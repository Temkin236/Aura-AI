import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { getPool } from '../db/index';
import { DbUser, DbProfile, DbSession, SafeUser, DbRoleType } from '../db/types';

export const SESSION_COOKIE_NAME = 'aura_session';
export const SESSION_DURATION_DAYS = 7;
const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password securely using bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Hashes a raw session token using SHA-256 for secure database storage.
 */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generates a cryptographically random session token and its SHA-256 hash.
 */
export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Validates email format and bounds.
 */
export function validateEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 255) return false;
  // Standard RFC 5322 compatible email pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

/**
 * Normalizes email address.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validates password length and characteristics.
 */
export function validatePassword(password: unknown): { valid: boolean; reason?: string } {
  if (typeof password !== 'string') {
    return { valid: false, reason: 'Password must be a string' };
  }
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, reason: 'Password cannot exceed 128 characters' };
  }
  return { valid: true };
}

/**
 * Returns cookie options for setting the authentication session.
 */
export function getSessionCookieOptions(durationDays: number = SESSION_DURATION_DAYS) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: durationDays * 24 * 60 * 60 * 1000,
  };
}

/**
 * Creates a new authenticated session in the database.
 */
export async function createSession(
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool,
  userId?: string,
  durationDays: number = SESSION_DURATION_DAYS
): Promise<{ rawToken: string; session: DbSession }> {
  if (!userId) {
    throw new Error('User ID is required to create a session');
  }

  const executor = clientOrPool || getPool();
  const { rawToken, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const result = await executor.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, token_hash, created_at, expires_at;`,
    [userId, tokenHash, expiresAt]
  );

  return {
    rawToken,
    session: result.rows[0],
  };
}

/**
 * Validates a session by raw token and returns associated user and profile.
 */
export async function validateSession(
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool,
  rawToken?: string
): Promise<{ session: DbSession; user: DbUser; profile: DbProfile; role: DbRoleType } | null> {
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  const executor = clientOrPool || getPool();
  const tokenHash = hashSessionToken(rawToken);

  const queryText = `
    SELECT 
      s.id as session_id, s.user_id, s.token_hash, s.created_at as session_created_at, s.expires_at,
      u.id as user_id, u.email, u.password_hash, u.created_at as user_created_at, u.updated_at as user_updated_at,
      p.id as profile_id, p.display_name, p.avatar_url, p.created_at as profile_created_at, p.updated_at as profile_updated_at,
      ar.role as admin_role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN profiles p ON u.id = p.user_id
    LEFT JOIN admin_roles ar ON u.id = ar.user_id AND ar.role = 'ADMIN'
    WHERE s.token_hash = $1 AND s.expires_at > NOW();
  `;

  const result = await executor.query(queryText, [tokenHash]);
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const userRole: DbRoleType = row.admin_role === 'ADMIN' ? 'ADMIN' : 'USER';

  return {
    session: {
      id: row.session_id,
      user_id: row.user_id,
      token_hash: row.token_hash,
      created_at: row.session_created_at,
      expires_at: row.expires_at,
    },
    user: {
      id: row.user_id,
      email: row.email,
      password_hash: row.password_hash,
      created_at: row.user_created_at,
      updated_at: row.user_updated_at,
    },
    profile: {
      id: row.profile_id,
      user_id: row.user_id,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      created_at: row.profile_created_at,
      updated_at: row.profile_updated_at,
    },
    role: userRole,
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates whether a string is a valid UUID format.
 */
export function isValidUuid(id: unknown): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * Checks if a user has a specific role by querying the database in real-time.
 * Guarantees fresh role enforcement so grants and revocations take immediate effect.
 */
export async function hasRole(
  userId: string,
  requiredRole: DbRoleType,
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<boolean> {
  if (!userId) return false;

  // 'USER' is the baseline authenticated role for every registered user
  if (requiredRole === 'USER') {
    return true;
  }

  if (!isValidUuid(userId)) {
    return false;
  }

  const executor = clientOrPool || getPool();
  const result = await executor.query(
    'SELECT 1 FROM admin_roles WHERE user_id = $1 AND role = $2 LIMIT 1;',
    [userId, requiredRole]
  );

  return result.rows.length > 0;
}

/**
 * Resolves the primary role for a user from the database.
 */
export async function getUserRole(
  userId: string,
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<DbRoleType> {
  if (!userId || !isValidUuid(userId)) return 'USER';

  const executor = clientOrPool || getPool();
  const result = await executor.query(
    `SELECT role FROM admin_roles 
     WHERE user_id = $1 
     ORDER BY CASE WHEN role = 'ADMIN' THEN 1 ELSE 2 END ASC 
     LIMIT 1;`,
    [userId]
  );

  if (result.rows.length > 0 && result.rows[0].role === 'ADMIN') {
    return 'ADMIN';
  }

  return 'USER';
}

/**
 * Invalidates (deletes) a session from the database.
 */
export async function invalidateSession(
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool,
  rawToken?: string
): Promise<boolean> {
  if (!rawToken || typeof rawToken !== 'string') {
    return false;
  }

  const executor = clientOrPool || getPool();
  const tokenHash = hashSessionToken(rawToken);

  const result = await executor.query(
    'DELETE FROM sessions WHERE token_hash = $1;',
    [tokenHash]
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * Cleans up expired sessions.
 */
export async function cleanupExpiredSessions(
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<number> {
  const executor = clientOrPool || getPool();
  const result = await executor.query(
    'DELETE FROM sessions WHERE expires_at < NOW();'
  );
  return result.rowCount ?? 0;
}

/**
 * Converts internal DbUser, DbProfile, and DbRoleType into a safe public SafeUser (never exposes password_hash).
 */
export function toSafeUser(
  user: { id: string; email: string },
  profile?: { display_name?: string | null; avatar_url?: string | null },
  role?: DbRoleType
): SafeUser {
  return {
    id: user.id,
    email: user.email,
    role: role || 'USER',
    profile: {
      displayName: profile?.display_name || null,
      avatarUrl: profile?.avatar_url || null,
    },
  };
}
