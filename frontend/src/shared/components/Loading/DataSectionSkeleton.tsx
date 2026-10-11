import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonCircle, SkeletonBadge } from '@/shared/components/Loading/SkeletonPrimitives';

interface DataSectionSkeletonProps {
  variant?: 'grid' | 'rail' | 'list';
  count?: number;
  className?: string;
}

/**
 * Tier 2 Skeleton: Rendered ONLY in the dynamic data section during
 * filter updates, tab switching, search typing, or pagination.
 * The rest of the page remains intact and interactive.
 */
export const DataSectionSkeleton: React.FC<DataSectionSkeletonProps> = ({
  variant = 'grid',
  count = 6,
  className = '',
}) => {
  if (variant === 'rail') {
    return (
      <div className={`skeleton-rail ${className}`}>
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="w-[280px] sm:w-[320px] shrink-0 skeleton-card min-h-[360px] select-none"
          >
            <div className="skeleton-media-well">
              <SkeletonBox className="absolute inset-0 w-full h-full opacity-60" />
              <SkeletonCircle size={36} />
            </div>
            <div className="skeleton-card-body gap-3">
              <div className="flex flex-col gap-2">
                <SkeletonBadge width="75px" />
                <SkeletonText lines={2} lastLineWidth="65%" />
              </div>
              <div className="skeleton-meta">
                <SkeletonBox className="w-16 h-4" />
                <SkeletonBox className="w-20 h-7 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`w-full flex flex-col gap-4 ${className}`}>
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="w-full p-4 skeleton-card flex flex-col sm:flex-row items-center gap-4 justify-between select-none"
          >
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <SkeletonBox className="w-20 h-20 rounded-lg shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <SkeletonBadge width="80px" />
                <SkeletonText lines={2} lastLineWidth="80%" />
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <SkeletonBox className="w-24 h-5" />
              <SkeletonBox className="w-28 h-9 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: Responsive Grid
  return (
    <div
      className={`w-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch ${className}`}
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card min-h-[380px] select-none">
          <div className="skeleton-media-well">
            <SkeletonBox className="absolute inset-0 w-full h-full opacity-60" />
            <SkeletonCircle size={36} />
            <div className="absolute top-2.5 right-2.5">
              <SkeletonBadge width="65px" />
            </div>
          </div>
          <div className="skeleton-card-body">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <SkeletonBadge width="80px" />
                <SkeletonBox className="w-16 h-4" />
              </div>
              <SkeletonText lines={2} lastLineWidth="70%" />
              <div className="flex items-center gap-2 mt-2">
                <SkeletonCircle size={24} />
                <SkeletonBox className="w-28 h-3.5" />
              </div>
            </div>
            <div className="skeleton-meta">
              <SkeletonBox className="w-20 h-4" />
              <SkeletonBox className="w-24 h-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
