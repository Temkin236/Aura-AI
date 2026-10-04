import React, { useState, useRef, useEffect } from 'react';
import { AIModeId, Attachment } from '../../types';
import { ModeSelector } from './ModeSelector';
import { ArrowUp, Square, Paperclip, X, Mic, MicOff, Sparkles, FileText, Image as ImageIcon } from 'lucide-react';

interface ChatComposerProps {
  onSendMessage: (text: string, mode: AIModeId, attachments?: Attachment[]) => void;
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
  placeholder = 'Ask AURA anything...'
}) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!trimmed && !attachment) return;

    const attachmentsList = attachment ? [attachment] : undefined;
    onSendMessage(trimmed || (attachment ? `Analyze this attached file: ${attachment.filename}` : ''), currentMode, attachmentsList);
    setInput('');
    setAttachment(null);
    setUploadError(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
      setAttachment({
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        dataUrl,
      });
    };
    reader.onerror = () => {
      setUploadError('Failed to read file contents.');
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 pb-3 sm:pb-6">
      <div className="relative rounded-2xl sm:rounded-3xl bg-[#FCFAF7] dark:bg-[#211814] border border-[#DCC9B8]/90 dark:border-[#3A2921] shadow-lg shadow-[#2B1D17]/5 dark:shadow-black/20 transition-all focus-within:border-[#C7A46A] focus-within:ring-2 focus-within:ring-[#C7A46A]/20">
        
        {/* Upload error banner */}
        {uploadError && (
          <div className="px-4 pt-3 pb-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
            {uploadError}
          </div>
        )}

        {/* Attachment preview tag */}
        {attachment && (
          <div className="px-3 sm:px-4 pt-3 pb-1 flex items-center gap-2">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#EDE1D5]/80 dark:bg-[#2B1D17] text-xs text-[#4A3026] dark:text-[#DCC9B8] border border-[#DCC9B8] dark:border-[#3A2921]">
              {attachment.mimeType.startsWith('image/') && attachment.dataUrl ? (
                <img
                  src={attachment.dataUrl}
                  alt={attachment.filename}
                  className="w-8 h-8 rounded-lg object-cover border border-[#DCC9B8] dark:border-[#3A2921]"
                />
              ) : (
                <Paperclip className="w-3.5 h-3.5 text-[#C7A46A] shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-medium max-w-[130px] sm:max-w-[220px] truncate">{attachment.filename}</span>
                <span className="text-[10px] text-[#8A7A70] shrink-0">
                  {attachment.sizeBytes > 1024 * 1024
                    ? `${(attachment.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                    : `${(attachment.sizeBytes / 1024).toFixed(0)} KB`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="p-1 hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors shrink-0"
                aria-label="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Text Input Area (16px base font on mobile prevents iOS WebKit auto-zoom) */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full bg-transparent px-4 sm:px-6 pt-3.5 sm:pt-4 pb-2 text-base text-[#2B1D17] dark:text-[#FCFAF7] placeholder:text-[#8A7A70]/70 dark:placeholder:text-[#8A6756] resize-none outline-none leading-relaxed font-sans max-h-48"
          aria-label="Ask AURA"
        />

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between px-2.5 sm:px-4 pb-2.5 sm:pb-3 pt-1">
          {/* Left tools: Mode selector + attachment + voice */}
          <div className="flex items-center gap-1 sm:gap-2">
            <ModeSelector
              currentMode={currentMode}
              onSelectMode={onSelectMode}
            />

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              aria-label="Attach file"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] active:scale-95 transition-all hover:text-[#2B1D17] dark:hover:text-[#FCFAF7]"
              title="Attach code or text file"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full active:scale-95 transition-all ${
                isListening
                  ? 'bg-[#C7A46A] text-[#FCFAF7] animate-pulse'
                  : 'text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17]'
              }`}
              title="Voice dictation"
              aria-label="Voice dictation"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Right Action: Send / Stop button */}
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#4A3026] text-[#FCFAF7] hover:bg-[#2B1D17] transition-all shadow-md active:scale-95 min-w-[36px] min-h-[36px]"
                title="Stop generation"
                aria-label="Stop generation"
              >
                <Square className="w-4 h-4 fill-current text-[#C7A46A]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!input.trim() && !attachment}
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-200 shadow-md min-w-[36px] min-h-[36px] ${
                  input.trim() || attachment
                    ? 'bg-[#2B1D17] text-[#FCFAF7] hover:bg-[#4A3026] hover:scale-105 active:scale-95 shadow-[#2B1D17]/20'
                    : 'bg-[#EDE1D5] dark:bg-[#2B1D17]/80 text-[#8A7A70] dark:text-[#8A6756] cursor-not-allowed opacity-60'
                }`}
                title="Send message (Enter)"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3 pt-2 text-[10px] sm:text-[11px] text-[#8A7A70] dark:text-[#8A6756] text-center">
        <span>AURA AI companion</span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#C7A46A]" />
          Think better. Create freely.
        </span>
      </div>
    </div>
  );
};
