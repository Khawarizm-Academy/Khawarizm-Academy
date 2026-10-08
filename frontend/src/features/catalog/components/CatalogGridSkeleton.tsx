import React from 'react';
import { SkeletonBox, SkeletonText, SkeletonBadge, SkeletonCircle } from '../../../shared/components/Loading/SkeletonPrimitives';

interface CatalogGridSkeletonProps {
  count?: number;
}

export const CatalogGridSkeleton: React.FC<CatalogGridSkeletonProps> = ({ count = 6 }) => {
  return (
    <div
      className="catalog-grid"
      aria-busy="true"
      aria-label="جاري تحميل البطاقات..."
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card min-h-[380px] select-none">
          {/* Media thumbnail */}
          <div className="catalog-card-media bg-navy-950/80">
            <SkeletonBox className="absolute inset-0 w-full h-full opacity-60" />

            <div className="catalog-skeleton-symbol">
              <SkeletonCircle size={18} />
            </div>

            <div className="absolute top-2.5 right-2.5">
              <SkeletonBadge width="65px" />
            </div>
          </div>

          {/* Card body */}
          <div className="catalog-card-body gap-4">
            <div className="flex flex-col gap-2.5">
              {/* Category and rating placeholders */}
              <div className="flex items-center justify-between">
                <SkeletonBadge width="80px" />
                <SkeletonBox className="w-16 h-4" />
              </div>

              <div className="mt-1">
                <SkeletonText lines={2} lastLineWidth="70%" />
              </div>

              {/* Instructor / university row */}
              <div className="flex items-center gap-2 mt-2">
                <SkeletonCircle size={24} />
                <SkeletonBox className="w-28 h-3.5" />
              </div>
            </div>

            {/* Bottom meta row */}
            <div className="pt-3 border-t border-navy-600/40 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <SkeletonBox className="w-14 h-3" />
                <SkeletonBox className="w-20 h-4" />
              </div>
              <SkeletonBox className="w-24 h-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
