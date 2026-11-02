import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPracticeAnswer, fetchCourseProblems } from '@/features/courses/data/courseFetchers';
import { apiGet, apiPost } from '@/shared/lib/apiClient';
import type { CourseProblem } from '@/shared/types/entities';

vi.mock('@/shared/lib/apiClient', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), ApiError: class ApiError extends Error {} }));
const get = vi.mocked(apiGet); const post = vi.mocked(apiPost);
const problem: CourseProblem = { id: 'p1', prompt: '2+2?', code: '', options: [{ id: 'a', label: '4' }], source: 'quiz', kind: 'single' };

describe('course quiz fetchers', () => {
  beforeEach(() => vi.clearAllMocks());
  it('normalizes source and does not preserve answer keys from practice list payloads', async () => {
    get.mockResolvedValue({ items: [{ ...problem, source: undefined, correctOptionIds: ['a'], answer: 'a' }] } as never);
    const [item] = await fetchCourseProblems('slug');
    expect(item.source).toBe('legacy');
    expect(item).not.toHaveProperty('correctOptionIds');
    expect(item).not.toHaveProperty('answer');
  });
  it('uses server verdicts for both quiz and legacy checks', async () => {
    post.mockResolvedValue({ correct: false, explanation: 'حاول مجددًا' } as never);
    const verdict = await checkPracticeAnswer(problem, ['a']);
    expect(post).toHaveBeenCalledWith('/questions/p1/check', { optionIds: ['a'] });
    expect(verdict.correct).toBe(false);
    expect(verdict.explanation).toBe('حاول مجددًا');
  });
  it('routes legacy checks without accepting a client answer key', async () => {
    post.mockResolvedValue({ correct: true } as never);
    await checkPracticeAnswer({ ...problem, source: 'legacy' }, ['a']);
    expect(post).toHaveBeenCalledWith('/problems/p1/check', { optionIds: ['a'] });
  });
});
