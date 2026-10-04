import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { runMigrations } from '../db/migrate';
import { setPool } from '../db/index';
import { app } from '../../server';
import { createConversation, createMessage } from '../db/conversations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AURA AI — Phase 2: Live Admin Metrics + Settings Cloud Sync', () => {
  let memDb: IMemoryDb;
  let pgAdapter: any;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    // 1. Setup in-memory PostgreSQL instance
    memDb = newDb({ noAstCoverageCheck: true });

    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      implementation: () => crypto.randomUUID(),
    });

    const { Pool } = memDb.adapters.createPg();
    pgAdapter = new Pool();

    // 2. Set test db pool
    setPool(pgAdapter);

    // 3. Run all migrations
    const migrationsDir = path.resolve(__dirname, '../db/migrations');
    const migResult = await runMigrations(pgAdapter, migrationsDir);
    expect(migResult.success).toBe(true);

    // 4. Start ephemeral HTTP server
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

  // Helper to register and sign in a user
  async function registerUser(email: string, displayName: string = 'Test User') {
    const res = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'ValidSecurePassword123!',
        displayName,
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    const setCookie = res.headers.get('set-cookie') || '';
    const cookie = setCookie.split(';')[0];
    return { user: data.user, cookie };
  }

  // Helper to grant ADMIN role
  async function grantAdmin(userId: string) {
    await pgAdapter.query(
      `INSERT INTO admin_roles (user_id, role)
       VALUES ($1, 'ADMIN')
       ON CONFLICT (user_id, role) DO NOTHING;`,
      [userId]
    );
  }

  describe('Part 1: Settings Cloud Sync & Validation', () => {
    it('returns 401 Unauthorized for unauthenticated GET /api/settings', async () => {
      const res = await fetch(`${baseUrl}/api/settings`);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Authentication required');
    });

    it('returns 401 Unauthorized for unauthenticated PATCH /api/settings', async () => {
      const res = await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark' }),
      });
      expect(res.status).toBe(401);
    });

    it('retrieves default cloud settings for an authenticated user on GET /api/settings', async () => {
      const user = await registerUser('user1@aura.ai', 'User One');

      const res = await fetch(`${baseUrl}/api/settings`, {
        headers: { Cookie: user.cookie },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.settings).toBeDefined();
      expect(data.settings.theme).toBeDefined();
      expect(data.settings.defaultMode).toBe('developer');
      expect(data.settings.model).toBe('gemini-2.5-flash');
      expect(typeof data.settings.temperature).toBe('number');
      expect(data.settings.saveHistory).toBe(true);
      expect(data.settings.autoTitle).toBe(true);
      expect(data.settings.streamResponses).toBe(true);
      expect(data.settings.soundEffects).toBe(false);
    });

    it('partially updates settings and preserves unspecified fields on PATCH /api/settings', async () => {
      const user = await registerUser('user2@aura.ai', 'User Two');

      // 1. Update only theme to 'light'
      const patchRes1 = await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ theme: 'light' }),
      });
      expect(patchRes1.status).toBe(200);
      const data1 = await patchRes1.json();
      expect(data1.settings.theme).toBe('light');
      expect(data1.settings.defaultMode).toBe('developer'); // Preserved!
      expect(data1.settings.model).toBe('gemini-2.5-flash'); // Preserved!

      // 2. Update model and temperature
      const patchRes2 = await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ model: 'gemini-2.5-pro', temperature: 1.2 }),
      });
      expect(patchRes2.status).toBe(200);
      const data2 = await patchRes2.json();
      expect(data2.settings.theme).toBe('light'); // Preserved!
      expect(data2.settings.model).toBe('gemini-2.5-pro');
      expect(data2.settings.temperature).toBe(1.2);

      // 3. Verify persistence via GET /api/settings
      const getRes = await fetch(`${baseUrl}/api/settings`, {
        headers: { Cookie: user.cookie },
      });
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.settings.theme).toBe('light');
      expect(getData.settings.model).toBe('gemini-2.5-pro');
      expect(getData.settings.temperature).toBe(1.2);
    });

    it('validates settings inputs server-side and rejects invalid values with 400 Bad Request', async () => {
      const user = await registerUser('user3@aura.ai', 'User Three');

      // Invalid theme
      const resTheme = await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ theme: 'neon-cyberpunk' }),
      });
      expect(resTheme.status).toBe(400);
      const themeData = await resTheme.json();
      expect(themeData.error).toContain('Invalid theme');

      // Invalid persona mode
      const resMode = await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ defaultMode: 'pirate-mode' }),
      });
      expect(resMode.status).toBe(400);
      const modeData = await resMode.json();
      expect(modeData.error).toContain('Invalid default mode');

      // Invalid model
      const resModel = await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ model: 'unsupported-gpt-5' }),
      });
      expect(resModel.status).toBe(400);
      const modelData = await resModel.json();
      expect(modelData.error).toContain('Invalid model');

      // Invalid temperature out of bounds (< 0.0 or > 2.0)
      const resTempLow = await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ temperature: -0.5 }),
      });
      expect(resTempLow.status).toBe(400);

      const resTempHigh = await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ temperature: 3.5 }),
      });
      expect(resTempHigh.status).toBe(400);

      // Invalid boolean type
      const resBool = await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: user.cookie },
        body: JSON.stringify({ saveHistory: 'yes' }),
      });
      expect(resBool.status).toBe(400);
    });

    it('strictly isolates settings between User A and User B and ignores client-supplied userId', async () => {
      const userA = await registerUser('usera@aura.ai', 'User A');
      const userB = await registerUser('userb@aura.ai', 'User B');

      // User A customizes settings
      await fetch(`${baseUrl}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: userA.cookie },
        body: JSON.stringify({
          theme: 'light',
          defaultMode: 'creative',
          temperature: 0.95,
          userId: userB.user.id, // Attacking: attempting to spoof userId to mutate User B's settings
        }),
      });

      // Verify User A's settings were updated
      const resA = await fetch(`${baseUrl}/api/settings`, {
        headers: { Cookie: userA.cookie },
      });
      const dataA = await resA.json();
      expect(dataA.settings.theme).toBe('light');
      expect(dataA.settings.defaultMode).toBe('creative');
      expect(dataA.settings.temperature).toBe(0.95);

      // Verify User B's settings were NOT mutated by User A
      const resB = await fetch(`${baseUrl}/api/settings`, {
        headers: { Cookie: userB.cookie },
      });
      const dataB = await resB.json();
      expect(dataB.settings.theme).toBe('dark'); // Default DB theme
      expect(dataB.settings.defaultMode).toBe('developer');
      expect(dataB.settings.temperature).toBe(0.7);
    });
  });

  describe('Part 2: Live PostgreSQL-Backed Admin Metrics', () => {
    it('returns 401 Unauthorized when an anonymous client requests /api/admin/metrics', async () => {
      const res = await fetch(`${baseUrl}/api/admin/metrics`);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Authentication required');
    });

    it('returns 403 Forbidden when an ordinary USER requests /api/admin/metrics and ignores role spoofing', async () => {
      const normalUser = await registerUser('normaluser@aura.ai', 'Regular User');

      // 1. Direct GET request with normal cookie
      const res1 = await fetch(`${baseUrl}/api/admin/metrics`, {
        headers: { Cookie: normalUser.cookie },
      });
      expect(res1.status).toBe(403);
      const data1 = await res1.json();
      expect(data1.error).toContain('Forbidden');

      // 2. Spoofed headers
      const res2 = await fetch(`${baseUrl}/api/admin/metrics`, {
        headers: {
          Cookie: normalUser.cookie,
          'X-Role': 'ADMIN',
          'x-admin': 'true',
        },
      });
      expect(res2.status).toBe(403);
    });

    it('returns real, aggregated PostgreSQL metrics when an authenticated ADMIN requests /api/admin/metrics', async () => {
      // 1. Create Admin User
      const adminUser = await registerUser('admin@aura.ai', 'Super Admin');
      await grantAdmin(adminUser.user.id);

      // 2. Create second user and add conversations & messages in different modes
      const member = await registerUser('member@aura.ai', 'Member User');
      
      const conv1 = await createConversation(member.user.id, {
        title: 'Python Architecture',
        mode: 'developer',
      });
      await createMessage(member.user.id, conv1.id, {
        role: 'user',
        content: 'How do we design a worker pool?',
        mode: 'developer',
      });
      await createMessage(member.user.id, conv1.id, {
        role: 'assistant',
        content: 'Use an asyncio bounded queue.',
        mode: 'developer',
      });

      const conv2 = await createConversation(member.user.id, {
        title: 'Poetry Exploration',
        mode: 'creative',
      });
      await createMessage(member.user.id, conv2.id, {
        role: 'user',
        content: 'Write a poem on quiet clarity.',
        mode: 'creative',
      });

      // 3. Fetch metrics as ADMIN
      const res = await fetch(`${baseUrl}/api/admin/metrics`, {
        headers: { Cookie: adminUser.cookie },
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.metrics).toBeDefined();

      const m = data.metrics;
      // Total users in database = adminUser + member = 2
      expect(m.totalUsers).toBe(2);
      // Total admins = 1
      expect(m.totalAdmins).toBe(1);
      // Total conversations = conv1 + conv2 = 2
      expect(m.totalConversations).toBe(2);
      // Total messages = 3
      expect(m.totalMessages).toBe(3);
      // Active sessions = at least 2
      expect(m.activeSessions).toBeGreaterThanOrEqual(2);
      // Recent messages in last 24h = 3
      expect(m.recentMessages24h).toBe(3);

      // Persona distribution
      expect(m.personaDistribution).toBeInstanceOf(Array);
      const devMode = m.personaDistribution.find((p: any) => p.mode === 'developer');
      const creativeMode = m.personaDistribution.find((p: any) => p.mode === 'creative');
      expect(devMode?.count).toBe(1);
      expect(creativeMode?.count).toBe(1);

      // User Directory contains non-leaking records
      expect(m.userDirectory).toBeInstanceOf(Array);
      expect(m.userDirectory.length).toBe(2);
      const memberEntry = m.userDirectory.find((u: any) => u.email === 'member@aura.ai');
      expect(memberEntry).toBeDefined();
      expect(memberEntry.conversationCount).toBe(2);
      expect(memberEntry.role).toBe('USER');
      expect(memberEntry.password_hash).toBeUndefined(); // Zero sensitive credentials exposed
      expect(memberEntry.token_hash).toBeUndefined();
    });
  });
});
