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

// Supported Gemini models allowlist
export const ALLOWED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
] as const;

export type SupportedModel = (typeof ALLOWED_MODELS)[number];
export const DEFAULT_GEMINI_MODEL = (process.env.GEMINI_MODEL as SupportedModel) || 'gemini-2.5-flash';

/**
 * GET /api/health
 * Lightweight health check endpoint.
 */
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    model: DEFAULT_GEMINI_MODEL,
    version: '0.2.0',
  });
});

/**
 * POST /api/chat/stream
 * Primary AI streaming endpoint powered by real Google Gemini.
 */
app.post('/api/chat/stream', async (req: Request, res: Response): Promise<void> => {
  const rawText = req.body.message ?? req.body.prompt;
  const message = typeof rawText === 'string' ? rawText.trim() : '';
  const { history, mode = 'developer', model } = req.body;

  // 1. Validate incoming message
  if (!message) {
    res.status(400).json({ error: 'A valid, non-empty message is required.' });
    return;
  }

  const trimmedMessage = message;
  if (trimmedMessage.length > 20000) {
    res.status(400).json({ error: 'Message exceeds the 20,000 character limit.' });
    return;
  }

  // 2. Sanitize conversation history (max last 30 turns)
  const sanitizedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-30)) {
      if (
        item &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string' &&
        item.content.trim()
      ) {
        sanitizedHistory.push({
          role: item.role,
          content: item.content.slice(0, 20000),
        });
      }
    }
  }

  // 3. Resolve target model & persona system prompt
  const targetModel: string =
    typeof model === 'string' && ALLOWED_MODELS.includes(model as SupportedModel)
      ? model
      : DEFAULT_GEMINI_MODEL;

  const targetMode = typeof mode === 'string' ? mode : 'developer';
  const systemInstruction = buildSystemPrompt(targetMode);

  // 4. Set SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // 5. Verify Gemini API key configuration
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    res.write(
      `data: ${JSON.stringify({
        error: 'Gemini API key is not configured. Add GEMINI_API_KEY to your server environment.',
      })}\n\n`
    );
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // 6. Stream real response from Google Gemini
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aura-ai/0.2.0',
        },
      },
    });

    // Format Gemini contents payload
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const turn of sanitizedHistory) {
      contents.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: trimmedMessage }],
    });

    const responseStream = await ai.models.generateContentStream({
      model: targetModel,
      contents,
      config: {
        systemInstruction,
        temperature: targetMode === 'creative' ? 0.9 : targetMode === 'developer' ? 0.3 : 0.7,
      },
    });

    let clientAborted = false;
    req.on('close', () => {
      clientAborted = true;
    });

    for await (const chunk of responseStream) {
      if (clientAborted) break;
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    if (!clientAborted) {
      res.write('data: [DONE]\n\n');
    }
    res.end();
  } catch (err: any) {
    console.error('Gemini generation error:', err?.message || err);

    const errorMessage =
      err?.message?.includes('API_KEY_INVALID') || err?.message?.includes('API key not valid')
        ? 'Invalid Gemini API key. Please verify your GEMINI_API_KEY in .env.'
        : err?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED')
        ? 'Gemini rate limit exceeded. Please wait a moment and try again.'
        : err?.message || "AURA couldn't reach Gemini. Please check your connection and try again.";

    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Server Initialization
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Development Vite middleware
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
    console.log(`\n  ✨ AURA AI is running:`);
    console.log(`  ➜ Local:   http://localhost:${PORT}`);
    console.log(`  ➜ Network: http://127.0.0.1:${PORT}\n`);
  });
}

// Only start when executed directly (not when imported in test suites)
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
