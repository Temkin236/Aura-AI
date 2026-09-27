import React, { useState } from 'react';
import { Message, AIModeId } from '../../types';
import { AuraSymbol } from '../aura/AuraSymbol';
import { MarkdownContent } from './MarkdownContent';
import { Copy, Check, RotateCw, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
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
      <div className="flex justify-end py-3 px-4 max-w-4xl mx-auto w-full group">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 bg-[#4A3026] text-[#FCFAF7] shadow-sm selection:bg-[#C7A46A] selection:text-[#2B1D17] transition-all">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
            {message.content}
          </p>
          <div className="flex items-center justify-end gap-2 mt-1.5 opacity-60 text-[11px] text-[#EDE1D5]">
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    );
  }

  // AI Message - Luxury Editorial Layout
  return (
    <div className="py-5 px-4 sm:px-6 max-w-4xl mx-auto w-full group transition-colors">
      <div className="flex items-start gap-4">
        {/* AURA Symbol Avatar */}
        <div className="pt-1 flex-shrink-0">
          <AuraSymbol
            size={30}
            animated={message.isStreaming}
            glow={message.isStreaming}
            variant="gold"
          />
        </div>

        {/* Content & Editorial Controls */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
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

            <span className="text-[11px] text-[#8A7A70] dark:text-[#8A6756]">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Body Content */}
          <div className="prose-aura">
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
            <div className="flex items-center gap-1 pt-2 opacity-85 transition-opacity">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-all"
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
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-all"
                  title="Regenerate response"
                  aria-label="Regenerate response"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}

              <div className="w-px h-3.5 bg-[#DCC9B8]/60 dark:bg-[#3A2921] mx-1" />

              <button
                onClick={() => handleFeedback('helpful')}
                className={`p-1.5 rounded-md transition-all ${
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
                className={`p-1.5 rounded-md transition-all ${
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
