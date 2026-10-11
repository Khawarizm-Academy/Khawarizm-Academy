import React from 'react';
import { SkeletonBox } from '@/shared/components/Loading/SkeletonPrimitives';

/** Tier 2 skeleton for the landing data section, mirroring the hero + sections. */
export const CourseLandingSkeleton: React.FC = () => (
  <div className="w-full flex flex-col gap-6" aria-busy="true">
    <SkeletonBox className="w-56 h-4" />

    <div className="course-hero-grid">
      <div className="course-hero-main">
        <div className="w-full aspect-video rounded-2xl skeleton-box" />
        <SkeletonBox className="w-3/4 h-9 rounded-xl" />
        <SkeletonBox className="w-full h-4 rounded-lg" />
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full skeleton-box" />
          <div className="flex flex-col gap-2">
            <SkeletonBox className="w-44 h-4 rounded-md" />
            <SkeletonBox className="w-64 h-3 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-20 rounded-xl skeleton-box" />
          ))}
        </div>
      </div>

      <div className="course-hero-aside">
        <div className="h-64 rounded-2xl skeleton-box lg:sticky lg:top-24" />
      </div>
    </div>

    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="h-16 rounded-xl skeleton-box" />
      ))}
    </div>

    <div className="w-full h-40 rounded-2xl skeleton-box" />
  </div>
);