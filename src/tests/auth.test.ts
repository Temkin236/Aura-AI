import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { runMigrations } from '../db/migrate';
import { setPool } from '../db/index';
import { app } from '../../server';
import { verifyPassword } from '../auth/service';

import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AURA V2 — Phase 3: Real Authentication', () => {
  let memDb: IMemoryDb;
  let pgAdapter: any;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    // 1. Setup in-memory PostgreSQL emulator
    memDb = newDb({ noAstCoverageCheck: true });

    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      implementation: () => crypto.randomUUID(),
    });

    const { Pool } = memDb.adapters.createPg();
    pgAdapter = new Pool();

    // 2. Point db pool to the test database
    setPool(pgAdapter);

    // 3. Run all migrations (including 001_initial_schema and 002_sessions)
    const migrationsDir = path.resolve(__dirname, '../db/migrations');
    const migResult = await runMigrations(pgAdapter, migrationsDir);
    expect(migResult.success).toBe(true);

    // 4. Start HTTP server on an ephemeral port
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

  describe('Signup Endpoint (POST /api/auth/signup)', () => {
    it('successfully registers a user with valid email, password, and displayName', async () => {
      const res = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'TestUser@example.com',
          password: 'Password123!',
          displayName: 'Ada Lovelace',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();

      // Safe user object verification
      expect(data.user).toBeDefined();
      expect(data.user.id).toBeDefined();
      expect(data.user.email).toBe('testuser@example.com'); // Normalized
      expect(data.user.profile.displayName).toBe('Ada Lovelace');
      expect((data.user as any).password_hash).toBeUndefined();
      expect((data.user as any).password).toBeUndefined();

      // Check cookie was set
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('aura_session=');
      expect(setCookie).toContain('HttpOnly');

      // Verify database state: password must be hashed, never plaintext
      const userInDb = await pgAdapter.query('SELECT * FROM users WHERE email = $1;', [
        'testuser@example.com',
      ]);
      expect(userInDb.rows.length).toBe(1);
      const dbRow = userInDb.rows[0];
      expect(dbRow.password_hash).not.toBe('Password123!');
      expect(dbRow.password_hash.startsWith('$2')).toBe(true);
      expect(await verifyPassword('Password123!', dbRow.password_hash)).toBe(true);

      // Verify profile and settings were created in DB
      const profileInDb = await pgAdapter.query('SELECT * FROM profiles WHERE user_id = $1;', [
        dbRow.id,
      ]);
      expect(profileInDb.rows.length).toBe(1);
      expect(profileInDb.rows[0].display_name).toBe('Ada Lovelace');

      const settingsInDb = await pgAdapter.query('SELECT * FROM settings WHERE user_id = $1;', [
        dbRow.id,
      ]);
      expect(settingsInDb.rows.length).toBe(1);
    });

    it('rejects invalid email formats', async () => {
      const res = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'not-an-email',
          password: 'Password123!',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('valid email');
    });

    it('rejects passwords shorter than 8 characters', async () => {
      const res = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'valid@example.com',
          password: 'short',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('8 characters');
    });

    it('safely handles duplicate account registration without leaking sensitive info', async () => {
      // First signup
      const res1 = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'Password123!',
        }),
      });
      expect(res1.status).toBe(201);

      // Duplicate signup attempt
      const res2 = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'duplicate@example.com',
          password: 'AnotherPassword456!',
        }),
      });

      expect(res2.status).toBe(409);
      const data2 = await res2.json();
      expect(data2.error).toContain('already exists');
    });
  });

  describe('Signin Endpoint (POST /api/auth/signin)', () => {
    beforeEach(async () => {
      // Pre-register a user
      await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'member@example.com',
          password: 'CorrectPassword123!',
          displayName: 'Aura Member',
        }),
      });
    });

    it('authenticates valid credentials, sets session cookie, and returns safe user', async () => {
      const res = await fetch(`${baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'member@example.com',
          password: 'CorrectPassword123!',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('member@example.com');
      expect(data.user.profile.displayName).toBe('Aura Member');
      expect((data.user as any).password_hash).toBeUndefined();

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain('aura_session=');
    });

    it('rejects incorrect password with generic error without enumeration', async () => {
      const res = await fetch(`${baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'member@example.com',
          password: 'WrongPassword999!',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid email or password.');
    });

    it('rejects non-existent email with identical generic error without enumeration', async () => {
      const res = await fetch(`${baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ghost@example.com',
          password: 'SomePassword123!',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Invalid email or password.');
    });

    it('rejects missing or empty credentials with 400', async () => {
      const res = await fetch(`${baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '' }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Current User Endpoint (GET /api/auth/me)', () => {
    let sessionCookie: string;

    beforeEach(async () => {
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'session_test@example.com',
          password: 'ValidPassword123!',
          displayName: 'Session Explorer',
        }),
      });
      const cookieHeader = signupRes.headers.get('set-cookie');
      sessionCookie = cookieHeader ? cookieHeader.split(';')[0] : '';
    });

    it('returns 200 and safe user for valid session cookie', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Cookie: sessionCookie,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('session_test@example.com');
      expect(data.user.profile.displayName).toBe('Session Explorer');
      expect((data.user as any).password_hash).toBeUndefined();
    });

    it('returns 401 when no session cookie is provided', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Authentication required');
    });

    it('returns 401 when an invalid session cookie is provided', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Cookie: 'aura_session=fake_invalid_session_token_1234567890',
        },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('Signout Endpoint (POST /api/auth/signout)', () => {
    let sessionCookie: string;

    beforeEach(async () => {
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'signout_test@example.com',
          password: 'ValidPassword123!',
        }),
      });
      const cookieHeader = signupRes.headers.get('set-cookie');
      sessionCookie = cookieHeader ? cookieHeader.split(';')[0] : '';
    });

    it('invalidates server-side session in database and clears cookie', async () => {
      // Confirm authenticated before signout
      const meBefore = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: sessionCookie },
      });
      expect(meBefore.status).toBe(200);

      // Perform signout
      const signoutRes = await fetch(`${baseUrl}/api/auth/signout`, {
        method: 'POST',
        headers: { Cookie: sessionCookie },
      });
      expect(signoutRes.status).toBe(200);

      // Verify cookie cleared
      const setCookie = signoutRes.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();

      // Subsequent /me request with old session must be rejected with 401
      const meAfter = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: sessionCookie },
      });
      expect(meAfter.status).toBe(401);
    });
  });

  describe('Multi-User Security & Session Isolation', () => {
    it('strictly isolates sessions and correctly distinguishes User A from User B', async () => {
      // 1. Register User A
      const resA = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user_a@example.com',
          password: 'PasswordA123!',
          displayName: 'User Alpha',
        }),
      });
      const cookieA = resA.headers.get('set-cookie')!.split(';')[0];
      const dataA = await resA.json();

      // 2. Register User B
      const resB = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user_b@example.com',
          password: 'PasswordB123!',
          displayName: 'User Beta',
        }),
      });
      const cookieB = resB.headers.get('set-cookie')!.split(';')[0];
      const dataB = await resB.json();

      expect(cookieA).not.toBe(cookieB);
      expect(dataA.user.id).not.toBe(dataB.user.id);

      // 3. User A queries /me with Cookie A
      const checkA = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieA },
      });
      const bodyA = await checkA.json();
      expect(bodyA.user.id).toBe(dataA.user.id);
      expect(bodyA.user.email).toBe('user_a@example.com');
      expect(bodyA.user.profile.displayName).toBe('User Alpha');

      // 4. User B queries /me with Cookie B
      const checkB = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieB },
      });
      const bodyB = await checkB.json();
      expect(bodyB.user.id).toBe(dataB.user.id);
      expect(bodyB.user.email).toBe('user_b@example.com');
      expect(bodyB.user.profile.displayName).toBe('User Beta');

      // 5. User A signs out — User B's session must remain active
      await fetch(`${baseUrl}/api/auth/signout`, {
        method: 'POST',
        headers: { Cookie: cookieA },
      });

      const checkAAfter = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieA },
      });
      expect(checkAAfter.status).toBe(401);

      const checkBAfter = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: cookieB },
      });
      expect(checkBAfter.status).toBe(200);
      const stillActiveB = await checkBAfter.json();
      expect(stillActiveB.user.email).toBe('user_b@example.com');
    });
  });

  describe('Security Guarantees & Protected Middleware', () => {
    it('guarantees password_hash is never exposed in any auth response', async () => {
      // Test signup response
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'leak_test@example.com',
          password: 'SecretPassword999!',
        }),
      });
      expect(signupRes.status).toBe(201);
      const signupBody = await signupRes.text();
      expect(signupBody).not.toContain('password_hash');
      expect(signupBody).not.toContain('SecretPassword999!');

      const cookie = signupRes.headers.get('set-cookie')!.split(';')[0];

      // Test signin response
      const signinRes = await fetch(`${baseUrl}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'leak_test@example.com',
          password: 'SecretPassword999!',
        }),
      });
      expect(signinRes.status).toBe(200);
      const signinBody = await signinRes.text();
      expect(signinBody).not.toContain('password_hash');
      expect(signinBody).not.toContain('SecretPassword999!');

      // Test me response
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: cookie },
      });
      const meBody = await meRes.text();
      expect(meBody).not.toContain('password_hash');
      expect(meBody).not.toContain('SecretPassword999!');
    });
  });
});

