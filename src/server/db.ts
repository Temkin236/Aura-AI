import { neon, neonConfig } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import https from 'node:https';
import { Conversation, Message, UserSettings, AIModeId } from '../types';

dotenv.config();

// Custom HTTPS fetch adapter forcing IPv4 to eliminate IPv6 network timeouts across cloud hosts
neonConfig.fetchFunction = (url: any, init: any = {}) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(typeof url === 'string' ? url : url.toString());
    const req = https.request(
      parsedUrl,
      {
        method: init.method || 'GET',
        headers: init.headers || {},
        family: 4,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const bodyText = buffer.toString('utf8');
          resolve({
            ok: (res.statusCode || 200) >= 200 && (res.statusCode || 200) < 300,
            status: res.statusCode || 200,
            statusText: res.statusMessage || 'OK',
            text: async () => bodyText,
            json: async () => JSON.parse(bodyText),
            arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
            headers: new Headers(res.headers as any),
          } as Response);
        });
      }
    );
    req.on('error', reject);
    if (init.body) {
      req.write(init.body);
    }
    req.end();
  });
};

function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  return neon(url);
}

export async function isDbConnected(): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') return true;
  const sql = getSql();
  if (!sql) return false;
  try {
    const res = await sql`SELECT 1 as connected`;
    return Boolean(res && res.length > 0);
  } catch (err: any) {
    console.warn('PostgreSQL health check failed:', err?.message || err);
    return false;
  }
}

export async function initDatabase(): Promise<boolean> {
  const sql = getSql();
  if (!sql) {
    console.log('ℹ️ No DATABASE_URL provided. Operating in local cache mode.');
    return false;
  }

  try {
    console.log('🔌 Connecting to Neon PostgreSQL...');

    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(64) PRIMARY KEY,
        title TEXT NOT NULL,
        mode VARCHAR(32) NOT NULL DEFAULT 'developer',
        pinned BOOLEAN NOT NULL DEFAULT FALSE,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(64) PRIMARY KEY,
        conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(16) NOT NULL,
        content TEXT NOT NULL,
        mode VARCHAR(32),
        model VARCHAR(64),
        timestamp BIGINT NOT NULL,
        duration_ms INTEGER DEFAULT 0,
        feedback VARCHAR(16),
        attachments JSONB DEFAULT '[]'::jsonb
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
        theme VARCHAR(16) DEFAULT 'dark',
        default_mode VARCHAR(32) DEFAULT 'developer',
        model VARCHAR(64) DEFAULT 'gemini-3.5-flash',
        sound_enabled BOOLEAN DEFAULT TRUE,
        custom_instructions TEXT DEFAULT '',
        updated_at BIGINT NOT NULL
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, timestamp ASC);`;

    console.log('✅ Connected to Neon PostgreSQL database.');
    return true;
  } catch (err: any) {
    console.warn('⚠️ Neon PostgreSQL initialization warning:', err?.message || err);
    return false;
  }
}

export async function dbGetConversations(): Promise<Conversation[]> {
  const sql = getSql();
  if (!sql) return [];

  const rows = await sql`
    SELECT 
      c.id,
      c.title,
      c.mode,
      c.pinned,
      c.created_at,
      c.updated_at,
      COUNT(m.id)::int as message_count
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
    GROUP BY c.id
    ORDER BY c.pinned DESC, c.updated_at DESC
  `;

  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    mode: r.mode as AIModeId,
    pinned: Boolean(r.pinned),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    messageCount: Number(r.message_count || 0),
  }));
}

export async function dbUpsertConversation(conv: Partial<Conversation> & { id: string }): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  const now = Date.now();
  const id = conv.id;
  const title = conv.title || 'New Conversation';
  const mode = conv.mode || 'developer';
  const pinned = conv.pinned ?? false;
  const createdAt = conv.createdAt ? Number(conv.createdAt) : now;
  const updatedAt = conv.updatedAt ? Number(conv.updatedAt) : now;

  await sql`
    INSERT INTO conversations (id, title, mode, pinned, created_at, updated_at)
    VALUES (${id}, ${title}, ${mode}, ${pinned}, ${createdAt}, ${updatedAt})
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      mode = EXCLUDED.mode,
      pinned = EXCLUDED.pinned,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function dbDeleteConversation(id: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`DELETE FROM conversations WHERE id = ${id}`;
}

export async function dbDeleteAllConversations(): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`DELETE FROM conversations`;
}

export async function dbGetMessages(conversationId: string): Promise<Message[]> {
  const sql = getSql();
  if (!sql) return [];

  const rows = await sql`
    SELECT 
      id,
      conversation_id,
      role,
      content,
      mode,
      model,
      timestamp,
      duration_ms,
      feedback,
      attachments
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY timestamp ASC
  `;

  return rows.map((r: any) => ({
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role as 'user' | 'assistant',
    content: r.content,
    mode: r.mode ? (r.mode as AIModeId) : undefined,
    model: r.model || undefined,
    timestamp: Number(r.timestamp),
    durationMs: r.duration_ms ? Number(r.duration_ms) : undefined,
    feedback: r.feedback ? (r.feedback as 'like' | 'dislike') : undefined,
    attachments: r.attachments && Array.isArray(r.attachments) ? r.attachments : undefined,
  }));
}

export async function dbSaveMessage(msg: Partial<Message> & { id: string; conversationId: string }): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  const timestamp = msg.timestamp ? Number(msg.timestamp) : Date.now();
  const attachmentsJson = JSON.stringify(msg.attachments || []);
  const title = (msg.content || 'Conversation').slice(0, 40);

  // Ensure parent conversation exists
  await sql`
    INSERT INTO conversations (id, title, mode, pinned, created_at, updated_at)
    VALUES (${msg.conversationId}, ${title}, ${msg.mode || 'developer'}, false, ${timestamp}, ${timestamp})
    ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at
  `;

  await sql`
    INSERT INTO messages (
      id, conversation_id, role, content, mode, model, timestamp, duration_ms, feedback, attachments
    ) VALUES (
      ${msg.id},
      ${msg.conversationId},
      ${msg.role || 'user'},
      ${msg.content || ''},
      ${msg.mode || null},
      ${msg.model || null},
      ${timestamp},
      ${msg.durationMs || 0},
      ${msg.feedback || null},
      ${attachmentsJson}::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      content = EXCLUDED.content,
      duration_ms = EXCLUDED.duration_ms,
      feedback = EXCLUDED.feedback,
      attachments = EXCLUDED.attachments
  `;

  // Update conversation updated_at
  await sql`UPDATE conversations SET updated_at = ${timestamp} WHERE id = ${msg.conversationId}`;
}

export async function dbUpdateMessageFeedback(messageId: string, feedback: 'like' | 'dislike' | null): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`UPDATE messages SET feedback = ${feedback} WHERE id = ${messageId}`;
}

export async function dbGetUserSettings(): Promise<Partial<UserSettings> | null> {
  const sql = getSql();
  if (!sql) return null;

  const rows = await sql`SELECT * FROM user_settings WHERE id = 'default'`;
  if (!rows || rows.length === 0) return null;

  const r = rows[0];
  return {
    theme: r.theme as any,
    defaultMode: r.default_mode as any,
    model: r.model,
    soundEnabled: Boolean(r.sound_enabled),
    customInstructions: r.custom_instructions || '',
  };
}

export async function dbSaveUserSettings(settings: Partial<UserSettings>): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  const now = Date.now();
  await sql`
    INSERT INTO user_settings (id, theme, default_mode, model, sound_enabled, custom_instructions, updated_at)
    VALUES (
      'default',
      ${settings.theme || 'dark'},
      ${settings.defaultMode || 'developer'},
      ${settings.model || 'gemini-3.5-flash'},
      ${settings.soundEnabled ?? true},
      ${settings.customInstructions || ''},
      ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      theme = COALESCE(EXCLUDED.theme, user_settings.theme),
      default_mode = COALESCE(EXCLUDED.default_mode, user_settings.default_mode),
      model = COALESCE(EXCLUDED.model, user_settings.model),
      sound_enabled = COALESCE(EXCLUDED.sound_enabled, user_settings.sound_enabled),
      custom_instructions = COALESCE(EXCLUDED.custom_instructions, user_settings.custom_instructions),
      updated_at = EXCLUDED.updated_at
  `;
}
