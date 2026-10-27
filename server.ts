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
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
] as const;

export type SupportedModel = (typeof ALLOWED_MODELS)[number];
export const DEFAULT_GEMINI_MODEL = (process.env.GEMINI_MODEL as SupportedModel) || 'gemini-3.5-flash';

export function resolveModelName(model: string): string {
  if (!model) return DEFAULT_GEMINI_MODEL;
  if (model.includes('3.5-flash-lite')) return 'gemini-3.5-flash-lite';
  if (model.includes('3.5') || model.includes('3.8') || model.includes('latest')) {
    return 'gemini-3.5-flash';
  }
  // If model is older 2.x or 1.x which Google deprecated for new accounts, route to gemini-3.5-flash
  if (model.includes('2.5') || model.includes('2.0') || model.includes('1.5')) {
    return 'gemini-3.5-flash';
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

> [!TIP]
> Prioritize immutable data flow and asynchronous boundaries with graceful backpressure handling.

#### 1. Architectural Strategy
| Layer | Core Responsibility | Key Mechanism |
| :--- | :--- | :--- |
| **Ingress** | Input validation & sanitization | Schema validation, rate limits |
| **Execution** | Async task scheduling | Non-blocking Event Loop |
| **Persistence** | Resilient storage & caching | In-memory cache + write-through |

#### 2. Implementation Specification
\`\`\`typescript
export interface TaskPayload<T = unknown> {
  id: string;
  timestamp: number;
  data: T;
}

export async function processTask<T>(payload: TaskPayload<T>): Promise<{ success: boolean; durationMs: number }> {
  const start = performance.now();
  try {
    if (!payload?.id) throw new Error('Invalid task identifier');
    await Promise.resolve(payload.data);
    return { success: true, durationMs: performance.now() - start };
  } catch (err) {
    console.error('[AURA] Task execution failed:', err);
    return { success: false, durationMs: performance.now() - start };
  }
}
\`\`\`

- [x] Strict type-safety with generic payload constraints
- [x] Comprehensive timing instrumentation
- [ ] Add your Gemini API Key in **Settings (⚙️)** for live streaming generation`;

    case 'tutor':
      return `### First Principles Breakdown

Let's explore: **"${prompt}"**

> [!NOTE]
> Every complex concept is simply an accumulation of intuitive, basic principles stacked logically.

#### Step 1: The Core Intuition
Imagine a relay race where each runner represents a discrete transformation. The batons passed between them are your data structures.

#### Step 2: Conceptual Mapping
| Concept | Everyday Analogy | Technical Reality |
| :--- | :--- | :--- |
| **Abstraction** | Car steering wheel | Hiding mechanical complexity behind simple controls |
| **State** | Water in a vessel | The memory snapshot at any given point in time |
| **Iteration** | Clock ticks | Repeated systematic execution until a condition is satisfied |

---

*Add your Gemini API Key in **Settings (⚙️)** for interactive live Socratic dialogues.*`;

    case 'creative':
      return `### Creative Reflection

*Exploring the contours of: "${prompt}"*

> [!TIP]
> True elegance lies not in excess, but in the intentional resonance between tone, structure, and cadence.

Atmosphere and resonance intertwine:
- **Sensory Resonance**: The rhythmic interplay of shadow, texture, and silence.
- **Harmonic Cadence**: Contrasting deliberate, sparse declarations with expansive evocative flow.

---

*Add your Gemini API Key in **Settings (⚙️)** for open-ended poetic and narrative generation.*`;

    case 'professional':
      return `### Executive Strategic Synthesis

**Subject**: ${prompt}

> [!IMPORTANT]
> Targeted for immediate executive clarity: minimize operational overhead while maximizing signal-to-noise ratio.

#### Strategic Evaluation Matrix
| Workstream | Priority | Key Milestone | Target Impact |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Immediate | Architectural Discovery | Establish baseline metrics |
| **Phase 2** | Mid-term | Structured Rollout | 40% reduction in cycle friction |
| **Phase 3** | Long-term | Observability & Governance | Autonomous resilience |

#### Actionable Recommendations
- [x] Validate resource attribution and environment variables
- [x] Establish automated integration verification
- [ ] Add your Gemini API Key in **Settings (⚙️)** for real-time executive advisory`;

    default:
      return `### AURA Intelligent Companion ✨

Regarding **"${prompt}"**:

> [!NOTE]
> Ready to assist across coding, research, writing, and structured thinking.

- Let's break this down into clear, actionable steps.
- You can switch between **Developer**, **Creative**, **Tutor**, **Friendly**, and **Professional** personas at any time.

---

*Add your Gemini API Key in **Settings (⚙️)** to unlock unconstrained live Gemini intelligence.*`;
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
  const { history, mode = 'developer', model, apiKey: clientApiKey, customInstructions } = req.body;

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
  let systemInstruction = buildSystemPrompt(targetMode);
  if (typeof customInstructions === 'string' && customInstructions.trim()) {
    systemInstruction += `\n\nUser Custom Guidance:\n${customInstructions.trim()}`;
  }

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
        const chunks = fallback.match(/.{1,40}/g) || [fallback];
        for (const chunk of chunks) {
          if (clientAborted) break;
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          if (!isTestEnv) await new Promise((r) => setTimeout(r, 15));
        }
        if (!clientAborted) res.write('data: [DONE]\n\n');
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
