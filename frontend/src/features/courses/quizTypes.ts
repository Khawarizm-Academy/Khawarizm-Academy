import type { CourseProblemOption } from '@/shared/types/entities';

export type PracticeSource = 'legacy' | 'quiz';
export interface LearnerProblem { id: string; prompt: string; code?: string; options: CourseProblemOption[]; source: PracticeSource; kind?: 'single' | 'multiple' | 'true_false'; points?: number; }
export interface PracticeVerdict { correct: boolean; explanation?: string; hint?: string; }
export interface CourseQuizSummary { id: string; kind: 'practice' | 'exam' | string; title: string; instructions: string; timeLimitMinutes: number | null; passThreshold: number; maxAttempts: number | null; attemptsUsed: number; attemptsLeft: number | null; passed: boolean; bestPercent: number | null; locked: { reason: string; needed: string | number | null } | null; activeAttemptId?: string; }
export interface QuizQuestion { id: string; kind: 'single' | 'multiple' | 'true_false' | string; prompt: string; code?: string; points: number; options: CourseProblemOption[]; }
export interface AttemptAnswer { questionId: string; optionIds: string[]; }
export interface QuizAttempt { attemptId: string; serverNow: string; deadlineAt: string | null; questions: QuizQuestion[]; answers?: AttemptAnswer[]; status?: 'in_progress' | 'submitted' | 'expired' | string; result?: QuizResult; }
export interface QuizResult { percent: number; passed: boolean; revealPolicy: 'never' | 'after_submit' | 'after_pass' | 'after_close' | string; questions?: Array<AttemptAnswer & { correctOptionIds?: string[]; correct?: boolean; explanation?: string }>; }
export const countdownSeconds = (deadlineAt: string, now = Date.now(), serverOffset = 0) => Math.max(0, Math.ceil((Date.parse(deadlineAt) - (now + serverOffset)) / 1000));
export const milestoneFor = (seconds: number): 10 | 5 | 1 | null => seconds <= 60 && seconds > 0 ? 1 : seconds <= 300 && seconds > 60 ? 5 : seconds <= 600 && seconds > 300 ? 10 : null;
