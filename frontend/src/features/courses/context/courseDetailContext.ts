import { createContext, useContext } from 'react';
import type { CourseDetail } from '@/shared/types/entities';

export interface CourseDetailContextValue {
  course: CourseDetail | null;
  isLoading: boolean;
  isEnrolled: boolean;
  isFavorite: boolean;
  /** Lesson where the student resumes; lessons before it count as done. */
  startedLessonId: string;
  /** Seed-based progress shown once the student is enrolled. */
  progress: number;
  toastMessage: string | null;
  enroll: () => void;
  toggleFavorite: () => void;
  continueLearning: () => void;
  hideToast: () => void;
}

export const CourseDetailContext = createContext<CourseDetailContextValue | null>(null);

/** Every piece of landing-page state the surfaces share, without prop drilling. */
export function useCourseDetail(): CourseDetailContextValue {
  const value = useContext(CourseDetailContext);
  if (!value) throw new Error('[courses] useCourseDetail must be used inside CourseDetailProvider.');
  return value;
}