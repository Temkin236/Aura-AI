import React from 'react';

interface AuraSymbolProps {
  size?: number;
  animated?: boolean;
  glow?: boolean;
  className?: string;
  variant?: 'gold' | 'espresso' | 'cream' | 'monochrome';
}

export const AuraSymbol: React.FC<AuraSymbolProps> = ({
  size = 32,
  animated = false,
  glow = false,
  className = '',
  variant = 'gold'
}) => {
  // Color palette definitions based on brand
  const outerRingStroke = variant === 'espresso' ? '#2B1D17' : variant === 'cream' ? '#EDE1D5' : '#C7A46A';
  const middleAuraFill = variant === 'cream' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(107, 73, 59, 0.12)';
  const innerAuraFill = variant === 'espresso' ? 'rgba(43, 29, 23, 0.25)' : 'rgba(199, 164, 106, 0.22)';
  const coreFill = variant === 'espresso' ? '#2B1D17' : variant === 'cream' ? '#FCFAF7' : '#4A3026';
  const sparkStroke = variant === 'cream' ? '#F8F3ED' : '#C7A46A';

  return (
    <div
      className={`inline-flex items-center justify-center relative select-none flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Optional ambient soft gold halo */}
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #C7A46A 0%, rgba(199, 164, 106, 0) 70%)',
            transform: 'scale(1.4)'
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={animated ? 'animate-aura-glow' : ''}
        aria-hidden="true"
      >
        {/* Outermost delicate perimeter aura */}
        <circle
          cx="24"
          cy="24"
          r="21.5"
          stroke={outerRingStroke}
          strokeWidth="1.2"
          strokeDasharray="2 3"
          strokeOpacity="0.5"
        />

        {/* Outer continuous aura boundary */}
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke={outerRingStroke}
          strokeWidth="1.25"
          strokeOpacity="0.8"
        />

        {/* Soft atmospheric gradient zone */}
        <circle
          cx="24"
          cy="24"
          r="14"
          fill={middleAuraFill}
        />

        {/* Inner radiant halo */}
        <circle
          cx="24"
          cy="24"
          r="9.5"
          fill={innerAuraFill}
          stroke={outerRingStroke}
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />

        {/* Deep centered nucleus */}
        <circle
          cx="24"
          cy="24"
          r="5.5"
          fill={coreFill}
        />

        {/* Minimal 4-point harmonic aura spark */}
        <path
          d="M24 7.5V11.5M24 36.5V40.5M7.5 24H11.5M36.5 24H40.5"
          stroke={sparkStroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Subtle diagonal micro-nodes */}
        <circle cx="14" cy="14" r="1.2" fill={sparkStroke} fillOpacity="0.6" />
        <circle cx="34" cy="14" r="1.2" fill={sparkStroke} fillOpacity="0.6" />
        <circle cx="14" cy="34" r="1.2" fill={sparkStroke} fillOpacity="0.6" />
        <circle cx="34" cy="34" r="1.2" fill={sparkStroke} fillOpacity="0.6" />

        {/* Core luminous center pin */}
        <circle
          cx="24"
          cy="24"
          r="1.8"
          fill="#F8F3ED"
        />
      </svg>
    </div>
  );
};
