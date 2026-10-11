import React from 'react';
import { SkeletonBox } from '@/shared/components/Loading/SkeletonPrimitives';

/** Tier 2 skeleton for the player data section: video column + path sidebar. */
export const CoursePlayerSkeleton: React.FC = () => (
  <div className="w-full flex flex-col gap-4" aria-busy="true">
    <div className="w-full flex items-center gap-3">
      <SkeletonBox className="w-28 h-4 rounded-md" />
      <SkeletonBox className="flex-1 h-5 rounded-md" />
      <SkeletonBox className="w-28 h-7 rounded-full" />
    </div>

    <div className="player-grid">
      <div className="player-main">
        <div className="w-full aspect-video rounded-2xl skeleton-box" />
        <div className="w-full h-11 rounded-full skeleton-box" />
        <div className="w-full h-56 rounded-2xl skeleton-box" />
      </div>

      <aside className="hidden lg:flex flex-col gap-3 rounded-2xl p-4 border border-navy-600/40 bg-navy-900/30">
        <SkeletonBox className="w-36 h-5 rounded-md" />
        <SkeletonBox className="w-full h-2 rounded-full" />
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full skeleton-box" />
            <div className="flex flex-col gap-1.5 flex-1">
              <SkeletonBox className="w-3/4 h-3.5 rounded-md" />
              <SkeletonBox className="w-16 h-2.5 rounded-md" />
            </div>
          </div>
        ))}
      </aside>
    </div>
  </div>
);