import React, { useState } from 'react';
import { UserSettings, AIModeId } from '../../types';
import { AI_MODES } from '../../data/modes';
import { AuraSymbol } from '../aura/AuraSymbol';
import { X, Moon, Sun, Laptop, Trash2, Key, Eye, EyeOff, Command } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSaveApiKey = (value: string) => {
    setApiKeyInput(value);
    onUpdateSettings({ apiKey: value.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#17110E]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8] dark:border-[#3A2921] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#EDE1D5] dark:border-[#2B1D17]">
          <div className="flex items-center gap-2">
            <AuraSymbol size={22} variant="gold" />
            <h2 className="font-serif text-base sm:text-lg font-medium text-[#2B1D17] dark:text-[#FCFAF7]">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
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
                placeholder="AIzaSy... (optional if set in .env)"
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
                ? '✓ Using custom API key'
                : 'Using server .env key or intelligent built-in assistant.'}
            </p>
          </div>

          {/* Theme Option */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Theme & Appearance
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ theme: 'light' })}
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
                onClick={() => onUpdateSettings({ theme: 'dark' })}
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
                onClick={() => onUpdateSettings({ theme: 'system' })}
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

          {/* Default AI Persona */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Default AI Persona
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(AI_MODES) as AIModeId[]).map((modeId) => {
                const mode = AI_MODES[modeId];
                const isSelected = settings.defaultMode === modeId;
                return (
                  <button
                    key={modeId}
                    type="button"
                    onClick={() => onUpdateSettings({ defaultMode: modeId })}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#C7A46A] bg-[#EDE1D5]/60 dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7] font-medium shadow-xs'
                        : 'border-[#DCC9B8]/60 dark:border-[#3A2921] text-[#6B493B] dark:text-[#DCC9B8] hover:border-[#C7A46A]/50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: mode.badgeColor }}
                    />
                    <div className="truncate">
                      <p className="font-semibold truncate">{mode.name}</p>
                      <p className="text-[10px] text-[#8A7A70] truncate">{mode.tagline}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gemini Model Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7A70]">
              Gemini Model
            </label>
            <div className="space-y-1.5">
              {[
                { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', desc: 'Ultra-fast & latest intelligence (Recommended)' },
                { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', desc: 'Advanced hybrid reasoning & multimodal' },
                { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', desc: 'High-speed reliable execution' },
              ].map((m) => {
                const isSelected = (settings.model || 'gemini-3.8-flash') === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onUpdateSettings({ model: m.id })}
                    className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#C7A46A] bg-[#EDE1D5]/60 dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7] shadow-xs'
                        : 'border-[#DCC9B8]/60 dark:border-[#3A2921] text-[#4A3026] dark:text-[#DCC9B8] hover:border-[#C7A46A]/50'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-xs">{m.name}</span>
                      <p className="text-[10px] sm:text-[11px] text-[#8A7A70] dark:text-[#8A6756] mt-0.5">{m.desc}</p>
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
                <span className="text-[#6B493B] dark:text-[#DCC9B8]">Send Message</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#FCFAF7] dark:bg-[#2B1D17] border border-[#DCC9B8] dark:border-[#3A2921] text-[10px] font-mono">
                  Enter
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
