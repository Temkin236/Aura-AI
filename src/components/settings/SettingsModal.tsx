import React, { useState, useEffect } from 'react';
import { UserSettings, AIModeId } from '../../types';
import { AI_MODES } from '../../data/modes';
import { AuraSymbol } from '../aura/AuraSymbol';
import {
  X,
  Moon,
  Sun,
  Laptop,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Command,
  Volume2,
  VolumeX,
  Sparkles,
  Coffee,
  Code2,
  BookOpen,
  Briefcase,
  Check,
  CheckCheck,
  Play,
  Square,
  Sliders,
  Compass,
  Copy,
} from 'lucide-react';
import { soundFx } from '../../utils/sound';
import { speechController, isSpeechSynthesisSupported } from '../../utils/speech';

const PERSONA_GREETINGS: Record<AIModeId, string> = {
  friendly:
    "Hello! I'm AURA Friendly. I'm here to offer warmth, mindful reflections, and thoughtful companionship whenever you need it.",
  developer:
    "AURA Developer online. System architecture, clean TypeScript, algorithmic optimization, and deep debugging at your service.",
  tutor:
    "Welcome to AURA Tutor. Tell me what subject or question you'd like to explore, and we'll unpack it together from first principles.",
  creative:
    "Greetings from AURA Creative. An open canvas awaits—let's weave evocative prose, vivid imagery, and resonant ideas.",
  professional:
    "AURA Professional initialized. Let's construct clear executive syntheses, strategic roadmaps, and actionable recommendations.",
};

const getPersonaIcon = (modeId: AIModeId, className = 'w-4 h-4') => {
  switch (modeId) {
    case 'friendly':
      return <Coffee className={className} />;
    case 'developer':
      return <Code2 className={className} />;
    case 'tutor':
      return <BookOpen className={className} />;
    case 'creative':
      return <Sparkles className={className} />;
    case 'professional':
      return <Briefcase className={className} />;
  }
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onClearAllConversations: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAllConversations,
}) => {
  const [clearedConfirm, setClearedConfirm] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey || '');
  const [soundEnabled, setSoundEnabled] = useState(soundFx.getEnabled());
  const [customInstructions, setCustomInstructions] = useState(
    settings.customInstructions || ''
  );
  const [isSpeakingPersona, setIsSpeakingPersona] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      speechController.stopSpeaking();
    };
  }, []);

  const handleClose = () => {
    speechController.stopSpeaking();
    setIsSpeakingPersona(false);
    soundFx.playClick();
    onClose();
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveApiKey = (value: string) => {
    setApiKeyInput(value);
    onUpdateSettings({ apiKey: value.trim() });
  };

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundFx.setEnabled(nextState);
    onUpdateSettings({ soundEnabled: nextState });
    if (nextState) {
      soundFx.playReceive();
    }
  };

  const handleSaveCustomInstructions = (val: string) => {
    setCustomInstructions(val);
    onUpdateSettings({ customInstructions: val });
  };

  const handleSelectPersona = (modeId: AIModeId) => {
    soundFx.playClick();
    if (isSpeakingPersona) {
      speechController.stopSpeaking();
      setIsSpeakingPersona(false);
    }
    onUpdateSettings({ defaultMode: modeId });
  };

  const handleToggleVoiceAudition = (modeId: AIModeId) => {
    if (isSpeakingPersona) {
      speechController.stopSpeaking();
      setIsSpeakingPersona(false);
      return;
    }

    soundFx.playReceive();
    const textToSpeak = PERSONA_GREETINGS[modeId];
    setIsSpeakingPersona(true);
    speechController.speak(
      textToSpeak,
      () => setIsSpeakingPersona(true),
      () => setIsSpeakingPersona(false),
      () => setIsSpeakingPersona(false)
    );
  };

  const handleCopyPrompt = (promptText: string) => {
    soundFx.playClick();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(promptText);
    }
    setCopiedPrompt(promptText);
    setTimeout(() => {
      setCopiedPrompt(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#17110E]/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8] dark:border-[#3A2921] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#EDE1D5] dark:border-[#2B1D17]">
          <div className="flex items-center gap-2">
            <AuraSymbol size={22} variant="gold" />
            <h2 className="font-serif text-base sm:text-lg font-medium text-[#2B1D17] dark:text-[#FCFAF7]">
              AURA Preferences
            </h2>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto scrollbar-thin text-xs sm:text-sm">
          {/* Gemini API Key Input */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7A70] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#C7A46A]" />
              <span>Google Gemini API Key</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="AIzaSy... (or configure in server .env)"
                value={apiKeyInput}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                className="w-full pl-3 pr-10 py-2 text-xs rounded-xl bg-[#EDE1D5]/40 dark:bg-[#17110E] border border-[#DCC9B8] dark:border-[#3A2921] text-[#2B1D17] dark:text-[#EDE1D5] placeholder:text-[#8A7A70] focus:outline-none focus:border-[#C7A46A] transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A7A70] hover:text-[#2B1D17] dark:hover:text-[#EDE1D5] cursor-pointer"
                title={showApiKey ? 'Hide Key' : 'Show Key'}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-[#8A7A70] dark:text-[#8A6756]">
              {apiKeyInput.trim()
                ? '✓ Using custom Gemini API key'
                : 'Using server .env key or intelligent built-in assistant.'}
            </p>
          </div>

          {/* Sound & Audio Haptics */}
          <div className="flex items-center justify-between p-3 rounded-xl sm:rounded-2xl border border-[#DCC9B8]/60 dark:border-[#3A2921] bg-[#EDE1D5]/30 dark:bg-[#17110E]/60">
            <div className="flex items-center gap-2.5">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#C7A46A]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#8A7A70]" />
              )}
              <div>
                <p className="font-semibold text-xs text-[#2B1D17] dark:text-[#FCFAF7]">
                  Harmonic Sound Chimes
                </p>
                <p className="text-[10px] text-[#8A7A70] dark:text-[#8A6756]">
                  Delicate crystal notes on message send and arrival
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17] shadow-xs'
                  : 'bg-[#EDE1D5]/70 dark:bg-[#2B1D17] text-[#8A7A70]'
              }`}
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7A70] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C7A46A]" />
              <span>Custom Instructions for AURA</span>
            </label>
            <textarea
              rows={2}
              value={customInstructions}
              onChange={(e) => handleSaveCustomInstructions(e.target.value)}
              placeholder="e.g. Always write clean TypeScript code, prefer concise architectural answers..."
              className="w-full p-2.5 text-xs rounded-xl bg-[#EDE1D5]/40 dark:bg-[#17110E] border border-[#DCC9B8] dark:border-[#3A2921] text-[#2B1D17] dark:text-[#EDE1D5] placeholder:text-[#8A7A70] focus:outline-none focus:border-[#C7A46A] transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Theme Option */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Theme & Appearance
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  onUpdateSettings({ theme: 'light' });
                }}
                className={`flex flex-col items-center justify-center gap-1.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                  settings.theme === 'light'
                    ? 'border-[#C7A46A] bg-[#EDE1D5]/60 dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7] shadow-xs'
                    : 'border-[#DCC9B8]/60 dark:border-[#3A2921] text-[#6B493B] dark:text-[#DCC9B8] hover:border-[#C7A46A]/50'
                }`}
              >
                <Sun className="w-4 h-4 text-[#C7A46A]" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  onUpdateSettings({ theme: 'dark' });
                }}
                className={`flex flex-col items-center justify-center gap-1.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                  settings.theme === 'dark'
                    ? 'border-[#C7A46A] bg-[#EDE1D5]/60 dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7] shadow-xs'
                    : 'border-[#DCC9B8]/60 dark:border-[#3A2921] text-[#6B493B] dark:text-[#DCC9B8] hover:border-[#C7A46A]/50'
                }`}
              >
                <Moon className="w-4 h-4 text-[#C7A46A]" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  onUpdateSettings({ theme: 'system' });
                }}
                className={`flex flex-col items-center justify-center gap-1.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-xs font-medium transition-all cursor-pointer ${
                  settings.theme === 'system'
                    ? 'border-[#C7A46A] bg-[#EDE1D5]/60 dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7] shadow-xs'
                    : 'border-[#DCC9B8]/60 dark:border-[#3A2921] text-[#6B493B] dark:text-[#DCC9B8] hover:border-[#C7A46A]/50'
                }`}
              >
                <Laptop className="w-4 h-4 text-[#C7A46A]" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Default AI Persona Mindset */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7A70] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#C7A46A]" />
                <span>Default Persona Mindset</span>
              </label>
              <span className="text-[10px] tracking-wider text-[#C7A46A] uppercase font-mono px-2 py-0.5 rounded-full bg-[#C7A46A]/10 border border-[#C7A46A]/20">
                {AI_MODES[settings.defaultMode || 'developer']?.name || 'Developer'} Active
              </span>
            </div>

            {/* 5-Card Balanced Persona Deck */}
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(AI_MODES) as AIModeId[]).map((modeId) => {
                const mode = AI_MODES[modeId];
                const isSelected = (settings.defaultMode || 'developer') === modeId;
                const isProfessional = modeId === 'professional';

                return (
                  <button
                    key={modeId}
                    type="button"
                    onClick={() => handleSelectPersona(modeId)}
                    className={`group relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all duration-200 cursor-pointer ${
                      isProfessional ? 'col-span-2' : ''
                    } ${
                      isSelected
                        ? 'border-[#C7A46A] bg-gradient-to-br from-[#EDE1D5]/90 to-[#EDE1D5]/50 dark:from-[#2B1D17] dark:to-[#1E1410] text-[#2B1D17] dark:text-[#FCFAF7] shadow-sm ring-1 ring-[#C7A46A]/40'
                        : 'border-[#DCC9B8]/60 dark:border-[#3A2921] bg-[#FCFAF7]/40 dark:bg-[#1A120E]/40 text-[#6B493B] dark:text-[#DCC9B8] hover:border-[#C7A46A]/60 hover:bg-[#EDE1D5]/40 dark:hover:bg-[#251A15]'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                        isSelected
                          ? 'bg-[#C7A46A] text-[#1E1410] shadow-[0_0_10px_rgba(199,164,106,0.3)]'
                          : 'bg-[#EDE1D5]/70 dark:bg-[#2B1D17] text-[#C7A46A] border border-[#DCC9B8]/50 dark:border-[#3A2921]'
                      }`}
                    >
                      {getPersonaIcon(modeId, 'w-4 h-4')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-serif text-[13px] font-semibold text-[#2B1D17] dark:text-[#FCFAF7] truncate">
                          {mode.name}
                        </span>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#C7A46A]/20 text-[#C7A46A] text-[9px] font-mono font-semibold uppercase tracking-wider border border-[#C7A46A]/30">
                            <Check className="w-2.5 h-2.5" />
                            Default
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-mono text-[#8A7A70]/80">
                            T·{mode.temperature}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#8A7A70] dark:text-[#A8988E] truncate mt-0.5">
                        {mode.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Persona Intelligence Dossier */}
            {(() => {
              const activeModeId = settings.defaultMode || 'developer';
              const activeMode = AI_MODES[activeModeId];
              if (!activeMode) return null;

              return (
                <div className="rounded-xl border border-[#C7A46A]/35 bg-gradient-to-br from-[#EDE1D5]/40 to-[#FCFAF7]/40 dark:from-[#211814] dark:to-[#17110E] p-3 space-y-2.5 animate-in fade-in duration-200">
                  {/* Persona Focus & Temperature Gauge */}
                  <div className="flex items-center justify-between text-xs border-b border-[#EDE1D5] dark:border-[#2B1D17] pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#C7A46A]/15 text-[#C7A46A] flex items-center justify-center">
                        {getPersonaIcon(activeModeId, 'w-3.5 h-3.5')}
                      </div>
                      <span className="font-serif font-medium text-[#2B1D17] dark:text-[#FCFAF7]">
                        {activeMode.name} Mindset Dossier
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8A7A70] dark:text-[#C7A46A]">
                      <Sliders className="w-3 h-3 text-[#C7A46A]" />
                      <span>
                        Temp {activeMode.temperature} ·{' '}
                        {activeMode.temperature <= 0.4
                          ? 'Strict Precision'
                          : activeMode.temperature >= 0.8
                          ? 'Creative Divergence'
                          : 'Balanced Guidance'}
                      </span>
                    </div>
                  </div>

                  {/* Philosophy Description */}
                  <p className="text-[11px] leading-relaxed text-[#6B493B] dark:text-[#DCC9B8]/90">
                    {activeMode.description}
                  </p>

                  {/* Voice Audition & Greeting Sample */}
                  <div className="p-2.5 rounded-lg bg-[#FCFAF7]/80 dark:bg-[#1A120E] border border-[#DCC9B8]/40 dark:border-[#3A2921] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A7A70] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#C7A46A]" />
                        <span>Persona Voice Signature</span>
                      </span>

                      {isSpeechSynthesisSupported() && (
                        <button
                          type="button"
                          onClick={() => handleToggleVoiceAudition(activeModeId)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all cursor-pointer ${
                            isSpeakingPersona
                              ? 'bg-[#C7A46A] text-[#1E1410] font-semibold animate-pulse'
                              : 'bg-[#EDE1D5]/70 dark:bg-[#2B1D17] text-[#C7A46A] hover:bg-[#C7A46A] hover:text-[#1E1410]'
                          }`}
                        >
                          {isSpeakingPersona ? (
                            <>
                              <Square className="w-2.5 h-2.5 fill-current" />
                              <span>Stop Voice</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Audition Voice</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <p className="font-serif italic text-xs text-[#4A3026] dark:text-[#EDE1D5] leading-relaxed">
                      "{PERSONA_GREETINGS[activeModeId]}"
                    </p>
                  </div>

                  {/* Suggested Prompts (Click to copy) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A7A70] flex items-center gap-1">
                      <Copy className="w-3 h-3 text-[#C7A46A]" />
                      <span>Sample Thought Starters (Click to copy)</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeMode.suggestedPrompts.slice(0, 3).map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleCopyPrompt(prompt)}
                          title="Click to copy prompt"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] bg-[#EDE1D5]/50 dark:bg-[#251A15] border border-[#DCC9B8]/40 dark:border-[#3A2921] text-[#4A3026] dark:text-[#EDE1D5] hover:border-[#C7A46A] hover:text-[#C7A46A] transition-all cursor-pointer"
                        >
                          <span className="truncate max-w-[260px]">{prompt}</span>
                          {copiedPrompt === prompt ? (
                            <CheckCheck className="w-3 h-3 text-[#C7A46A] flex-shrink-0" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-[#8A7A70] opacity-60 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Gemini Model Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Gemini Model Intelligence
            </label>
            <div className="space-y-1.5">
              {[
                {
                  id: 'gemini-3.5-flash',
                  name: 'Gemini 3.5 Flash',
                  desc: 'Ultra-fast, state-of-the-art multimodal intelligence (Active & Recommended)',
                },
                {
                  id: 'gemini-3.5-flash-lite',
                  name: 'Gemini 3.5 Flash-Lite',
                  desc: 'Maximum throughput and lowest response latency for rapid iteration',
                },
                {
                  id: 'gemini-2.5-flash',
                  name: 'Gemini 2.5 Flash',
                  desc: 'Standard Google Gemini model baseline',
                },
              ].map((m) => {
                const isSelected = (settings.model || 'gemini-3.5-flash') === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      onUpdateSettings({ model: m.id });
                    }}
                    className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#C7A46A] bg-[#EDE1D5]/60 dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7] shadow-xs'
                        : 'border-[#DCC9B8]/60 dark:border-[#3A2921] text-[#4A3026] dark:text-[#DCC9B8] hover:border-[#C7A46A]/50'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-xs">{m.name}</span>
                      <p className="text-[10px] sm:text-[11px] text-[#8A7A70] dark:text-[#8A6756] mt-0.5">
                        {m.desc}
                      </p>
                    </div>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-[#C7A46A] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keyboard Shortcuts Overview */}
          <div className="pt-2 border-t border-[#EDE1D5] dark:border-[#2B1D17] space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7A70] flex items-center gap-1.5">
              <Command className="w-3.5 h-3.5" />
              <span>Keyboard Shortcuts</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-[#EDE1D5]/40 dark:bg-[#17110E] flex items-center justify-between">
                <span className="text-[#6B493B] dark:text-[#DCC9B8]">New Chat</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#FCFAF7] dark:bg-[#2B1D17] border border-[#DCC9B8] dark:border-[#3A2921] text-[10px] font-mono">
                  Ctrl+Shift+N
                </kbd>
              </div>
              <div className="p-2 rounded-lg bg-[#EDE1D5]/40 dark:bg-[#17110E] flex items-center justify-between">
                <span className="text-[#6B493B] dark:text-[#DCC9B8]">Settings</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#FCFAF7] dark:bg-[#2B1D17] border border-[#DCC9B8] dark:border-[#3A2921] text-[10px] font-mono">
                  Ctrl+,
                </kbd>
              </div>
              <div className="p-2 rounded-lg bg-[#EDE1D5]/40 dark:bg-[#17110E] flex items-center justify-between">
                <span className="text-[#6B493B] dark:text-[#DCC9B8]">Send Message</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#FCFAF7] dark:bg-[#2B1D17] border border-[#DCC9B8] dark:border-[#3A2921] text-[10px] font-mono">
                  Enter
                </kbd>
              </div>
              <div className="p-2 rounded-lg bg-[#EDE1D5]/40 dark:bg-[#17110E] flex items-center justify-between">
                <span className="text-[#6B493B] dark:text-[#DCC9B8]">Close Modal</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#FCFAF7] dark:bg-[#2B1D17] border border-[#DCC9B8] dark:border-[#3A2921] text-[10px] font-mono">
                  Esc
                </kbd>
              </div>
            </div>
          </div>

          {/* Clear History */}
          <div className="pt-2 border-t border-[#EDE1D5] dark:border-[#2B1D17] space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Data & Storage
            </label>
            <div>
              {clearedConfirm ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllConversations();
                      setClearedConfirm(false);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-medium transition-all cursor-pointer"
                  >
                    Yes, delete all chats
                  </button>
                  <button
                    type="button"
                    onClick={() => setClearedConfirm(false)}
                    className="py-2 px-3 rounded-xl border border-[#DCC9B8] dark:border-[#3A2921] text-xs text-[#6B493B] dark:text-[#DCC9B8] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setClearedConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-medium transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Local Conversations</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
