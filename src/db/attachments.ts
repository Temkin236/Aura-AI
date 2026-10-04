import { getPool } from './index';
import { DbAttachment } from './types';

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
] as const;

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAttachment(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  base64Data?: string
): AttachmentValidationResult {
  if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
    return { valid: false, error: 'Attachment must have a valid filename.' };
  }

  if (!mimeType || !(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file format: ${mimeType}. Allowed formats: PNG, JPEG, WEBP, GIF, PDF, TXT, MD, CSV, JSON.`,
    };
  }

  if (!sizeBytes || sizeBytes <= 0 || sizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds allowed limit (Maximum ${MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)}MB).`,
    };
  }

  if (base64Data && typeof base64Data !== 'string') {
    return { valid: false, error: 'Malformed file payload.' };
  }

  return { valid: true };
}

export async function createAttachment(
  userId: string | null,
  attachment: {
    conversationId?: string | null;
    messageId?: string | null;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    dataUrl?: string | null;
    storageKey?: string | null;
  }
): Promise<DbAttachment> {
  const pool = getPool();
  const query = `
    INSERT INTO attachments (user_id, conversation_id, message_id, filename, mime_type, size_bytes, data_url, storage_key)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, user_id, conversation_id, message_id, filename, mime_type, size_bytes, data_url, storage_key, created_at;
  `;
  const res = await pool.query(query, [
    userId,
    attachment.conversationId || null,
    attachment.messageId || null,
    attachment.filename.slice(0, 255),
    attachment.mimeType.toLowerCase(),
    attachment.sizeBytes,
    attachment.dataUrl || null,
    attachment.storageKey || null,
  ]);

  const row = res.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    conversation_id: row.conversation_id,
    message_id: row.message_id,
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    data_url: row.data_url,
    storage_key: row.storage_key,
    created_at: row.created_at,
  };
}

export async function getAttachmentById(
  attachmentId: string,
  userId?: string | null
): Promise<DbAttachment | null> {
  const pool = getPool();
  let query = `
    SELECT id, user_id, conversation_id, message_id, filename, mime_type, size_bytes, data_url, storage_key, created_at
    FROM attachments
    WHERE id = $1
  `;
  const params: any[] = [attachmentId];

  if (userId) {
    query += ` AND (user_id = $2 OR user_id IS NULL)`;
    params.push(userId);
  }

  const res = await pool.query(query, params);
  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    conversation_id: row.conversation_id,
    message_id: row.message_id,
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    data_url: row.data_url,
    storage_key: row.storage_key,
    created_at: row.created_at,
  };
}

export async function listAttachmentsForConversation(
  userId: string | null,
  conversationId: string
): Promise<DbAttachment[]> {
  const pool = getPool();
  let query = `
    SELECT id, user_id, conversation_id, message_id, filename, mime_type, size_bytes, storage_key, created_at
    FROM attachments
    WHERE conversation_id = $1
  `;
  const params: any[] = [conversationId];

  if (userId) {
    query += ` AND user_id = $2`;
    params.push(userId);
  }

  query += ` ORDER BY created_at ASC;`;
  const res = await pool.query(query, params);
  return res.rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    conversation_id: row.conversation_id,
    message_id: row.message_id,
    filename: row.filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    storage_key: row.storage_key,
    created_at: row.created_at,
  }));
}
