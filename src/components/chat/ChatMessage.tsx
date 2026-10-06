import React, { useState } from 'react';
import { Message, AIModeId } from '../../types';
import { AuraSymbol } from '../aura/AuraSymbol';
import { MarkdownContent } from './MarkdownContent';
import { Copy, Check, RotateCw, AlertCircle } from 'lucide-react';
import { AI_MODES } from '../../data/modes';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
  isLatest?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  isLatest = false,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard fallback
    }
  };

  const modeData = message.mode ? AI_MODES[message.mode as AIModeId] : null;

  if (isUser) {
    return (
      <div className="flex justify-end py-2 px-2 sm:px-4 max-w-4xl mx-auto w-full group">
        <div className="max-w-[92%] sm:max-w-[80%] rounded-2xl rounded-tr-xs px-4 py-2.5 sm:py-3 bg-[#4A3026] dark:bg-[#33221A] text-[#FCFAF7] shadow-xs selection:bg-[#C7A46A] selection:text-[#2B1D17] transition-all space-y-1">
          <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap font-sans break-words">
            {message.content}
          </p>
          <div className="flex items-center justify-end gap-2 text-[10px] text-[#DCC9B8]/70 pt-0.5 select-none">
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#FCFAF7]"
              title="Copy message"
            >
              {copied ? <Check className="w-3 h-3 text-[#C7A46A]" /> : <Copy className="w-3 h-3" />}
            </button>
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // AI Message Layout
  return (
    <div className="py-3 sm:py-4 px-2 sm:px-4 max-w-4xl mx-auto w-full group transition-colors">
      <div className="flex items-start gap-2.5 sm:gap-3.5">
        {/* AURA Symbol Avatar */}
        <div className="pt-0.5 flex-shrink-0">
          <AuraSymbol
            size={24}
            animated={message.isStreaming}
            glow={message.isStreaming}
            variant="gold"
          />
        </div>

        {/* Content & Controls */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Metadata */}
          <div className="flex items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className="font-serif font-medium text-xs sm:text-sm text-[#2B1D17] dark:text-[#FCFAF7]">
                AURA AI
              </span>
              {modeData && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#EDE1D5]/60 dark:bg-[#2B1D17] text-[#6B493B] dark:text-[#C7A46A] font-medium">
                  {modeData.name}
                </span>
              )}
            </div>

            {/* Actions: Copy & Regenerate */}
            {!message.isStreaming && message.content && (
              <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  className="p-1 rounded-lg text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] active:scale-95 transition-all"
                  title="Copy response"
                  aria-label="Copy response"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#C7A46A]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {isLatest && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1 rounded-lg text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] active:scale-95 transition-all"
                    title="Regenerate response"
                    aria-label="Regenerate response"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Error Banner */}
          {message.isError ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">{message.content}</p>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="mt-1 underline hover:no-underline text-amber-900 dark:text-amber-100 font-medium"
                  >
                    Retry request
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Markdown Content Body */
            <div className="text-sm sm:text-[15px] leading-relaxed text-[#2B1D17] dark:text-[#EDE1D5] break-words">
              <MarkdownContent content={message.content || (message.isStreaming ? 'Thinking...' : '')} />
            </div>
          )}

          {/* Streaming Indicator */}
          {message.isStreaming && (
            <div className="flex items-center gap-1.5 text-xs text-[#C7A46A] pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7A46A] animate-pulse" />
              <span className="font-serif italic text-xs">AURA is composing...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
