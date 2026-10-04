import React, { useState } from 'react';
import { Message, AIModeId } from '../../types';
import { AuraSymbol } from '../aura/AuraSymbol';
import { MarkdownContent } from './MarkdownContent';
import { Copy, Check, RotateCw, ThumbsUp, ThumbsDown, Sparkles, Paperclip, BookOpen, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { AI_MODES } from '../../data/modes';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
  onFeedback?: (messageId: string, feedback: 'helpful' | 'unhelpful') => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  onFeedback
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<'helpful' | 'unhelpful' | null>(
    message.feedback || null
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // copy fallback
    }
  };

  const handleFeedback = (type: 'helpful' | 'unhelpful') => {
    const nextFeedback = localFeedback === type ? null : type;
    setLocalFeedback(nextFeedback);
    if (nextFeedback && onFeedback) {
      onFeedback(message.id, nextFeedback);
    }
  };

  const modeData = message.mode ? AI_MODES[message.mode as AIModeId] : null;

  if (isUser) {
    return (
      <div className="flex justify-end py-2.5 sm:py-3 px-3 sm:px-4 max-w-4xl mx-auto w-full group">
        <div className="max-w-[90%] sm:max-w-[75%] rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 bg-[#4A3026] text-[#FCFAF7] shadow-sm selection:bg-[#C7A46A] selection:text-[#2B1D17] transition-all space-y-2">
          {/* User Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1">
              {message.attachments.map((att) => (
                <div key={att.id} className="rounded-xl overflow-hidden bg-black/20 p-1 border border-white/10">
                  {att.mimeType.startsWith('image/') && att.dataUrl ? (
                    <img
                      src={att.dataUrl}
                      alt={att.filename}
                      className="max-h-48 max-w-full rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#EDE1D5]">
                      <Paperclip className="w-3.5 h-3.5 text-[#C7A46A]" />
                      <span className="truncate max-w-[180px]">{att.filename}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
            {message.content}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1.5 opacity-60 text-[10px] sm:text-[11px] text-[#EDE1D5]">
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    );
  }

  // AI Message - Luxury Editorial Layout
  return (
    <div className="py-4 sm:py-5 px-3 sm:px-6 max-w-4xl mx-auto w-full group transition-colors">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* AURA Symbol Avatar */}
        <div className="pt-1 flex-shrink-0">
          <AuraSymbol
            size={28}
            animated={message.isStreaming}
            glow={message.isStreaming}
            variant="gold"
          />
        </div>

        {/* Content & Editorial Controls */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-serif text-sm font-semibold tracking-wide text-[#2B1D17] dark:text-[#FCFAF7]">
                AURA
              </span>
              {modeData && (
                <>
                  <span className="text-xs text-[#8A6756] dark:text-[#DCC9B8]/60">·</span>
                  <span className="text-xs text-[#6B493B] dark:text-[#DCC9B8] font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#C7A46A]" />
                    {modeData.name}
                  </span>
                </>
              )}
              {message.isFallback || message.model === 'aura-local-fallback' ? (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EDE1D5]/80 dark:bg-[#2B1D17] text-[#8A6756] dark:text-[#DCC9B8] border border-[#DCC9B8]/60 dark:border-[#3A2921]"
                  title="Offline local development engine active"
                >
                  Local Fallback
                </span>
              ) : message.model ? (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60"
                  title={`Live Gemini Model: ${message.model}`}
                >
                  {message.model}
                </span>
              ) : null}
            </div>

            <span className="text-[10px] sm:text-[11px] text-[#8A7A70] dark:text-[#8A6756] shrink-0">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* RAG Sources Accordion */}
          {message.sources && message.sources.length > 0 && (
            <div className="rounded-xl border border-[#DCC9B8]/80 dark:border-[#3A2921] bg-[#EDE1D5]/40 dark:bg-[#211814] overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setShowSources(!showSources)}
                className="w-full flex items-center justify-between px-3 py-2 text-[#6B493B] dark:text-[#DCC9B8] font-medium hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17]"
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#C7A46A]" />
                  <span>Grounding: {message.sources.length} retrieved verified source(s)</span>
                </div>
                {showSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showSources && (
                <div className="p-3 border-t border-[#DCC9B8]/60 dark:border-[#3A2921] space-y-2">
                  {message.sources.map((src, i) => (
                    <div key={i} className="p-2 rounded-lg bg-[#FCFAF7] dark:bg-[#2B1D17] border border-[#DCC9B8]/40 dark:border-[#3A2921]">
                      <div className="flex items-center justify-between font-semibold text-[#2B1D17] dark:text-[#FCFAF7]">
                        <span>{src.title}</span>
                        <span className="text-[10px] text-[#C7A46A]">{(src.similarity * 100).toFixed(0)}% match</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#8A7A70] dark:text-[#8A6756] italic">"{src.contentPreview}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tool Calls Accordion */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="rounded-xl border border-[#DCC9B8]/80 dark:border-[#3A2921] bg-[#EDE1D5]/40 dark:bg-[#211814] overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setShowTools(!showTools)}
                className="w-full flex items-center justify-between px-3 py-2 text-[#6B493B] dark:text-[#DCC9B8] font-medium hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17]"
              >
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#C7A46A]" />
                  <span>Executed Agent Tools: {message.toolCalls.map(t => t.toolName).join(', ')}</span>
                </div>
                {showTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showTools && (
                <div className="p-3 border-t border-[#DCC9B8]/60 dark:border-[#3A2921] space-y-2 font-mono">
                  {message.toolCalls.map((t, i) => (
                    <div key={i} className="p-2 rounded-lg bg-[#FCFAF7] dark:bg-[#2B1D17] border border-[#DCC9B8]/40 dark:border-[#3A2921] text-[11px]">
                      <div className="text-[#C7A46A] font-bold uppercase">{t.toolName} ({t.executionTimeMs}ms)</div>
                      <div className="text-[#8A7A70]">Input: {JSON.stringify(t.input)}</div>
                      <div className="text-[#2B1D17] dark:text-[#FCFAF7] mt-1">Output: {JSON.stringify(t.output)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Body Content */}
          <div className="prose-aura overflow-x-auto">
            {message.content ? (
              <MarkdownContent content={message.content} />
            ) : message.isStreaming ? (
              <div className="flex items-center gap-3 py-2 text-sm text-[#8A6756] dark:text-[#DCC9B8] italic">
                <span className="inline-block w-2 h-2 rounded-full bg-[#C7A46A] animate-ping" />
                <span>AURA is thinking...</span>
              </div>
            ) : null}
          </div>

          {/* Action Controls */}
          {!message.isStreaming && message.content && (
            <div className="flex items-center gap-1.5 pt-2 opacity-90 transition-opacity flex-wrap">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] active:scale-95 transition-all min-h-[34px]"
                title="Copy response"
                aria-label="Copy response"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#C7A46A]" />
                    <span className="text-[#C7A46A]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] active:scale-95 transition-all min-h-[34px]"
                  title="Regenerate response"
                  aria-label="Regenerate response"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}

              <div className="w-px h-3.5 bg-[#DCC9B8]/60 dark:bg-[#3A2921] mx-0.5" />

              <button
                onClick={() => handleFeedback('helpful')}
                className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg active:scale-95 transition-all ${
                  localFeedback === 'helpful'
                    ? 'text-[#C7A46A] bg-[#EDE1D5] dark:bg-[#2B1D17]'
                    : 'text-[#8A6756] dark:text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#2B1D17]'
                }`}
                title="Helpful"
                aria-label="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleFeedback('unhelpful')}
                className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg active:scale-95 transition-all ${
                  localFeedback === 'unhelpful'
                    ? 'text-[#C7A46A] bg-[#EDE1D5] dark:bg-[#2B1D17]'
                    : 'text-[#8A6756] dark:text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#2B1D17]'
                }`}
                title="Not helpful"
                aria-label="Not helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
