import React from 'react';

interface SkeletonBoxProps {
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({ className = '', style }) => {
  return <div className={`skeleton-box rounded-lg ${className}`} style={style} />;
};

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  className = '',
  lastLineWidth = '60%',
}) => {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        return (
          <div
            key={index}
            className="skeleton-text skeleton-box"
            style={{ width: isLast && lines > 1 ? lastLineWidth : '100%' }}
          />
        );
      })}
    </div>
  );
};

interface SkeletonCircleProps {
  size?: number | string;
  className?: string;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 40,
  className = '',
}) => {
  const dim = typeof size === 'number' ? `${size}px` : size;
  return (
    <div
      className={`skeleton-circle skeleton-box shrink-0 ${className}`}
      style={{ width: dim, height: dim }}
    />
  );
};

interface SkeletonBadgeProps {
  className?: string;
  width?: string;
}

export const SkeletonBadge: React.FC<SkeletonBadgeProps> = ({
  className = '',
  width = '70px',
}) => {
  return (
    <div
      className={`skeleton-badge skeleton-box shrink-0 ${className}`}
      style={{ width }}
    />
  );
};
