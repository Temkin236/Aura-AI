import React, { useState, useRef, useEffect } from 'react';
import { AIModeId } from '../../types';
import { AI_MODES } from '../../data/modes';
import { Coffee, Code, BookOpen, Sparkles, Target, ChevronDown, Check } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: AIModeId;
  onSelectMode: (mode: AIModeId) => void;
  compact?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getModeIcon = (id: AIModeId, sizeClass = 'w-3.5 h-3.5') => {
    switch (id) {
      case 'friendly':
        return <Coffee className={sizeClass} />;
      case 'developer':
        return <Code className={sizeClass} />;
      case 'tutor':
        return <BookOpen className={sizeClass} />;
      case 'creative':
        return <Sparkles className={sizeClass} />;
      case 'professional':
        return <Target className={sizeClass} />;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeMode = AI_MODES[currentMode] || AI_MODES.developer;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border border-[#DCC9B8] dark:border-[#3A2921] bg-[#FCFAF7]/90 dark:bg-[#211814]/90 text-[#4A3026] dark:text-[#EDE1D5] hover:border-[#C7A46A] active:scale-95 transition-all ${
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 sm:px-3 py-1.5 text-xs font-medium'
        } shadow-xs`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Change AI Persona Mode"
      >
        <span className="text-[#C7A46A] flex-shrink-0">
          {getModeIcon(currentMode, 'w-3.5 h-3.5')}
        </span>
        <span className="font-medium tracking-wide truncate max-w-[100px] sm:max-w-none">
          {activeMode.name}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-[#8A6756] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 bottom-full mb-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#FCFAF7] dark:bg-[#211814] border border-[#DCC9B8] dark:border-[#3A2921] shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
        >
          <div className="px-2.5 py-1.5 border-b border-[#EDE1D5] dark:border-[#2B1D17]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A7A70] dark:text-[#8A6756]">
              Select AI Persona
            </p>
          </div>

          <div className="py-1 space-y-0.5">
            {(Object.keys(AI_MODES) as AIModeId[]).map((modeId) => {
              const mode = AI_MODES[modeId];
              const isSelected = modeId === currentMode;

              return (
                <button
                  key={modeId}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => {
                    onSelectMode(modeId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-[#EDE1D5]/80 dark:bg-[#2B1D17] text-[#2B1D17] dark:text-[#FCFAF7] font-medium shadow-xs'
                      : 'hover:bg-[#EDE1D5]/40 dark:hover:bg-[#2B1D17]/40 text-[#4A3026] dark:text-[#DCC9B8]'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg flex-shrink-0 ${
                      isSelected
                        ? 'bg-[#C7A46A] text-[#FCFAF7]'
                        : 'bg-[#EDE1D5]/50 dark:bg-[#17110E] text-[#6B493B] dark:text-[#C7A46A]'
                    }`}
                  >
                    {getModeIcon(modeId, 'w-3.5 h-3.5')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#2B1D17] dark:text-[#FCFAF7]">
                        {mode.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#C7A46A]" />}
                    </div>
                    <p className="text-[10px] text-[#8A7A70] dark:text-[#8A6756] truncate">
                      {mode.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
