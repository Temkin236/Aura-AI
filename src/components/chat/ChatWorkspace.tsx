import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, AIModeId, UserSettings } from '../../types';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { WelcomeScreen } from './WelcomeScreen';
import { AuraSymbol } from '../aura/AuraSymbol';
import { AI_MODES } from '../../data/modes';
import { PanelLeft, Sparkles, Moon, Sun, RotateCcw } from 'lucide-react';

interface ChatWorkspaceProps {
  onOpenSettings: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userSettings: UserSettings;
}

function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  onOpenSettings,
  isDarkMode,
  onToggleTheme,
  userSettings,
}) => {
  // 1. Conversations state (with localStorage persistence)
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('aura_conversations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    return conversations.length > 0 ? conversations[0].id : null;
  });

  // 2. Messages map state (with localStorage persistence)
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem('aura_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return {};
  });

  const [currentMode, setCurrentMode] = useState<AIModeId>(userSettings.defaultMode || 'developer');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aura_conversations', JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  useEffect(() => {
    try {
      localStorage.setItem('aura_messages', JSON.stringify(messagesMap));
    } catch {}
  }, [messagesMap]);

  // Auto-scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const activeMessages = activeConversationId ? messagesMap[activeConversationId] || [] : [];

  useEffect(() => {
    scrollToBottom(false);
  }, [activeConversationId]);

  useEffect(() => {
    if (isGenerating) {
      scrollToBottom(true);
    }
  }, [activeMessages, isGenerating]);

  // Create New Conversation
  const handleNewConversation = (initialMode: AIModeId = currentMode) => {
    const newId = generateId();
    const newConv: Conversation = {
      id: newId,
      title: 'New Conversation',
      mode: initialMode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newId);
    setCurrentMode(initialMode);
    return newId;
  };

  // Delete Conversation
  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setMessagesMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Rename Conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  // Pin / Unpin Conversation
  const handleTogglePin = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);

    if (activeConversationId) {
      setMessagesMap((prev) => {
        const msgs = prev[activeConversationId] || [];
        return {
          ...prev,
          [activeConversationId]: msgs.map((m) =>
            m.isStreaming ? { ...m, isStreaming: false } : m
          ),
        };
      });
    }
  };

  // Send Message with Real Gemini SSE Streaming
  const handleSendMessage = async (text: string, mode: AIModeId = currentMode) => {
    if (!text.trim() || isGenerating) return;

    let convId = activeConversationId;
    let isFirstMessage = false;

    if (!convId || !conversations.some((c) => c.id === convId)) {
      convId = handleNewConversation(mode);
      isFirstMessage = true;
    } else {
      const existingMsgs = messagesMap[convId] || [];
      if (existingMsgs.length === 0) {
        isFirstMessage = true;
      }
    }

    // Auto-generate title from first user prompt
    if (isFirstMessage) {
      const cleanTitle = text.trim().slice(0, 32) + (text.trim().length > 32 ? '...' : '');
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId ? { ...c, title: cleanTitle, mode, updatedAt: Date.now() } : c
        )
      );
    }

    const userMsgId = `msg-user-${Date.now()}`;
    const assistantMsgId = `msg-ai-${Date.now()}`;

    const userMessage: Message = {
      id: userMsgId,
      conversationId: convId,
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
      mode,
    };

    const initialAssistantMessage: Message = {
      id: assistantMsgId,
      conversationId: convId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      mode,
      isStreaming: true,
    };

    // Append user message & placeholder assistant message
    const previousHistory = (messagesMap[convId] || []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessagesMap((prev) => ({
      ...prev,
      [convId!]: [...(prev[convId!] || []), userMessage, initialAssistantMessage],
    }));

    setIsGenerating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message: text.trim(),
          history: previousHistory,
          mode,
          model: userSettings.model || 'gemini-2.5-flash',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorText = 'Failed to connect to AI service.';
        try {
          const errJson = await response.json();
          if (errJson.error) errorText = errJson.error;
        } catch {}
        throw new Error(errorText);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Readable stream not supported in this browser.');
      }

      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('data:')) continue;

          const dataPayload = trimmedLine.slice(5).trim();
          if (dataPayload === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataPayload);
            if (parsed.error) {
              accumulatedContent = parsed.error;
              setMessagesMap((prev) => ({
                ...prev,
                [convId!]: (prev[convId!] || []).map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: accumulatedContent, isStreaming: false, isError: true }
                    : m
                ),
              }));
              setIsGenerating(false);
              return;
            }

            if (parsed.text) {
              accumulatedContent += parsed.text;
              setMessagesMap((prev) => ({
                ...prev,
                [convId!]: (prev[convId!] || []).map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: accumulatedContent, isStreaming: true }
                    : m
                ),
              }));
            }
          } catch {}
        }
      }

      // Mark generation complete
      setMessagesMap((prev) => ({
        ...prev,
        [convId!]: (prev[convId!] || []).map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: accumulatedContent || 'No response generated.', isStreaming: false }
            : m
        ),
      }));
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted intentionally
      } else {
        const errorMessage = err?.message || "AURA couldn't reach Gemini. Please try again.";
        setMessagesMap((prev) => ({
          ...prev,
          [convId!]: (prev[convId!] || []).map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: errorMessage,
                  isStreaming: false,
                  isError: true,
                }
              : m
          ),
        }));
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate Latest Assistant Response
  const handleRegenerate = () => {
    if (!activeConversationId || isGenerating) return;
    const msgs = messagesMap[activeConversationId] || [];
    if (msgs.length === 0) return;

    // Find the last user message
    let lastUserMessageIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = msgs[lastUserMessageIndex];
    // Trim history back to before this user message
    const trimmedMsgs = msgs.slice(0, lastUserMessageIndex);

    setMessagesMap((prev) => ({
      ...prev,
      [activeConversationId]: trimmedMsgs,
    }));

    // Resend
    handleSendMessage(lastUserMessage.content, lastUserMessage.mode || currentMode);
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F3ED] dark:bg-[#17110E] text-[#2B1D17] dark:text-[#EDE1D5]">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewConversation={() => handleNewConversation()}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePinConversation={handleTogglePin}
        isDesktopOpen={isDesktopSidebarOpen}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onToggleCollapse={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
        onOpenSettings={onOpenSettings}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Workspace Top Bar */}
        <header className="h-14 px-4 flex items-center justify-between border-b border-[#EDE1D5] dark:border-[#2B1D17] bg-[#FCFAF7]/80 dark:bg-[#1E1511]/80 backdrop-blur-md z-10 select-none">
          <div className="flex items-center gap-2 min-w-0">
            {/* Sidebar toggle buttons */}
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileSidebarOpen(true);
                } else {
                  setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
                }
              }}
              className="p-2 rounded-xl text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] active:scale-95 transition-all"
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 min-w-0 truncate">
              <AuraSymbol size={18} variant="gold" />
              <h2 className="font-serif font-medium text-sm text-[#2B1D17] dark:text-[#FCFAF7] truncate">
                {activeConv ? activeConv.title : 'AURA AI'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] active:scale-95 transition-all"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#C7A46A]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-2 scrollbar-thin">
          {activeMessages.length === 0 ? (
            <WelcomeScreen
              currentMode={currentMode}
              onSelectPrompt={(prompt, mode) => {
                setCurrentMode(mode);
                handleSendMessage(prompt, mode);
              }}
            />
          ) : (
            activeMessages.map((msg, idx) => (
              <ChatMessage
                key={msg.id || idx}
                message={msg}
                isLatest={idx === activeMessages.length - 1}
                onRegenerate={handleRegenerate}
              />
            ))
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Bottom Composer Area */}
        <div className="p-3 sm:p-4 bg-gradient-to-t from-[#F8F3ED] via-[#F8F3ED] dark:from-[#17110E] dark:via-[#17110E] to-transparent">
          <ChatComposer
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            isGenerating={isGenerating}
            currentMode={currentMode}
            onSelectMode={setCurrentMode}
            placeholder={`Ask AURA in ${AI_MODES[currentMode]?.name || 'Developer'} mode...`}
          />
        </div>
      </div>
    </div>
  );
};
