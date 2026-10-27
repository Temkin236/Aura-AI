import React from 'react';
import { AuraSymbol } from '../aura/AuraSymbol';
import { AIModeId } from '../../types';
import { AI_MODES } from '../../data/modes';
import { Sparkles, Code, BookOpen, Coffee, Target, ArrowRight, Zap } from 'lucide-react';
import { soundFx } from '../../utils/sound';

interface WelcomeScreenProps {
  onSelectPrompt: (promptText: string, mode: AIModeId) => void;
  currentMode: AIModeId;
  onSelectMode?: (mode: AIModeId) => void;
  currentModel?: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  currentMode,
  onSelectMode,
  currentModel = 'gemini-2.5-flash',
}) => {
  const currentModeInfo = AI_MODES[currentMode] || AI_MODES.developer;

  const modeIcons: Record<AIModeId, React.ReactNode> = {
    friendly: <Coffee className="w-4 h-4 text-[#C7A46A]" />,
    developer: <Code className="w-4 h-4 text-[#C7A46A]" />,
    tutor: <BookOpen className="w-4 h-4 text-[#C7A46A]" />,
    creative: <Sparkles className="w-4 h-4 text-[#C7A46A]" />,
    professional: <Target className="w-4 h-4 text-[#C7A46A]" />,
  };

  const personaPrompts = currentModeInfo.suggestedPrompts || [];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-6 sm:py-12 max-w-3xl mx-auto w-full text-center select-none">
      {/* Centered Luminous AURA Emblem & Orb */}
      <div className="relative mb-5 sm:mb-7 group cursor-pointer" onClick={() => soundFx.playClick()}>
        <div className="absolute -inset-4 rounded-full bg-radial from-[#C7A46A]/20 to-transparent blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <AuraSymbol
          size={64}
          glow={true}
          animated={true}
          variant="gold"
          className="transition-transform group-hover:scale-110 duration-500 relative z-10"
        />
      </div>

      {/* Model Status Pill */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE1D5]/60 dark:bg-[#211814] border border-[#DCC9B8]/70 dark:border-[#3A2921] text-[11px] font-medium text-[#6B493B] dark:text-[#C7A46A] mb-3 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Zap className="w-3 h-3 text-[#C7A46A]" />
        <span>{currentModel.replace('gemini-', 'Gemini ')} • Real-time AI</span>
      </div>

      {/* Editorial Headline */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7] tracking-tight mb-2 sm:mb-3">
        What would you like to explore?
      </h1>

      {/* Subheadline */}
      <p className="text-sm sm:text-base text-[#6B493B] dark:text-[#DCC9B8] max-w-md mx-auto leading-relaxed mb-6 sm:mb-8 font-sans font-light">
        A personal conversational companion with luxury editorial rigor and five distinct mindsets.
      </p>

      {/* Persona Mode Switcher Pills */}
      {onSelectMode && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8">
          {(Object.keys(AI_MODES) as AIModeId[]).map((modeId) => {
            const isSelected = modeId === currentMode;
            const mode = AI_MODES[modeId];
            return (
              <button
                key={modeId}
                onClick={() => {
                  soundFx.playClick();
                  onSelectMode(modeId);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17] shadow-sm scale-105 border border-[#C7A46A]'
                    : 'bg-[#EDE1D5]/60 dark:bg-[#211814] text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5] dark:hover:bg-[#2B1D17] border border-[#DCC9B8]/40 dark:border-[#3A2921]'
                }`}
              >
                <span>{modeIcons[modeId]}</span>
                <span>{mode.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 w-full text-left">
        {personaPrompts.slice(0, 4).map((promptText, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              soundFx.playClick();
              onSelectPrompt(promptText, currentMode);
            }}
            className="group relative p-3.5 sm:p-4 rounded-2xl bg-[#FCFAF7] dark:bg-[#211814] border border-[#DCC9B8]/70 dark:border-[#3A2921] hover:border-[#C7A46A] dark:hover:border-[#C7A46A] hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-[#EDE1D5]/50 dark:bg-[#17110E] text-[#C7A46A] flex-shrink-0 group-hover:scale-110 transition-transform mt-0.5 border border-[#DCC9B8]/30 dark:border-[#3A2921]">
                {modeIcons[currentMode]}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-[#2B1D17] dark:text-[#EDE1D5] leading-snug line-clamp-2">
                  {promptText}
                </p>
                <span className="text-[10px] text-[#8A7A70] dark:text-[#8A6756] mt-0.5 inline-block">
                  Click to start conversation
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#8A7A70] group-hover:text-[#C7A46A] group-hover:translate-x-1 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
