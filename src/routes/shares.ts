import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { createShareLink, getPublicShareSnapshot, revokeShareLink } from '../db/shares';
import { isValidUuid } from '../auth/service';

const router = Router();

/**
 * POST /api/shares/:conversationId
 * Creates a secure, unguessable public read-only share token for a conversation.
 */
router.post('/:conversationId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    if (!isValidUuid(conversationId)) {
      res.status(400).json({ error: 'Invalid conversationId UUID format.' });
      return;
    }

    const share = await createShareLink(req.user!.id, conversationId);
    res.status(201).json({
      ok: true,
      share: {
        shareToken: share.share_token,
        shareUrl: `/share/${share.share_token}`,
        createdAt: share.created_at,
        expiresAt: share.expires_at,
      },
    });
  } catch (err: any) {
    console.error('Error in POST /api/shares/:conversationId:', err?.message || err);
    res.status(500).json({ error: err?.message || 'Failed to create share link.' });
  }
});

/**
 * GET /api/shares/public/:token
 * Public endpoint to view a shared conversation snapshot.
 * Strict guarantees: Anonymous access allowed; never leaks user_id, email, or secrets.
 */
router.get('/public/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string' || token.length < 16) {
      res.status(400).json({ error: 'Invalid share token format.' });
      return;
    }

    const snapshot = await getPublicShareSnapshot(token);
    if (!snapshot) {
      res.status(404).json({ error: 'Shared conversation not found, expired, or revoked.' });
      return;
    }

    res.json({ snapshot });
  } catch (err: any) {
    console.error('Error in GET /api/shares/public/:token:', err?.message || err);
    res.status(500).json({ error: 'Failed to retrieve shared conversation.' });
  }
});

/**
 * DELETE /api/shares/:token
 * Revokes an existing share link (authenticated owner only).
 */
router.delete('/:token', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const revoked = await revokeShareLink(req.user!.id, token);
    if (!revoked) {
      res.status(404).json({ error: 'Share link not found or access denied.' });
      return;
    }

    res.json({ ok: true, message: 'Share link successfully revoked.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/shares/:token:', err?.message || err);
    res.status(500).json({ error: 'Failed to revoke share link.' });
  }
});

export default router;
