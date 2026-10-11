import detailsJson from '@/shared/json/mockCourses.json';
import problemsJson from '@/shared/json/mockCourseProblems.json';
import type { CourseExam, CourseLiveSession, CourseModule, CourseProblem } from '@/shared/types/entities';

/** The extra landing-page fields a course record adds on top of its catalog base. */
export interface CourseDetailSeed {
  id: string;
  tagline: string;
  about: string;
  instructorCredential: string;
  instructorBio: string;
  reviewCount: number;
  enrolledCount: number;
  /** Lesson the student left off at; lessons before it count as completed. */
  startedLessonId: string;
  outcomes: string[];
  modules: CourseModule[];
  liveSessions: CourseLiveSession[];
  exam: CourseExam;
  relatedIds: string[];
}

/** JSON widens literals; cast once here so the rest of the app stays typed. */
export const mockCourseDetails = detailsJson.details as CourseDetailSeed[];

export const mockCourseProblems = problemsJson.problems as CourseProblem[];
