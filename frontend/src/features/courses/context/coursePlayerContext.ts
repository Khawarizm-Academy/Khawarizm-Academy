import { createContext, useContext } from 'react';
import type { CourseDetail, CourseLesson, CourseProblem } from '@/shared/types/entities';
import type { CourseTab } from '@/features/courses/types';
import type { CourseQuizSummary } from '@/features/courses/quizTypes';

export interface CoursePlayerContextValue {
  courseSlug: string;
  course: CourseDetail | null;
  isLoading: boolean;
  activeLesson: CourseLesson | null;
  activeLessonId: string;
  completedIds: string[];
  activeTab: CourseTab;
  isSyllabusOpen: boolean;
  problems: CourseProblem[];
  problemsLoading: boolean;
  problemsError: Error | null;
  retryProblems: () => Promise<CourseProblem[] | undefined>;
  canReadDiscussions: boolean;
  canPostDiscussions: boolean;
  canReplyDiscussions: boolean;
  canModerateDiscussions: boolean;
  quizzes: CourseQuizSummary[];
  quizzesLoading: boolean;
  quizzesError: Error | null;
  retryQuizzes: () => Promise<CourseQuizSummary[] | undefined>;
  /** Single unified course percentage: completed lessons over total lessons. */
  progress: number;
  isExamUnlocked: boolean;
  selectLesson: (lessonId: string) => void;
  selectTab: (tab: CourseTab) => void;
  completeLesson: (options?: { showProblems?: boolean; showToast?: boolean }) => void;
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
