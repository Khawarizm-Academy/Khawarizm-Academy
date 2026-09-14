import React from 'react';

interface RadialProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

export const RadialProgressRing: React.FC<RadialProgressRingProps> = ({
  progress,
  size = 44,
  strokeWidth = 3.5,
  className = '',
  color = '#29A9FF',
}) => {
  const safeProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeProgress / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={safeProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`التقدم: ${safeProgress}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background Track Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0F2B5C"
          strokeWidth={strokeWidth}
          opacity={0.7}
        />
        {/* Animated Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 4px ${color}80)`,
          }}
        />
      </svg>
      {/* Center Percentage Display */}
      <span className="absolute text-[10px] sm:text-[11px] font-bold text-[#DCE5EE] font-['Cairo',sans-serif] tracking-tight">
        {safeProgress}%
      </span>
    </div>
  );
};
