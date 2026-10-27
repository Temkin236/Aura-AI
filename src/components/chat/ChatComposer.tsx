import React, { useState, useRef, useEffect } from 'react';
import { AIModeId, MessageAttachment } from '../../types';
import { ModeSelector } from './ModeSelector';
import {
  ArrowUp,
  Square,
  X,
  Mic,
  MicOff,
  Paperclip,
  Wand2,
  FileText,
} from 'lucide-react';
import { speechController, isSpeechRecognitionSupported } from '../../utils/speech';
import { soundFx } from '../../utils/sound';

interface ChatComposerProps {
  onSendMessage: (text: string, mode: AIModeId, attachments?: MessageAttachment[]) => void;
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
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopListeningRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  useEffect(() => {
    return () => {
      if (stopListeningRef.current) {
        stopListeningRef.current();
      }
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating) {
      if (onStopGeneration) onStopGeneration();
      return;
    }

    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    soundFx.playSend();

    // If attachments exist, format prompt to incorporate attached file content
    let finalPrompt = trimmed;
    if (attachments.length > 0) {
      const attachmentsText = attachments
        .map(
          (att) =>
            `\n\n--- Attachment: ${att.name} ---\n\`\`\`\n${att.content.slice(0, 15000)}\n\`\`\``
        )
        .join('');
      finalPrompt = `${trimmed || 'Please review and analyze the attached files.'}${attachmentsText}`;
    }

    onSendMessage(finalPrompt, currentMode, attachments);
    setInput('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Voice Speech-to-Text handler
  const handleToggleListening = () => {
    if (isListening) {
      if (stopListeningRef.current) {
        stopListeningRef.current();
        stopListeningRef.current = null;
      }
      setIsListening(false);
      soundFx.playClick();
    } else {
      soundFx.playClick();
      setIsListening(true);
      const stopFn = speechController.startListening(
        (transcript) => {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        },
        () => {
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );
      stopListeningRef.current = stopFn;
    }
  };

  // File upload handler (Text, markdown, code, JSON, CSV)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    soundFx.playClick();
    const newAttachments: MessageAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 2 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 2MB limit.`);
        continue;
      }

      try {
        const text = await file.text();
        newAttachments.push({
          name: file.name,
          size: file.size,
          content: text,
        });
      } catch {}
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    soundFx.playClick();
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Prompt refiner / "Polish with AURA"
  const handleRefinePrompt = () => {
    if (!input.trim() || isPolishing) return;
    soundFx.playClick();
    setIsPolishing(true);

    const raw = input.trim();
    let polished = raw;

    switch (currentMode) {
      case 'developer':
        polished = `Act as an elite software architect. Analyze and implement: "${raw}". Include architectural patterns, clean type-safe implementation, edge-case coverage, and performance considerations.`;
        break;
      case 'creative':
        polished = `Reflect on and explore: "${raw}". Craft evocative prose with nuanced sensory resonance, atmospheric cadence, and artistic depth.`;
        break;
      case 'tutor':
        polished = `Explain from first principles: "${raw}". Use an intuitive real-world analogy, break it down layer by layer, and provide a quick check for understanding.`;
        break;
      case 'professional':
        polished = `Provide a concise, executive-level strategic assessment on: "${raw}". Structure with clear objectives, core findings, actionable recommendations, and measurable milestones.`;
        break;
      default:
        polished = `Please provide a thoughtful, clear, and comprehensive perspective on: "${raw}". Break this down into intuitive, actionable insights.`;
        break;
    }

    setInput(polished);
    setTimeout(() => setIsPolishing(false), 500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl sm:rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8] dark:border-[#3A2921] shadow-lg focus-within:border-[#C7A46A] dark:focus-within:border-[#C7A46A] transition-all p-2.5 sm:p-3.5"
      >
        {/* Attached Files Chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-[#EDE1D5]/60 dark:border-[#2B1D17]/60 mb-2">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EDE1D5]/70 dark:bg-[#2B1D17] text-xs text-[#4A3026] dark:text-[#DCC9B8] border border-[#DCC9B8]/60 dark:border-[#3A2921]"
              >
                <FileText className="w-3.5 h-3.5 text-[#C7A46A]" />
                <span className="font-mono text-[11px] truncate max-w-[130px]">{att.name}</span>
                <span className="text-[10px] text-[#8A7A70]">({Math.round(att.size / 1024)}k)</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="hover:text-red-500 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening... Speak your prompt naturally.'
                : isGenerating
                ? 'AURA is generating a response...'
                : placeholder
            }
            rows={1}
            disabled={isGenerating}
            maxLength={20000}
            className={`w-full bg-transparent border-0 focus:ring-0 focus:outline-none resize-none px-2 py-1 pr-8 text-sm sm:text-base text-[#2B1D17] dark:text-[#EDE1D5] placeholder:text-[#8A7A70] dark:placeholder:text-[#8A6756] max-h-[180px] leading-relaxed scrollbar-thin ${
              isListening ? 'italic text-[#C7A46A]' : ''
            }`}
          />
          {input.length > 0 && !isGenerating && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                soundFx.playClick();
                if (textareaRef.current) textareaRef.current.style.height = 'auto';
              }}
              className="absolute right-1 top-2 p-1 rounded-md text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#EDE1D5] transition-colors cursor-pointer"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Footer Toolbar */}
        <div className="flex items-center justify-between pt-2 border-t border-[#EDE1D5]/60 dark:border-[#2B1D17]/60 mt-1">
          {/* Left Actions: Mode Selector, Attach, Refine Prompt */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ModeSelector currentMode={currentMode} onSelectMode={onSelectMode} />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.py,.html,.css,.sql,.yaml,.yml"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 sm:p-2 rounded-xl text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-all cursor-pointer"
              title="Attach documents or code files"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Polish / Refine with Aura */}
            {input.trim().length > 3 && !isGenerating && (
              <button
                type="button"
                onClick={handleRefinePrompt}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#EDE1D5]/60 dark:bg-[#2B1D17] hover:bg-[#C7A46A]/20 text-[#6B493B] dark:text-[#C7A46A] text-xs font-medium transition-all cursor-pointer"
                title="Enhance prompt with persona depth"
              >
                <Wand2 className="w-3.5 h-3.5 text-[#C7A46A]" />
                <span className="text-[11px]">Enhance</span>
              </button>
            )}

            {input.length > 100 && (
              <span className="hidden md:inline-block text-[10px] text-[#8A7A70] dark:text-[#8A6756]">
                {input.length.toLocaleString()}/20,000
              </span>
            )}
          </div>

          {/* Right Actions: Voice Mic & Submit / Stop Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Speech Recognition Button */}
            {isSpeechRecognitionSupported() && !isGenerating && (
              <button
                type="button"
                onClick={handleToggleListening}
                className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${
                  isListening
                    ? 'bg-[#C7A46A] text-[#17110E] animate-voice-pulse shadow-md'
                    : 'text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17]'
                }`}
                title={isListening ? 'Stop listening' : 'Voice typing'}
                aria-label="Voice typing"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6B493B] text-[#FCFAF7] hover:bg-[#8A6756] active:scale-95 text-xs font-medium transition-all shadow-xs cursor-pointer"
                title="Stop generating"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && attachments.length === 0}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17] hover:bg-[#4A3026] dark:hover:bg-[#EDE1D5] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
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
          AURA AI is powered by Google Gemini with luxury editorial styling.
        </p>
      </div>
    </div>
  );
};
