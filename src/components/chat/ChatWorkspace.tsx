import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, AIModeId, UserSettings } from '../../types';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatComposer } from './ChatComposer';
import { WelcomeScreen } from './WelcomeScreen';
import { AuraSymbol } from '../aura/AuraSymbol';
import { AI_MODES, INITIAL_CONVERSATIONS, INITIAL_MESSAGES_MAP } from '../../data/modes';
import { 
  PanelLeft, 
  Share2, 
  Sparkles, 
  Download, 
  Trash2, 
  Settings, 
  SlidersHorizontal 
} from 'lucide-react';

interface ChatWorkspaceProps {
  onOpenSettings: () => void;
  onOpenAdmin: () => void;
  onOpenLanding: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  userSettings: UserSettings;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  onOpenSettings,
  onOpenAdmin,
  onOpenLanding,
  isDarkMode,
  onToggleTheme,
  userSettings
}) => {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('aura_conversations');
      return saved ? JSON.parse(saved) : INITIAL_CONVERSATIONS;
    } catch {
      return INITIAL_CONVERSATIONS;
    }
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>('conv-1');

  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem('aura_messages');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }

    // Initial seed messages
    const map: Record<string, Message[]> = {};
    Object.entries(INITIAL_MESSAGES_MAP).forEach(([id, msgs]) => {
      map[id] = msgs.map((m, idx) => ({
        id: `msg-${id}-${idx}`,
        conversationId: id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }));
    });
    return map;
  });

  const [currentMode, setCurrentMode] = useState<AIModeId>(userSettings.defaultMode || 'developer');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debounced safe local storage sync (avoids writing to disk on every streamed token)
  useEffect(() => {
    try {
      localStorage.setItem('aura_conversations', JSON.stringify(conversations));
    } catch (e) {
      console.warn('LocalStorage quota or write error:', e);
    }
  }, [conversations]);

  useEffect(() => {
    // Skip saving intermediate states during active generation
    if (isGenerating) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem('aura_messages', JSON.stringify(messagesMap));
      } catch (e) {
        console.warn('LocalStorage quota or write error:', e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [messagesMap, isGenerating]);

  // Current active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const currentMessages = activeConversationId ? (messagesMap[activeConversationId] || []) : [];

  // Sync currentMode with conversation if already set
  useEffect(() => {
    if (activeConversation) {
      setCurrentMode(activeConversation.mode);
    }
  }, [activeConversationId]);

  // Scroll to bottom on message change or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isGenerating]);

  // Handle New Conversation
  const handleNewConversation = (initialMode: AIModeId = currentMode) => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New conversation',
      mode: initialMode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newId);
    setMessagesMap((prev) => ({ ...prev, [newId]: [] }));
    setMobileDrawerOpen(false);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setMessagesMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  const handleArchiveConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived: !c.archived } : c))
    );
  };

  const handleTogglePin = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const handleSendMessage = async (text: string, modeToUse: AIModeId) => {
    let convId = activeConversationId;

    // If no active conversation, create one
    if (!convId) {
      convId = `conv-${Date.now()}`;
      const newConv: Conversation = {
        id: convId,
        title: text.slice(0, 32) + (text.length > 32 ? '...' : ''),
        mode: modeToUse,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 1
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(convId);
      setMessagesMap((prev) => ({ ...prev, [convId as string]: [] }));
    }

    const currentId = convId as string;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      conversationId: currentId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      mode: modeToUse
    };

    const assistantMessageId = `msg-ai-${Date.now()}`;
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      conversationId: currentId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      mode: modeToUse,
      isStreaming: true
    };

    // Update state with user message and streaming placeholder
    setMessagesMap((prev) => ({
      ...prev,
      [currentId]: [...(prev[currentId] || []), userMessage, initialAssistantMessage]
    }));

    // Update conversation title if default
    const currentConv = conversations.find((c) => c.id === currentId);
    if (currentConv && (currentConv.title === 'New conversation' || currentConv.messageCount === 0)) {
      const generatedTitle = text.slice(0, 36) + (text.length > 36 ? '...' : '');
      setConversations((prev) =>
        prev.map((c) => (c.id === currentId ? { ...c, title: generatedTitle, messageCount: c.messageCount + 2 } : c))
      );
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      const modeConfig = AI_MODES[modeToUse];
      const conversationHistory = (messagesMap[currentId] || []).concat(userMessage);

      // Call real server-side streaming SSE endpoint
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          prompt: text,
          mode: modeToUse,
          model: userSettings.model || 'gemini-2.5-flash',
          temperature: userSettings.temperature ?? 0.7,
          systemInstruction: modeConfig.systemPrompt,
          history: conversationHistory.slice(-8).map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            content: m.content
          }))
        })
      });

      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "You're sending messages a little too quickly. Please try again in a moment.");
      }

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      // Check if response is streaming SSE
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
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
            const dataStr = trimmedLine.slice(5).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulated += parsed.text;
                const currentContent = accumulated;
                setMessagesMap((prev) => {
                  const convMsgs = prev[currentId] || [];
                  return {
                    ...prev,
                    [currentId]: convMsgs.map((m) =>
                      m.id === assistantMessageId
                        ? {
                            ...m,
                            content: currentContent,
                            model: parsed.model || m.model,
                            isFallback: parsed.isFallback !== undefined ? parsed.isFallback : m.isFallback,
                            warning: parsed.warning || m.warning
                          }
                        : m
                    )
                  };
                });
              } else if (parsed.warning || parsed.isFallback !== undefined) {
                setMessagesMap((prev) => {
                  const convMsgs = prev[currentId] || [];
                  return {
                    ...prev,
                    [currentId]: convMsgs.map((m) =>
                      m.id === assistantMessageId
                        ? {
                            ...m,
                            model: parsed.model || m.model,
                            isFallback: parsed.isFallback !== undefined ? parsed.isFallback : m.isFallback,
                            warning: parsed.warning || m.warning
                          }
                        : m
                    )
                  };
                });
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      } else {
        // Fallback for standard JSON response
        const data = await response.json();
        const fullContent = data.text || data.response || 'I am listening. How can we explore this further?';
        setMessagesMap((prev) => {
          const convMsgs = prev[currentId] || [];
          return {
            ...prev,
            [currentId]: convMsgs.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: fullContent,
                    isStreaming: false,
                    model: data.model,
                    isFallback: data.isFallback,
                    warning: data.warning
                  }
                : m
            )
          };
        });
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        // User deliberately stopped generation
      } else {
        const errMsg = (err as Error)?.message || 'Chat generation error occurred.';
        console.error('Chat generation error:', errMsg);
        const fallbackText = errMsg.includes('quickly')
          ? errMsg
          : getModeFallback(modeToUse, text);

        setMessagesMap((prev) => {
          const convMsgs = prev[currentId] || [];
          return {
            ...prev,
            [currentId]: convMsgs.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: fallbackText, isStreaming: false, isFallback: true, warning: errMsg }
                : m
            )
          };
        });
      }
    } finally {
      setIsGenerating(false);
      setMessagesMap((prev) => {
        const convMsgs = prev[currentId] || [];
        return {
          ...prev,
          [currentId]: convMsgs.map((m) =>
            m.id === assistantMessageId ? { ...m, isStreaming: false } : m
          )
        };
      });
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleClearMessages = () => {
    if (activeConversationId) {
      setMessagesMap((prev) => ({ ...prev, [activeConversationId]: [] }));
    }
  };

  const handleExportConversation = () => {
    if (!activeConversation) return;
    const exportData = {
      title: activeConversation.title,
      mode: activeConversation.mode,
      exportedAt: new Date().toISOString(),
      messages: currentMessages
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.replace(/\s+/g, '_')}_aura.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F3ED] dark:bg-[#17110E] text-[#2B1D17] dark:text-[#EDE1D5]">
      {/* Sidebar (Desktop collapsible & Mobile drawer) */}
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setMobileDrawerOpen(false);
        }}
        onNewConversation={() => handleNewConversation(currentMode)}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onArchiveConversation={handleArchiveConversation}
        onTogglePinConversation={handleTogglePin}
        isDesktopOpen={sidebarOpen}
        isMobileOpen={mobileDrawerOpen}
        onCloseMobile={() => setMobileDrawerOpen(false)}
        onToggleCollapse={() => setSidebarOpen(!sidebarOpen)}
        onOpenSettings={onOpenSettings}
        onOpenAdmin={onOpenAdmin}
        onOpenLanding={onOpenLanding}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Workspace Top Header */}
        <header className="h-14 sm:h-16 px-2.5 sm:px-6 flex items-center justify-between border-b border-[#DCC9B8]/60 dark:border-[#3A2921] bg-[#FCFAF7]/85 dark:bg-[#17110E]/85 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
            {/* Sidebar Toggle for Desktop and Mobile */}
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileDrawerOpen(true);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#211814] active:scale-95 transition-all shrink-0"
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="font-serif text-sm sm:text-base md:text-lg font-medium text-[#2B1D17] dark:text-[#FCFAF7] truncate max-w-[130px] sm:max-w-xs md:max-w-md">
                {activeConversation?.title || 'What would you like to explore?'}
              </span>

              {activeConversation && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EDE1D5]/60 dark:bg-[#2B1D17] text-[#6B493B] dark:text-[#DCC9B8] border border-[#DCC9B8]/70 dark:border-[#3A2921] shrink-0">
                  <Sparkles className="w-3 h-3 text-[#C7A46A]" />
                  {AI_MODES[activeConversation.mode]?.name}
                </span>
              )}
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={handleExportConversation}
              disabled={currentMessages.length === 0}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-[#8A6756] dark:text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#211814] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Export conversation"
              aria-label="Export conversation"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleClearMessages}
              disabled={currentMessages.length === 0}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-[#8A6756] dark:text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#211814] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Clear messages in conversation"
              aria-label="Clear messages"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenLanding}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCC9B8] dark:border-[#3A2921] text-xs font-medium text-[#4A3026] dark:text-[#EDE1D5] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#211814] active:scale-95 transition-all min-h-[36px]"
            >
              <span>Explore AURA</span>
            </button>
          </div>
        </header>

        {/* Message Scrollable Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
          {currentMessages.length === 0 ? (
            <WelcomeScreen
              currentMode={currentMode}
              onSelectPrompt={(prompt, mode) => {
                setCurrentMode(mode);
                handleSendMessage(prompt, mode);
              }}
            />
          ) : (
            <div className="flex-1 py-4 sm:py-6">
              {currentMessages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onRegenerate={() => {
                    // find last user message and resend
                    const lastUserMsg = [...currentMessages]
                      .reverse()
                      .find((m) => m.role === 'user');
                    if (lastUserMsg) {
                      handleSendMessage(lastUserMsg.content, currentMode);
                    }
                  }}
                />
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Floating Composer */}
        <div className="w-full flex-shrink-0">
          <ChatComposer
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            isGenerating={isGenerating}
            currentMode={currentMode}
            onSelectMode={(mode) => setCurrentMode(mode)}
          />
        </div>
      </main>
    </div>
  );
};

// Thoughtful, rich mode fallback when offline or before backend responds
function getModeFallback(mode: AIModeId, prompt: string): string {
  switch (mode) {
    case 'developer':
      return `### Architectural Reflection

Here is an elegant conceptual approach to \`${prompt.slice(0, 40)}\`:

\`\`\`python
# Clean, idiomatic implementation pattern
def solve_problem(context: dict) -> dict:
    """
    Modular implementation adhering to first-principles design.
    """
    result = {"status": "optimized", "insights": context}
    return result
\`\`\`

1. **First Principles**: Decouple stateful mutation from query patterns.
2. **Robust Invariants**: Guarantee deterministic handling across concurrent threads.
3. **Ergonomics**: Maintain clean interfaces that leave no ambiguity for caller code.`;

    case 'creative':
      return `### The Architecture of Light and Intention

*"To create freely is not to lack discipline; it is to master simplicity until only the essential remains."*

Regarding your prompt: let us view it through a lens of tactile resonance. Rather than constructing mere utilities, design as though every contour invites touch, every pause allows contemplation, and every stroke carries purpose.`;

    case 'tutor':
      return `### Breaking It Down from First Principles

To understand this concept deeply, consider this guiding mental model:

1. **The Core Intuition**: Every complex structure is simply a repetition of elementary rules.
2. **Step-by-step**: First establish the baseline state, then introduce the perturbation, and observe how the equilibrium reasserts itself.
3. **Checkpoint**: Does this mental model feel intuitive, or would you like to explore an analogy grounded in physical systems?`;

    case 'professional':
      return `### Executive Synthesis & Action Vector

**Executive Summary:**
A structured approach to your objective yields immediate operational clarity.

- **Primary Objective**: Align core deliverables with high-leverage outcomes.
- **Risk Mitigation**: Establish continuous feedback loops to detect drift early.
- **Next Step**: Synthesize key stakeholder inputs before scaling execution.`;

    default:
      return `Thank you for sharing that with me. I appreciate how you are approaching this question.

When we pause and examine this thoughtfully, the most interesting aspect is how balance and clarity can be maintained without rushing.

What part of this would you like to unpack first together?`;
  }
}
