/**
 * AURA AI V2 — PostgreSQL Database Foundation Types
 * Strongly typed representations of the 7 core database tables.
 */

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface DbProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbConversation {
  id: string;
  user_id: string;
  title: string;
  mode: string;
  pinned: boolean;
  archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export type DbMessageRole = 'user' | 'assistant' | 'system';

export interface DbMessage {
  id: string;
  conversation_id: string;
  role: DbMessageRole;
  content: string;
  mode: string | null;
  model: string | null;
  created_at: Date;
}

export interface DbSettings {
  id: string;
  user_id: string;
  theme: string;
  default_mode: string;
  model: string;
  temperature: number;
  save_history: boolean;
  auto_title: boolean;
  stream_responses: boolean;
  sound_effects: boolean;
  preferences: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type DbRoleType = 'USER' | 'ADMIN';

export interface DbAdminRole {
  id: string;
  user_id: string;
  role: DbRoleType;
  created_at: Date;
}

export interface DbAuditLog {
  id: string;
  admin_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface DbSession {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: Date;
  expires_at: Date;
}

export interface DbAttachment {
  id: string;
  user_id: string | null;
  conversation_id: string | null;
  message_id: string | null;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string | null;
  data_url?: string | null;
  created_at: Date;
}

export interface DbDocument {
  id: string;
  user_id: string;
  title: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  total_chunks: number;
  created_at: Date;
  updated_at: Date;
}

export interface DbDocumentChunk {
  id: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  created_at: Date;
}

export interface DbShareLink {
  id: string;
  user_id: string;
  conversation_id: string;
  share_token: string;
  is_active: boolean;
  view_count: number;
  created_at: Date;
  expires_at: Date | null;
}

export interface SafeUser {
  id: string;
  email: string;
  role?: DbRoleType;
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
  };
}

