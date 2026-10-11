import type { ComponentType } from 'react';
import { LessonPanel } from '@/features/courses/components/layout/LessonPanel';
import { ProblemsPanel } from '@/features/courses/components/layout/ProblemsPanel';
import { LiveSessionPanel } from '@/features/courses/components/layout/LiveSessionPanel';
import { ExamPanel } from '@/features/courses/components/layout/ExamPanel';
import type { CourseTab } from '@/features/courses/types';

/** One body panel per player tab; switching tabs swops one component. */
export const PANEL_BY_TAB: Record<CourseTab, ComponentType> = {
  lesson: LessonPanel,
  problems: ProblemsPanel,
  live: LiveSessionPanel,
  exam: ExamPanel,
};