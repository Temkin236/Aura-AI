import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import http from 'http';
import { app } from '../../server';
import { setPool } from '../db/index';
import { runMigrations } from '../db/migrate';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AURA V2 — Phase 9: Account Management & Profile', () => {
  let memDb: IMemoryDb;
  let pgAdapter: any;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    memDb = newDb({ noAstCoverageCheck: true });
    let uuidCounter = 1;
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      implementation: () => `66666666-7777-8888-9999-${String(uuidCounter++).padStart(12, '0')}`,
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

  describe('Password Reset Endpoint Security', () => {
    it('returns generic success message for password reset to prevent email enumeration', async () => {
      const res = await fetch(`${baseUrl}/api/profile/reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'unknown@example.com' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.message).toContain('password reset instructions');
    });

    it('rejects empty or missing email for reset request with 400', async () => {
      const res = await fetch(`${baseUrl}/api/profile/reset-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });
});
