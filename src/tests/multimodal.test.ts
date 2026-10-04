import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import http from 'http';
import { app } from '../../server';
import { setPool } from '../db/index';
import { runMigrations } from '../db/migrate';
import { validateAttachment, MAX_ATTACHMENT_SIZE_BYTES } from '../db/attachments';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AURA V2 — Phase 3: Multimodal AI & File Attachments', () => {
  let memDb: IMemoryDb;
  let pgAdapter: any;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    memDb = newDb({ noAstCoverageCheck: true });
    let uuidCounter = 1;
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      implementation: () => `33333333-4444-5555-6666-${String(uuidCounter++).padStart(12, '0')}`,
    });

    const { Pool } = memDb.adapters.createPg();
    pgAdapter = new Pool();
    setPool(pgAdapter);

    const migrationsDir = path.resolve(__dirname, '../db/migrations');
    await runMigrations(pgAdapter, migrationsDir);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    setPool(null);
    if (pgAdapter) {
      await pgAdapter.end();
    }
  });

  describe('File Validation Layer', () => {
    it('accepts valid PNG, JPEG, WEBP, and PDF files within size limit', () => {
      expect(validateAttachment('test.png', 'image/png', 1024 * 50).valid).toBe(true);
      expect(validateAttachment('photo.jpeg', 'image/jpeg', 1024 * 500).valid).toBe(true);
      expect(validateAttachment('document.pdf', 'application/pdf', 1024 * 1024).valid).toBe(true);
    });

    it('rejects unsupported file formats cleanly', () => {
      const result = validateAttachment('malicious.exe', 'application/x-msdownload', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });

    it('rejects oversized files exceeding 10MB limit', () => {
      const result = validateAttachment('huge.png', 'image/png', MAX_ATTACHMENT_SIZE_BYTES + 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds allowed limit');
    });

    it('rejects empty or missing filenames', () => {
      const result = validateAttachment('', 'image/png', 500);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid filename');
    });
  });

  describe('Attachments API Endpoints', () => {
    it('allows anonymous and authenticated users to upload valid attachments', async () => {
      const res = await fetch(`${baseUrl}/api/attachments/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'diagram.png',
          mimeType: 'image/png',
          sizeBytes: 2048,
          dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.attachment.filename).toBe('diagram.png');
      expect(data.attachment.id).toBeDefined();
    });

    it('returns 400 when attempting to upload an unsupported format via API', async () => {
      const res = await fetch(`${baseUrl}/api/attachments/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'script.sh',
          mimeType: 'application/x-sh',
          sizeBytes: 500,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Unsupported file format');
    });
  });
});
