import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { runMigrations } from '../db/migrate';
import { setPool } from '../db/index';
import { app } from '../../server';
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  listMessages,
  createMessage,
} from '../db/conversations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AURA V2 — Phase 5: Conversation & Message Persistence', () => {
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

    // 4. Start HTTP server
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

  describe('Authentication Boundary & Unauthenticated Access', () => {
    it('returns 401 Unauthorized for all conversation and message endpoints when anonymous', async () => {
      const convId = crypto.randomUUID();

      // 1. List conversations
      const listRes = await fetch(`${baseUrl}/api/conversations`);
      expect(listRes.status).toBe(401);

      // 2. Create conversation
      const createRes = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Conv' }),
      });
      expect(createRes.status).toBe(401);

      // 3. Get single conversation
      const getRes = await fetch(`${baseUrl}/api/conversations/${convId}`);
      expect(getRes.status).toBe(401);

      // 4. Update conversation
      const patchRes = await fetch(`${baseUrl}/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title' }),
      });
      expect(patchRes.status).toBe(401);

      // 5. Delete conversation
      const delRes = await fetch(`${baseUrl}/api/conversations/${convId}`, {
        method: 'DELETE',
      });
      expect(delRes.status).toBe(401);

      // 6. List messages
      const msgsRes = await fetch(`${baseUrl}/api/conversations/${convId}/messages`);
      expect(msgsRes.status).toBe(401);

      // 7. Create message
      const postMsgRes = await fetch(`${baseUrl}/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: 'hello' }),
      });
      expect(postMsgRes.status).toBe(401);
    });
  });

  describe('Authenticated Conversation CRUD', () => {
    it('creates, reads, updates, and deletes conversations for an authenticated user', async () => {
      const { cookie, user } = await registerUser('owner@aura.ai', 'Conversation Owner');

      // 1. Create a conversation
      const createRes = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          title: 'Quantum Architecture Analysis',
          mode: 'developer',
          pinned: false,
        }),
      });

      expect(createRes.status).toBe(201);
      const { conversation: created } = await createRes.json();
      expect(created.id).toBeDefined();
      expect(created.title).toBe('Quantum Architecture Analysis');
      expect(created.mode).toBe('developer');
      expect(created.userId).toBe(user.id);
      expect(created.pinned).toBe(false);

      // 2. List conversations
      const listRes = await fetch(`${baseUrl}/api/conversations`, {
        headers: { Cookie: cookie },
      });
      expect(listRes.status).toBe(200);
      const { conversations } = await listRes.json();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe(created.id);

      // 3. Get single conversation
      const getRes = await fetch(`${baseUrl}/api/conversations/${created.id}`, {
        headers: { Cookie: cookie },
      });
      expect(getRes.status).toBe(200);
      const { conversation: retrieved } = await getRes.json();
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe('Quantum Architecture Analysis');

      // 4. Update conversation (patch title and pinned)
      const patchRes = await fetch(`${baseUrl}/api/conversations/${created.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          title: 'Updated Quantum Architecture',
          pinned: true,
        }),
      });
      expect(patchRes.status).toBe(200);
      const { conversation: updated } = await patchRes.json();
      expect(updated.title).toBe('Updated Quantum Architecture');
      expect(updated.pinned).toBe(true);

      // 5. Delete conversation
      const delRes = await fetch(`${baseUrl}/api/conversations/${created.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      });
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();
      expect(delData.ok).toBe(true);

      // 6. Verify it is no longer listed
      const verifyList = await fetch(`${baseUrl}/api/conversations`, {
        headers: { Cookie: cookie },
      });
      const { conversations: emptyList } = await verifyList.json();
      expect(emptyList).toHaveLength(0);
    });
  });

  describe('Message Persistence and Cascade Deletion', () => {
    it('appends messages chronologically and cascades deletion with the parent conversation', async () => {
      const { cookie } = await registerUser('author@aura.ai', 'Message Author');

      // 1. Create conversation
      const convRes = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ title: 'AI Ethics Discussion', mode: 'tutor' }),
      });
      const { conversation } = await convRes.json();

      // 2. Add user message
      const msg1Res = await fetch(`${baseUrl}/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          role: 'user',
          content: 'What are the core principles of AI alignment?',
          mode: 'tutor',
        }),
      });
      expect(msg1Res.status).toBe(201);
      const { message: msg1 } = await msg1Res.json();
      expect(msg1.content).toBe('What are the core principles of AI alignment?');

      // 3. Add assistant message
      const msg2Res = await fetch(`${baseUrl}/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          role: 'assistant',
          content: 'The core principles include helpfulness, honesty, and harmlessness (HHH).',
          mode: 'tutor',
          model: 'gemini-2.5-flash',
        }),
      });
      expect(msg2Res.status).toBe(201);

      // 4. Retrieve message list
      const listMsgsRes = await fetch(`${baseUrl}/api/conversations/${conversation.id}/messages`, {
        headers: { Cookie: cookie },
      });
      expect(listMsgsRes.status).toBe(200);
      const { messages } = await listMsgsRes.json();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');

      // 5. Delete conversation and verify messages are gone
      await fetch(`${baseUrl}/api/conversations/${conversation.id}`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      });

      // Querying deleted conversation messages returns 404
      const afterDelMsgs = await fetch(`${baseUrl}/api/conversations/${conversation.id}/messages`, {
        headers: { Cookie: cookie },
      });
      expect(afterDelMsgs.status).toBe(404);
    });
  });

  describe('Multi-User Ownership & Cross-User Security Isolation', () => {
    it('strictly isolates conversations and messages between User A and User B', async () => {
      // 1. Setup User A with a conversation and message
      const userA = await registerUser('usera@aura.ai', 'User A');
      const convARes = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
        body: JSON.stringify({ title: "User A's Secret Strategy", mode: 'professional' }),
      });
      const { conversation: convA } = await convARes.json();

      await fetch(`${baseUrl}/api/conversations/${convA.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
        body: JSON.stringify({ role: 'user', content: 'Confidential strategy notes.' }),
      });

      // 2. Setup User B with their own conversation
      const userB = await registerUser('userb@aura.ai', 'User B');
      const convBRes = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userB.cookie },
        body: JSON.stringify({ title: "User B's Public Project", mode: 'creative' }),
      });
      const { conversation: convB } = await convBRes.json();

      // 3. User A lists conversations -> sees only Conversation A
      const listA = await (await fetch(`${baseUrl}/api/conversations`, { headers: { Cookie: userA.cookie } })).json();
      expect(listA.conversations.map((c: any) => c.id)).toEqual([convA.id]);

      // 4. User B lists conversations -> sees only Conversation B
      const listB = await (await fetch(`${baseUrl}/api/conversations`, { headers: { Cookie: userB.cookie } })).json();
      expect(listB.conversations.map((c: any) => c.id)).toEqual([convB.id]);

      // 5. User B attempts direct GET on User A's conversation -> 404
      const stealGet = await fetch(`${baseUrl}/api/conversations/${convA.id}`, {
        headers: { Cookie: userB.cookie },
      });
      expect(stealGet.status).toBe(404);

      // 6. User B attempts to read User A's messages -> 404
      const stealMsgs = await fetch(`${baseUrl}/api/conversations/${convA.id}/messages`, {
        headers: { Cookie: userB.cookie },
      });
      expect(stealMsgs.status).toBe(404);

      // 7. User B attempts to modify User A's conversation -> 404
      const stealPatch = await fetch(`${baseUrl}/api/conversations/${convA.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: userB.cookie },
        body: JSON.stringify({ title: 'Hijacked Title' }),
      });
      expect(stealPatch.status).toBe(404);

      // 8. User B attempts to delete User A's conversation -> 404
      const stealDel = await fetch(`${baseUrl}/api/conversations/${convA.id}`, {
        method: 'DELETE',
        headers: { Cookie: userB.cookie },
      });
      expect(stealDel.status).toBe(404);

      // 9. User B attempts to inject a message into User A's conversation -> 404
      const injectMsg = await fetch(`${baseUrl}/api/conversations/${convA.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userB.cookie },
        body: JSON.stringify({ role: 'user', content: 'Injected message!' }),
      });
      expect(injectMsg.status).toBe(404);

      // 10. Verify User A's conversation and messages remain uncorrupted
      const verifyA = await (
        await fetch(`${baseUrl}/api/conversations/${convA.id}/messages`, {
          headers: { Cookie: userA.cookie },
        })
      ).json();
      expect(verifyA.messages).toHaveLength(1);
      expect(verifyA.messages[0].content).toBe('Confidential strategy notes.');
    });
  });

  describe('Privilege & ID Spoofing Prevention', () => {
    it('ignores client-supplied userId in conversation creation and prevents ownership transfer', async () => {
      const userA = await registerUser('target@aura.ai', 'Target User');
      const userB = await registerUser('attacker@aura.ai', 'Attacker User');

      // User B tries to create conversation pretending to be User A
      const spoofCreate = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: userB.cookie },
        body: JSON.stringify({
          userId: userA.user.id, // spoof attempt
          title: 'Spoofed Owner Conversation',
          mode: 'developer',
        }),
      });

      expect(spoofCreate.status).toBe(201);
      const { conversation: spoofed } = await spoofCreate.json();
      // Server must have assigned ownership to User B (the verified session owner), NOT User A
      expect(spoofed.userId).toBe(userB.user.id);
      expect(spoofed.userId).not.toBe(userA.user.id);

      // User B tries to transfer their conversation to User A via PATCH
      const transferPatch = await fetch(`${baseUrl}/api/conversations/${spoofed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: userB.cookie },
        body: JSON.stringify({
          userId: userA.user.id, // transfer attempt
        }),
      });
      expect(transferPatch.status).toBe(200);

      // Verify conversation is still owned by User B in the database
      const checkConv = await getConversation(userB.user.id, spoofed.id);
      expect(checkConv).not.toBeNull();
      expect(checkConv?.userId).toBe(userB.user.id);

      const checkA = await getConversation(userA.user.id, spoofed.id);
      expect(checkA).toBeNull();
    });

    it('rejects malformed UUIDs with 400 Bad Request without crashing', async () => {
      const { cookie } = await registerUser('uuidtest@aura.ai', 'UUID Tester');

      const badGet = await fetch(`${baseUrl}/api/conversations/invalid-uuid-format`, {
        headers: { Cookie: cookie },
      });
      expect(badGet.status).toBe(400);
      const body = await badGet.json();
      expect(body.error).toContain('Invalid conversation ID');

      const badPatch = await fetch(`${baseUrl}/api/conversations/not-a-uuid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ title: 'Test' }),
      });
      expect(badPatch.status).toBe(400);
    });
  });

  describe('Chat API & SSE Streaming Persistence Integration', () => {
    it('persists user message and assistant reply during non-streaming POST /api/chat', async () => {
      const { cookie, user } = await registerUser('chatpersist@aura.ai', 'Chat Persister');
      const convId = crypto.randomUUID();

      // Create conversation first
      await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ id: convId, title: 'Chat Persistence Test', mode: 'developer' }),
      });

      // Call /api/chat
      const chatRes = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          prompt: 'Demonstrate deterministic state machines.',
          mode: 'developer',
          conversationId: convId,
        }),
      });

      expect(chatRes.status).toBe(200);
      const chatData = await chatRes.json();
      expect(chatData.text).toBeDefined();

      // Verify both user message and assistant message are persisted in DB
      const messagesRes = await fetch(`${baseUrl}/api/conversations/${convId}/messages`, {
        headers: { Cookie: cookie },
      });
      expect(messagesRes.status).toBe(200);
      const { messages } = await messagesRes.json();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Demonstrate deterministic state machines.');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toBe(chatData.text);
    });

    it('persists user message and completed assistant reply during streaming POST /api/chat/stream', async () => {
      const { cookie } = await registerUser('streampersist@aura.ai', 'Stream Persister');
      const convId = crypto.randomUUID();

      // Call /api/chat/stream
      const streamRes = await fetch(`${baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          prompt: 'Explain concurrent worker pools.',
          mode: 'developer',
          conversationId: convId,
        }),
      });

      expect(streamRes.status).toBe(200);
      expect(streamRes.headers.get('content-type')).toContain('text/event-stream');

      // Consume stream
      const streamText = await streamRes.text();
      expect(streamText).toContain('data: [DONE]');

      // Verify both messages were saved to the database
      const messagesRes = await fetch(`${baseUrl}/api/conversations/${convId}/messages`, {
        headers: { Cookie: cookie },
      });
      expect(messagesRes.status).toBe(200);
      const { messages } = await messagesRes.json();
      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Explain concurrent worker pools.');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content.length).toBeGreaterThan(0);
    });

    it('allows anonymous chat requests without throwing persistence errors', async () => {
      const anonRes = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Anonymous prompt without session.',
          mode: 'developer',
        }),
      });

      expect(anonRes.status).toBe(200);
      const anonData = await anonRes.json();
      expect(anonData.text).toBeDefined();
    });
  });
});
