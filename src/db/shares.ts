import crypto from 'crypto';
import { getPool } from './index';
import { DbShareLink } from './types';
import { FormattedConversation, FormattedMessage } from './conversations';

export interface PublicShareSnapshot {
  shareToken: string;
  createdAt: string;
  viewCount: number;
  conversation: {
    title: string;
    mode: string;
    createdAt: string;
  };
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    mode?: string | null;
    createdAt: string;
  }>;
}

export function generateSecureShareToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export async function createShareLink(
  userId: string,
  conversationId: string,
  expiresInDays: number = 30
): Promise<DbShareLink> {
  const pool = getPool();

  // Verify conversation ownership
  const convRes = await pool.query('SELECT id FROM conversations WHERE id = $1 AND user_id = $2;', [
    conversationId,
    userId,
  ]);
  if (convRes.rows.length === 0) {
    throw new Error('Conversation not found or access denied.');
  }

  const token = generateSecureShareToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const query = `
    INSERT INTO share_links (user_id, conversation_id, share_token, is_active, view_count, expires_at)
    VALUES ($1, $2, $3, true, 0, $4)
    RETURNING id, user_id, conversation_id, share_token, is_active, view_count, created_at, expires_at;
  `;

  const res = await pool.query(query, [userId, conversationId, token, expiresAt]);
  const row = res.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    conversation_id: row.conversation_id,
    share_token: row.share_token,
    is_active: row.is_active,
    view_count: row.view_count,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

export async function getPublicShareSnapshot(shareToken: string): Promise<PublicShareSnapshot | null> {
  const pool = getPool();

  // Find active and non-expired share link
  const now = new Date();
  const shareRes = await pool.query(
    `SELECT id, conversation_id, share_token, is_active, view_count, created_at, expires_at
     FROM share_links
     WHERE share_token = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > $2);`,
    [shareToken, now]
  );

  if (shareRes.rows.length === 0) return null;
  const share = shareRes.rows[0];

  // Fetch conversation without leaking user_id, email, or database internals
  const convRes = await pool.query(
    `SELECT title, mode, created_at FROM conversations WHERE id = $1;`,
    [share.conversation_id]
  );
  if (convRes.rows.length === 0) return null;
  const conv = convRes.rows[0];

  // Fetch messages
  const msgRes = await pool.query(
    `SELECT role, content, mode, created_at
     FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC;`,
    [share.conversation_id]
  );

  // Increment view counter safely
  await pool.query('UPDATE share_links SET view_count = view_count + 1 WHERE id = $1;', [share.id]);

  return {
    shareToken: share.share_token,
    createdAt: share.created_at.toISOString(),
    viewCount: share.view_count + 1,
    conversation: {
      title: conv.title,
      mode: conv.mode,
      createdAt: conv.created_at.toISOString(),
    },
    messages: msgRes.rows.map((m) => ({
      role: m.role,
      content: m.content,
      mode: m.mode,
      createdAt: m.created_at.toISOString(),
    })),
  };
}

export async function revokeShareLink(userId: string, shareToken: string): Promise<boolean> {
  const pool = getPool();
  const res = await pool.query(
    `UPDATE share_links SET is_active = false WHERE share_token = $1 AND user_id = $2;`,
    [shareToken, userId]
  );
  return (res.rowCount ?? 0) > 0;
}
