import React, { useState } from 'react';
import { AuraSymbol } from '../aura/AuraSymbol';
import { MarkdownContent, CodeBlock } from '../chat/MarkdownContent';
import { AI_MODES } from '../../data/modes';
import { AIModeId } from '../../types';
import { 
  ArrowRight, 
  Code, 
  Sparkles, 
  BookOpen, 
  Coffee, 
  Target, 
  Check, 
  Copy, 
  Compass, 
  Layers, 
  Feather,
  ShieldCheck,
  ChevronRight,
  Terminal,
  Cpu,
  Bookmark
} from 'lucide-react';

interface LandingPageProps {
  onStartChatting: () => void;
  onOpenAdmin: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartChatting,
  onOpenAdmin,
  isDarkMode,
  onToggleTheme
}) => {
  const [activePreviewMode, setActivePreviewMode] = useState<AIModeId>('developer');
  const [copiedCode, setCopiedCode] = useState(false);

  const previewSnippet = {
    developer: {
      user: "How do I build an event loop in Python with graceful termination and bounded queues?",
      assistant: "When engineering an asynchronous worker pool with backpressure, couple `asyncio.Queue(maxsize=50)` with bounded consumer tasks:\n\n```python\nasync def worker(queue: asyncio.Queue):\n    while True:\n        item = await queue.get()\n        await process(item)\n        queue.task_done()\n```\n\nThis guarantees deterministic backpressure with zero unbounded allocations."
    },
    creative: {
      user: "Write a short brand manifesto on the beauty of intentional slowness.",
      assistant: "True luxury is the courage to pause. In a world hurried by noise, clarity is an act of defiance. We do not rush the ink; we allow the thought to settle like dust in autumn sunlight."
    },
    tutor: {
      user: "Teach me how vector search finds similar thoughts across billions of words.",
      assistant: "Think of words not as letters, but as coordinates in an infinite library of meaning. When two ideas share emotional or conceptual proximity, their arrows point toward the exact same constellation."
    },
    friendly: {
      user: "I feel overwhelmed by my to-do list. How should I approach today?",
      assistant: "Take a gentle breath. Let us set aside ten things and focus only on the single thread that gives you peace once completed. Everything else can wait for tomorrow."
    },
    professional: {
      user: "Summarize the primary strategic levers for our Q3 platform rollout.",
      assistant: "1. Velocity: Unblock frontend API contracts by Day 14.\n2. Integrity: Enforce automated invariant verification across all data sinks.\n3. Alignment: Single source of truth for stakeholder KPIs."
    }
  }[activePreviewMode];

  return (
    <div className="min-h-screen bg-[#F8F3ED] dark:bg-[#17110E] text-[#2B1D17] dark:text-[#EDE1D5] selection:bg-[#DCC9B8] selection:text-[#2B1D17] transition-colors">
      
      {/* Top Editorial Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#F8F3ED]/85 dark:bg-[#17110E]/85 border-b border-[#DCC9B8]/50 dark:border-[#3A2921]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AuraSymbol size={32} glow={false} variant="gold" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-2xl tracking-wide font-medium text-[#2B1D17] dark:text-[#FCFAF7]">
                AURA
              </span>
              <span className="font-mono text-xs text-[#C7A46A] tracking-widest font-semibold uppercase">
                AI
              </span>
            </div>
          </div>

          {/* Clean text navigation */}
          <div className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide text-[#6B493B] dark:text-[#DCC9B8]">
            <a href="#why-aura" className="hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors">
              Philosophy
            </a>
            <a href="#modes" className="hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors">
              Personas
            </a>
            <a href="#capabilities" className="hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors">
              Engineering
            </a>
            <a href="#learning" className="hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors">
              Mastery
            </a>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-full text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5]/60 dark:hover:bg-[#211814] transition-colors"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              <span className="text-xs font-mono">{isDarkMode ? 'LIGHT' : 'DARK'}</span>
            </button>

            <button
              onClick={onStartChatting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2B1D17] text-[#FCFAF7] hover:bg-[#4A3026] text-xs font-semibold tracking-wider uppercase transition-all shadow-sm hover:shadow-md active:scale-95"
            >
              <span>Start chatting</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C7A46A]" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 pb-20 overflow-hidden">
        {/* Subtle decorative aura shapes */}
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-3xl opacity-35 dark:opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #DCC9B8 0%, #EDE1D5 45%, rgba(248, 243, 237, 0) 70%)'
          }}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Subtle brand tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EDE1D5]/60 dark:bg-[#211814] border border-[#DCC9B8] dark:border-[#3A2921] text-xs text-[#6B493B] dark:text-[#DCC9B8] mb-8 animate-subtle-float">
            <AuraSymbol size={16} variant="gold" />
            <span className="font-medium tracking-wide">AURA AI &middot; Personal Intelligence Companion</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7] tracking-tight leading-[1.08] mb-6">
            Think better. <br />
            <span className="italic font-normal text-[#4A3026] dark:text-[#DCC9B8]">Create freely.</span>
          </h1>

          {/* Supporting Text */}
          <p className="text-lg sm:text-xl text-[#6B493B] dark:text-[#DCC9B8] max-w-2xl mx-auto leading-relaxed mb-10 font-sans font-light">
            An intelligent personal companion for learning, programming, research, writing, brainstorming, and creative exploration.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={onStartChatting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17] hover:bg-[#4A3026] dark:hover:bg-[#EDE1D5] text-sm font-semibold tracking-wide transition-all shadow-md active:scale-95 group"
            >
              <span>Start chatting with AURA</span>
              <ArrowRight className="w-4 h-4 text-[#C7A46A] group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#modes"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-[#DCC9B8] dark:border-[#3A2921] hover:border-[#C7A46A] bg-[#FCFAF7]/60 dark:bg-[#211814]/60 text-sm font-medium text-[#4A3026] dark:text-[#EDE1D5] transition-all hover:bg-[#EDE1D5]/40"
            >
              Explore Personas
            </a>
          </div>

          {/* Hero Visual: Floating Interactive AURA Conversation Interface */}
          <div className="relative max-w-4xl mx-auto rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/90 dark:border-[#3A2921] shadow-2xl p-4 sm:p-6 text-left">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-4 border-b border-[#EDE1D5] dark:border-[#2B1D17] mb-6">
              <div className="flex items-center gap-3">
                <AuraSymbol size={24} variant="gold" glow={true} />
                <div>
                  <span className="font-serif text-sm font-semibold text-[#2B1D17] dark:text-[#FCFAF7]">
                    AURA Workspace
                  </span>
                  <span className="text-[11px] text-[#8A7A70] dark:text-[#8A6756] ml-2">
                    Live Preview
                  </span>
                </div>
              </div>

              {/* Mode switch pills */}
              <div className="flex items-center gap-1 bg-[#EDE1D5]/50 dark:bg-[#2B1D17] p-1 rounded-xl">
                {(Object.keys(AI_MODES) as AIModeId[]).slice(0, 4).map((mId) => (
                  <button
                    key={mId}
                    onClick={() => setActivePreviewMode(mId)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      activePreviewMode === mId
                        ? 'bg-white dark:bg-[#17110E] text-[#2B1D17] dark:text-[#FCFAF7] shadow-xs'
                        : 'text-[#8A6756] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7]'
                    }`}
                  >
                    {AI_MODES[mId].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Messages */}
            <div className="space-y-6">
              {/* User message */}
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-[#4A3026] text-[#FCFAF7] text-sm leading-relaxed">
                  {previewSnippet.user}
                </div>
              </div>

              {/* AI message */}
              <div className="flex items-start gap-4">
                <AuraSymbol size={28} variant="gold" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm font-semibold text-[#2B1D17] dark:text-[#FCFAF7]">
                      AURA
                    </span>
                    <span className="text-xs text-[#8A6756]">&middot;</span>
                    <span className="text-xs text-[#C7A46A] font-medium">
                      {AI_MODES[activePreviewMode].name} Mode
                    </span>
                  </div>
                  <div className="text-sm leading-relaxed text-[#2B1D17] dark:text-[#EDE1D5] bg-[#F8F3ED]/60 dark:bg-[#17110E]/60 p-4 rounded-2xl border border-[#EDE1D5] dark:border-[#2B1D17]">
                    <MarkdownContent content={previewSnippet.assistant} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom prompt teaser */}
            <div className="mt-6 pt-4 border-t border-[#EDE1D5] dark:border-[#2B1D17] flex items-center justify-between text-xs text-[#8A6756] dark:text-[#8A6756]">
              <span>Ready to continue this thought?</span>
              <button
                onClick={onStartChatting}
                className="font-medium text-[#6B493B] dark:text-[#C7A46A] hover:underline flex items-center gap-1"
              >
                <span>Open in workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted / Technology Strip */}
      <section className="py-12 border-y border-[#DCC9B8]/40 dark:border-[#3A2921]/50 bg-[#FCFAF7]/50 dark:bg-[#1E1511]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold tracking-widest uppercase text-[#8A7A70] dark:text-[#8A6756] mb-8">
            Grounded in Advanced Engineering &middot; Refined for Deep Thought
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <span className="block font-serif text-2xl text-[#2B1D17] dark:text-[#FCFAF7]">100%</span>
              <span className="text-xs text-[#8A6756] dark:text-[#8A7A70] mt-1 block">Contextual Attention</span>
            </div>
            <div className="p-4">
              <span className="block font-serif text-2xl text-[#2B1D17] dark:text-[#FCFAF7]">5 Personas</span>
              <span className="text-xs text-[#8A6756] dark:text-[#8A7A70] mt-1 block">Dedicated System Prompts</span>
            </div>
            <div className="p-4">
              <span className="block font-serif text-2xl text-[#2B1D17] dark:text-[#FCFAF7]">&lt; 350ms</span>
              <span className="text-xs text-[#8A6756] dark:text-[#8A7A70] mt-1 block">Streaming First-Token Latency</span>
            </div>
            <div className="p-4">
              <span className="block font-serif text-2xl text-[#2B1D17] dark:text-[#FCFAF7]">Zero Clutter</span>
              <span className="text-xs text-[#8A6756] dark:text-[#8A7A70] mt-1 block">Anti-Slop Editorial Design</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why AURA Section */}
      <section id="why-aura" className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono uppercase tracking-widest text-[#C7A46A] font-semibold">
            The Philosophy
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7] mt-3 mb-4">
            More than answers.
          </h2>
          <p className="text-base sm:text-lg text-[#6B493B] dark:text-[#DCC9B8] leading-relaxed font-sans">
            AURA helps you understand, explore, and turn ideas into something real.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Understand */}
          <div className="p-8 rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/70 dark:border-[#3A2921] relative group hover:border-[#C7A46A] transition-all">
            <span className="text-xs font-mono text-[#C7A46A] font-semibold">01</span>
            <h3 className="text-2xl font-serif font-medium text-[#2B1D17] dark:text-[#FCFAF7] mt-3 mb-3">
              Understand
            </h3>
            <p className="text-sm text-[#6B493B] dark:text-[#DCC9B8] leading-relaxed">
              Break down intricate engineering topics, difficult academic papers, and mathematical theorems with Socratic patience and illuminating intuitive mental models.
            </p>
          </div>

          {/* Explore */}
          <div className="p-8 rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/70 dark:border-[#3A2921] relative group hover:border-[#C7A46A] transition-all">
            <span className="text-xs font-mono text-[#C7A46A] font-semibold">02</span>
            <h3 className="text-2xl font-serif font-medium text-[#2B1D17] dark:text-[#FCFAF7] mt-3 mb-3">
              Explore
            </h3>
            <p className="text-sm text-[#6B493B] dark:text-[#DCC9B8] leading-relaxed">
              Think out loud across divergent angles. From speculative literature to frontier product concepts, test hypotheses without judgement or algorithmic bias.
            </p>
          </div>

          {/* Create */}
          <div className="p-8 rounded-3xl bg-[#FCFAF7] dark:bg-[#1E1511] border border-[#DCC9B8]/70 dark:border-[#3A2921] relative group hover:border-[#C7A46A] transition-all">
            <span className="text-xs font-mono text-[#C7A46A] font-semibold">03</span>
            <h3 className="text-2xl font-serif font-medium text-[#2B1D17] dark:text-[#FCFAF7] mt-3 mb-3">
              Create
            </h3>
            <p className="text-sm text-[#6B493B] dark:text-[#DCC9B8] leading-relaxed">
              Synthesize elegant production software, write arresting essays, and construct strategic frameworks. Turn embryonic whispers into enduring work.
            </p>
          </div>
        </div>
      </section>

      {/* AI Modes Showcase */}
      <section id="modes" className="py-20 bg-[#EDE1D5]/30 dark:bg-[#17110E]/60 border-t border-[#DCC9B8]/50 dark:border-[#3A2921]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono uppercase tracking-widest text-[#C7A46A] font-semibold">
              Adaptive Intelligence
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7] mt-2 mb-3">
              Five Tailored Modes
            </h2>
            <p className="text-sm sm:text-base text-[#6B493B] dark:text-[#DCC9B8]">
              Each mode deploys a specialized system prompt, temperature configuration, and reasoning stance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {(Object.keys(AI_MODES) as AIModeId[]).map((modeId) => {
              const mode = AI_MODES[modeId];
              return (
                <div
                  key={modeId}
                  className="p-5 rounded-2xl bg-[#FCFAF7] dark:bg-[#211814] border border-[#DCC9B8]/80 dark:border-[#3A2921] flex flex-col justify-between hover:border-[#C7A46A] transition-all"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#EDE1D5]/50 dark:bg-[#17110E] flex items-center justify-center text-[#6B493B] dark:text-[#C7A46A] mb-4">
                      {modeId === 'friendly' && <Coffee className="w-5 h-5" />}
                      {modeId === 'developer' && <Code className="w-5 h-5" />}
                      {modeId === 'tutor' && <BookOpen className="w-5 h-5" />}
                      {modeId === 'creative' && <Sparkles className="w-5 h-5" />}
                      {modeId === 'professional' && <Target className="w-5 h-5" />}
                    </div>
                    <h3 className="font-serif text-lg font-medium text-[#2B1D17] dark:text-[#FCFAF7] mb-1">
                      {mode.name}
                    </h3>
                    <p className="text-xs text-[#C7A46A] font-medium mb-3">
                      {mode.tagline}
                    </p>
                    <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] leading-relaxed">
                      {mode.description}
                    </p>
                  </div>

                  <button
                    onClick={onStartChatting}
                    className="mt-6 pt-3 border-t border-[#EDE1D5] dark:border-[#2B1D17] text-[11px] font-semibold text-[#6B493B] dark:text-[#DCC9B8] hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] flex items-center justify-between"
                  >
                    <span>Use persona</span>
                    <ArrowRight className="w-3 h-3 text-[#C7A46A]" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Developer Capabilities Section */}
      <section id="capabilities" className="py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#C7A46A] font-semibold">
              Software Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7] mt-3 mb-5">
              Architectural rigor for engineers.
            </h2>
            <p className="text-sm sm:text-base text-[#6B493B] dark:text-[#DCC9B8] leading-relaxed mb-6">
              AURA does not hallucinate naive scripts. It formats clean, typed, idiomatic code with explicit error boundaries, bounded queues, and complete architectural explanations.
            </p>

            <ul className="space-y-3 text-sm text-[#4A3026] dark:text-[#DCC9B8]">
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#C7A46A]" />
                <span>Idiomatic TypeScript, Python, Rust, and SQL</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#C7A46A]" />
                <span>Syntax highlighted code blocks with instant one-click copy</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-4 h-4 text-[#C7A46A]" />
                <span>First-principles explanation of invariants and edge cases</span>
              </li>
            </ul>

            <button
              onClick={onStartChatting}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4A3026] text-[#FCFAF7] hover:bg-[#2B1D17] text-xs font-medium tracking-wide transition-all shadow-sm"
            >
              <Terminal className="w-3.5 h-3.5 text-[#C7A46A]" />
              <span>Explore Developer Mode</span>
            </button>
          </div>

          {/* Code Preview Card */}
          <div className="shadow-xl">
            <CodeBlock
              language="python"
              code={`# Bounded concurrency with backpressure
import asyncio

async def ingest_stream(source: asyncio.Queue, target: asyncio.Queue):
    while True:
        payload = await source.get()
        # Non-blocking backpressure check
        await target.put(transform(payload))
        source.task_done()`}
            />
          </div>
        </div>
      </section>

      {/* Final Editorial Call to Action */}
      <section className="py-24 border-t border-[#DCC9B8]/50 dark:border-[#3A2921] bg-[#FCFAF7] dark:bg-[#1E1612]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-6 inline-block">
            <AuraSymbol size={48} variant="gold" glow={true} animated={true} />
          </div>
          <h2 className="text-4xl sm:text-5xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7] mb-4">
            Step into clarity.
          </h2>
          <p className="text-base sm:text-lg text-[#6B493B] dark:text-[#DCC9B8] max-w-xl mx-auto mb-8 font-sans">
            Start a quiet, profound conversation with your personal AI companion.
          </p>

          <button
            onClick={onStartChatting}
            className="inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17] hover:bg-[#4A3026] text-sm font-semibold tracking-wide transition-all shadow-lg active:scale-95 group"
          >
            <span>Launch AURA AI</span>
            <ArrowRight className="w-4 h-4 text-[#C7A46A] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Editorial Luxury Footer */}
      <footer className="py-12 border-t border-[#DCC9B8]/40 dark:border-[#3A2921] text-xs text-[#8A7A70] dark:text-[#8A6756]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AuraSymbol size={22} variant="gold" />
            <span className="font-serif text-base font-semibold text-[#2B1D17] dark:text-[#FCFAF7]">
              AURA AI
            </span>
            <span className="text-[11px]">&middot; Think better. Create freely.</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={onOpenAdmin}
              className="hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors"
            >
              Admin Console
            </button>
            <a href="#why-aura" className="hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors">
              Philosophy
            </a>
            <a href="#modes" className="hover:text-[#2B1D17] dark:hover:text-[#FCFAF7] transition-colors">
              Personas
            </a>
            <span className="text-[#8A7A70]/60">&copy; {new Date().getFullYear()} AURA Intelligence Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
