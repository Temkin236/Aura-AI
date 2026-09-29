import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * GET /api/admin/status
 * Minimal administrative authorization status test endpoint.
 * Protected by server-side authentication (requireAuth) and RBAC (requireAdmin).
 *
 * Responses:
 * - Anonymous: 401 Unauthorized
 * - Authenticated USER (non-admin): 403 Forbidden
 * - Authenticated ADMIN: 200 OK
 */
router.get('/status', requireAuth, requireAdmin, (req: Request, res: Response): void => {
  res.status(200).json({
    ok: true,
    admin: true,
    user: {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role || 'ADMIN',
    },
  });
});

export default router;
