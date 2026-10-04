import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { GoogleGenAI } from '@google/genai';
import authRouter from './src/routes/auth';
import adminRouter from './src/routes/admin';
import conversationsRouter from './src/routes/conversations';
import settingsRouter from './src/routes/settings';
import attachmentsRouter from './src/routes/attachments';
import documentsRouter from './src/routes/documents';
import sharesRouter from './src/routes/shares';
import exportRouter from './src/routes/export';
import profileRouter from './src/routes/profile';
import { optionalAuth } from './src/middleware/auth';
import { getConversation, createConversation, createMessage } from './src/db/conversations';
import { createAttachment } from './src/db/attachments';
import { isValidUuid } from './src/auth/service';
import { runMigrations } from './src/db/migrate';
import { getDatabaseUrl, checkDatabaseConnection } from './src/db/index';
import { retrieveRagContext } from './src/ai/rag';
import { defaultControlledAgent } from './src/ai/agent';
import { buildSystemPrompt, buildRagContextString } from './src/ai/prompts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));
app.use(cookieParser(process.env.AUTH_SESSION_SECRET));

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

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: process.env.NODE_ENV === 'test' ? 1000 : parseInt(process.env.AUTH_RATE_LIMIT_MAX || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: 'Too many authentication attempts. Please try again in a moment.',
  },
});

// Authentication routes
app.use('/api/auth', authLimiter, authRouter);

// Administrative routes
app.use('/api/admin', adminRouter);

// Authenticated conversation & message routes
app.use('/api/conversations', conversationsRouter);

// Authenticated settings routes
app.use('/api/settings', settingsRouter);

// Attachments routes (Multimodal support)
app.use('/api/attachments', attachmentsRouter);

// RAG Documents routes
app.use('/api/documents', documentsRouter);

// Public Share Snapshots routes
app.use('/api/shares', sharesRouter);

// Export routes (Markdown, JSON, PDF)
app.use('/api/export', exportRouter);

// Profile and Account management routes
app.use('/api/profile', profileRouter);

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  const dbConfigured = !!getDatabaseUrl();
  let dbConnected = false;
  if (dbConfigured) {
    const dbStatus = await checkDatabaseConnection().catch(() => ({ connected: false }));
    dbConnected = dbStatus.connected;
  }

  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    defaultModel: DEFAULT_GEMINI_MODEL,
    allowedModels: ALLOWED_MODELS,
    database: {
      configured: dbConfigured,
      connected: dbConnected,
    },
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
app.post('/api/chat/stream', chatLimiter, optionalAuth, async (req: Request, res: Response) => {
  const { prompt, mode, model, temperature, systemInstruction, history, conversationId, attachments, enableRag = true } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'A valid prompt string is required' });
    return;
  }

  const activeModel = resolveModel(model);
  const activeTemp = resolveTemperature(temperature, mode);
  const personaInstruction = buildSystemPrompt(mode || 'developer', systemInstruction);

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

  // 1. If user is authenticated and conversationId is valid, persist user message & attachments
  let savedUserMessageId: string | null = null;
  if (req.user && conversationId && isValidUuid(conversationId)) {
    try {
      const existing = await getConversation(req.user.id, conversationId);
      if (!existing) {
        await createConversation(req.user.id, {
          id: conversationId,
          title: prompt.slice(0, 36) + (prompt.length > 36 ? '...' : ''),
          mode: mode || 'developer',
        });
      }
      const userMsg = await createMessage(req.user.id, conversationId, {
        role: 'user',
        content: prompt,
        mode: mode || 'developer',
        model: activeModel,
      });
      if (userMsg) savedUserMessageId = userMsg.id;

      // Link attachments
      if (attachments && Array.isArray(attachments)) {
        for (const att of attachments) {
          if (att.filename && att.mimeType && att.sizeBytes) {
            await createAttachment(req.user.id, {
              conversationId,
              messageId: savedUserMessageId,
              filename: att.filename,
              mimeType: att.mimeType,
              sizeBytes: att.sizeBytes,
              dataUrl: att.dataUrl || null,
            });
          }
        }
      }
    } catch (err: any) {
      console.error('Error persisting user stream message:', err?.message || err);
    }
  }

  // 2. RAG Retrieval if user is authenticated
  let retrievedSources: any[] = [];
  let ragContextStr = '';
  if (req.user && enableRag) {
    try {
      const ragRes = await retrieveRagContext(req.user.id, prompt, 3);
      if (ragRes.sources.length > 0) {
        retrievedSources = ragRes.sources;
        ragContextStr = buildRagContextString(ragRes.sources);
        res.write(
          `data: ${JSON.stringify({
            sources: retrievedSources.map((s) => ({
              documentId: s.documentId,
              title: s.documentTitle,
              chunkIndex: s.chunkIndex,
              similarity: s.similarity,
              contentPreview: s.content.slice(0, 150) + '...',
            })),
          })}\n\n`
        );
      }
    } catch (ragErr) {
      console.warn('RAG context retrieval skipped:', ragErr);
    }
  }

  // 3. Agent Tool Call Check
  const toolTriggers = defaultControlledAgent.detectToolIntent(prompt);
  let toolExecutions: any[] = [];
  if (toolTriggers.length > 0) {
    const agentResult = await defaultControlledAgent.runWorkflow(
      prompt,
      personaInstruction,
      activeModel,
      activeTemp
    );
    if (agentResult.steps.length > 0) {
      toolExecutions = agentResult.steps.map((s) => ({
        toolName: s.toolName,
        input: s.args,
        output: s.result || s.error,
        status: s.error ? 'error' : 'success',
        executionTimeMs: s.durationMs,
      }));
      res.write(`data: ${JSON.stringify({ toolCalls: toolExecutions })}\n\n`);
    }
  }

  // 4. Stream via Google Gemini SDK if available
  if (ai) {
    try {
      const sanitizedContents: any[] = sanitizeHistory(history);
      const userParts: any[] = [];

      // Multimodal image/document inlineData parts
      if (attachments && Array.isArray(attachments)) {
        for (const att of attachments) {
          if (att.dataUrl && typeof att.dataUrl === 'string') {
            const match = att.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              userParts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          }
        }
      }

      // Add text prompt + RAG context
      userParts.push({
        text: `${prompt}${ragContextStr}`,
      });

      sanitizedContents.push({
        role: 'user',
        parts: userParts,
      });

      const responseStream = await ai.models.generateContentStream({
        model: activeModel,
        contents: sanitizedContents,
        config: {
          systemInstruction: personaInstruction,
          temperature: activeTemp,
        },
      });

      let accumulatedStreamText = '';

      for await (const chunk of responseStream) {
        if (isAborted) break;
        const text = chunk.text || '';
        if (text) {
          accumulatedStreamText += text;
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
        if (req.user && conversationId && isValidUuid(conversationId) && accumulatedStreamText.trim()) {
          try {
            await createMessage(req.user.id, conversationId, {
              role: 'assistant',
              content: accumulatedStreamText,
              mode: mode || 'developer',
              model: activeModel,
            });
          } catch (e: any) {
            console.error('Error persisting assistant stream message:', e?.message || e);
          }
        }
        res.write('data: [DONE]\n\n');
        res.end();
      }
      return;
    } catch (err: any) {
      console.error('Gemini Stream Error:', err?.message || err);
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
  await streamLocalFallback(res, fallbackFullText, () => isAborted, async () => {
    if (req.user && conversationId && isValidUuid(conversationId) && fallbackFullText.trim()) {
      try {
        await createMessage(req.user.id, conversationId, {
          role: 'assistant',
          content: fallbackFullText,
          mode: mode || 'developer',
          model: 'aura-local-fallback',
        });
      } catch (e: any) {
        console.error('Error persisting fallback stream message:', e?.message || e);
      }
    }
  });
});

// STANDARD NON-STREAMING ENDPOINT
app.post('/api/chat', chatLimiter, optionalAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, mode, model, temperature, systemInstruction, history, conversationId } = req.body;

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

    // If user is authenticated and conversationId is valid, persist user message
    if (req.user && conversationId && isValidUuid(conversationId)) {
      try {
        const existing = await getConversation(req.user.id, conversationId);
        if (!existing) {
          await createConversation(req.user.id, {
            id: conversationId,
            title: prompt.slice(0, 36) + (prompt.length > 36 ? '...' : ''),
            mode: mode || 'developer',
          });
        }
        await createMessage(req.user.id, conversationId, {
          role: 'user',
          content: prompt,
          mode: mode || 'developer',
          model: activeModel,
        });
      } catch (err: any) {
        console.error('Error persisting user message in /api/chat:', err?.message || err);
      }
    }

    if (!ai) {
      const fallback = generateAuraResponse(prompt, mode || 'developer');
      if (req.user && conversationId && isValidUuid(conversationId) && fallback.trim()) {
        try {
          await createMessage(req.user.id, conversationId, {
            role: 'assistant',
            content: fallback,
            mode: mode || 'developer',
            model: 'aura-local-fallback',
          });
        } catch (err: any) {
          console.error('Error persisting fallback message in /api/chat:', err?.message || err);
        }
      }
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

    if (req.user && conversationId && isValidUuid(conversationId) && replyText.trim()) {
      try {
        await createMessage(req.user.id, conversationId, {
          role: 'assistant',
          content: replyText,
          mode: mode || 'developer',
          model: activeModel,
        });
      } catch (err: any) {
        console.error('Error persisting assistant message in /api/chat:', err?.message || err);
      }
    }

    res.json({
      text: replyText,
      model: activeModel,
      isFallback: false,
    });
  } catch (error: any) {
    console.error('Server Gemini Error:', error?.message || error);
    const fallback = generateAuraResponse(req.body.prompt || '', req.body.mode || 'developer');
    if (req.user && req.body.conversationId && isValidUuid(req.body.conversationId) && fallback.trim()) {
      try {
        await createMessage(req.user.id, req.body.conversationId, {
          role: 'assistant',
          content: fallback,
          mode: req.body.mode || 'developer',
          model: 'aura-local-fallback',
        });
      } catch (err: any) {
        console.error('Error persisting fallback error message:', err?.message || err);
      }
    }
    res.json({
      text: fallback,
      model: 'aura-local-fallback',
      isFallback: true,
      warning: 'Upstream API error; activating AURA local fallback engine.',
    });
  }
});

// Helper for streaming local fallback responses smoothly
async function streamLocalFallback(
  res: Response,
  fullText: string,
  isAborted: () => boolean,
  onComplete?: () => Promise<void>
) {
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
    if (onComplete) {
      try {
        await onComplete();
      } catch (err: any) {
        console.error('Error in stream onComplete callback:', err?.message || err);
      }
    }
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
  // Auto-run pending database migrations if DATABASE_URL is configured
  if (getDatabaseUrl()) {
    try {
      console.log('📦 Checking PostgreSQL migrations...');
      const migrationResult = await runMigrations();
      if (migrationResult.success) {
        if (migrationResult.applied.length > 0) {
          console.log(`✓ Applied ${migrationResult.applied.length} pending migration(s):`, migrationResult.applied.join(', '));
        } else {
          console.log('✓ Database schema is up to date.');
        }
      } else {
        console.warn('⚠️ Database migration warning:', migrationResult.error);
      }
    } catch (dbErr: any) {
      console.warn('⚠️ Could not connect to PostgreSQL on startup:', dbErr?.message || dbErr);
    }
  }

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
    console.log(`\n  ✨ AURA AI is running:`);
    console.log(`  ➜ Local:   http://localhost:${PORT}`);
    console.log(`  ➜ Network: http://127.0.0.1:${PORT}\n`);
  });
}

// Only start the server when run directly (not during vitest test imports)
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
