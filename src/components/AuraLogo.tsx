import React from 'react';

interface AuraLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  showTagline?: boolean;
}

export const AuraLogo: React.FC<AuraLogoProps> = ({
  className = "h-8",
  variant = "dark",
  showTagline = true,
}) => {
  // Unique gradient IDs to prevent conflicts when rendered multiple times
  const idPrefix = React.useId().replace(/:/g, '');
                              
  const gradA1 = `${idPrefix}-grad-a1`;
  const gradU = `${idPrefix}-grad-u`;
  const gradR = `${idPrefix}-grad-r`;
  const gradA2 = `${idPrefix}-grad-a2`;

  const textColor = variant === 'dark' ? 'text-white' : 'text-[#141414]';
  const subtextColor = variant === 'dark' ? 'text-emerald-200' : 'text-[#6B6B6B]';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        viewBox="0 0 280 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto max-w-[170px] sm:max-w-[200px]"
        aria-label="Aura Energy Logo"
      >
        <defs>
          {/* Gradient 1: Pink/Coral/Orange for first 'A' */}
          <linearGradient id={gradA1} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>

          {/* Gradient 2: Yellow/Lime/Green for 'U' */}
          <linearGradient id={gradU} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FACC15" />
            <stop offset="60%" stopColor="#84CC16" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>

          {/* Gradient 3: Green/Teal for 'R' */}
          <linearGradient id={gradR} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="50%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Gradient 4: Cyan/Blue/Purple for second 'A' */}
          <linearGradient id={gradA2} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>

        {/* --- First A (Pink/Coral) --- */}
        <g transform="translate(0, 4)">
          {/* Outer Triangle with inner arch cutout */}
          <path
            d="M 32 4 L 60 52 C 61 54 59.5 56 57 56 L 45 56 C 43 56 41 54 40 52 L 32 36 L 24 52 C 23 54 21 56 19 56 L 7 56 C 4.5 56 3 54 4 52 L 32 4 Z"
            fill={`url(#${gradA1})`}
          />
          {/* Bottom arch curve */}
          <path
            d="M 16 56 C 24 44 40 44 48 56 Z"
            fill={`url(#${gradA1})`}
          />
        </g>

        {/* --- U (Yellow/Lime) --- */}
        <g transform="translate(68, 8)">
          <path
            d="M 6 0 L 6 32 C 6 42 15 50 26 50 C 37 50 46 42 46 32 L 46 0 L 32 0 L 32 30 C 32 34 29 37 26 37 C 23 37 20 34 20 30 L 20 0 L 6 0 Z"
            fill={`url(#${gradU})`}
          />
        </g>

        {/* --- R (Green/Teal) --- */}
        <g transform="translate(136, 8)">
          <path
            d="M 6 0 L 32 0 C 42 0 48 6 48 15 C 48 22 43 27 35 29 L 49 50 L 33 50 L 21 32 L 20 32 L 20 50 L 6 50 L 6 0 Z M 20 12 L 20 22 L 30 22 C 34 22 36 20 36 17 C 36 14 34 12 30 12 L 20 12 Z"
            fill={`url(#${gradR})`}
          />
        </g>

        {/* --- Second A (Cyan/Blue/Purple) --- */}
        <g transform="translate(204, 4)">
          <path
            d="M 32 4 L 60 52 C 61 54 59.5 56 57 56 L 45 56 C 43 56 41 54 40 52 L 32 36 L 24 52 C 23 54 21 56 19 56 L 7 56 C 4.5 56 3 54 4 52 L 32 4 Z"
            fill={`url(#${gradA2})`}
          />
          <path
            d="M 16 56 C 24 44 40 44 48 56 Z"
            fill={`url(#${gradA2})`}
          />
        </g>
      </svg>

      {showTagline && (
        <div className="flex flex-col justify-center border-l border-white/20 pl-2.5 sm:pl-3">
          <span className={`text-[13px] sm:text-[15px] font-bold tracking-[0.18em] uppercase ${textColor}`}>
            ENERGY
          </span>
          <span className={`text-[9px] sm:text-[10px] font-medium tracking-wider ${subtextColor}`}>
            BANGALORE
          </span>
        </div>
      )}
    </div>
  );
};
