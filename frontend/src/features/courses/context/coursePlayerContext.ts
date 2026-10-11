import { createContext, useContext } from 'react';
import type { CourseDetail, CourseLesson, CourseProblem } from '@/shared/types/entities';
import type { CourseTab } from '@/features/courses/types';

export interface CoursePlayerContextValue {
  course: CourseDetail | null;
  isLoading: boolean;
  activeLesson: CourseLesson | null;
  activeLessonId: string;
  completedIds: string[];
  activeTab: CourseTab;
  isSyllabusOpen: boolean;
  problems: CourseProblem[];
  /** Single unified course percentage: completed lessons over total lessons. */
  progress: number;
  isExamUnlocked: boolean;
  selectLesson: (lessonId: string) => void;
  selectTab: (tab: CourseTab) => void;
  completeLesson: () => void;
  openSyllabus: () => void;
  closeSyllabus: () => void;
}

export const CoursePlayerContext = createContext<CoursePlayerContextValue | null>(null);

/** Every piece of player state the surfaces share, without prop drilling. */
export function useCoursePlayer(): CoursePlayerContextValue {
  const value = useContext(CoursePlayerContext);
  if (!value) throw new Error('[courses] useCoursePlayer must be used inside CoursePlayerProvider.');
  return value;
}