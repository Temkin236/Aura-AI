import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getPool } from '../db/index';

const router = Router();

// Apply requireAuth and requireAdmin to all administrative routes
router.use(requireAuth, requireAdmin);

/**
 * GET /api/admin/status
 * Administrative authorization status test endpoint.
 */
router.get('/status', (req: Request, res: Response): void => {
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

/**
 * GET /api/admin/metrics
 * Returns real, aggregated telemetry and administrative metrics from PostgreSQL.
 * Strictly protected: Anonymous receives 401, non-admin USER receives 403.
 */
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const pool = getPool();
    const now = new Date();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Execute queries in parallel using database aggregation
    const [
      usersCountRes,
      convsCountRes,
      msgsCountRes,
      sessionsCountRes,
      adminsCountRes,
      recentMsgsRes,
      recentUsersRes,
      modeDistRes,
      usersRes,
      adminRolesRes,
      convCountsRes,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as count FROM users;'),
      pool.query('SELECT COUNT(*)::int as count FROM conversations;'),
      pool.query('SELECT COUNT(*)::int as count FROM messages;'),
      pool.query('SELECT COUNT(*)::int as count FROM sessions WHERE expires_at > $1;', [now]),
      pool.query("SELECT COUNT(DISTINCT user_id)::int as count FROM admin_roles WHERE role = 'ADMIN';"),
      pool.query('SELECT COUNT(*)::int as count FROM messages WHERE created_at >= $1;', [twentyFourHoursAgo]),
      pool.query('SELECT COUNT(*)::int as count FROM users WHERE created_at >= $1;', [twentyFourHoursAgo]),
      pool.query('SELECT mode, COUNT(*)::int as count FROM conversations GROUP BY mode;'),
      pool.query(`
        SELECT u.id, u.email, p.display_name, u.created_at
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        ORDER BY u.created_at DESC
        LIMIT 50;
      `),
      pool.query("SELECT user_id FROM admin_roles WHERE role = 'ADMIN';"),
      pool.query('SELECT user_id, COUNT(*)::int as count FROM conversations GROUP BY user_id;'),
    ]);

    const totalUsers = usersCountRes.rows[0]?.count || 0;
    const totalConversations = convsCountRes.rows[0]?.count || 0;
    const totalMessages = msgsCountRes.rows[0]?.count || 0;
    const activeSessions = sessionsCountRes.rows[0]?.count || 0;
    const totalAdmins = adminsCountRes.rows[0]?.count || 0;
    const recentMessages24h = recentMsgsRes.rows[0]?.count || 0;
    const recentUsers24h = recentUsersRes.rows[0]?.count || 0;

    // Calculate persona distribution with percentages
    const personaDistribution = modeDistRes.rows.map((row: { mode: string; count: number }) => ({
      mode: row.mode,
      count: row.count,
      percentage: totalConversations > 0 ? Math.round((row.count / totalConversations) * 1000) / 10 : 0,
    }));

    const adminUserIds = new Set(adminRolesRes.rows.map((r: any) => r.user_id));
    const convCountMap = new Map(convCountsRes.rows.map((r: any) => [r.user_id, r.count]));

    const userDirectory = usersRes.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name || row.email.split('@')[0],
      role: adminUserIds.has(row.id) ? 'ADMIN' : 'USER',
      conversationCount: convCountMap.get(row.id) || 0,
      createdAt: row.created_at,
    }));

    res.status(200).json({
      metrics: {
        totalUsers,
        totalConversations,
        totalMessages,
        activeSessions,
        totalAdmins,
        recentMessages24h,
        recentUsers24h,
        personaDistribution,
        userDirectory,
      },
    });
  } catch (err: any) {
    console.error('Failed to retrieve admin metrics:', err?.message || err);
    res.status(500).json({ error: 'Failed to retrieve administrative metrics.' });
  }
});

export default router;
