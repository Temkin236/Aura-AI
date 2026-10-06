import React, { useState, useRef, useEffect } from 'react';
import { AIModeId } from '../../types';
import { ModeSelector } from './ModeSelector';
import { ArrowUp, Square } from 'lucide-react';

interface ChatComposerProps {
  onSendMessage: (text: string, mode: AIModeId) => void;
  onStopGeneration?: () => void;
  isGenerating: boolean;
  currentMode: AIModeId;
  onSelectMode: (mode: AIModeId) => void;
  placeholder?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  currentMode,
  onSelectMode,
  placeholder = 'Ask AURA anything...',
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating) {
      if (onStopGeneration) onStopGeneration();
      return;
    }

    const trimmed = input.trim();
    if (!trimmed) return;

    onSendMessage(trimmed, currentMode);
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Send on desktop Enter
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl sm:rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8] dark:border-[#3A2921] shadow-lg focus-within:border-[#C7A46A] dark:focus-within:border-[#C7A46A] transition-all p-2 sm:p-3"
      >
        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isGenerating ? 'Generating response...' : placeholder}
          rows={1}
          disabled={isGenerating}
          className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none resize-none px-2 py-1 text-sm sm:text-base text-[#2B1D17] dark:text-[#EDE1D5] placeholder:text-[#8A7A70] dark:placeholder:text-[#8A6756] max-h-[180px] leading-relaxed scrollbar-thin"
        />

        {/* Footer Toolbar: Persona Selector & Action Button */}
        <div className="flex items-center justify-between pt-1.5 border-t border-[#EDE1D5]/60 dark:border-[#2B1D17]/60 mt-1">
          <div className="flex items-center gap-1.5">
            <ModeSelector
              currentMode={currentMode}
              onSelectMode={onSelectMode}
            />
          </div>

          <div className="flex items-center gap-2">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6B493B] text-[#FCFAF7] hover:bg-[#8A6756] active:scale-95 text-xs font-medium transition-all shadow-xs"
                title="Stop generating"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17] hover:bg-[#4A3026] dark:hover:bg-[#EDE1D5] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4 text-[#C7A46A] stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="flex items-center justify-center gap-2 mt-1.5 text-center">
        <p className="text-[10px] sm:text-[11px] text-[#8A7A70] dark:text-[#8A6756]">
          AURA AI can make mistakes. Verify critical facts.
        </p>
      </div>
    </div>
  );
};
