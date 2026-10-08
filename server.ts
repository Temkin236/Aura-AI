import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt } from './src/ai/prompts.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '5mb' }));

export const ALLOWED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
] as const;

export type SupportedModel = (typeof ALLOWED_MODELS)[number];
export const DEFAULT_GEMINI_MODEL = (process.env.GEMINI_MODEL as SupportedModel) || 'gemini-2.5-flash';

export function resolveModelName(model: string): string {
  if (
    !model ||
    model.includes('3.') ||
    model.includes('flash-latest') ||
    model === 'gemini-2.5-flash'
  ) {
    return 'gemini-2.5-flash';
  }
  if (model.includes('pro')) {
    return 'gemini-2.5-pro';
  }
  return model;
}

app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    model: DEFAULT_GEMINI_MODEL,
    version: '0.2.0',
  });
});

function generatePersonaFallback(prompt: string, mode: string = 'developer'): string {
  switch (mode) {
    case 'developer':
      return `### Architectural Solution

Regarding: **"${prompt}"**

1. **System Design Considerations**:
   - Maintain clear separation of concerns and immutable data flow.
   - Leverage asynchronous patterns with graceful backpressure handling.

2. **Implementation Example**:
\`\`\`typescript
export async function handleTask(payload: Record<string, unknown>): Promise<boolean> {
  try {
    if (!payload) return false;
    await Promise.resolve(payload);
    return true;
  } catch (err) {
    console.error('Task failed:', err);
    return false;
  }
}
\`\`\`

*Add your Gemini API Key in Settings (⚙️) for full live AI streaming.*`;

    case 'tutor':
      return `### First Principles Breakdown

Let's explore **"${prompt}"**:

1. **Core Concept**: Every complex topic is built from simple, intuitive foundations.
2. **Key Mechanism**: Understanding the relationships between core components.
3. **Application**: How to leverage this insight to solve real problems.

*Add your Gemini API Key in Settings (⚙️) for live interactive tutoring.*`;

    case 'creative':
      return `### Creative Reflection

*Exploring: "${prompt}"*

Atmosphere and intention create resonance:
- **Sensory Resonance**: Visual rhythm, tone, and intentional texture.
- **Harmonic Cadence**: Contrasting declarative ideas with evocative flow.

*Add your Gemini API Key in Settings (⚙️) for live creative generation.*`;

    case 'professional':
      return `### Executive Assessment

**Topic**: ${prompt}

1. **Objective**: High-signal execution with minimal operational friction.
2. **Key Actions**: Discovery, structured rollout, and observability.
3. **Next Steps**: Validate milestones and review metrics.

*Add your Gemini API Key in Settings (⚙️) for live executive synthesis.*`;

    default:
      return `### Hello from AURA ✨

Regarding **"${prompt}"**:
- Let's break this down into clear, actionable steps.
- Feel free to ask more or switch persona modes at any time.

*Add your Gemini API Key in Settings (⚙️) for live conversation.*`;
  }
}

async function callGeminiRest(
  apiKey: string,
  model: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemInstruction: string
): Promise<string> {
  const modelName = resolveModelName(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
  } finally {
    clearTimeout(timeoutId);
  }
}

app.post('/api/chat/stream', async (req: Request, res: Response): Promise<void> => {
  const rawText = req.body.message ?? req.body.prompt;
  const message = typeof rawText === 'string' ? rawText.trim() : '';
  const { history, mode = 'developer', model, apiKey: clientApiKey } = req.body;

  if (!message) {
    res.status(400).json({ error: 'A valid, non-empty message is required.' });
    return;
  }

  if (message.length > 20000) {
    res.status(400).json({ error: 'Message exceeds the 20,000 character limit.' });
    return;
  }

  const sanitizedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-30)) {
      if (item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string' && item.content.trim()) {
        sanitizedHistory.push({ role: item.role, content: item.content.slice(0, 20000) });
      }
    }
  }

  const targetModel = resolveModelName(typeof model === 'string' ? model : DEFAULT_GEMINI_MODEL);
  const targetMode = typeof mode === 'string' ? mode : 'developer';
  const systemInstruction = buildSystemPrompt(targetMode);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let clientAborted = false;
  req.socket?.on('close', () => {
    if (!res.writableEnded) {
      clientAborted = true;
    }
  });

  const activeApiKey = (typeof clientApiKey === 'string' && clientApiKey.trim())
    ? clientApiKey.trim()
    : process.env.GEMINI_API_KEY?.trim();

  const isTestEnv = process.env.NODE_ENV === 'test';
  const isValidApiKey = Boolean(activeApiKey && activeApiKey.length > 15);

  if (isTestEnv || !isValidApiKey) {
    const fallbackText = generatePersonaFallback(message, targetMode);
    const chunks = fallbackText.match(/.{1,40}/g) || [fallbackText];

    for (const chunk of chunks) {
      if (clientAborted) break;
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      if (!isTestEnv) await new Promise((r) => setTimeout(r, 15));
    }

    if (!clientAborted) res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const turn of sanitizedHistory) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const ai = new GoogleGenAI({
      apiKey: activeApiKey,
      httpOptions: { headers: { 'User-Agent': 'aura-ai/0.2.0' } },
    });

    const responseStream = await ai.models.generateContentStream({
      model: targetModel,
      contents,
      config: {
        systemInstruction,
        temperature: targetMode === 'creative' ? 0.9 : targetMode === 'developer' ? 0.3 : 0.7,
      },
    });

    for await (const chunk of responseStream) {
      if (clientAborted) break;
      const text = chunk.text;
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    if (!clientAborted) res.write('data: [DONE]\n\n');
    res.end();
  } catch (sdkErr: any) {
    try {
      const directText = await callGeminiRest(activeApiKey!, targetModel, contents, systemInstruction);
      if (!clientAborted) {
        res.write(`data: ${JSON.stringify({ text: directText })}\n\n`);
        res.write('data: [DONE]\n\n');
      }
      res.end();
    } catch (err: any) {
      const fallback = generatePersonaFallback(message, targetMode);
      if (!clientAborted) {
        res.write(`data: ${JSON.stringify({ text: fallback })}\n\n`);
        res.write('data: [DONE]\n\n');
      }
      res.end();
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ✨ AURA AI running at http://localhost:${PORT}\n`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
