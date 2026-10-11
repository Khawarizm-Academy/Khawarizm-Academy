import React from 'react';
import { SkeletonBox, SkeletonBadge } from '@/shared/components/Loading/SkeletonPrimitives';
import { CatalogGridSkeleton } from '@/features/catalog/components/states/CatalogGridSkeleton';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';

interface PageSkeletonProps {
  variant?: 'catalog' | 'home' | 'detail' | 'dashboard' | 'default';
}

/**
 * Tier 1 Skeleton: Rendered during initial cold page loads or route suspense.
 * Mimics the entire page structure to achieve 0 Cumulative Layout Shift (CLS).
 */
export const PageSkeleton: React.FC<PageSkeletonProps> = ({ variant = 'default' }) => {
  if (variant === 'catalog') {
    return (
      <div className="skeleton-page" aria-busy="true">
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
              <div className="w-full h-14 rounded-xl skeleton-box flex-between px-4">
                <SkeletonBox className="w-32 h-5" />
                <SkeletonBox className="w-44 h-8 rounded-lg" />
              </div>

              {/* 6-Card Grid Skeleton */}
              <CatalogGridSkeleton count={6} />
            </div>

            {/* Desktop Filter Sidebar Placeholder */}
            <aside className="skeleton-sidebar">
              <div className="flex-between pb-4 border-b border-navy-600/40">
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
              <div className="flex flex-col gap-3 pt-4 border-t border-navy-600/30">
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
      <div className="skeleton-page" aria-busy="true">
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
              <div className="flex-between">
                <SkeletonBox className="w-44 h-7" />
                <SkeletonBox className="w-24 h-5" />
              </div>
              <DataSectionSkeleton variant="rail" count={4} />
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <div className="flex-between">
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

  if (variant === 'dashboard') {
    return (
      <div className="skeleton-page" aria-busy="true">
        <div className="w-full min-h-screen flex justify-start items-start">
          {/* 1. Sidebar Placeholder (desktop only) */}
          <aside className="hidden lg:flex w-60 shrink-0 self-stretch flex-col gap-6 p-5 bg-slate-900/80 border-b-0">
            <SkeletonBox className="w-28 h-8 rounded-lg" />
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBox className="w-4 h-4 rounded" />
                  <SkeletonBox className={i === 0 ? 'w-24 h-5' : 'w-20 h-4'} />
                </div>
              ))}
            </div>
          </aside>

          {/* 2. Main Workspace Column */}
          <main className="flex-1 min-w-0 flex flex-col gap-6 md:gap-8 px-4 sm:px-6 md:px-10 py-4 md:py-6">
            {/* Top Bar Placeholder (desktop) */}
            <div className="hidden md:block w-full h-12 rounded-xl skeleton-box" />

            {/* Greeting Header Row */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center gap-6 flex-wrap">
                <div className="flex flex-col gap-2">
                  <SkeletonBox className="w-56 h-7" />
                  <SkeletonBox className="w-72 h-4" />
                </div>
                <div className="flex items-center gap-3">
                  <SkeletonBadge width="130px" />
                  <SkeletonBadge width="160px" />
                  <SkeletonBadge width="140px" />
                </div>
              </div>
            </div>

            {/* Two-Column Content */}
            <div className="w-full flex flex-col lg:flex-row gap-8">
              {/* Primary Column */}
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                <div className="w-full h-44 rounded-2xl skeleton-card" />
                <div className="flex flex-col gap-4">
                  <SkeletonBox className="w-44 h-6" />
                  <DataSectionSkeleton variant="list" count={3} />
                </div>
              </div>

              {/* Stats Sidebar Placeholder (x-large only) */}
              <aside className="hidden xl:flex w-80 shrink-0 flex-col gap-6">
                <div className="w-full h-64 rounded-2xl skeleton-card" />
                <div className="w-full h-44 rounded-2xl skeleton-card" />
              </aside>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="skeleton-page" aria-busy="true">
        <main className="content-container">
          {/* Back Button Placeholder */}
          <SkeletonBox className="w-32 h-4 mb-6 mt-4" />

          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Media / CTA Column */}
            <div className="lg:col-span-1 flex flex-col gap-5">
              <div className="w-full aspect-video lg:aspect-[4/3] rounded-2xl skeleton-box" />
              <SkeletonBox className="w-full h-12 rounded-xl" />
              <SkeletonBox className="w-full h-12 rounded-xl" />
            </div>

            {/* Info Column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <SkeletonBadge width="110px" />
              <SkeletonBox className="w-3/4 h-10 rounded-xl" />
              <SkeletonBox className="w-full h-4 rounded-lg" />
              <SkeletonBox className="w-2/3 h-4 rounded-lg" />
              <SkeletonBox className="w-full h-4 rounded-lg" />

              {/* Meta Chips Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="detail-chip gap-2">
                    <SkeletonBox className="w-16 h-3" />
                    <SkeletonBox className="w-24 h-4" />
                  </div>
                ))}
              </div>

              {/* Body Section */}
              <div className="detail-panel">
                <SkeletonBox className="w-48 h-6" />
                <SkeletonBox className="w-full h-4" />
                <SkeletonBox className="w-5/6 h-4" />
                <SkeletonBox className="w-3/4 h-4" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Default Page Skeleton
  return (
    <div className="skeleton-page" aria-busy="true">
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
