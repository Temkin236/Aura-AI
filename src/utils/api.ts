import { Conversation, Message, UserSettings } from '../types';

export const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface DatabaseStatus {
  connected: boolean;
  provider: string;
}

export async function fetchHealthStatus(): Promise<{
  status: string;
  configured: boolean;
  model: string;
  version: string;
  database?: DatabaseStatus;
}> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchConversationsFromDb(): Promise<Conversation[]> {
  try {
    const res = await fetch(`${API_BASE}/api/conversations`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.conversations) ? data.conversations : [];
  } catch (err) {
    console.warn('Failed to fetch conversations from DB, falling back to cache:', err);
    return [];
  }
}

export async function saveConversationToDb(conv: Partial<Conversation> & { id: string }): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conv),
    });
  } catch (err) {
    console.warn('Failed to save conversation to DB:', err);
  }
}

export async function deleteConversationFromDb(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Failed to delete conversation from DB:', err);
  }
}

export async function clearAllConversationsFromDb(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/conversations`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Failed to clear conversations in DB:', err);
  }
}

export async function fetchMessagesFromDb(conversationId: string): Promise<Message[]> {
  try {
    const res = await fetch(`${API_BASE}/api/conversations/${encodeURIComponent(conversationId)}/messages`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.messages) ? data.messages : [];
  } catch (err) {
    console.warn('Failed to fetch messages from DB:', err);
    return [];
  }
}

export async function saveMessageToDb(msg: Partial<Message> & { id: string; conversationId: string }): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/conversations/${encodeURIComponent(msg.conversationId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
  } catch (err) {
    console.warn('Failed to save message to DB:', err);
  }
}

export async function updateMessageFeedbackInDb(messageId: string, feedback: 'like' | 'dislike' | null): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/messages/${encodeURIComponent(messageId)}/feedback`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    });
  } catch (err) {
    console.warn('Failed to update message feedback in DB:', err);
  }
}

export async function fetchUserSettingsFromDb(): Promise<Partial<UserSettings> | null> {
  try {
    const res = await fetch(`${API_BASE}/api/settings`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.settings || null;
  } catch (err) {
    console.warn('Failed to fetch user settings from DB:', err);
    return null;
  }
}

export async function saveUserSettingsToDb(settings: Partial<UserSettings>): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  } catch (err) {
    console.warn('Failed to save settings to DB:', err);
  }
}
