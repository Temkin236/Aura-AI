import React from 'react';
import { AuraSymbol } from '../aura/AuraSymbol';
import { AIModeId } from '../../types';
import { AI_MODES } from '../../data/modes';
import { Sparkles, Code, BookOpen, Coffee, Target, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectPrompt: (promptText: string, mode: AIModeId) => void;
  currentMode: AIModeId;
  onSelectMode?: (mode: AIModeId) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  currentMode,
  onSelectMode,
}) => {
  const currentModeInfo = AI_MODES[currentMode] || AI_MODES.developer;

  const modeIcons: Record<AIModeId, React.ReactNode> = {
    friendly: <Coffee className="w-4 h-4 text-[#C7A46A]" />,
    developer: <Code className="w-4 h-4 text-[#C7A46A]" />,
    tutor: <BookOpen className="w-4 h-4 text-[#C7A46A]" />,
    creative: <Sparkles className="w-4 h-4 text-[#C7A46A]" />,
    professional: <Target className="w-4 h-4 text-[#C7A46A]" />,
  };

  // Specific curated prompts for the active persona + standard rich exploration
  const personaPrompts = currentModeInfo.suggestedPrompts || [];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-6 sm:py-10 max-w-3xl mx-auto w-full text-center">
      {/* Centered AURA Emblem */}
      <div className="mb-4 sm:mb-6">
        <AuraSymbol
          size={56}
          glow={true}
          animated={true}
          variant="gold"
          className="transition-transform hover:scale-105 duration-300"
        />
      </div>

      {/* Editorial Headline */}
      <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7] tracking-tight mb-2 sm:mb-3">
        What would you like to explore?
      </h1>

      {/* Subheadline */}
      <p className="text-sm sm:text-base text-[#6B493B] dark:text-[#DCC9B8] max-w-lg mx-auto leading-relaxed mb-6 font-sans">
        Ask AURA anything. Learn, build, write, or simply brainstorm your ideas.
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
                onClick={() => onSelectMode(modeId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2B1D17] dark:bg-[#FCFAF7] text-[#FCFAF7] dark:text-[#2B1D17] shadow-sm scale-105'
                    : 'bg-[#EDE1D5]/50 dark:bg-[#211814] text-[#6B493B] dark:text-[#DCC9B8] hover:bg-[#EDE1D5] dark:hover:bg-[#2B1D17]'
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full text-left">
        {personaPrompts.slice(0, 4).map((promptText, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(promptText, currentMode)}
            className="group relative p-3.5 sm:p-4 rounded-2xl bg-[#FCFAF7] dark:bg-[#211814] border border-[#DCC9B8]/70 dark:border-[#3A2921] hover:border-[#C7A46A] hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-[#EDE1D5]/50 dark:bg-[#17110E] text-[#C7A46A] flex-shrink-0 group-hover:scale-110 transition-transform mt-0.5">
                {modeIcons[currentMode]}
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#2B1D17] dark:text-[#EDE1D5] leading-snug line-clamp-2">
                {promptText}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#8A7A70] group-hover:text-[#C7A46A] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
