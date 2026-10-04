import React, { useState, useEffect } from 'react';
import { AuraSymbol } from '../aura/AuraSymbol';
import { AI_MODES } from '../../data/modes';
import { AIModeId, SystemPromptConfig, ModelConfig } from '../../types';
import { 
  LayoutDashboard, 
  Users, 
  Sparkles, 
  Cpu, 
  BarChart3, 
  ArrowLeft, 
  Check, 
  Edit3, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

interface AdminDashboardProps {
  onBackToChat: () => void;
  onOpenLanding: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

interface AdminMetricsData {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  activeSessions: number;
  totalAdmins: number;
  recentMessages24h: number;
  recentUsers24h: number;
  personaDistribution: Array<{ mode: string; count: number; percentage: number }>;
  userDirectory: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    conversationCount: number;
    createdAt: string;
  }>;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'prompts' | 'models' | 'analytics'>('overview');
  const [metrics, setMetrics] = useState<AdminMetricsData | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Fetch real PostgreSQL metrics
  const fetchMetrics = () => {
    setIsLoadingMetrics(true);
    setMetricsError(null);

    fetch('/api/admin/metrics', {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
      .then((res) => {
        if (res.status === 401) {
          throw new Error('Authentication required. Please sign in as an administrator.');
        }
        if (res.status === 403) {
          throw new Error('Administrative privilege required (Role: ADMIN). Access denied.');
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch metrics (Status ${res.status}).`);
        }
        return res.json();
      })
      .then((data) => {
        if (data?.metrics) {
          setMetrics(data.metrics);
        }
      })
      .catch((err) => {
        setMetricsError(err?.message || 'Failed to load administrative metrics.');
      })
      .finally(() => {
        setIsLoadingMetrics(false);
      });
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // System prompts with localStorage persistence
  const [prompts, setPrompts] = useState<SystemPromptConfig[]>(() => {
    try {
      const saved = localStorage.getItem('aura_admin_prompts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PROMPTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('aura_admin_prompts', JSON.stringify(prompts));
    } catch (e) {
      console.warn('LocalStorage error saving admin prompts:', e);
    }
  }, [prompts]);

  const [models] = useState<ModelConfig[]>([
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

  // Helper to resolve persona distribution counts and percentages safely
  const getModeStats = (modeId: string) => {
    if (!metrics || !metrics.personaDistribution) return { count: 0, percentage: 0 };
    const found = metrics.personaDistribution.find((p) => p.mode === modeId);
    return found ? { count: found.count, percentage: found.percentage } : { count: 0, percentage: 0 };
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
            onClick={fetchMetrics}
            disabled={isLoadingMetrics}
            className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg border border-[#DCC9B8] dark:border-[#3A2921] hover:bg-[#EDE1D5]/50 active:scale-95 transition-all min-h-[36px]"
            title="Refresh database metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="text-xs font-mono px-2.5 py-1.5 rounded-lg border border-[#DCC9B8] dark:border-[#3A2921] hover:bg-[#EDE1D5]/50 active:scale-95 transition-all min-h-[36px]"
          >
            {isDarkMode ? 'LIGHT' : 'DARK'}
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#6B493B] dark:text-[#DCC9B8]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Database Connected</span>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-8 gap-4 sm:gap-6 md:gap-8">
        {/* Admin Left Sidebar / Nav */}
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
          {/* Error Banner */}
          {metricsError && (
            <div className="mb-6 p-4 rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-xs text-red-800 dark:text-red-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>{metricsError}</span>
              </div>
              <button
                onClick={fetchMetrics}
                className="px-3 py-1 rounded-lg bg-red-100 dark:bg-red-900/40 hover:bg-red-200 text-red-900 dark:text-red-200 font-medium active:scale-95 transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7]">
                  Platform Intelligence
                </h1>
                <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] mt-1">
                  Live operational telemetry and configuration console for AURA companion services.
                </p>
              </div>

              {/* Live PostgreSQL Telemetry Notice */}
              <div className="p-3.5 rounded-xl border border-[#DCC9B8] dark:border-[#3A2921] bg-[#EDE1D5]/40 dark:bg-[#211814] text-xs text-[#6B493B] dark:text-[#DCC9B8] flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#C7A46A] shrink-0" />
                <span>
                  <strong>PostgreSQL Live Telemetry:</strong> Metrics, sessions, and directory records below are aggregated directly from the database in real-time.
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    Total Conversations
                  </span>
                  <div className="text-2xl font-serif font-medium mt-1 text-[#2B1D17] dark:text-[#FCFAF7]">
                    {isLoadingMetrics ? '...' : (metrics?.totalConversations ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-[#8A7A70] mt-1 block">
                    {metrics?.recentMessages24h ?? 0} messages in last 24h
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    Messages Synthesized
                  </span>
                  <div className="text-2xl font-serif font-medium mt-1 text-[#2B1D17] dark:text-[#FCFAF7]">
                    {isLoadingMetrics ? '...' : (metrics?.totalMessages ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-[#8A7A70] mt-1 block">
                    Persisted across all turns
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    Active Sessions
                  </span>
                  <div className="text-2xl font-serif font-medium mt-1 text-[#2B1D17] dark:text-[#FCFAF7]">
                    {isLoadingMetrics ? '...' : (metrics?.activeSessions ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 inline-flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Valid cookie sessions
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    Registered Users
                  </span>
                  <div className="text-2xl font-serif font-medium mt-1 text-[#2B1D17] dark:text-[#FCFAF7]">
                    {isLoadingMetrics ? '...' : (metrics?.totalUsers ?? 0).toLocaleString()}
                  </div>
                  <span className="text-[11px] text-[#8A7A70] mt-1 block">
                    {metrics?.totalAdmins ?? 0} Admin{(metrics?.totalAdmins ?? 0) === 1 ? '' : 's'} registered
                  </span>
                </div>
              </div>

              {/* Mode Distribution Bar */}
              <div className="p-6 rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921]">
                <h3 className="font-serif text-lg font-medium mb-1">
                  Persona Utilization Ratio
                </h3>
                <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] mb-5">
                  Real distribution of conversations by active AURA persona mode.
                </p>

                <div className="space-y-4">
                  {(Object.keys(AI_MODES) as AIModeId[]).map((modeKey) => {
                    const stats = getModeStats(modeKey);
                    const modeInfo = AI_MODES[modeKey];
                    return (
                      <div key={modeKey}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{modeInfo.name}</span>
                          <span className="font-mono text-[#C7A46A]">
                            {stats.percentage}% ({stats.count} conversation{stats.count === 1 ? '' : 's'})
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#EDE1D5] dark:bg-[#2B1D17] overflow-hidden">
                          <div
                            className="h-full bg-[#C7A46A] rounded-full transition-all duration-500"
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
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
                  Provider abstraction layer supporting Google Gemini SDK streaming engines.
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
                  Database-verified volume and platform activity summary.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921] text-center">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    24h Message Volume
                  </span>
                  <div className="text-3xl font-serif font-medium mt-2 text-[#2B1D17] dark:text-[#FCFAF7]">
                    {isLoadingMetrics ? '...' : (metrics?.recentMessages24h ?? 0).toLocaleString()}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921] text-center">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    24h New Users
                  </span>
                  <div className="text-3xl font-serif font-medium mt-2 text-[#2B1D17] dark:text-[#FCFAF7]">
                    {isLoadingMetrics ? '...' : (metrics?.recentUsers24h ?? 0).toLocaleString()}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/80 dark:border-[#3A2921] text-center">
                  <span className="text-[11px] uppercase font-semibold text-[#8A7A70] dark:text-[#8A6756]">
                    Active Sessions
                  </span>
                  <div className="text-3xl font-serif font-medium mt-2 text-[#2B1D17] dark:text-[#FCFAF7]">
                    {isLoadingMetrics ? '...' : (metrics?.activeSessions ?? 0).toLocaleString()}
                  </div>
                </div>
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
                  Registered database members and role assignments.
                </p>
              </div>

              <div className="rounded-2xl border border-[#DCC9B8]/80 dark:border-[#3A2921] overflow-x-auto bg-[#FCFAF7] dark:bg-[#1E1511]">
                <table className="w-full text-xs text-left min-w-[480px]">
                  <thead className="bg-[#EDE1D5]/40 dark:bg-[#17110E] border-b border-[#DCC9B8]/60 text-[#8A7A70]">
                    <tr>
                      <th className="p-3.5 font-medium">User</th>
                      <th className="p-3.5 font-medium">Email</th>
                      <th className="p-3.5 font-medium">Role</th>
                      <th className="p-3.5 font-medium">Conversations</th>
                      <th className="p-3.5 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE1D5]/40 dark:divide-[#2B1D17]">
                    {isLoadingMetrics ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#8A7A70]">
                          Loading database user records...
                        </td>
                      </tr>
                    ) : !metrics?.userDirectory || metrics.userDirectory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#8A7A70]">
                          No registered users found in database.
                        </td>
                      </tr>
                    ) : (
                      metrics.userDirectory.map((u) => (
                        <tr key={u.id}>
                          <td className="p-3.5 font-medium text-[#2B1D17] dark:text-[#FCFAF7]">
                            {u.displayName || u.email.split('@')[0]}
                          </td>
                          <td className="p-3.5 font-mono text-[#8A7A70]">
                            {u.email}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                u.role === 'ADMIN'
                                  ? 'bg-[#C7A46A]/20 text-[#C7A46A] border border-[#C7A46A]/40'
                                  : 'bg-[#EDE1D5] dark:bg-[#2B1D17] text-[#8A7A70]'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono">
                            {u.conversationCount}
                          </td>
                          <td className="p-3.5 text-[#8A7A70]">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
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
