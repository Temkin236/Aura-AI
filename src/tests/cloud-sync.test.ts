import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { runMigrations } from '../db/migrate';
import { setPool } from '../db/index';
import { app } from '../../server';
import { getConversation, listMessages } from '../db/conversations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AURA V2 — Frontend Cloud Sync & PostgreSQL Source of Truth', () => {
  let memDb: IMemoryDb;
  let pgAdapter: any;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    // 1. Setup in-memory PostgreSQL instance with gen_random_uuid
    memDb = newDb({ noAstCoverageCheck: true });

    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      implementation: () => crypto.randomUUID(),
    });

    const { Pool } = memDb.adapters.createPg();
    pgAdapter = new Pool();

    // 2. Set DB pool
    setPool(pgAdapter);

    // 3. Run migrations
    const migrationsDir = path.resolve(__dirname, '../db/migrations');
    const migResult = await runMigrations(pgAdapter, migrationsDir);
    expect(migResult.success).toBe(true);

    // 4. Start HTTP server on dynamic port
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
    if (pgAdapter) {
      await pgAdapter.end();
    }
    setPool(null);
  });

  async function registerUser(email: string, displayName: string): Promise<{ cookie: string; user: any }> {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123!',
        displayName,
      }),
    });
    expect(res.status).toBe(201);
    const cookie = res.headers.get('set-cookie')!.split(';')[0];
    const data = await res.json();
    return { cookie, user: data.user };
  }

  async function signInUser(email: string): Promise<{ cookie: string; user: any }> {
    const res = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123!',
      }),
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie')!.split(';')[0];
    const data = await res.json();
    return { cookie, user: data.user };
  }

  describe('Storage Mode & Source of Truth Contract', () => {
    it('enforces PostgreSQL as authoritative source of truth when authenticated', async () => {
      const userA = await registerUser('cloud_user@aura.ai', 'Cloud User');

      // 1. Authenticated user creates conversation via POST /api/conversations
      const createRes = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
        body: JSON.stringify({
          title: 'Distributed Consensus Engineering',
          mode: 'developer',
        }),
      });
      expect(createRes.status).toBe(201);
      const { conversation } = await createRes.json();
      expect(conversation.id).toBeDefined();

      // 2. Fetch conversations via GET /api/conversations
      const listRes = await fetch(`${baseUrl}/api/conversations`, {
        headers: { Cookie: userA.cookie },
      });
      expect(listRes.status).toBe(200);
      const listData = await listRes.json();
      expect(listData.conversations).toHaveLength(1);
      expect(listData.conversations[0].id).toBe(conversation.id);
      expect(listData.conversations[0].title).toBe('Distributed Consensus Engineering');

      // 3. Messages endpoint returns empty array for new conversation
      const msgsRes = await fetch(`${baseUrl}/api/conversations/${conversation.id}/messages`, {
        headers: { Cookie: userA.cookie },
      });
      expect(msgsRes.status).toBe(200);
      const msgsData = await msgsRes.json();
      expect(msgsData.messages).toEqual([]);
    });

    it('rejects anonymous access to conversation sync APIs', async () => {
      const convId = crypto.randomUUID();

      const listRes = await fetch(`${baseUrl}/api/conversations`);
      expect(listRes.status).toBe(401);

      const getRes = await fetch(`${baseUrl}/api/conversations/${convId}`);
      expect(getRes.status).toBe(401);

      const patchRes = await fetch(`${baseUrl}/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Unauthorized' }),
      });
      expect(patchRes.status).toBe(401);

      const delRes = await fetch(`${baseUrl}/api/conversations/${convId}`, {
        method: 'DELETE',
      });
      expect(delRes.status).toBe(401);
    });
  });

  describe('Full SSE Streaming Persistence Verification', () => {
    it('persists user message and streamed assistant response in PostgreSQL after [DONE]', async () => {
      const user = await registerUser('streamer@aura.ai', 'Streamer User');
      const convId = crypto.randomUUID();

      // Stream request over SSE
      const streamRes = await fetch(`${baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: user.cookie,
        },
        body: JSON.stringify({
          prompt: 'Explain Paxos in three concise bullet points.',
          mode: 'developer',
          conversationId: convId,
        }),
      });

      expect(streamRes.status).toBe(200);
      expect(streamRes.headers.get('content-type')).toContain('text/event-stream');

      // Consume stream text to completion
      const streamBody = await streamRes.text();
      expect(streamBody).toContain('data:');
      expect(streamBody).toContain('[DONE]');

      // Verify PostgreSQL database now has the conversation and both messages
      const dbConv = await getConversation(user.user.id, convId);
      expect(dbConv).not.toBeNull();
      expect(dbConv?.id).toBe(convId);

      const dbMessages = await listMessages(user.user.id, convId);
      expect(dbMessages).toHaveLength(2);
      expect(dbMessages[0].role).toBe('user');
      expect(dbMessages[0].content).toBe('Explain Paxos in three concise bullet points.');
      expect(dbMessages[1].role).toBe('assistant');
      expect(dbMessages[1].content.length).toBeGreaterThan(0);

      // Verify frontend GET /api/conversations/:id/messages returns both messages
      const clientMsgsRes = await fetch(`${baseUrl}/api/conversations/${convId}/messages`, {
        headers: { Cookie: user.cookie },
      });
      expect(clientMsgsRes.status).toBe(200);
      const clientMsgsData = await clientMsgsRes.json();
      expect(clientMsgsData.messages).toHaveLength(2);
      expect(clientMsgsData.messages[0].content).toBe('Explain Paxos in three concise bullet points.');
      expect(clientMsgsData.messages[1].role).toBe('assistant');
    });
  });

  describe('Conversation Actions & PostgreSQL Sync', () => {
    it('synchronizes rename, pin, archive, and delete operations directly with PostgreSQL', async () => {
      const user = await registerUser('actions@aura.ai', 'Actions User');

      // Create conversation
      const createRes = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({
          title: 'Initial Title',
          mode: 'tutor',
        }),
      });
      const { conversation } = await createRes.json();
      const convId = conversation.id;

      // 1. Rename
      const renameRes = await fetch(`${baseUrl}/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ title: 'Refined Title' }),
      });
      expect(renameRes.status).toBe(200);
      const { conversation: renamed } = await renameRes.json();
      expect(renamed.title).toBe('Refined Title');

      // 2. Toggle Pin
      const pinRes = await fetch(`${baseUrl}/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ pinned: true }),
      });
      expect(pinRes.status).toBe(200);
      const { conversation: pinned } = await pinRes.json();
      expect(pinned.pinned).toBe(true);

      // 3. Toggle Archive
      const archiveRes = await fetch(`${baseUrl}/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ archived: true }),
      });
      expect(archiveRes.status).toBe(200);
      const { conversation: archived } = await archiveRes.json();
      expect(archived.archived).toBe(true);

      // 4. Delete
      const deleteRes = await fetch(`${baseUrl}/api/conversations/${convId}`, {
        method: 'DELETE',
        headers: { Cookie: user.cookie },
      });
      expect(deleteRes.status).toBe(200);

      // 5. Verify conversation no longer exists in PostgreSQL
      const getDeleted = await fetch(`${baseUrl}/api/conversations/${convId}`, {
        headers: { Cookie: user.cookie },
      });
      expect(getDeleted.status).toBe(404);
    });
  });

  describe('Multi-User Transition & State Isolation (User A -> Signout -> User B)', () => {
    it('strictly isolates User A and User B state through signout and login cycles', async () => {
      // 1. User A registers and creates a confidential conversation
      const userA = await registerUser('alice@aura.ai', 'Alice');
      const convARes = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
        body: JSON.stringify({ title: "Alice's Quantum Workspace", mode: 'developer' }),
      });
      const { conversation: convA } = await convARes.json();

      await fetch(`${baseUrl}/api/conversations/${convA.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
        body: JSON.stringify({ role: 'user', content: 'Top secret quantum findings.' }),
      });

      // 2. User A signs out
      const signoutRes = await fetch(`${baseUrl}/api/auth/signout`, {
        method: 'POST',
        headers: { Cookie: userA.cookie },
      });
      expect(signoutRes.status).toBe(200);

      // Verify session is invalidated
      const meAfterSignout = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: userA.cookie },
      });
      expect(meAfterSignout.status).toBe(401);

      // 3. User B registers and creates their own conversation
      const userB = await registerUser('bob@aura.ai', 'Bob');
      const convBRes = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userB.cookie },
        body: JSON.stringify({ title: "Bob's Creative Workshop", mode: 'creative' }),
      });
      const { conversation: convB } = await convBRes.json();

      // 4. User B lists conversations -> sees ONLY Conversation B
      const listBRes = await fetch(`${baseUrl}/api/conversations`, {
        headers: { Cookie: userB.cookie },
      });
      expect(listBRes.status).toBe(200);
      const listB = await listBRes.json();
      expect(listB.conversations).toHaveLength(1);
      expect(listB.conversations[0].id).toBe(convB.id);
      expect(listB.conversations[0].title).toBe("Bob's Creative Workshop");

      // 5. User B attempts direct access to Alice's conversation -> 404
      const stealConv = await fetch(`${baseUrl}/api/conversations/${convA.id}`, {
        headers: { Cookie: userB.cookie },
      });
      expect(stealConv.status).toBe(404);

      const stealMsgs = await fetch(`${baseUrl}/api/conversations/${convA.id}/messages`, {
        headers: { Cookie: userB.cookie },
      });
      expect(stealMsgs.status).toBe(404);

      // 6. Alice logs back in with valid credentials
      const aliceLogin = await signInUser('alice@aura.ai');
      const aliceListRes = await fetch(`${baseUrl}/api/conversations`, {
        headers: { Cookie: aliceLogin.cookie },
      });
      expect(aliceListRes.status).toBe(200);
      const aliceList = await aliceListRes.json();
      expect(aliceList.conversations).toHaveLength(1);
      expect(aliceList.conversations[0].id).toBe(convA.id);

      const aliceMsgsRes = await fetch(`${baseUrl}/api/conversations/${convA.id}/messages`, {
        headers: { Cookie: aliceLogin.cookie },
      });
      expect(aliceMsgsRes.status).toBe(200);
      const aliceMsgs = await aliceMsgsRes.json();
      expect(aliceMsgs.messages).toHaveLength(1);
      expect(aliceMsgs.messages[0].content).toBe('Top secret quantum findings.');
    });
  });
});
