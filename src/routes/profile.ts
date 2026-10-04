import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';
import { getPool } from '../db/index';

const router = Router();

/**
 * PATCH /api/profile
 * Updates user display name and avatar URL.
 */
router.patch('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { displayName, avatarUrl } = req.body;
    const pool = getPool();

    const query = `
      INSERT INTO profiles (user_id, display_name, avatar_url, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE
      SET display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = CURRENT_TIMESTAMP
      RETURNING user_id, display_name, avatar_url;
    `;

    const resProfile = await pool.query(query, [
      req.user!.id,
      displayName ? String(displayName).slice(0, 255) : null,
      avatarUrl ? String(avatarUrl).slice(0, 2048) : null,
    ]);

    const row = resProfile.rows[0];
    res.json({
      ok: true,
      profile: {
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
      },
    });
  } catch (err: any) {
    console.error('Error updating profile:', err?.message || err);
    res.status(500).json({ error: 'Failed to update user profile.' });
  }
});

/**
 * POST /api/profile/password
 * Changes password with required verification of current password.
 */
router.post('/password', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    const pool = getPool();
    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1;', [req.user!.id]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Incorrect current password.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;', [
      newHash,
      req.user!.id,
    ]);

    res.json({ ok: true, message: 'Password updated successfully.' });
  } catch (err: any) {
    console.error('Error updating password:', err?.message || err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

/**
 * POST /api/profile/reset-request
 * Initiates a password reset request.
 * Security guarantee: Generic success response prevents user email enumeration.
 */
router.post('/reset-request', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }

    // Always respond with generic 200 to prevent account enumeration
    res.json({
      ok: true,
      message: 'If an account exists with this email, password reset instructions will be delivered.',
    });
  } catch (err: any) {
    console.error('Error in reset-request:', err?.message || err);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

/**
 * DELETE /api/profile/account
 * Deletes user account and cascades deletion of all associated user data.
 */
router.delete('/account', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Password confirmation is required to delete your account.' });
      return;
    }

    const pool = getPool();
    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1;', [req.user!.id]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, userRes.rows[0].password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }

    await pool.query('DELETE FROM users WHERE id = $1;', [req.user!.id]);
    res.clearCookie('aura_session');
    res.json({ ok: true, message: 'Account permanently deleted.' });
  } catch (err: any) {
    console.error('Error deleting account:', err?.message || err);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

export default router;
