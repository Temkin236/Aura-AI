import React, { useState } from 'react';
import { UserSettings, AIModeId } from '../../types';
import { AI_MODES } from '../../data/modes';
import { AuraSymbol } from '../aura/AuraSymbol';
import { 
  X, 
  Moon, 
  Sun, 
  Laptop, 
  Sparkles, 
  Trash2, 
  Download, 
  Shield, 
  Sliders, 
  User, 
  Check,
  Cpu
} from 'lucide-react';

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
  onClearAllConversations
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'ai' | 'conversation' | 'privacy'>('ai');
  const [clearedConfirm, setClearedConfirm] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17110E]/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8] dark:border-[#3A2921] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE1D5] dark:border-[#2B1D17]">
          <div className="flex items-center gap-3">
            <AuraSymbol size={24} variant="gold" />
            <h2 className="font-serif text-xl font-medium text-[#2B1D17] dark:text-[#FCFAF7]">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-[#EDE1D5] dark:border-[#2B1D17] overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17]'
                : 'text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#2B1D17]'
            }`}
          >
            AI Preferences
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17]'
                : 'text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#2B1D17]'
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('conversation')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'conversation'
                ? 'bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17]'
                : 'text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#2B1D17]'
            }`}
          >
            Conversation Memory
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17]'
                : 'text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#2B1D17]'
            }`}
          >
            Privacy & Security
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Default Mode */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8A7A70] dark:text-[#8A6756] mb-2">
                  Default Persona
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(AI_MODES) as AIModeId[]).map((mId) => {
                    const mode = AI_MODES[mId];
                    const isSelected = settings.defaultMode === mId;
                    return (
                      <button
                        key={mId}
                        onClick={() => onUpdateSettings({ defaultMode: mId })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#C7A46A] bg-[#EDE1D5]/50 dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7]'
                            : 'border-[#DCC9B8]/70 dark:border-[#3A2921] hover:border-[#C7A46A]/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs">{mode.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#C7A46A]" />}
                        </div>
                        <p className="text-[11px] text-[#8A7A70] dark:text-[#8A6756] mt-0.5">
                          {mode.tagline}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model Choice */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8A7A70] dark:text-[#8A6756] mb-2">
                  Active Model
                </label>
                <select
                  value={settings.model}
                  onChange={(e) => onUpdateSettings({ model: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-[#17110E] border border-[#DCC9B8] dark:border-[#3A2921] text-xs text-[#2B1D17] dark:text-[#EDE1D5] focus:outline-none focus:border-[#C7A46A]"
                >
                  <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Default · Speed &amp; Multimodal)</option>
                  <option value="gemini-2.5-pro">Google Gemini 2.5 Pro (Deep Conceptual &amp; Code Reasoning)</option>
                  <option value="gemini-2.0-flash">Google Gemini 2.0 Flash (Fast Response Baseline)</option>
                  <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (Lightweight General Purpose)</option>
                  <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Long Context Reasoning)</option>
                </select>
                <p className="text-[11px] text-[#8A7A70] dark:text-[#8A6756] mt-1.5">
                  Managed via server-side Google Gen AI SDK. Configurable via GEMINI_MODEL env var.
                </p>
              </div>

              {/* Temperature Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#8A7A70] dark:text-[#8A6756]">
                    Creativity (Temperature)
                  </label>
                  <span className="font-mono text-xs text-[#C7A46A]">{settings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => onUpdateSettings({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-[#C7A46A]"
                />
                <div className="flex justify-between text-[11px] text-[#8A7A70] mt-1">
                  <span>Precise &amp; Factual</span>
                  <span>Balanced</span>
                  <span>Creative &amp; Divergent</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8A7A70] dark:text-[#8A6756] mb-3">
                  Theme Appearance
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => onUpdateSettings({ theme: 'light' })}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      settings.theme === 'light'
                        ? 'border-[#C7A46A] bg-[#EDE1D5]/50 dark:bg-[#2B1D17]'
                        : 'border-[#DCC9B8]/70 dark:border-[#3A2921]'
                    }`}
                  >
                    <Sun className="w-5 h-5 mx-auto mb-2 text-[#6B493B]" />
                    <span className="text-xs font-medium">Warm Cream (Light)</span>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ theme: 'dark' })}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      settings.theme === 'dark'
                        ? 'border-[#C7A46A] bg-[#EDE1D5]/50 dark:bg-[#2B1D17]'
                        : 'border-[#DCC9B8]/70 dark:border-[#3A2921]'
                    }`}
                  >
                    <Moon className="w-5 h-5 mx-auto mb-2 text-[#C7A46A]" />
                    <span className="text-xs font-medium">Night Espresso (Dark)</span>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ theme: 'system' })}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      settings.theme === 'system'
                        ? 'border-[#C7A46A] bg-[#EDE1D5]/50 dark:bg-[#2B1D17]'
                        : 'border-[#DCC9B8]/70 dark:border-[#3A2921]'
                    }`}
                  >
                    <Laptop className="w-5 h-5 mx-auto mb-2 text-[#8A6756]" />
                    <span className="text-xs font-medium">System Sync</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'conversation' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#EDE1D5]/30 dark:bg-[#211814] border border-[#DCC9B8]/60 dark:border-[#3A2921]">
                <div>
                  <h4 className="font-semibold text-xs text-[#2B1D17] dark:text-[#FCFAF7]">
                    Persist Conversation History
                  </h4>
                  <p className="text-[11px] text-[#8A7A70] dark:text-[#8A6756]">
                    Retain past messages locally for seamless continuity across turns.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.saveHistory}
                  onChange={(e) => onUpdateSettings({ saveHistory: e.target.checked })}
                  className="w-4 h-4 accent-[#C7A46A]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#EDE1D5]/30 dark:bg-[#211814] border border-[#DCC9B8]/60 dark:border-[#3A2921]">
                <div>
                  <h4 className="font-semibold text-xs text-[#2B1D17] dark:text-[#FCFAF7]">
                    Automatic Conversation Titling
                  </h4>
                  <p className="text-[11px] text-[#8A7A70] dark:text-[#8A6756]">
                    Generate intuitive titles from your opening message.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoTitle}
                  onChange={(e) => onUpdateSettings({ autoTitle: e.target.checked })}
                  className="w-4 h-4 accent-[#C7A46A]"
                />
              </div>

              <div className="pt-4 border-t border-[#EDE1D5] dark:border-[#2B1D17]">
                <h4 className="text-xs font-semibold text-red-600 mb-2">
                  Danger Zone
                </h4>
                {clearedConfirm ? (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between">
                    <span className="text-xs text-red-700 dark:text-red-300">Are you sure? This cannot be undone.</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onClearAllConversations();
                          setClearedConfirm(false);
                        }}
                        className="px-3 py-1 rounded bg-red-600 text-white text-xs font-medium"
                      >
                        Yes, Clear All
                      </button>
                      <button
                        onClick={() => setClearedConfirm(false)}
                        className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-800 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setClearedConfirm(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear all conversations</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs text-[#6B493B] dark:text-[#DCC9B8] leading-relaxed">
              <div className="p-4 rounded-2xl bg-[#EDE1D5]/40 dark:bg-[#211814] border border-[#DCC9B8]/70 dark:border-[#3A2921]">
                <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-[#2B1D17] dark:text-[#FCFAF7]">
                  <Shield className="w-4 h-4 text-[#C7A46A]" />
                  <span>Private by Architecture</span>
                </div>
                <p>
                  AURA never exposes your API keys to the browser. All interactions pass through secure server routes with strict authentication bounds.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#EDE1D5]/40 dark:bg-[#17110E] border-t border-[#EDE1D5] dark:border-[#2B1D17] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17] text-xs font-semibold tracking-wide hover:bg-[#4A3026] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
