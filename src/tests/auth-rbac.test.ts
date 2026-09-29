import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { runMigrations } from '../db/migrate';
import { setPool } from '../db/index';
import { app } from '../../server';
import { hasRole, getUserRole } from '../auth/service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AURA V2 — Phase 4: Server-Side Authorization & RBAC', () => {
  let memDb: IMemoryDb;
  let pgAdapter: any;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    // 1. Setup in-memory PostgreSQL instance with uuid generator
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

    // 3. Run all migrations (001_initial_schema and 002_sessions)
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

  describe('Authorization Boundary (401 vs 403 vs 200)', () => {
    it('returns 401 Unauthorized when an anonymous user accesses protected admin endpoint', async () => {
      const res = await fetch(`${baseUrl}/api/admin/status`);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(body.error).toContain('Authentication required');
      // No internal details leaked
      expect(JSON.stringify(body)).not.toContain('password');
      expect(JSON.stringify(body)).not.toContain('token');
    });

    it('returns 403 Forbidden when an authenticated normal USER accesses protected admin endpoint', async () => {
      // 1. Register normal user
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'regular_user@example.com',
          password: 'Password123!',
          displayName: 'Regular User',
        }),
      });
      expect(signupRes.status).toBe(201);
      const userCookie = signupRes.headers.get('set-cookie')!.split(';')[0];

      // 2. Attempt admin access with normal user session
      const adminRes = await fetch(`${baseUrl}/api/admin/status`, {
        headers: { Cookie: userCookie },
      });

      expect(adminRes.status).toBe(403);
      const body = await adminRes.json();
      expect(body.error).toBeDefined();
      expect(body.error).toContain('Forbidden');
      expect(body.admin).toBeUndefined();
    });

    it('returns 200 OK when an authenticated ADMIN accesses protected admin endpoint', async () => {
      // 1. Register user
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin_user@example.com',
          password: 'AdminPassword123!',
          displayName: 'System Admin',
        }),
      });
      expect(signupRes.status).toBe(201);
      const signupData = await signupRes.json();
      const adminCookie = signupRes.headers.get('set-cookie')!.split(';')[0];
      const adminId = signupData.user.id;

      // 2. Grant ADMIN role in database (legitimate server-side operation)
      await pgAdapter.query(
        `INSERT INTO admin_roles (user_id, role) VALUES ($1, 'ADMIN');`,
        [adminId]
      );

      // 3. Request admin endpoint
      const adminRes = await fetch(`${baseUrl}/api/admin/status`, {
        headers: { Cookie: adminCookie },
      });

      expect(adminRes.status).toBe(200);
      const body = await adminRes.json();
      expect(body.ok).toBe(true);
      expect(body.admin).toBe(true);
      expect(body.user.id).toBe(adminId);
      expect(body.user.email).toBe('admin_user@example.com');
    });
  });

  describe('Privilege Escalation & Client Role Spoofing Prevention', () => {
    it('prevents privilege escalation during signup when client passes role: ADMIN', async () => {
      // Malicious signup attempt with role: "ADMIN" in body
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'hacker@example.com',
          password: 'Password123!',
          displayName: 'Hacker',
          role: 'ADMIN',
          isAdmin: true,
        }),
      });

      expect(signupRes.status).toBe(201);
      const data = await signupRes.json();
      const cookie = signupRes.headers.get('set-cookie')!.split(';')[0];

      // User must be standard 'USER' role
      expect(data.user.role).toBe('USER');

      // Admin endpoint must reject with 403 Forbidden
      const adminRes = await fetch(`${baseUrl}/api/admin/status`, {
        headers: { Cookie: cookie },
      });
      expect(adminRes.status).toBe(403);
    });

    it('ignores client-sent role headers or body tampering on admin requests', async () => {
      // 1. Register regular user
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'tamper_test@example.com',
          password: 'Password123!',
        }),
      });
      const cookie = signupRes.headers.get('set-cookie')!.split(';')[0];

      // 2. Attempt role spoofing via request headers and query parameters
      const spoofRes = await fetch(`${baseUrl}/api/admin/status?role=ADMIN&isAdmin=true`, {
        headers: {
          Cookie: cookie,
          'X-User-Role': 'ADMIN',
          'X-Admin': 'true',
          'Role': 'ADMIN',
        },
      });

      expect(spoofRes.status).toBe(403);
    });
  });

  describe('Multi-User Role Isolation', () => {
    it('strictly isolates roles between User A (Admin) and User B (Normal User)', async () => {
      // 1. Create User A (Admin)
      const resA = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin_alpha@example.com',
          password: 'PasswordAlpha123!',
          displayName: 'Alpha Admin',
        }),
      });
      const dataA = await resA.json();
      const cookieA = resA.headers.get('set-cookie')!.split(';')[0];
      await pgAdapter.query(
        `INSERT INTO admin_roles (user_id, role) VALUES ($1, 'ADMIN');`,
        [dataA.user.id]
      );

      // 2. Create User B (Normal User)
      const resB = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user_beta@example.com',
          password: 'PasswordBeta123!',
          displayName: 'Beta User',
        }),
      });
      const cookieB = resB.headers.get('set-cookie')!.split(';')[0];

      // 3. User A accessing admin endpoint succeeds
      const checkAdminA = await fetch(`${baseUrl}/api/admin/status`, {
        headers: { Cookie: cookieA },
      });
      expect(checkAdminA.status).toBe(200);

      // 4. User B accessing admin endpoint fails with 403
      const checkAdminB = await fetch(`${baseUrl}/api/admin/status`, {
        headers: { Cookie: cookieB },
      });
      expect(checkAdminB.status).toBe(403);
    });
  });

  describe('Dynamic Role Revocation and Promotion (Freshness)', () => {
    it('immediately revokes admin access on subsequent request when ADMIN role is removed from database', async () => {
      // 1. Setup Admin user
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'revocation_test@example.com',
          password: 'Password123!',
        }),
      });
      const data = await signupRes.json();
      const cookie = signupRes.headers.get('set-cookie')!.split(';')[0];
      const userId = data.user.id;

      // Grant ADMIN role
      await pgAdapter.query(
        `INSERT INTO admin_roles (user_id, role) VALUES ($1, 'ADMIN');`,
        [userId]
      );

      // Confirm admin access works initially
      const initialRes = await fetch(`${baseUrl}/api/admin/status`, {
        headers: { Cookie: cookie },
      });
      expect(initialRes.status).toBe(200);

      // 2. Revoke ADMIN role in database
      await pgAdapter.query(
        `DELETE FROM admin_roles WHERE user_id = $1 AND role = 'ADMIN';`,
        [userId]
      );

      // 3. Next request with the same session token MUST be immediately rejected with 403
      const revokedRes = await fetch(`${baseUrl}/api/admin/status`, {
        headers: { Cookie: cookie },
      });
      expect(revokedRes.status).toBe(403);
    });

    it('immediately authorizes user on subsequent request when ADMIN role is granted in database', async () => {
      // 1. Setup normal user
      const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'promotion_test@example.com',
          password: 'Password123!',
        }),
      });
      const data = await signupRes.json();
      const cookie = signupRes.headers.get('set-cookie')!.split(';')[0];
      const userId = data.user.id;

      // Access denied initially
      const initialRes = await fetch(`${baseUrl}/api/admin/status`, {
        headers: { Cookie: cookie },
      });
      expect(initialRes.status).toBe(403);

      // 2. Legitimate server-side promotion
      await pgAdapter.query(
        `INSERT INTO admin_roles (user_id, role) VALUES ($1, 'ADMIN');`,
        [userId]
      );

      // 3. Next request with the same session token MUST be immediately authorized with 200
      const promotedRes = await fetch(`${baseUrl}/api/admin/status`, {
        headers: { Cookie: cookie },
      });
      expect(promotedRes.status).toBe(200);
      const body = await promotedRes.json();
      expect(body.ok).toBe(true);
      expect(body.admin).toBe(true);
    });
  });

  describe('Service Helper Functions (hasRole and getUserRole)', () => {
    it('correctly resolves default USER role when no admin_roles record exists', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-999999999999';
      const role = await getUserRole(nonExistentUuid, pgAdapter);
      expect(role).toBe('USER');

      const isUser = await hasRole(nonExistentUuid, 'USER', pgAdapter);
      expect(isUser).toBe(true);

      const isAdmin = await hasRole(nonExistentUuid, 'ADMIN', pgAdapter);
      expect(isAdmin).toBe(false);

      // Also verify malformed non-UUID strings are handled safely without errors
      const malformedRole = await getUserRole('invalid-uuid-string', pgAdapter);
      expect(malformedRole).toBe('USER');
      const malformedAdmin = await hasRole('invalid-uuid-string', 'ADMIN', pgAdapter);
      expect(malformedAdmin).toBe(false);
    });

    it('correctly resolves ADMIN role when admin_roles record exists', async () => {
      // Insert user
      const userRes = await pgAdapter.query(
        `INSERT INTO users (email, password_hash)
         VALUES ('helper_test@example.com', 'hash')
         RETURNING id;`
      );
      const userId = userRes.rows[0].id;

      // Assign ADMIN
      await pgAdapter.query(
        `INSERT INTO admin_roles (user_id, role) VALUES ($1, 'ADMIN');`,
        [userId]
      );

      const role = await getUserRole(userId, pgAdapter);
      expect(role).toBe('ADMIN');

      const isAdmin = await hasRole(userId, 'ADMIN', pgAdapter);
      expect(isAdmin).toBe(true);
    });
  });
});
