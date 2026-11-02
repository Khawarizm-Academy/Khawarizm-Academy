import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemsPanel } from '@/features/courses/components/layout/ProblemsPanel';
import { ExamPanel } from '@/features/courses/components/layout/ExamPanel';
import { countdownSeconds, milestoneFor } from '@/features/courses/quizTypes';
import type { CourseTab } from '@/features/courses/types';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { checkPracticeAnswer, fetchQuizAttempt, saveQuizAnswers, startQuizAttempt, submitQuizAttempt } from '@/features/courses/data/courseFetchers';

vi.mock('@/features/courses/context/coursePlayerContext', () => ({ useCoursePlayer: vi.fn() }));
vi.mock('@/features/courses/data/courseFetchers', () => ({ checkPracticeAnswer: vi.fn(), fetchQuizAttempt: vi.fn(), saveQuizAnswers: vi.fn(), startQuizAttempt: vi.fn(), submitQuizAttempt: vi.fn() }));
const context = vi.mocked(useCoursePlayer); const check = vi.mocked(checkPracticeAnswer); const resume = vi.mocked(fetchQuizAttempt); const start = vi.mocked(startQuizAttempt); const save = vi.mocked(saveQuizAnswers); const submit = vi.mocked(submitQuizAttempt);
const problem = { id: 'p1', prompt: 'اختر', code: '', options: [{ id: 'a', label: 'أ' }, { id: 'b', label: 'ب' }], source: 'legacy' as const, kind: 'single' as const };
const question = { id: 'q1', prompt: 'سؤال', options: [{ id: 'a', label: 'أ' }, { id: 'b', label: 'ب' }], kind: 'single' as const, points: 1 };
const attempt = { attemptId: 'attempt-1', serverNow: new Date().toISOString(), deadlineAt: new Date(Date.now() + 600_000).toISOString(), questions: [question, { ...question, id: 'q2' }] };
const exam = { id: 'exam-1', kind: 'exam' as const, title: 'الاختبار', instructions: 'تعليمات', timeLimitMinutes: 10, passThreshold: 70, maxAttempts: 2, attemptsUsed: 0, attemptsLeft: 2, passed: false, bestPercent: null, locked: null };
const base = (extra = {}) => ({ courseSlug: 'course', course: null, isLoading: false, activeLesson: { id: 'lesson', title: 'درس', duration: '1', summary: '' }, activeLessonId: 'lesson', completedIds: [], activeTab: 'exam' as CourseTab, isSyllabusOpen: false, problems: [problem], problemsLoading: false, problemsError: null, retryProblems: vi.fn(), quizzes: [exam], quizzesLoading: false, quizzesError: null, retryQuizzes: vi.fn(), progress: 100, isExamUnlocked: true, selectLesson: vi.fn(), selectTab: vi.fn(), completeLesson: vi.fn(), openSyllabus: vi.fn(), closeSyllabus: vi.fn(), ...extra });

describe('quiz panels', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); context.mockReturnValue(base()); save.mockResolvedValue(undefined); });
  it('renders a failed practice check and lets the learner retry it', async () => {
    check.mockRejectedValueOnce(new Error('تعذر التحقق')).mockResolvedValueOnce({ correct: false, explanation: 'حاول مرة أخرى' });
    render(<ProblemsPanel />); fireEvent.click(screen.getByRole('radio', { name: 'أأ' })); await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }));
    expect(await screen.findByText('إجابة غير صحيحة، حاول مرة أخرى')).toBeTruthy(); expect(check).toHaveBeenCalledTimes(2);
  });
  it('uses the server lock even when the local unlock fallback is true', () => {
    context.mockReturnValue(base({ quizzes: [{ ...exam, locked: { reason: 'أكمل الدروس', needed: 1 } }], isExamUnlocked: true }));
    render(<ExamPanel />); expect(screen.getByText('أكمل الدروس')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'ابدأ الاختبار' })).toBeNull(); expect(start).not.toHaveBeenCalled();
  });
  it('keeps legacy course exam parameters as a display-only fallback when no quiz exists', () => {
    context.mockReturnValue(base({ quizzes: [], course: { title: 'دورة', exam: { questionCount: 8, minutes: 20, passThreshold: 75, attemptsLeft: 3 } } }));
    render(<ExamPanel />);
    expect(screen.getByText('8')).toBeTruthy(); expect(screen.getByText('20')).toBeTruthy(); expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'ابدأ الاختبار' })).toBeNull();
  });
  it('supports question navigation and functional flags', async () => {
    start.mockResolvedValue(attempt); render(<ExamPanel />); fireEvent.click(screen.getByRole('button', { name: 'ابدأ الاختبار' }));
    expect(await screen.findByText('السؤال 1 من 2')).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: 'السؤال 2' })); expect(screen.getByText('السؤال 2 من 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /مراجعة لاحقًا/ })); expect(screen.getByRole('button', { name: /السؤال 2، للمراجعة/ })).toBeTruthy();
  });
  it('does not expose feedback when the server reveal policy is never', async () => {
    start.mockResolvedValue({ ...attempt, result: { percent: 40, passed: false, revealPolicy: 'never', questions: [{ questionId: 'q1', optionIds: [], correct: false, explanation: 'secret' }] } });
    render(<ExamPanel />); fireEvent.click(screen.getByRole('button', { name: 'ابدأ الاختبار' })); await screen.findByText('40%'); expect(screen.queryByText('secret')).toBeNull();
  });
  it('resumes the session-stored attempt after reload', async () => {
    sessionStorage.setItem('quiz-attempt:exam-1', 'attempt-1'); resume.mockResolvedValue(attempt); render(<ExamPanel />); await waitFor(() => expect(screen.getByText('السؤال 1 من 2')).toBeTruthy()); expect(resume).toHaveBeenCalledWith('attempt-1');
  });
  it('flushes the latest selection before submitting even when the debounce has not fired', async () => {
    const order: string[] = [];
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(true);
    start.mockResolvedValue(attempt);
    save.mockImplementation(async () => { order.push('save'); });
    submit.mockImplementation(async () => { order.push('submit'); return { ...attempt, result: { percent: 50, passed: false, revealPolicy: 'never' } }; });
    render(<ExamPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'ابدأ الاختبار' }));
    await screen.findByText('السؤال 1 من 2');
    fireEvent.click(screen.getByRole('button', { name: 'السؤال 2' }));
    fireEvent.click(screen.getByRole('radio', { name: 'أ' }));
    fireEvent.click(screen.getByRole('button', { name: 'تسليم' }));
    await screen.findByText('50%');
    expect(order).toEqual(['save', 'submit']);
    confirmation.mockRestore();
  });
  it('keeps timer offset and milestone math deterministic', () => {
    const deadline = new Date(1_700_000_600_000).toISOString(); expect(countdownSeconds(deadline, 1_700_000_000_000, 0)).toBe(600); expect(countdownSeconds(deadline, 1_700_000_000_000, 60_000)).toBe(540); expect(milestoneFor(600)).toBe(10); expect(milestoneFor(599)).toBe(10); expect(milestoneFor(300)).toBe(5); expect(milestoneFor(60)).toBe(1);
  });
  it('exposes deadline submission as one idempotent call', async () => {
    vi.useFakeTimers(); const expired = { ...attempt, serverNow: new Date().toISOString(), deadlineAt: new Date(Date.now() - 1).toISOString() }; start.mockResolvedValue(expired); submit.mockResolvedValue({ ...expired, result: { percent: 0, passed: false, revealPolicy: 'never' } }); render(<ExamPanel />); fireEvent.click(screen.getByRole('button', { name: 'ابدأ الاختبار' })); await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(1)); await vi.runAllTimersAsync(); expect(submit).toHaveBeenCalledTimes(1); vi.useRealTimers();
  });
});
