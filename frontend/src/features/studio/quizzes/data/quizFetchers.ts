import { apiDelete, apiGet, apiPatch, apiPost, apiPut, buildQuery } from '@/shared/lib/apiClient';
import type { StudioCoursePage } from '@/features/studio/types';

export type QuizKind = 'practice' | 'lesson_quiz' | 'exam';
export type QuestionKind = 'single' | 'multiple' | 'true_false';
export type RevealPolicy = 'never' | 'after_submit' | 'after_pass' | 'after_close';
export interface QuizOption { id: string; label: string; isCorrect: boolean; order: number; }
export interface QuizQuestion { id: string; kind: QuestionKind; prompt: string; code: string; explanation: string; hint: string; points: number; order: number; partialCredit: boolean; options: QuizOption[]; previousAnswerCount: number; }
export interface StudioQuiz { id: string; courseId: string; lessonId: string | null; kind: QuizKind; title: string; instructions: string; isPublished: boolean; order: number; timeLimitMinutes: number | null; passThreshold: number; maxAttempts: number | null; drawCount: number | null; shuffleQuestions: boolean; shuffleOptions: boolean; revealPolicy: RevealPolicy; unlockProgressPercent: number; questions: QuizQuestion[]; }
export interface QuizStats { attempts: number; completion: number; meanScore: number; medianScore: number; passRate: number; scoreHistogram: Record<string, number>; perQuestion: Array<{ questionId: string; correctPercent: number; mostChosenWrongOptionId: string | null }>; meanDurationSeconds: number; }
export interface QuizAttemptRow { id: string; userId: string; name: string; status: string; startedAt: string; submittedAt: string | null; percent: number | null; passed: boolean | null; }
export interface QuizAttemptsPage { page: number; pageSize: number; total: number; results: QuizAttemptRow[]; }
export interface QuizImportResult { dryRun: boolean; committed: number; valid: number; errors: Array<{ row: number; errors: string[] }>; }
export interface QuizCourseOption { id: string; slug: string; title: string; }

export const fetchQuizCourses = () => apiGet<StudioCoursePage>('/studio/courses?page=1');
export const fetchCourseQuizzes = (slug: string) => apiGet<{ items: StudioQuiz[] }>(`/studio/courses/${encodeURIComponent(slug)}/quizzes`);
export const fetchStudioQuiz = (id: string) => apiGet<StudioQuiz>(`/studio/quizzes/${encodeURIComponent(id)}`);
export const createStudioQuiz = (slug: string, input: Partial<StudioQuiz> & { title: string; kind: QuizKind }) => apiPost<StudioQuiz>(`/studio/courses/${encodeURIComponent(slug)}/quizzes`, input);
export const updateStudioQuiz = (id: string, input: Record<string, unknown>) => apiPatch<StudioQuiz>(`/studio/quizzes/${encodeURIComponent(id)}`, input);
export const deleteStudioQuiz = (id: string) => apiDelete<{ deleted: boolean; id: string }>(`/studio/quizzes/${encodeURIComponent(id)}`);
export const publishStudioQuiz = (id: string) => apiPost<StudioQuiz>(`/studio/quizzes/${encodeURIComponent(id)}/publish`);
export const unpublishStudioQuiz = (id: string) => apiPost<StudioQuiz>(`/studio/quizzes/${encodeURIComponent(id)}/unpublish`);
export const createQuizQuestion = (quizId: string, input: Record<string, unknown>) => apiPost<QuizQuestion>(`/studio/quizzes/${encodeURIComponent(quizId)}/questions`, input);
export const updateQuizQuestion = (questionId: string, input: Record<string, unknown>) => apiPut<QuizQuestion>(`/studio/questions/${encodeURIComponent(questionId)}`, input);
export const deleteQuizQuestion = (questionId: string) => apiDelete<{ deleted: boolean; id: string; previousAnswerCount: number }>(`/studio/questions/${encodeURIComponent(questionId)}`);
export const reorderQuizQuestions = (quizId: string, orderedIds: string[]) => apiPost<{ items: QuizQuestion[] }>(`/studio/quizzes/${encodeURIComponent(quizId)}/questions/reorder`, { orderedIds });
export const importQuizQuestions = (quizId: string, csv: string, dryRun = true) => apiPost<QuizImportResult>(`/studio/quizzes/${encodeURIComponent(quizId)}/import`, { csv, dryRun });
export const fetchQuizStats = (id: string) => apiGet<QuizStats>(`/studio/quizzes/${encodeURIComponent(id)}/stats`);
export const fetchQuizAttempts = (id: string, page = 1, pageSize = 20) => apiGet<QuizAttemptsPage>(`/studio/quizzes/${encodeURIComponent(id)}/attempts${buildQuery({ page, pageSize })}`);
export const grantQuizExtraAttempt = (quizId: string, userId: string, count = 1, note = '') => apiPost(`/studio/quizzes/${encodeURIComponent(quizId)}/extra-attempts`, { userId, count, note });
export const downloadQuizResultsCsv = async (quizId: string) => {
  const token = localStorage.getItem('khawarizm.accessToken');
  const base = import.meta.env.VITE_API_BASE_URL as string;
  const response = await fetch(`${base}/studio/quizzes/${encodeURIComponent(quizId)}/results.csv`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!response.ok) throw new Error('تعذّر تصدير النتائج.');
  return response.blob();
};
