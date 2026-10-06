import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../server';
import http from 'http';

describe('AURA AI — Core Chatbot API Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('GET /api/health', () => {
    it('returns 200 OK and health status with configuration metadata', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(typeof data.configured).toBe('boolean');
      expect(typeof data.model).toBe('string');
      expect(data.version).toBe('0.2.0');
    });
  });

  describe('POST /api/chat/stream — Validation & Safety', () => {
    it('returns 400 when message is missing or empty', async () => {
      const res = await fetch(`${baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '   ' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/valid, non-empty message/i);
    });

    it('returns 400 when message exceeds max character limit', async () => {
      const oversized = 'A'.repeat(25000);
      const res = await fetch(`${baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: oversized }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/exceeds/i);
    });

    it('sets SSE headers and responds with text/event-stream Content-Type', async () => {
      const res = await fetch(`${baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello AURA',
          mode: 'developer',
          history: [],
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/event-stream');
      expect(res.headers.get('cache-control')).toContain('no-cache');

      const bodyText = await res.text();
      expect(bodyText).toContain('data:');
      expect(bodyText).toContain('[DONE]');
    }, 15000);

    it('sanitizes and gracefully handles malformed history turns', async () => {
      const res = await fetch(`${baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Tell me about clean architecture',
          mode: 'developer',
          history: [
            null,
            { role: 'invalid', content: '' },
            { role: 'user', content: 'What is separation of concerns?' },
            { role: 'assistant', content: 'Separation of concerns is an architectural pattern.' },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('[DONE]');
    }, 15000);
  });
});
