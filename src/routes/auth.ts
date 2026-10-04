import { Router, Request, Response } from 'express';
import { getPool } from '../db/index';
import {
  hashPassword,
  verifyPassword,
  createSession,
  invalidateSession,
  validateEmail,
  normalizeEmail,
  validatePassword,
  getSessionCookieOptions,
  toSafeUser,
  SESSION_COOKIE_NAME,
} from '../auth/service';
import { requireAuth, extractSessionToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/signup
 * Registers a new user account, creates default profile and settings, and issues a session.
 */
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;

    // 1. Input validation
    if (!validateEmail(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      res.status(400).json({ error: passCheck.reason });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 2. Check existing account
      const existingRes = await client.query(
        'SELECT id FROM users WHERE email = $1;',
        [normalizedEmail]
      );

      if (existingRes.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }

      // 3. Hash password securely
      const passwordHash = await hashPassword(password);

      // 4. Insert user
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, created_at, updated_at;`,
        [normalizedEmail, passwordHash]
      );
      const newUser = userRes.rows[0];

      // 5. Create default profile (1:1)
      const cleanDisplayName =
        typeof displayName === 'string' && displayName.trim()
          ? displayName.trim().slice(0, 100)
          : normalizedEmail.split('@')[0];

      const profileRes = await client.query(
        `INSERT INTO profiles (user_id, display_name)
         VALUES ($1, $2)
         RETURNING id, user_id, display_name, avatar_url, created_at, updated_at;`,
        [newUser.id, cleanDisplayName]
      );
      const newProfile = profileRes.rows[0];

      // 6. Create default settings (1:1)
      await client.query(
        `INSERT INTO settings (user_id)
         VALUES ($1);`,
        [newUser.id]
      );

      // 7. Create session in database
      const { rawToken } = await createSession(client, newUser.id);

      await client.query('COMMIT');

      // 8. Set secure HTTP-only cookie
      res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions());

      // 9. Return safe user representation (no password hash)
      res.status(201).json({
        user: toSafeUser(newUser, newProfile),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Signup error:', err);
    const errorMessage =
      process.env.NODE_ENV === 'development' && err.message
        ? `Signup error: ${err.message}`
        : 'An error occurred during account creation. Please try again.';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/auth/signin
 * Validates credentials, creates a new authenticated session, and returns user data.
 */
router.post('/signin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const pool = getPool();

    // Query user and profile
    const result = await pool.query(
      `SELECT 
         u.id as user_id, u.email, u.password_hash, u.created_at, u.updated_at,
         p.id as profile_id, p.display_name, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.email = $1;`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      // Run dummy hash check to mitigate timing side-channel attacks
      await verifyPassword(password, '$2a$12$e8k8f5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x');
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const row = result.rows[0];
    const passwordMatch = await verifyPassword(password, row.password_hash);

    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Create session
    const { rawToken } = await createSession(pool, row.user_id);

    // Set secure HTTP-only cookie
    res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions());

    res.status(200).json({
      user: toSafeUser(
        { id: row.user_id, email: row.email },
        { display_name: row.display_name, avatar_url: row.avatar_url }
      ),
    });
  } catch (err: any) {
    console.error('Signin error:', err.message);
    res.status(500).json({ error: 'An error occurred during authentication. Please try again.' });
  }
});

/**
 * POST /api/auth/signout
 * Revokes the server-side session and clears the session cookie.
 */
router.post('/signout', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawToken = extractSessionToken(req);

    if (rawToken) {
      await invalidateSession(undefined, rawToken);
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.status(200).json({ success: true, message: 'Signed out successfully.' });
  } catch (err: any) {
    console.error('Signout error:', err.message);
    res.status(500).json({ error: 'An error occurred during signout.' });
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile and identity.
 */
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  res.status(200).json({
    user: req.user,
  });
});

export default router;
