import { ApiError, apiGet, apiPost, apiPut } from '@/shared/lib/apiClient';
import type { CatalogItem, CourseCertificate, CourseDetail, CourseProblem } from '@/shared/types/entities';
import type { AttemptAnswer, CourseQuizSummary, PracticeVerdict, QuizAttempt } from '@/features/courses/quizTypes';

function orEmpty<T>(value: T[] | undefined): T[] { return value ?? []; }

function normalizeCourseDetail(course: CourseDetail): CourseDetail {
  return { ...course, outcomes: orEmpty(course.outcomes), modules: orEmpty(course.modules).map((module) => ({ ...module, lessons: orEmpty(module.lessons) })), liveSessions: orEmpty(course.liveSessions), relatedIds: orEmpty(course.relatedIds) };
}

export async function fetchCourseDetail(slug: string): Promise<CourseDetail | null> {
  try { return normalizeCourseDetail(await apiGet<CourseDetail>(`/courses/${slug}`)); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export interface CourseLessonContent {
  content: string;
  resources: Array<{ id: string; title: string; url: string; kind: string }>;
}
export const fetchCourseLessonContent = (slug: string, contentId: string) =>
  apiGet<CourseLessonContent>(`/courses/${encodeURIComponent(slug)}/lessons/${encodeURIComponent(contentId)}/content`);
export async function fetchRelatedCourses(slug: string): Promise<CatalogItem[]> {
  return orEmpty((await apiGet<{ items: CatalogItem[] }>(`/courses/${slug}/related`)).items);
}

/** Normalize legacy list records without ever accepting answer keys from the list payload. */
export async function fetchCourseProblems(slug: string): Promise<CourseProblem[]> {
  const items = orEmpty((await apiGet<{ items: CourseProblem[] }>(`/courses/${slug}/problems`)).items);
  return items.map((problem) => {
    const safeProblem = { ...problem } as CourseProblem & Record<string, unknown>;
    delete safeProblem.correctOptionIds;
    delete safeProblem.answer;
    delete safeProblem.answerKey;
    return { ...safeProblem, source: problem.source ?? 'legacy' };
  });
}

/** The server is the only authority for correctness; AbortSignal prevents stale checks. */
export function checkPracticeAnswer(problem: CourseProblem, optionIds: string[], signal?: AbortSignal): Promise<PracticeVerdict> {
  const path = problem.source === 'quiz' ? `/questions/${problem.id}/check` : `/problems/${problem.id}/check`;
  void signal;
  return apiPost<PracticeVerdict>(path, { optionIds });
}

export async function fetchCourseQuizzes(slug: string): Promise<CourseQuizSummary[]> {
  return orEmpty((await apiGet<{ items: CourseQuizSummary[] }>(`/courses/${slug}/quizzes`)).items);
}
export const startQuizAttempt = (quizId: string) => apiPost<QuizAttempt>(`/quizzes/${quizId}/attempts`);
export const fetchQuizAttempt = (attemptId: string) => apiGet<QuizAttempt>(`/attempts/${attemptId}`);
export async function saveQuizAnswers(attemptId: string, answers: AttemptAnswer[]): Promise<void> {
  await apiPut(`/attempts/${attemptId}/answers`, { answers });
}
export const submitQuizAttempt = (attemptId: string) => apiPost<QuizAttempt>(`/attempts/${attemptId}/submit`);

export async function enrollCourse(slug: string): Promise<boolean> { return (await apiPost<{ enrolled: boolean }>(`/courses/${slug}/enroll`)).enrolled; }
export async function toggleCourseFavorite(slug: string): Promise<{ favorited: boolean; requiresAuth: boolean }> {
  const data = await apiPost<{ favorited: boolean; requiresAuth?: boolean }>(`/courses/${slug}/favorite`);
  return { favorited: data.favorited, requiresAuth: data.requiresAuth ?? false };
}
export interface ProgressSync { progress: number; completedLessonIds: string[]; lastLesson: string; isCompleted: boolean; }
export async function syncCourseProgress(slug: string, payload: ProgressSync): Promise<void> { await apiPost(`/courses/${slug}/progress`, payload); }
export async function fetchCourseCertificate(slug: string): Promise<CourseCertificate | null> {
  try { return await apiGet<CourseCertificate>(`/courses/${slug}/certificate`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
