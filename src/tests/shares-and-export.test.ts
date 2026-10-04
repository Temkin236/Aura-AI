import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import http from 'http';
import { app } from '../../server';
import { setPool } from '../db/index';
import { runMigrations } from '../db/migrate';
import { createShareLink, getPublicShareSnapshot, revokeShareLink } from '../db/shares';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AURA V2 — Phase 8: Export & Secure Public Sharing', () => {
  let memDb: IMemoryDb;
  let pgAdapter: any;
  let server: http.Server;
  let baseUrl: string;
  const userA = '11111111-0000-0000-0000-000000000001';
  const userB = '22222222-0000-0000-0000-000000000002';
  const convId = '33333333-0000-0000-0000-000000000001';

  beforeEach(async () => {
    memDb = newDb({ noAstCoverageCheck: true });
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      implementation: () => crypto.randomUUID(),
    });

    const { Pool } = memDb.adapters.createPg();
    pgAdapter = new Pool();
    setPool(pgAdapter);

    const migrationsDir = path.resolve(__dirname, '../db/migrations');
    await runMigrations(pgAdapter, migrationsDir);

    // Seed test users & conversation
    await pgAdapter.query("INSERT INTO users (id, email, password_hash) VALUES ($1, 'a@test.com', 'hash'), ($2, 'b@test.com', 'hash');", [userA, userB]);
    await pgAdapter.query("INSERT INTO conversations (id, user_id, title, mode) VALUES ($1, $2, 'Distributed Systems Architecture', 'developer');", [convId, userA]);
    await pgAdapter.query("INSERT INTO messages (conversation_id, role, content, mode) VALUES ($1, 'user', 'What is Paxos consensus?', 'developer'), ($1, 'assistant', 'Paxos is a consensus protocol...', 'developer');", [convId]);

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

  describe('Share Links Security & Privacy Isolation', () => {
    it('creates a secure random share token for an owned conversation', async () => {
      const share = await createShareLink(userA, convId);
      expect(share.share_token).toBeDefined();
      expect(share.share_token.length).toBeGreaterThanOrEqual(32);
      expect(share.is_active).toBe(true);
    });

    it('retrieves public read-only snapshot without exposing user ID, email, or secrets', async () => {
      const share = await createShareLink(userA, convId);
      const snapshot = await getPublicShareSnapshot(share.share_token);

      expect(snapshot).not.toBeNull();
      expect(snapshot!.conversation.title).toBe('Distributed Systems Architecture');
      expect(snapshot!.messages.length).toBe(2);

      // Verify no sensitive keys exist in returned snapshot
      const rawJson = JSON.stringify(snapshot);
      expect(rawJson).not.toContain(userA);
      expect(rawJson).not.toContain('a@test.com');
      expect(rawJson).not.toContain('hash');
    });

    it('allows owner to revoke share link immediately', async () => {
      const share = await createShareLink(userA, convId);
      const revoked = await revokeShareLink(userA, share.share_token);
      expect(revoked).toBe(true);

      const snapshotAfter = await getPublicShareSnapshot(share.share_token);
      expect(snapshotAfter).toBeNull();
    });
  });

  describe('Public Share Endpoint via HTTP', () => {
    it('allows anonymous public viewing via GET /api/shares/public/:token', async () => {
      const share = await createShareLink(userA, convId);
      const res = await fetch(`${baseUrl}/api/shares/public/${share.share_token}`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.snapshot).toBeDefined();
      expect(data.snapshot.conversation.title).toBe('Distributed Systems Architecture');
    });

    it('returns 404 for invalid or non-existent share tokens', async () => {
      const res = await fetch(`${baseUrl}/api/shares/public/non_existent_token_1234567890123456`);
      expect(res.status).toBe(404);
    });
  });
});
