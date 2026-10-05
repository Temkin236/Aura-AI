export type AIModeId = 'friendly' | 'developer' | 'tutor' | 'creative' | 'professional';

export interface AIMode {
  id: AIModeId;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  systemPrompt: string;
  temperature: number;
  badgeColor: string;
  suggestedPrompts: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mode?: AIModeId;
  model?: string;
  isStreaming?: boolean;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  mode: AIModeId;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  messageCount: number;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultMode: AIModeId;
  model: string;
}
