import pg from 'pg';
import { getPool } from './index';
import { isValidUuid } from '../auth/service';
import { DbConversation, DbMessage, DbMessageRole } from './types';

export interface FormattedConversation {
  id: string;
  userId: string;
  title: string;
  mode: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface FormattedMessage {
  id: string;
  conversationId: string;
  role: DbMessageRole;
  content: string;
  mode?: string | null;
  model?: string | null;
  createdAt: string;
}

export const VALID_MODES = ['developer', 'friendly', 'tutor', 'creative', 'professional'] as const;
export const VALID_ROLES = ['user', 'assistant', 'system'] as const;

function formatConversationRow(row: any): FormattedConversation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    mode: row.mode,
    pinned: !!row.pinned,
    archived: !!row.archived,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    messageCount: typeof row.message_count === 'number' ? row.message_count : parseInt(row.message_count || '0', 10),
  };
}

function formatMessageRow(row: any): FormattedMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as DbMessageRole,
    content: row.content,
    mode: row.mode || null,
    model: row.model || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

/**
 * Lists all conversations belonging exclusively to the authenticated user.
 */
export async function listConversations(
  userId: string,
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<FormattedConversation[]> {
  if (!isValidUuid(userId)) return [];

  const executor = clientOrPool || getPool();
  const queryText = `
    SELECT 
      c.id, 
      c.user_id, 
      c.title, 
      c.mode, 
      c.pinned, 
      c.archived, 
      c.created_at, 
      c.updated_at, 
      COUNT(m.id)::int as message_count
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
    WHERE c.user_id = $1
    GROUP BY c.id, c.user_id, c.title, c.mode, c.pinned, c.archived, c.created_at, c.updated_at
    ORDER BY c.updated_at DESC, c.created_at DESC;
  `;

  const result = await executor.query(queryText, [userId]);
  return result.rows.map(formatConversationRow);
}

/**
 * Retrieves a single conversation by ID, strictly enforcing user ownership.
 */
export async function getConversation(
  userId: string,
  conversationId: string,
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<FormattedConversation | null> {
  if (!isValidUuid(userId) || !isValidUuid(conversationId)) return null;

  const executor = clientOrPool || getPool();
  const queryText = `
    SELECT 
      c.id, 
      c.user_id, 
      c.title, 
      c.mode, 
      c.pinned, 
      c.archived, 
      c.created_at, 
      c.updated_at, 
      COUNT(m.id)::int as message_count
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
    WHERE c.id = $1 AND c.user_id = $2
    GROUP BY c.id, c.user_id, c.title, c.mode, c.pinned, c.archived, c.created_at, c.updated_at;
  `;

  const result = await executor.query(queryText, [conversationId, userId]);
  if (result.rows.length === 0) return null;
  return formatConversationRow(result.rows[0]);
}

/**
 * Creates a new conversation owned by the authenticated user.
 */
export async function createConversation(
  userId: string,
  data: {
    id?: string;
    title?: string;
    mode?: string;
    pinned?: boolean;
    archived?: boolean;
  },
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<FormattedConversation> {
  if (!isValidUuid(userId)) {
    throw new Error('Invalid user ID');
  }

  const rawTitle = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'New conversation';
  const title = rawTitle.slice(0, 255);
  const rawMode = typeof data.mode === 'string' && data.mode.trim() ? data.mode.trim() : 'developer';
  const mode = rawMode.slice(0, 64);
  const pinned = Boolean(data.pinned);
  const archived = Boolean(data.archived);

  const executor = clientOrPool || getPool();

  let queryText: string;
  let params: any[];

  if (data.id && isValidUuid(data.id)) {
    queryText = `
      INSERT INTO conversations (id, user_id, title, mode, pinned, archived, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, user_id, title, mode, pinned, archived, created_at, updated_at;
    `;
    params = [data.id, userId, title, mode, pinned, archived];
  } else {
    queryText = `
      INSERT INTO conversations (user_id, title, mode, pinned, archived, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, user_id, title, mode, pinned, archived, created_at, updated_at;
    `;
    params = [userId, title, mode, pinned, archived];
  }

  const result = await executor.query(queryText, params);
  const row = result.rows[0];
  return {
    ...formatConversationRow(row),
    messageCount: 0,
  };
}

/**
 * Updates an existing conversation owned by the authenticated user.
 */
export async function updateConversation(
  userId: string,
  conversationId: string,
  updates: {
    title?: string;
    mode?: string;
    pinned?: boolean;
    archived?: boolean;
  },
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<FormattedConversation | null> {
  if (!isValidUuid(userId) || !isValidUuid(conversationId)) return null;

  const setClauses: string[] = ['updated_at = NOW()'];
  const params: any[] = [conversationId, userId];
  let paramIdx = 3;

  if (updates.title !== undefined) {
    const rawTitle = typeof updates.title === 'string' ? updates.title.trim() : '';
    setClauses.push(`title = $${paramIdx++}`);
    params.push(rawTitle.slice(0, 255) || 'New conversation');
  }

  if (updates.mode !== undefined) {
    const rawMode = typeof updates.mode === 'string' ? updates.mode.trim() : 'developer';
    setClauses.push(`mode = $${paramIdx++}`);
    params.push(rawMode.slice(0, 64) || 'developer');
  }

  if (updates.pinned !== undefined) {
    setClauses.push(`pinned = $${paramIdx++}`);
    params.push(Boolean(updates.pinned));
  }

  if (updates.archived !== undefined) {
    setClauses.push(`archived = $${paramIdx++}`);
    params.push(Boolean(updates.archived));
  }

  const executor = clientOrPool || getPool();
  const queryText = `
    UPDATE conversations
    SET ${setClauses.join(', ')}
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, title, mode, pinned, archived, created_at, updated_at;
  `;

  const result = await executor.query(queryText, params);
  if (result.rows.length === 0) return null;

  // Retrieve message count
  const countRes = await executor.query(
    'SELECT COUNT(id)::int as count FROM messages WHERE conversation_id = $1;',
    [conversationId]
  );
  const count = countRes.rows[0]?.count || 0;

  return {
    ...formatConversationRow(result.rows[0]),
    messageCount: typeof count === 'number' ? count : parseInt(count, 10),
  };
}

/**
 * Deletes a conversation owned by the authenticated user.
 * Messages are cascade-deleted automatically.
 */
export async function deleteConversation(
  userId: string,
  conversationId: string,
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<boolean> {
  if (!isValidUuid(userId) || !isValidUuid(conversationId)) return false;

  const executor = clientOrPool || getPool();
  const queryText = `
    DELETE FROM conversations
    WHERE id = $1 AND user_id = $2
    RETURNING id;
  `;

  const result = await executor.query(queryText, [conversationId, userId]);
  return result.rows.length > 0;
}

/**
 * Lists all messages in a conversation, strictly ensuring user ownership of the parent conversation.
 */
export async function listMessages(
  userId: string,
  conversationId: string,
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<FormattedMessage[] | null> {
  if (!isValidUuid(userId) || !isValidUuid(conversationId)) return null;

  const executor = clientOrPool || getPool();

  // 1. Verify ownership of the conversation
  const ownerCheck = await executor.query(
    'SELECT 1 FROM conversations WHERE id = $1 AND user_id = $2 LIMIT 1;',
    [conversationId, userId]
  );

  if (ownerCheck.rows.length === 0) {
    return null; // Not found or not owned
  }

  // 2. Fetch messages ordered chronologically
  const queryText = `
    SELECT id, conversation_id, role, content, mode, model, created_at
    FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC, id ASC;
  `;

  const result = await executor.query(queryText, [conversationId]);
  return result.rows.map(formatMessageRow);
}

/**
 * Appends a message to a conversation owned by the authenticated user.
 */
export async function createMessage(
  userId: string,
  conversationId: string,
  data: {
    id?: string;
    role: DbMessageRole;
    content: string;
    mode?: string | null;
    model?: string | null;
  },
  clientOrPool?: pg.PoolClient | pg.Client | pg.Pool
): Promise<FormattedMessage | null> {
  if (!isValidUuid(userId) || !isValidUuid(conversationId)) return null;

  if (!VALID_ROLES.includes(data.role)) {
    throw new Error(`Invalid message role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  if (typeof data.content !== 'string' || !data.content.trim()) {
    throw new Error('Message content cannot be empty');
  }

  const executor = clientOrPool || getPool();

  // 1. Verify conversation ownership
  const ownerCheck = await executor.query(
    'SELECT 1 FROM conversations WHERE id = $1 AND user_id = $2 LIMIT 1;',
    [conversationId, userId]
  );

  if (ownerCheck.rows.length === 0) {
    return null;
  }

  const content = data.content.slice(0, 100000);
  const mode = data.mode ? String(data.mode).slice(0, 64) : null;
  const model = data.model ? String(data.model).slice(0, 128) : null;

  let queryText: string;
  let params: any[];

  if (data.id && isValidUuid(data.id)) {
    queryText = `
      INSERT INTO messages (id, conversation_id, role, content, mode, model, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, conversation_id, role, content, mode, model, created_at;
    `;
    params = [data.id, conversationId, data.role, content, mode, model];
  } else {
    queryText = `
      INSERT INTO messages (conversation_id, role, content, mode, model, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, conversation_id, role, content, mode, model, created_at;
    `;
    params = [conversationId, data.role, content, mode, model];
  }

  const result = await executor.query(queryText, params);
  
  // Update conversation updated_at
  await executor.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1;', [conversationId]);

  return formatMessageRow(result.rows[0]);
}
