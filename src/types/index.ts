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

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl?: string;
  createdAt?: string | number;
}

export interface RagSource {
  documentId: string;
  title: string;
  chunkIndex: number;
  similarity: number;
  contentPreview: string;
}

export interface ToolCallInfo {
  toolName: string;
  input: Record<string, any>;
  output?: any;
  status: 'running' | 'success' | 'error';
  executionTimeMs?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  mode?: AIModeId;
  model?: string;
  isStreaming?: boolean;
  isFallback?: boolean;
  warning?: string;
  feedback?: 'helpful' | 'unhelpful' | null;
  attachments?: Attachment[];
  sources?: RagSource[];
  toolCalls?: ToolCallInfo[];
}

export interface Conversation {
  id: string;
  title: string;
  mode: AIModeId;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  archived?: boolean;
  messageCount: number;
  tags?: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin';
  joinedAt: number;
  stats: {
    conversationsCreated: number;
    messagesSent: number;
    favoriteMode: AIModeId;
  };
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultMode: AIModeId;
  model: string;
  temperature: number;
  saveHistory: boolean;
  autoTitle: boolean;
  streamResponses: boolean;
  soundEffects: boolean;
}

export interface SystemPromptConfig {
  id: string;
  modeId: AIModeId;
  title: string;
  systemInstruction: string;
  temperature: number;
  maxTokens: number;
  status: 'active' | 'draft' | 'archived';
  version: number;
  updatedAt: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'Google Gemini' | 'OpenAI';
  modelId: string;
  status: 'active' | 'ready' | 'experimental';
  contextWindow: string;
  isDefault: boolean;
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalMessages: number;
  avgResponseTimeMs: number;
  errorRatePercent: number;
  modelUsage: {
    name: string;
    percentage: number;
  }[];
  dailyActivity: {
    date: string;
    conversations: number;
    messages: number;
  }[];
}
