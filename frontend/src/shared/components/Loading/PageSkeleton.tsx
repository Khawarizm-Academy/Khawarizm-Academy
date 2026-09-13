import React from 'react';
import { SkeletonBox, SkeletonBadge } from './SkeletonPrimitives';
import { CatalogGridSkeleton } from '../../../features/catalog/components/CatalogGridSkeleton';
import { DataSectionSkeleton } from './DataSectionSkeleton';

interface PageSkeletonProps {
  variant?: 'catalog' | 'home' | 'detail' | 'default';
}

/**
 * Tier 1 Skeleton: Rendered during initial cold page loads or route suspense.
 * Mimics the entire page structure to achieve 0 Cumulative Layout Shift (CLS).
 */
export const PageSkeleton: React.FC<PageSkeletonProps> = ({ variant = 'default' }) => {
  if (variant === 'catalog') {
    return (
      <div className="w-full flex-1 flex flex-col items-center animate-pulse" aria-busy="true">
        <main className="content-container">
          {/* 1. Hero Section Placeholder */}
          <section className="w-full flex flex-col items-center text-center gap-3 pt-6 pb-2">
            <SkeletonBox className="w-72 sm:w-96 h-10 rounded-xl" />
            <SkeletonBox className="w-80 sm:w-[520px] h-5 rounded-lg mt-1" />

            {/* Mobile Tab Switcher Placeholder */}
            <div className="md:hidden w-full max-w-sm mt-3 h-10 rounded-full skeleton-box" />

            {/* Search Input Box Placeholder */}
            <div className="w-full max-w-3xl mt-4 h-14 rounded-2xl skeleton-box" />
          </section>

          {/* 2. Split Content Layout (Sidebar + Results Grid) */}
          <div className="w-full flex flex-col lg:flex-row items-start gap-8 mt-2">
            {/* Main Results Pane */}
            <div className="flex-1 w-full flex flex-col gap-6">
              {/* Toolbar Placeholder */}
              <div className="w-full h-14 rounded-xl skeleton-box flex items-center justify-between px-4">
                <SkeletonBox className="w-32 h-5" />
                <SkeletonBox className="w-44 h-8 rounded-lg" />
              </div>

              {/* 6-Card Grid Skeleton */}
              <CatalogGridSkeleton count={6} />
            </div>

            {/* Desktop Filter Sidebar Placeholder */}
            <aside className="hidden lg:block w-72 shrink-0 p-5 glass-panel rounded-2xl border border-[#1B3F80]/50 flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#1B3F80]/40">
                <SkeletonBox className="w-24 h-5" />
                <SkeletonBox className="w-16 h-4" />
              </div>

              {/* Filter Group 1 */}
              <div className="flex flex-col gap-3">
                <SkeletonBox className="w-20 h-4" />
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <SkeletonBox className="w-4 h-4 rounded" />
                      <SkeletonBox className="w-28 h-4" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter Group 2 */}
              <div className="flex flex-col gap-3 pt-4 border-t border-[#1B3F80]/30">
                <SkeletonBox className="w-24 h-4" />
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <SkeletonBox className="w-4 h-4 rounded" />
                      <SkeletonBox className="w-24 h-4" />
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  if (variant === 'home') {
    return (
      <div className="w-full flex-1 flex flex-col items-center animate-pulse" aria-busy="true">
        <main className="content-container">
          {/* 1. Hero Section Skeleton */}
          <section className="w-full flex flex-col items-center text-center gap-4 py-8">
            <SkeletonBadge width="120px" />
            <SkeletonBox className="w-80 sm:w-[560px] h-12 rounded-2xl mt-2" />
            <SkeletonBox className="w-72 sm:w-[480px] h-6 rounded-lg" />
            <div className="w-full max-w-3xl mt-4 h-16 rounded-2xl skeleton-box" />
          </section>

          {/* 2. Competition Banner Skeleton */}
          <div className="w-full h-44 rounded-2xl skeleton-box mt-2" />

          {/* 3. Twin Rails Skeleton */}
          <section className="w-full flex flex-col gap-8 mt-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <SkeletonBox className="w-44 h-7" />
                <SkeletonBox className="w-24 h-5" />
              </div>
              <DataSectionSkeleton variant="rail" count={4} />
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <div className="flex items-center justify-between">
                <SkeletonBox className="w-48 h-7" />
                <SkeletonBox className="w-24 h-5" />
              </div>
              <DataSectionSkeleton variant="rail" count={4} />
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Default Page Skeleton
  return (
    <div className="w-full flex-1 flex flex-col items-center animate-pulse" aria-busy="true">
      <main className="content-container">
        <div className="w-full flex flex-col gap-4 py-6">
          <SkeletonBox className="w-48 h-8 rounded-lg" />
          <SkeletonBox className="w-96 h-5 rounded-md" />
        </div>
        <DataSectionSkeleton variant="grid" count={6} />
      </main>
    </div>
  );
};
