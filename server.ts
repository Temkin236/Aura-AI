import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';

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

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aura-ai/0.1.0',
      },
    },
  });
}

// Development-friendly rate limiting for AI endpoints
const chatLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '60', 10), // 60 requests/minute
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: "You're sending messages a little too quickly. Please try again in a moment.",
    retryAfter: 60,
  },
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    defaultModel: DEFAULT_GEMINI_MODEL,
    allowedModels: ALLOWED_MODELS,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Validates and limits history turns and characters to prevent token explosion.
 * Preserves the last 8 messages, caps each turn at 4,000 characters,
 * and limits total context to 16,000 characters.
 */
export function sanitizeHistory(history: unknown): Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> {
  if (!Array.isArray(history)) return [];

  const maxTurns = 8;
  const maxTurnChars = 4000;
  const maxTotalChars = 16000;

  let accumulatedChars = 0;
  const sanitized: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

  const recentTurns = history.slice(-maxTurns);
  for (let i = recentTurns.length - 1; i >= 0; i--) {
    const item = recentTurns[i];
    if (!item || typeof item !== 'object') continue;

    let rawContent = typeof item.content === 'string' ? item.content : '';
    if (rawContent.length > maxTurnChars) {
      rawContent = rawContent.slice(0, maxTurnChars) + '... [truncated]';
    }

    if (accumulatedChars + rawContent.length > maxTotalChars) {
      break;
    }

    accumulatedChars += rawContent.length;
    const role = item.role === 'assistant' || item.role === 'model' ? 'model' : 'user';
    sanitized.unshift({
      role,
      parts: [{ text: rawContent }],
    });
  }

  return sanitized;
}

export function resolveModel(requestedModel?: unknown): SupportedModel {
  if (typeof requestedModel === 'string' && (ALLOWED_MODELS as readonly string[]).includes(requestedModel)) {
    return requestedModel as SupportedModel;
  }
  return DEFAULT_GEMINI_MODEL;
}

export function resolveTemperature(reqTemp: unknown, mode?: string): number {
  if (typeof reqTemp === 'number' && !isNaN(reqTemp)) {
    return Math.max(0.0, Math.min(2.0, reqTemp));
  }
  return mode === 'developer' ? 0.3 : mode === 'creative' ? 0.9 : 0.7;
}

// REAL STREAMING ENDPOINT (Server-Sent Events)
app.post('/api/chat/stream', chatLimiter, async (req: Request, res: Response) => {
  const { prompt, mode, model, temperature, systemInstruction, history } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'A valid prompt string is required' });
    return;
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let isAborted = false;
  req.on('close', () => {
    isAborted = true;
  });

  const activeModel = resolveModel(model);
  const activeTemp = resolveTemperature(temperature, mode);
  const sanitizedInstruction =
    typeof systemInstruction === 'string' && systemInstruction.trim()
      ? systemInstruction.slice(0, 4000)
      : 'You are AURA AI, an intelligent, warm, calm, and intellectually rigorous personal companion. Think better. Create freely.';

  // If Gemini client is available, stream real Gemini chunks
  if (ai) {
    try {
      const sanitizedContents: any[] = sanitizeHistory(history);
      sanitizedContents.push({
        role: 'user',
        parts: [{ text: prompt.slice(0, 10000) }],
      });

      const responseStream = await ai.models.generateContentStream({
        model: activeModel,
        contents: sanitizedContents,
        config: {
          systemInstruction: sanitizedInstruction,
          temperature: activeTemp,
        },
      });

      for await (const chunk of responseStream) {
        if (isAborted) break;
        const text = chunk.text || '';
        if (text) {
          res.write(
            `data: ${JSON.stringify({
              text,
              model: activeModel,
              isFallback: false,
            })}\n\n`
          );
        }
      }

      if (!isAborted) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
      return;
    } catch (err: any) {
      console.error('Gemini Stream Error:', err?.message || err);
      // If error occurs, stream fallback with explicit error indicator
      if (!isAborted) {
        res.write(
          `data: ${JSON.stringify({
            warning: 'Upstream API error; activating AURA local fallback engine.',
            model: 'aura-local-fallback',
            isFallback: true,
          })}\n\n`
        );
      }
    }
  }

  // Fallback stream generator (Offline / No Key / Fallback Mode)
  const fallbackFullText = generateAuraResponse(prompt, mode || 'developer');
  await streamLocalFallback(res, fallbackFullText, () => isAborted);
});

// STANDARD NON-STREAMING ENDPOINT
app.post('/api/chat', chatLimiter, async (req: Request, res: Response) => {
  try {
    const { prompt, mode, model, temperature, systemInstruction, history } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'A valid prompt string is required' });
      return;
    }

    const activeModel = resolveModel(model);
    const activeTemp = resolveTemperature(temperature, mode);
    const sanitizedInstruction =
      typeof systemInstruction === 'string' && systemInstruction.trim()
        ? systemInstruction.slice(0, 4000)
        : 'You are AURA AI, an intelligent, warm, calm, and intellectually rigorous personal companion. Think better. Create freely.';

    if (!ai) {
      const fallback = generateAuraResponse(prompt, mode || 'developer');
      res.json({
        text: fallback,
        model: 'aura-local-fallback',
        isFallback: true,
      });
      return;
    }

    const sanitizedContents: any[] = sanitizeHistory(history);
    sanitizedContents.push({
      role: 'user',
      parts: [{ text: prompt.slice(0, 10000) }],
    });

    const response = await ai.models.generateContent({
      model: activeModel,
      contents: sanitizedContents,
      config: {
        systemInstruction: sanitizedInstruction,
        temperature: activeTemp,
      },
    });

    const replyText = response.text || '';
    res.json({
      text: replyText,
      model: activeModel,
      isFallback: false,
    });
  } catch (error: any) {
    console.error('Server Gemini Error:', error?.message || error);
    const fallback = generateAuraResponse(req.body.prompt || '', req.body.mode || 'developer');
    res.json({
      text: fallback,
      model: 'aura-local-fallback',
      isFallback: true,
      warning: 'Upstream API error; activating AURA local fallback engine.',
    });
  }
});

// Helper for streaming local fallback responses smoothly
async function streamLocalFallback(res: Response, fullText: string, isAborted: () => boolean) {
  const words = fullText.split(' ');
  const chunkSize = 3;

  for (let i = 0; i < words.length; i += chunkSize) {
    if (isAborted()) break;
    const chunk = words.slice(i, i + chunkSize).join(' ') + (i + chunkSize < words.length ? ' ' : '');
    res.write(
      `data: ${JSON.stringify({
        text: chunk,
        model: 'aura-local-fallback',
        isFallback: true,
      })}\n\n`
    );
    // Yield brief tick for natural streaming cadence
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  if (!isAborted()) {
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

// Editorial AURA persona fallbacks
export function generateAuraResponse(prompt: string, mode: string): string {
  if (mode === 'developer') {
    return `### Precision Analysis & Implementation

Regarding: **${prompt.slice(0, 50)}**

Here is a clean, production-grade approach built around single-responsibility principles and strict type guarantees:

\`\`\`python
import asyncio
from typing import Optional, Dict, Any

class AuraWorkerPool:
    """
    Self-healing worker pool featuring bounded queues and deterministic shutdown.
    """
    def __init__(self, capacity: int = 50):
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=capacity)
        self.is_active: bool = True

    async def enqueue(self, task_id: str, payload: Dict[str, Any]) -> bool:
        """Enqueue task with non-blocking backpressure check."""
        if not self.is_active:
            raise RuntimeError("Worker pool is draining.")
        await self.queue.put({"id": task_id, "data": payload})
        return True
\`\`\`

#### Architectural Guarantees
1. **Bounded Allocations**: Constrained memory envelope during ingestion spikes.
2. **Explicit Backpressure**: Producers await naturally without unbounded memory drift.
3. **Deterministic Drain**: Clean queue draining on termination signals.`;
  }

  if (mode === 'creative') {
    return `### A Reflection on Form and Light

*"In every deliberate pause, the mind reclaims its rhythm."*

When considering: *${prompt}*

Let us discard the hurried assumptions. The most compelling creations emerge from intentional restraint—the contrast between rich espresso shadows and the quiet warmth of cream paper. Allow your premise room to breathe before giving it definitive shape.`;
  }

  if (mode === 'tutor') {
    return `### Conceptual Foundation & Intuition

Let us unpack this together from first principles:

1. **The Anchor Concept**: Break the problem down into its irreducible component parts.
2. **Mental Model**: Notice how the dynamics mirror physical systems where potential translates into equilibrium.
3. **Next Checkpoint**: Would you like to delve into the mathematical foundation or test this intuition with a practical example?`;
  }

  if (mode === 'professional') {
    return `### Executive Synthesis & Action Vector

**Executive Summary:**
A structured approach to your objective yields immediate operational clarity.

- **Primary Objective**: Align core deliverables with high-leverage outcomes.
- **Risk Mitigation**: Establish continuous feedback loops to detect drift early.
- **Next Step**: Synthesize key stakeholder inputs before scaling execution.`;
  }

  return `Thank you for sharing this thought. 

Regarding **${prompt.slice(0, 45)}**: The key is approaching this with quiet clarity rather than urgency.

Let's begin by isolating what matters most to you in this outcome. Where would you like to start?`;
}

// Development vs Production Setup
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Vite middleware for development
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
    console.log(`AURA AI server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start the server when run directly (not during vitest test imports)
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
