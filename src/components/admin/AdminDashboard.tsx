import React, { useState, useEffect } from 'react';
import { AuraSymbol } from '../aura/AuraSymbol';
import { AI_MODES } from '../../data/modes';
import { AIModeId, SystemPromptConfig, ModelConfig } from '../../types';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Sliders, 
  Sparkles, 
  Cpu, 
  BarChart3, 
  ArrowLeft, 
  Check, 
  Edit3, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  Plus
} from 'lucide-react';

interface AdminDashboardProps {
  onBackToChat: () => void;
  onOpenLanding: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const DEFAULT_PROMPTS: SystemPromptConfig[] = [
  {
    id: 'p-1',
    modeId: 'developer',
    title: 'AURA Senior Architect',
    systemInstruction: AI_MODES.developer.systemPrompt,
    temperature: 0.3,
    maxTokens: 4096,
    status: 'active',
    version: 3,
    updatedAt: '2026-09-24'
  },
  {
    id: 'p-2',
    modeId: 'friendly',
    title: 'AURA Mindful Companion',
    systemInstruction: AI_MODES.friendly.systemPrompt,
    temperature: 0.8,
    maxTokens: 2048,
    status: 'active',
    version: 2,
    updatedAt: '2026-09-22'
  },
  {
    id: 'p-3',
    modeId: 'tutor',
    title: 'AURA Socratic Mentor',
    systemInstruction: AI_MODES.tutor.systemPrompt,
    temperature: 0.5,
    maxTokens: 3072,
    status: 'active',
    version: 4,
    updatedAt: '2026-09-25'
  },
  {
    id: 'p-4',
    modeId: 'creative',
    title: 'AURA Literary Muse',
    systemInstruction: AI_MODES.creative.systemPrompt,
    temperature: 0.9,
    maxTokens: 4096,
    status: 'active',
    version: 2,
    updatedAt: '2026-09-21'
  },
  {
    id: 'p-5',
    modeId: 'professional',
    title: 'AURA Executive Strategist',
    systemInstruction: AI_MODES.professional.systemPrompt,
    temperature: 0.4,
    maxTokens: 2560,
    status: 'active',
    version: 1,
    updatedAt: '2026-09-20'
  }
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToChat,
  onOpenLanding,
  isDarkMode,
  onToggleTheme
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'conversations' | 'prompts' | 'models' | 'analytics'>('overview');

  // Initial prompt configs with localStorage persistence
  const [prompts, setPrompts] = useState<SystemPromptConfig[]>(() => {
    try {
      const saved = localStorage.getItem('aura_admin_prompts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_PROMPTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('aura_admin_prompts', JSON.stringify(prompts));
    } catch (e) {
      console.warn('LocalStorage error saving admin prompts:', e);
    }
  }, [prompts]);

  const [models, setModels] = useState<ModelConfig[]>([
    {
      id: 'm-1',
      name: 'Gemini 2.5 Flash',
      provider: 'Google Gemini',
      modelId: 'gemini-2.5-flash',
      status: 'active',
      contextWindow: '1M tokens',
      isDefault: true
    },
    {
      id: 'm-2',
      name: 'Gemini 2.5 Pro',
      provider: 'Google Gemini',
      modelId: 'gemini-2.5-pro',
      status: 'ready',
      contextWindow: '2M tokens',
      isDefault: false
    },
    {
      id: 'm-3',
      name: 'Gemini 2.0 Flash',
      provider: 'Google Gemini',
      modelId: 'gemini-2.0-flash',
      status: 'ready',
      contextWindow: '1M tokens',
      isDefault: false
    }
  ]);

  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editedInstruction, setEditedInstruction] = useState('');

  const handleEditPrompt = (prompt: SystemPromptConfig) => {
    setEditingPromptId(prompt.id);
    setEditedInstruction(prompt.systemInstruction);
  };

  const handleSavePrompt = (id: string) => {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, systemInstruction: editedInstruction, version: p.version + 1, updatedAt: 'Just now' }
          : p
      )
    );
    setEditingPromptId(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F3ED] dark:bg-[#17110E] text-[#2B1D17] dark:text-[#EDE1D5] flex flex-col">
      {/* Top Admin Nav */}
      <header className="h-16 px-3 sm:px-6 border-b border-[#DCC9B8]/70 dark:border-[#3A2921] bg-[#FCFAF7]/90 dark:bg-[#1E1511]/90 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <button
            onClick={onBackToChat}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#DCC9B8] dark:border-[#3A2921] text-xs font-medium text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#2B1D17] active:scale-95 transition-all min-h-[36px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Workspace</span>
          </button>

          <div className="h-4 w-px bg-[#DCC9B8] dark:bg-[#3A2921]" />

          <div className="flex items-center gap-2 sm:gap-2.5">
            <AuraSymbol size={24} variant="gold" />
            <span className="font-serif text-base sm:text-lg font-medium text-[#2B1D17] dark:text-[#FCFAF7]">
              AURA
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#EDE1D5] dark:bg-[#2B1D17] text-[#6B493B] dark:text-[#C7A46A] uppercase font-semibold">
              Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onToggleTheme}
            className="text-xs font-mono px-2.5 py-1.5 rounded-lg border border-[#DCC9B8] dark:border-[#3A2921] hover:bg-[#EDE1D5]/50 active:scale-95 transition-all min-h-[36px]"
          >
            {isDarkMode ? 'LIGHT' : 'DARK'}
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#6B493B] dark:text-[#DCC9B8]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Optimal</span>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 gap-4 sm:gap-6 md:gap-8">
        {/* Admin Left Sidebar / Mobile Nav Bar */}
        <aside className="w-full md:w-56 flex-shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-visible pb-2 md:pb-0 gap-1.5 md:space-y-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 md:w-full min-h-[40px] active:scale-95 ${
              activeTab === 'overview'
                ? 'bg-[#2B1D17] text-[#FCFAF7] shadow-sm'
                : 'text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#211814]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#C7A46A]" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 md:w-full min-h-[40px] active:scale-95 ${
              activeTab === 'prompts'
                ? 'bg-[#2B1D17] text-[#FCFAF7] shadow-sm'
                : 'text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#211814]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#C7A46A]" />
            <span>System Prompts</span>
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 md:w-full min-h-[40px] active:scale-95 ${
              activeTab === 'models'
                ? 'bg-[#2B1D17] text-[#FCFAF7] shadow-sm'
                : 'text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#211814]'
            }`}
          >
            <Cpu className="w-4 h-4 text-[#C7A46A]" />
            <span>AI Model Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 md:w-full min-h-[40px] active:scale-95 ${
              activeTab === 'analytics'
                ? 'bg-[#2B1D17] text-[#FCFAF7] shadow-sm'
                : 'text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#211814]'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#C7A46A]" />
            <span>Usage Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 md:w-full min-h-[40px] active:scale-95 ${
              activeTab === 'users'
                ? 'bg-[#2B1D17] text-[#FCFAF7] shadow-sm'
                : 'text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/50 dark:hover:bg-[#211814]'
            }`}
          >
            <Users className="w-4 h-4 text-[#C7A46A]" />
            <span>User Directory</span>
          </button>
        </aside>

        {/* Admin Content View */}
        <main className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7]">
                  Platform Intelligence
                </h1>
                <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] mt-1">
                  Operational overview and configuration console for AURA companion services.
                </p>
              </div>

              {/* Local Simulation Notice */}
              <div className="p-3.5 rounded-xl border border-[#DCC9B8] dark:border-[#3A2921] bg-[#EDE1D5]/40 dark:bg-[#211814] text-xs text-[#6B493B] dark:text-[#DCC9B8] flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#C7A46A] shrink-0" />
                <span>
                  <strong>Local Preview Interface:</strong> This administrative console is a local demonstration prototype. Production deployment requires server-side authentication (e.g. OAuth / IAM) and persistent database storage. Metrics and directory entries below represent simulated telemetry.
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    Active Conversations
                  </span>
                  <div className="text-2xl font-serif font-medium mt-1 text-[#2B1D17] dark:text-[#FCFAF7]">
                    1,284
                  </div>
                  <span className="text-[11px] text-emerald-600 mt-1 inline-flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> +14% this week
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    Messages Synthesized
                  </span>
                  <div className="text-2xl font-serif font-medium mt-1 text-[#2B1D17] dark:text-[#FCFAF7]">
                    48,219
                  </div>
                  <span className="text-[11px] text-[#8A7A70] mt-1 block">99.8% completion rate</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    Avg Stream Latency
                  </span>
                  <div className="text-2xl font-serif font-medium mt-1 text-[#2B1D17] dark:text-[#FCFAF7]">
                    285 ms
                  </div>
                  <span className="text-[11px] text-emerald-600 mt-1 block">Optimal Gemini throughput (Server Default: gemini-2.5-flash)</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    Error Frequency
                  </span>
                  <div className="text-2xl font-serif font-medium mt-1 text-[#2B1D17] dark:text-[#FCFAF7]">
                    0.02%
                  </div>
                  <span className="text-[11px] text-[#8A7A70] mt-1 block">Graceful fallback active</span>
                </div>
              </div>

              {/* Mode Distribution Bar */}
              <div className="p-6 rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]">
                <h3 className="font-serif text-lg font-medium mb-1">
                  Persona Utilization Ratio
                </h3>
                <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] mb-5">
                  Distribution of interactions by specialized AURA system prompt.
                </p>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">Developer Mode</span>
                      <span className="font-mono text-[#C7A46A]">42%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#EDE1D5] dark:bg-[#2B1D17] overflow-hidden">
                      <div className="h-full bg-[#4A3026] dark:bg-[#C7A46A] rounded-full" style={{ width: '42%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">Tutor (Conceptual Socratic)</span>
                      <span className="font-mono text-[#C7A46A]">26%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#EDE1D5] dark:bg-[#2B1D17] overflow-hidden">
                      <div className="h-full bg-[#6B493B] rounded-full" style={{ width: '26%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">Creative Exploration</span>
                      <span className="font-mono text-[#C7A46A]">18%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#EDE1D5] dark:bg-[#2B1D17] overflow-hidden">
                      <div className="h-full bg-[#8A6756] rounded-full" style={{ width: '18%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">Friendly &amp; Professional</span>
                      <span className="font-mono text-[#C7A46A]">14%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#EDE1D5] dark:bg-[#2B1D17] overflow-hidden">
                      <div className="h-full bg-[#DCC9B8] dark:bg-[#4A3026] rounded-full" style={{ width: '14%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7]">
                    System Prompts
                  </h1>
                  <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] mt-1">
                    Manage persona system instructions, temperature hyperparameters, and versioning.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {prompts.map((p) => {
                  const isEditing = editingPromptId === p.id;
                  return (
                    <div
                      key={p.id}
                      className="p-4 sm:p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                          <h3 className="font-serif text-base sm:text-lg font-medium">{p.title}</h3>
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#EDE1D5] dark:bg-[#2B1D17] text-[#4A3026] dark:text-[#C7A46A]">
                            v{p.version}
                          </span>
                          <span className="text-[11px] text-[#8A7A70]">Updated {p.updatedAt}</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          <span className="font-mono text-[#8A7A70]">Temp: {p.temperature}</span>
                          {!isEditing ? (
                            <button
                              onClick={() => handleEditPrompt(p)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCC9B8] dark:border-[#3A2921] hover:border-[#C7A46A] active:scale-95 transition-all text-[#4A3026] dark:text-[#EDE1D5] min-h-[36px]"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#C7A46A]" />
                              <span>Edit Prompt</span>
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSavePrompt(p.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2B1D17] text-[#FCFAF7] text-xs font-medium active:scale-95 transition-all min-h-[36px]"
                              >
                                <Check className="w-3.5 h-3.5 text-[#C7A46A]" />
                                <span>Save v{p.version + 1}</span>
                              </button>
                              <button
                                onClick={() => setEditingPromptId(null)}
                                className="px-3 py-1.5 rounded-lg border border-[#DCC9B8] text-xs active:scale-95 transition-all min-h-[36px]"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <textarea
                          value={editedInstruction}
                          onChange={(e) => setEditedInstruction(e.target.value)}
                          rows={6}
                          className="w-full p-3 font-mono text-xs rounded-xl bg-white dark:bg-[#17110E] border border-[#C7A46A] text-[#2B1D17] dark:text-[#FCFAF7] focus:outline-none leading-relaxed"
                        />
                      ) : (
                        <div className="p-3 rounded-xl bg-[#EDE1D5]/30 dark:bg-[#17110E]/60 text-xs font-mono text-[#6B493B] dark:text-[#DCC9B8] leading-relaxed whitespace-pre-wrap overflow-x-auto">
                          {p.systemInstruction}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7]">
                  AI Model Providers
                </h1>
                <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] mt-1">
                  Provider abstraction layer supporting Google Gemini and future extensions.
                </p>
              </div>

              <div className="space-y-4">
                {models.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm text-[#2B1D17] dark:text-[#FCFAF7]">
                          {m.name}
                        </h3>
                        {m.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C7A46A]/20 text-[#C7A46A] border border-[#C7A46A]/40">
                            Default Engine
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#8A7A70] mt-1 flex-wrap">
                        <span>Provider: {m.provider}</span>
                        <span>&middot;</span>
                        <span className="font-mono">{m.modelId}</span>
                        <span>&middot;</span>
                        <span>Context: {m.contextWindow}</span>
                      </div>
                    </div>

                    <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-medium capitalize bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7]">
                  Usage Analytics
                </h1>
                <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] mt-1">
                  Synthesized token volume, session longevity, and retention metrics.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921] text-center">
                <BarChart3 className="w-10 h-10 text-[#C7A46A] mx-auto mb-3" />
                <h3 className="font-serif text-xl mb-2">Steady Daily Growth</h3>
                <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] max-w-md mx-auto">
                  Over 12,400 query turns resolved this cycle with zero rate limit interruptions.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7]">
                  User Accounts
                </h1>
                <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] mt-1">
                  Authenticated members and role assignments.
                </p>
              </div>

              <div className="rounded-2xl border border-[#DCC9B8]/80 dark:border-[#3A2921] overflow-x-auto bg-[#FCFAF7] dark:bg-[#1E1511]">
                <table className="w-full text-xs text-left min-w-[480px]">
                  <thead className="bg-[#EDE1D5]/40 dark:bg-[#17110E] border-b border-[#DCC9B8]/60 text-[#8A7A70]">
                    <tr>
                      <th className="p-3.5 font-medium">User</th>
                      <th className="p-3.5 font-medium">Role</th>
                      <th className="p-3.5 font-medium">Conversations</th>
                      <th className="p-3.5 font-medium">Favorite Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE1D5]/40 dark:divide-[#2B1D17]">
                    <tr>
                      <td className="p-3.5 font-medium text-[#2B1D17] dark:text-[#FCFAF7]">Elena Rostova</td>
                      <td className="p-3.5 text-[#C7A46A] font-semibold">Admin</td>
                      <td className="p-3.5">42</td>
                      <td className="p-3.5">Developer</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-[#2B1D17] dark:text-[#FCFAF7]">Julian Hayes</td>
                      <td className="p-3.5 text-[#8A7A70]">Member</td>
                      <td className="p-3.5">18</td>
                      <td className="p-3.5">Creative</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-medium text-[#2B1D17] dark:text-[#FCFAF7]">Claire Beauchamp</td>
                      <td className="p-3.5 text-[#8A7A70]">Member</td>
                      <td className="p-3.5">31</td>
                      <td className="p-3.5">Tutor</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
