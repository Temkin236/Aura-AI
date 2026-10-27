import React, { useState, useEffect } from 'react';
import { Message, AIModeId } from '../../types';
import { AuraSymbol } from '../aura/AuraSymbol';
import { MarkdownContent } from './MarkdownContent';
import {
  Copy,
  Check,
  RotateCw,
  AlertCircle,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Share2,
} from 'lucide-react';
import { AI_MODES } from '../../data/modes';
import { speechController, isSpeechSynthesisSupported } from '../../utils/speech';
import { soundFx } from '../../utils/sound';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
  onToggleFeedback?: (id: string, feedback: 'like' | 'dislike') => void;
  isLatest?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  onToggleFeedback,
  isLatest = false,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        speechController.stopSpeaking();
      }
    };
  }, [isSpeaking]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      soundFx.playClick();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      speechController.stopSpeaking();
      setIsSpeaking(false);
    } else {
      soundFx.playClick();
      setIsSpeaking(true);
      speechController.speak(
        message.content,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
        () => setIsSpeaking(false)
      );
    }
  };

  const handleShare = async () => {
    soundFx.playClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AURA AI Message',
          text: message.content,
        });
        return;
      } catch {}
    }
    // Fallback: copy to clipboard and show toast
    try {
      await navigator.clipboard.writeText(message.content);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    } catch {}
  };

  const modeData = message.mode ? AI_MODES[message.mode as AIModeId] : null;

  if (isUser) {
    return (
      <div className="flex justify-end py-2 px-2 sm:px-4 max-w-4xl mx-auto w-full group">
        <div className="max-w-[92%] sm:max-w-[80%] rounded-2xl rounded-tr-xs px-4 py-3 bg-[#4A3026] dark:bg-[#33221A] text-[#FCFAF7] shadow-sm selection:bg-[#C7A46A] selection:text-[#2B1D17] transition-all space-y-2 border border-[#6B493B]/40 dark:border-[#4A3026]">
          {/* User Attached Documents */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1 border-b border-[#6B493B]/40">
              {message.attachments.map((att, aIdx) => (
                <div
                  key={aIdx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#2B1D17]/70 text-[11px] font-mono text-[#DCC9B8]"
                >
                  <FileText className="w-3 h-3 text-[#C7A46A]" />
                  <span className="truncate max-w-[140px]">{att.name}</span>
                  <span className="text-[9px] text-[#8A7A70]">({Math.round(att.size / 1024)}kb)</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap font-sans break-words">
            {message.content}
          </p>

          <div className="flex items-center justify-end gap-2 text-[10px] text-[#DCC9B8]/70 pt-0.5 select-none">
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#FCFAF7] cursor-pointer"
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
            size={26}
            animated={message.isStreaming}
            glow={message.isStreaming || isSpeaking}
            variant="gold"
          />
        </div>

        {/* Content & Controls */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Metadata */}
          <div className="flex items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className="font-serif font-medium text-xs sm:text-sm text-[#2B1D17] dark:text-[#FCFAF7] tracking-wide">
                AURA AI
              </span>
              {modeData && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDE1D5]/60 dark:bg-[#2B1D17] text-[#6B493B] dark:text-[#C7A46A] font-medium border border-[#DCC9B8]/40 dark:border-[#3A2921]">
                  {modeData.name}
                </span>
              )}
              {isSpeaking && (
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[#C7A46A]/15 text-[#C7A46A] text-[10px] font-medium">
                  <div className="w-1 bg-[#C7A46A] rounded-full animate-wave-1 mr-0.5" />
                  <div className="w-1 bg-[#C7A46A] rounded-full animate-wave-2 mr-0.5" />
                  <div className="w-1 bg-[#C7A46A] rounded-full animate-wave-3 mr-0.5" />
                  <div className="w-1 bg-[#C7A46A] rounded-full animate-wave-4 mr-1" />
                  <span>Reading aloud</span>
                </div>
              )}
            </div>

            {/* Actions: Copy, Read Aloud, Regenerate, Share */}
            {!message.isStreaming && message.content && (
              <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                {isSpeechSynthesisSupported() && (
                  <button
                    onClick={handleToggleSpeak}
                    className={`p-1.5 rounded-lg text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] active:scale-95 transition-all cursor-pointer ${
                      isSpeaking ? 'text-[#C7A46A] bg-[#EDE1D5]/60 dark:bg-[#2B1D17]' : ''
                    }`}
                    title={isSpeaking ? 'Stop reading' : 'Read aloud'}
                    aria-label="Read aloud"
                  >
                    {isSpeaking ? (
                      <VolumeX className="w-3.5 h-3.5 text-[#C7A46A]" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] active:scale-95 transition-all cursor-pointer"
                  title="Copy response"
                  aria-label="Copy response"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-[#C7A46A]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={handleShare}
                  className="p-1.5 rounded-lg text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] active:scale-95 transition-all cursor-pointer"
                  title="Share response"
                  aria-label="Share response"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                {isLatest && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-lg text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] active:scale-95 transition-all cursor-pointer"
                    title="Regenerate response"
                    aria-label="Regenerate response"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Share Toast Notification */}
          {showShareToast && (
            <div className="text-[11px] text-[#C7A46A] font-medium animate-in fade-in duration-150">
              ✓ Copied response to clipboard for sharing
            </div>
          )}

          {/* Error Banner */}
          {message.isError ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200 shadow-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">{message.content}</p>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="mt-1 underline hover:no-underline text-amber-900 dark:text-amber-100 font-medium cursor-pointer"
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
            <div className="flex items-center gap-2 text-xs text-[#C7A46A] pt-1">
              <span className="w-2 h-2 rounded-full bg-[#C7A46A] animate-ping" />
              <span className="font-serif italic text-xs tracking-wide">AURA is composing...</span>
            </div>
          )}

          {/* Response Metrics & Feedback Footer */}
          {!message.isStreaming && !message.isError && message.content && (
            <div className="flex items-center justify-between text-[11px] text-[#8A7A70] dark:text-[#8A6756] pt-1.5 select-none border-t border-[#EDE1D5]/40 dark:border-[#2B1D17]/40">
              <div className="flex items-center gap-2">
                <span>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>•</span>
                <span>
                  {message.content.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                {typeof message.durationMs === 'number' && message.durationMs > 0 && (
                  <>
                    <span>•</span>
                    <span>{(message.durationMs / 1000).toFixed(1)}s</span>
                  </>
                )}
              </div>

              {/* Feedback Buttons */}
              {onToggleFeedback && (
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onToggleFeedback(message.id, 'like');
                    }}
                    className={`p-1 rounded-md hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors cursor-pointer ${
                      message.feedback === 'like' ? 'text-[#C7A46A]' : ''
                    }`}
                    title="Helpful response"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      onToggleFeedback(message.id, 'dislike');
                    }}
                    className={`p-1 rounded-md hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors cursor-pointer ${
                      message.feedback === 'dislike' ? 'text-amber-600 dark:text-amber-400' : ''
                    }`}
                    title="Needs improvement"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
