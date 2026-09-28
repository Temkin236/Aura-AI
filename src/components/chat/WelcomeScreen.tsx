import React from 'react';
import { AuraSymbol } from '../aura/AuraSymbol';
import { AIModeId } from '../../types';
import { AI_MODES } from '../../data/modes';
import { Sparkles, Code, BookOpen, Lightbulb, GraduationCap } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectPrompt: (promptText: string, mode: AIModeId) => void;
  currentMode: AIModeId;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  currentMode
}) => {
  const currentModeInfo = AI_MODES[currentMode];

  const suggestionCards = [
    {
      title: 'Explain Python simply',
      category: 'Programming',
      prompt: 'Explain how Python handles asynchronous programming with asyncio, in simple terms with a clear mental model.',
      icon: <Code className="w-4 h-4 text-[#C7A46A]" />,
      mode: 'developer' as AIModeId
    },
    {
      title: 'Teach me how RAG works',
      category: 'AI Architecture',
      prompt: 'Teach me how Retrieval-Augmented Generation (RAG) works from first principles, with an intuitive analogy.',
      icon: <BookOpen className="w-4 h-4 text-[#C7A46A]" />,
      mode: 'tutor' as AIModeId
    },
    {
      title: 'Help me debug this code',
      category: 'Software Engineering',
      prompt: 'I want to review and debug a function for performance bottlenecks and edge cases. What should I share first?',
      icon: <Sparkles className="w-4 h-4 text-[#C7A46A]" />,
      mode: 'developer' as AIModeId
    },
    {
      title: 'Give me a project idea',
      category: 'Creative Exploration',
      prompt: 'Give me 3 original and sophisticated project concepts combining modern AI with thoughtful editorial design.',
      icon: <Lightbulb className="w-4 h-4 text-[#C7A46A]" />,
      mode: 'creative' as AIModeId
    },
    {
      title: 'Help me study',
      category: 'Deep Learning',
      prompt: 'I am preparing for an interview or exam. Act as my thoughtful tutor and guide me through key concepts.',
      icon: <GraduationCap className="w-4 h-4 text-[#C7A46A]" />,
      mode: 'tutor' as AIModeId
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-5 sm:py-8 max-w-3xl mx-auto w-full text-center">
      {/* Centered Elegant AURA Symbol */}
      <div className="mb-4 sm:mb-6 relative">
        <AuraSymbol
          size={52}
          glow={true}
          animated={true}
          variant="gold"
          className="transition-transform hover:scale-105 duration-300 sm:scale-110"
        />
      </div>

      {/* Editorial Headline */}
      <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-light text-[#2B1D17] dark:text-[#FCFAF7] tracking-tight mb-2 sm:mb-3">
        What would you like to explore?
      </h1>

      {/* Subheadline */}
      <p className="text-sm sm:text-base md:text-lg text-[#6B493B] dark:text-[#DCC9B8] max-w-xl mx-auto leading-relaxed mb-5 sm:mb-8 font-sans font-normal">
        Ask AURA anything. Learn, build, write, or simply think out loud.
      </p>

      {/* Active mode indicator */}
      <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#EDE1D5]/60 dark:bg-[#211814] border border-[#DCC9B8] dark:border-[#3A2921] text-xs text-[#4A3026] dark:text-[#DCC9B8] mb-5 sm:mb-8 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C7A46A]" />
        <span>Currently in <strong>{currentModeInfo.name}</strong> mode:</span>
        <span className="text-[#8A7A70] dark:text-[#8A6756] hidden sm:inline">{currentModeInfo.tagline}</span>
      </div>

      {/* Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full text-left">
        {suggestionCards.slice(0, 5).map((card, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(card.prompt, card.mode)}
            className="group relative p-3.5 sm:p-4 rounded-2xl bg-[#FCFAF7] dark:bg-[#211814] border border-[#DCC9B8]/70 dark:border-[#3A2921] hover:border-[#C7A46A] hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px]"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-[#8A7A70] dark:text-[#8A6756]">
                  {card.category}
                </span>
                <div className="p-1 rounded-md bg-[#EDE1D5]/50 dark:bg-[#17110E] group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-[#2B1D17] dark:text-[#FCFAF7] group-hover:text-[#4A3026] transition-colors leading-snug">
                {card.title}
              </h3>
            </div>
            <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] line-clamp-2 mt-2 leading-relaxed">
              {card.prompt}
            </p>
          </button>
        ))}

        {/* 6th Card - Free thought card */}
        <button
          type="button"
          onClick={() => onSelectPrompt('I have an idea I want to think through with you. Help me explore it from multiple angles.', 'friendly')}
          className="group relative p-3.5 sm:p-4 rounded-2xl bg-[#FCFAF7] dark:bg-[#211814] border border-[#DCC9B8]/70 dark:border-[#3A2921] hover:border-[#C7A46A] hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px]"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-[#8A7A70] dark:text-[#8A6756]">
                Brainstorming
              </span>
              <div className="p-1 rounded-md bg-[#EDE1D5]/50 dark:bg-[#17110E] group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4 text-[#C7A46A]" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-[#2B1D17] dark:text-[#FCFAF7] group-hover:text-[#4A3026] transition-colors leading-snug">
              Think out loud
            </h3>
          </div>
          <p className="text-xs text-[#8A6756] dark:text-[#8A7A70] line-clamp-2 mt-2 leading-relaxed">
            Unpack a complex decision or fresh creative concept together.
          </p>
        </button>
      </div>
    </div>
  );
};
