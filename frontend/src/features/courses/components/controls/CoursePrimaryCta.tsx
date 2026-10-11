import React from 'react';
import { BookOpen, PlayCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCourseDetail } from '@/features/courses/context/courseDetailContext';
import { courseCopy } from '@/features/courses/data/courseCopy';

/** CTA tone per enrollment state: gold for guests, cyan outline for enrolled. */
const CTA_TONE: Record<'enrolled' | 'guest', string> = {
  enrolled: 'btn-outline-blue w-full py-3.5 text-sm font-bold',
  guest: 'btn-gold w-full py-3.5 text-sm font-bold',
};

const CTA_ICON: Record<'enrolled' | 'guest', LucideIcon> = {
  enrolled: PlayCircle,
  guest: BookOpen,
};

/** The single enroll/continue button every CTA surface (panel + sticky bar) reuses. */
export const CoursePrimaryCta: React.FC = () => {
  const { isEnrolled, progress, enroll, continueLearning } = useCourseDetail();
  const state = isEnrolled ? 'enrolled' : 'guest';
  const Icon = CTA_ICON[state];
  const label = isEnrolled ? courseCopy.landing.continueLabel : courseCopy.landing.enrollLabel;

  return (
    <button type="button" onClick={isEnrolled ? continueLearning : enroll} className={CTA_TONE[state]}>
      <Icon size={16} className="shrink-0" />
      <span>{label}</span>
      {isEnrolled && <span className="tabular-nums shrink-0">({progress}%)</span>}
    </button>
  );
};