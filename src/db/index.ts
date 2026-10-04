import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let pool: pg.Pool | null = null;

export interface DatabaseConfig {
  connectionString?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

/**
 * Returns the configured database connection string from environment.
 */
export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || '';
}

/**
 * Parses and builds the database pool configuration.
 */
export function buildDatabaseConfig(customUrl?: string): DatabaseConfig {
  let connectionString = customUrl || getDatabaseUrl();
  const isProduction = process.env.NODE_ENV === 'production';
  const isCloudHost =
    connectionString.includes('supabase.co') ||
    connectionString.includes('supabase.com') ||
    connectionString.includes('render.com') ||
    connectionString.includes('railway.app') ||
    connectionString.includes('neon.tech') ||
    connectionString.includes('db.cloud.internal');

  const forceSsl =
    process.env.DATABASE_SSL === 'true' ||
    connectionString.includes('sslmode=require') ||
    isCloudHost;

  // Clean out sslmode=require from connection string to allow pg custom ssl object configuration
  if (connectionString.includes('sslmode=')) {
    connectionString = connectionString.replace(/[?&]sslmode=[a-zA-Z-]+/, '');
    if (connectionString.endsWith('?')) {
      connectionString = connectionString.slice(0, -1);
    }
  }

  const config: DatabaseConfig = {
    connectionString,
    max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX, 10) : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  if (forceSsl || isProduction) {
    config.ssl = {
      rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
    };
  }

  return config;
}

/**
 * Retrieves or lazily initializes the singleton PostgreSQL connection pool.
 */
export function getPool(customUrl?: string): pg.Pool {
  if (pool) {
    return pool;
  }

  const config = buildDatabaseConfig(customUrl);

  if (!config.connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Please provide a valid PostgreSQL connection string in the environment.'
    );
  }

  pool = new Pool({
    connectionString: config.connectionString,
    max: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    ssl: config.ssl,
  });

  pool.on('error', (err) => {
    console.error('Unexpected idle client error in PostgreSQL pool:', err.message);
  });

  return pool;
}

/**
 * Sets a custom pool (useful for tests or mocking).
 */
export function setPool(customPool: pg.Pool | null): void {
  pool = customPool;
}

/**
 * Safely closes the database connection pool.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Parameterized query helper.
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const currentPool = getPool();
  return currentPool.query<T>(text, params);
}

/**
 * Checks database connectivity and returns status metadata.
 */
export async function checkDatabaseConnection(customUrl?: string): Promise<{
  connected: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const currentPool = getPool(customUrl);
    const result = await currentPool.query('SELECT version();');
    return {
      connected: true,
      version: result.rows[0]?.version,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message || 'Unknown database connection error',
    };
  }
}

export { Pool };
export default {
  getPool,
  setPool,
  closePool,
  query,
  checkDatabaseConnection,
  getDatabaseUrl,
};
