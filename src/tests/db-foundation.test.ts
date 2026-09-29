import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newDb, IMemoryDb } from 'pg-mem';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMigrations, getAppliedMigrations } from '../db/migrate';
import { buildDatabaseConfig, getDatabaseUrl } from '../db/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AURA V2 — PostgreSQL Foundation', () => {
  let memDb: IMemoryDb;
  let pgAdapter: any;

  beforeEach(() => {
    memDb = newDb({ noAstCoverageCheck: true });

    // Support uuid generation in pg-mem
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      implementation: () => '11111111-2222-3333-4444-555555555555',
    });

    const { Pool } = memDb.adapters.createPg();
    pgAdapter = new Pool();
  });

  afterEach(async () => {
    if (pgAdapter) {
      await pgAdapter.end();
    }
  });

  describe('Configuration & Environment Driver', () => {
    it('correctly parses and builds configuration from DATABASE_URL', () => {
      const testUrl = 'postgresql://aura_user:secret_pass@localhost:5432/aura_db';
      const config = buildDatabaseConfig(testUrl);
      expect(config.connectionString).toBe(testUrl);
      expect(config.max).toBeGreaterThan(0);
    });

    it('handles production SSL settings cleanly', () => {
      const prodUrl = 'postgresql://aura_user:secret_pass@db.cloud.internal:5432/aura_db?sslmode=require';
      const config = buildDatabaseConfig(prodUrl);
      expect(config.ssl).toBeDefined();
    });
  });

  describe('Database Migrations', () => {
    it('successfully applies migrations from a completely clean database', async () => {
      const migrationsDir = path.resolve(__dirname, '../db/migrations');
      const result = await runMigrations(pgAdapter, migrationsDir);

      if (!result.success) {
        console.error('Migration failed with error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.applied).toContain('001_initial_schema.sql');

      // Verify schema_migrations table records migration
      const applied = await getAppliedMigrations(pgAdapter);
      expect(applied).toContain('001_initial_schema.sql');
    });

    it('is idempotent: running migrations a second time does not re-apply', async () => {
      const migrationsDir = path.resolve(__dirname, '../db/migrations');
      await runMigrations(pgAdapter, migrationsDir);

      const secondRun = await runMigrations(pgAdapter, migrationsDir);
      expect(secondRun.success).toBe(true);
      expect(secondRun.applied.length).toBe(0);
      expect(secondRun.alreadyApplied).toContain('001_initial_schema.sql');
    });
  });

  describe('Core 7 Schema Tables Existence & Structure', () => {
    beforeEach(async () => {
      const migrationsDir = path.resolve(__dirname, '../db/migrations');
      await runMigrations(pgAdapter, migrationsDir);
    });

    it('verifies all 7 required tables exist in the schema', async () => {
      const requiredTables = [
        'users',
        'profiles',
        'conversations',
        'messages',
        'settings',
        'admin_roles',
        'audit_logs',
        'sessions',
      ];

      for (const table of requiredTables) {
        const check = await pgAdapter.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1;`,
          [table]
        );
        expect(check.rows.length).toBe(1);
        expect(check.rows[0].table_name).toBe(table);
      }
    });

    it('verifies users table constraints and columns', async () => {
      // Insert user
      const userRes = await pgAdapter.query(
        `INSERT INTO users (id, email, password_hash)
         VALUES ('a0000000-0000-0000-0000-000000000001', 'user@example.com', '$2b$12$securehash')
         RETURNING *;`
      );
      expect(userRes.rows[0].email).toBe('user@example.com');
      expect(userRes.rows[0].created_at).toBeDefined();

      // Email unique constraint violation test
      await expect(
        pgAdapter.query(
          `INSERT INTO users (id, email, password_hash)
           VALUES ('a0000000-0000-0000-0000-000000000002', 'user@example.com', '$2b$12$anotherhash');`
        )
      ).rejects.toThrow();
    });

    it('enforces 1-to-1 relationship on profiles', async () => {
      const userId = 'b0000000-0000-0000-0000-000000000001';
      await pgAdapter.query(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, 'profile_test@example.com', 'hash1');`,
        [userId]
      );

      // First profile
      await pgAdapter.query(
        `INSERT INTO profiles (id, user_id, display_name, avatar_url)
         VALUES ('10000000-0000-0000-0000-000000000001', $1, 'Aura Explorer', 'https://example.com/avatar.png');`,
        [userId]
      );

      // Attempting second profile for same user must fail (1-to-1 unique constraint)
      await expect(
        pgAdapter.query(
          `INSERT INTO profiles (id, user_id, display_name)
           VALUES ('10000000-0000-0000-0000-000000000002', $1, 'Duplicate Profile');`,
          [userId]
        )
      ).rejects.toThrow();
    });

    it('enforces 1-to-1 relationship on settings', async () => {
      const userId = 'c0000000-0000-0000-0000-000000000001';
      await pgAdapter.query(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, 'settings_test@example.com', 'hash1');`,
        [userId]
      );

      await pgAdapter.query(
        `INSERT INTO settings (id, user_id, theme, default_mode, model, temperature)
         VALUES ('20000000-0000-0000-0000-000000000001', $1, 'dark', 'developer', 'gemini-2.5-flash', 0.70);`,
        [userId]
      );

      // Attempting second settings for same user must fail
      await expect(
        pgAdapter.query(
          `INSERT INTO settings (id, user_id, theme)
           VALUES ('20000000-0000-0000-0000-000000000002', $1, 'light');`,
          [userId]
        )
      ).rejects.toThrow();
    });

    it('enforces 1-to-N relationship between conversations and messages', async () => {
      const userId = 'd0000000-0000-0000-0000-000000000001';
      const convId = '30000000-0000-0000-0000-000000000001';

      await pgAdapter.query(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, 'conv_test@example.com', 'hash1');`,
        [userId]
      );

      const convRes = await pgAdapter.query(
        `INSERT INTO conversations (id, user_id, title, mode)
         VALUES ($1, $2, 'Project Architecture', 'developer')
         RETURNING *;`,
        [convId, userId]
      );
      expect(convRes.rows[0].title).toBe('Project Architecture');

      // Insert multiple messages in conversation
      await pgAdapter.query(
        `INSERT INTO messages (id, conversation_id, role, content)
         VALUES ('40000000-0000-0000-0000-000000000001', $1, 'user', 'What is our DB strategy?');`,
        [convId]
      );
      await pgAdapter.query(
        `INSERT INTO messages (id, conversation_id, role, content)
         VALUES ('40000000-0000-0000-0000-000000000002', $1, 'assistant', 'We are using a clean PostgreSQL foundation.');`,
        [convId]
      );

      const msgs = await pgAdapter.query(
        `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC;`,
        [convId]
      );
      expect(msgs.rows.length).toBe(2);
      expect(msgs.rows[0].role).toBe('user');
      expect(msgs.rows[1].role).toBe('assistant');
    });

    it('enforces admin_roles and audit_logs schemas', async () => {
      const adminId = 'e0000000-0000-0000-0000-000000000001';
      await pgAdapter.query(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, 'admin@example.com', 'adminhash');`,
        [adminId]
      );

      // Assign ADMIN role
      const roleRes = await pgAdapter.query(
        `INSERT INTO admin_roles (id, user_id, role)
         VALUES ('50000000-0000-0000-0000-000000000001', $1, 'ADMIN')
         RETURNING *;`,
        [adminId]
      );
      expect(roleRes.rows[0].role).toBe('ADMIN');

      // Unique constraint on (user_id, role)
      await expect(
        pgAdapter.query(
          `INSERT INTO admin_roles (id, user_id, role)
           VALUES ('50000000-0000-0000-0000-000000000002', $1, 'ADMIN');`,
          [adminId]
        )
      ).rejects.toThrow();

      // Insert audit log
      const auditRes = await pgAdapter.query(
        `INSERT INTO audit_logs (id, admin_user_id, action, target_type, target_id, metadata)
         VALUES ('60000000-0000-0000-0000-000000000001', $1, 'PROMPT_UPDATE', 'system_prompt', 'prompt_123', '{"change":"updated tone"}'::jsonb)
         RETURNING *;`,
        [adminId]
      );
      expect(auditRes.rows[0].action).toBe('PROMPT_UPDATE');
    });

    it('enforces foreign key cascading and deletion behavior', async () => {
      const userId = 'f0000000-0000-0000-0000-000000000001';
      const convId = '70000000-0000-0000-0000-000000000001';

      await pgAdapter.query(
        `INSERT INTO users (id, email, password_hash)
         VALUES ($1, 'cascade_test@example.com', 'hash1');`,
        [userId]
      );
      await pgAdapter.query(
        `INSERT INTO profiles (id, user_id, display_name)
         VALUES ('80000000-0000-0000-0000-000000000001', $1, 'Cascade User');`,
        [userId]
      );
      await pgAdapter.query(
        `INSERT INTO settings (id, user_id)
         VALUES ('90000000-0000-0000-0000-000000000001', $1);`,
        [userId]
      );
      await pgAdapter.query(
        `INSERT INTO conversations (id, user_id, title)
         VALUES ($1, $2, 'To be deleted');`,
        [convId, userId]
      );
      await pgAdapter.query(
        `INSERT INTO messages (id, conversation_id, role, content)
         VALUES ('a1000000-0000-0000-0000-000000000001', $1, 'user', 'Cascade message');`,
        [convId]
      );
      await pgAdapter.query(
        `INSERT INTO admin_roles (id, user_id, role)
         VALUES ('a2000000-0000-0000-0000-000000000001', $1, 'USER');`,
        [userId]
      );
      await pgAdapter.query(
        `INSERT INTO audit_logs (id, admin_user_id, action)
         VALUES ('a3000000-0000-0000-0000-000000000001', $1, 'USER_CREATED');`,
        [userId]
      );

      // Delete the user
      await pgAdapter.query(`DELETE FROM users WHERE id = $1;`, [userId]);

      // Verify cascade deletions
      const prof = await pgAdapter.query(`SELECT * FROM profiles WHERE user_id = $1;`, [userId]);
      expect(prof.rows.length).toBe(0);

      const sett = await pgAdapter.query(`SELECT * FROM settings WHERE user_id = $1;`, [userId]);
      expect(sett.rows.length).toBe(0);

      const conv = await pgAdapter.query(`SELECT * FROM conversations WHERE user_id = $1;`, [userId]);
      expect(conv.rows.length).toBe(0);

      const msgs = await pgAdapter.query(`SELECT * FROM messages WHERE conversation_id = $1;`, [convId]);
      expect(msgs.rows.length).toBe(0);

      const roles = await pgAdapter.query(`SELECT * FROM admin_roles WHERE user_id = $1;`, [userId]);
      expect(roles.rows.length).toBe(0);

      // Verify audit log remains with admin_user_id set to NULL
      const audits = await pgAdapter.query(`SELECT * FROM audit_logs WHERE id = 'a3000000-0000-0000-0000-000000000001';`);
      expect(audits.rows.length).toBe(1);
      expect(audits.rows[0].admin_user_id).toBeNull();
    });
  });
});
