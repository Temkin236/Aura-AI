import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { getPool, closePool } from './index';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationResult {
  success: boolean;
  applied: string[];
  alreadyApplied: string[];
  error?: string;
}

/**
 * Ensures the schema_migrations tracking table exists.
 */
export async function ensureMigrationsTable(client: pg.PoolClient | pg.Client | pg.Pool): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Gets the list of applied migration names from schema_migrations.
 */
export async function getAppliedMigrations(client: pg.PoolClient | pg.Client | pg.Pool): Promise<string[]> {
  await ensureMigrationsTable(client);
  const result = await client.query('SELECT name FROM schema_migrations ORDER BY id ASC;');
  return result.rows.map((row) => row.name);
}

/**
 * Loads all .sql migration files from the migrations directory in sorted order.
 */
export function loadMigrationFiles(migrationsDir?: string): { name: string; fullPath: string; sql: string }[] {
  const targetDir = migrationsDir || path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(targetDir)) {
    return [];
  }

  const files = fs
    .readdirSync(targetDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return files.map((file) => ({
    name: file,
    fullPath: path.join(targetDir, file),
    sql: fs.readFileSync(path.join(targetDir, file), 'utf8'),
  }));
}

/**
 * Executes all pending migrations against the provided database client or pool.
 */
export async function runMigrations(
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool,
  migrationsDir?: string
): Promise<MigrationResult> {
  let ownPool: pg.Pool | null = null;
  let client: pg.PoolClient | pg.Client;
  let releaseClient = false;

  if (clientOrPool) {
    if ('connect' in clientOrPool && typeof clientOrPool.connect === 'function' && !('release' in clientOrPool)) {
      // It's a Pool or Client
      if ('totalCount' in clientOrPool) {
        // Pool
        client = await (clientOrPool as pg.Pool).connect();
        releaseClient = true;
      } else {
        // Client
        client = clientOrPool as pg.Client;
      }
    } else {
      client = clientOrPool as pg.PoolClient;
    }
  } else {
    ownPool = getPool();
    client = await ownPool.connect();
    releaseClient = true;
  }

  const appliedList: string[] = [];

  try {
    await ensureMigrationsTable(client);
    const existing = await getAppliedMigrations(client);
    const available = loadMigrationFiles(migrationsDir);

    for (const migration of available) {
      if (existing.includes(migration.name)) {
        continue;
      }

      console.log(`[Migration] Applying ${migration.name}...`);
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1);', [migration.name]);
        await client.query('COMMIT');
        appliedList.push(migration.name);
        console.log(`[Migration] ✓ Applied ${migration.name}`);
      } catch (migrationErr: any) {
        await client.query('ROLLBACK');
        console.error(`[Migration] ✗ Failed ${migration.name}:`, migrationErr.message);
        throw migrationErr;
      }
    }

    return {
      success: true,
      applied: appliedList,
      alreadyApplied: existing,
    };
  } catch (err: any) {
    return {
      success: false,
      applied: appliedList,
      alreadyApplied: [],
      error: err.message || 'Unknown migration error',
    };
  } finally {
    if (releaseClient && 'release' in client && typeof client.release === 'function') {
      client.release();
    }
    if (ownPool) {
      // Don't close pool here if running in continuous mode, caller handles lifecycle
    }
  }
}

// CLI Execution Entry Point
async function cli() {
  console.log('--- AURA AI Database Migration Runner ---');
  try {
    const result = await runMigrations();
    if (!result.success) {
      console.error(`Migration error: ${result.error}`);
      process.exit(1);
    }

    if (result.applied.length === 0) {
      console.log('Database is up to date. No pending migrations.');
    } else {
      console.log(`Successfully applied ${result.applied.length} migration(s):`, result.applied.join(', '));
    }
    await closePool();
    process.exit(0);
  } catch (err: any) {
    console.error('Fatal migration failure:', err.message);
    await closePool().catch(() => {});
    process.exit(1);
  }
}

// Run CLI if invoked directly via tsx / node
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  cli();
}
