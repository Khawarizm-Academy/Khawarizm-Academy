import { apiGet, apiPost, buildQuery } from '@/shared/lib/apiClient';
import type { DiscussionInput, DiscussionModerationInput, DiscussionPost, DiscussionReplyInput, DiscussionThread } from '@/features/discussions/types';

export const fetchDiscussionThreads = (courseSlug: string, lessonId?: string) =>
  apiGet<{ items: DiscussionThread[] }>(`/courses/${encodeURIComponent(courseSlug)}/discussions${buildQuery({ lessonId })}`);

export const createDiscussionThread = (courseSlug: string, input: DiscussionInput) =>
  apiPost<DiscussionThread>(`/courses/${encodeURIComponent(courseSlug)}/discussions`, input);

export const createDiscussionReply = (courseSlug: string, threadId: string, input: DiscussionReplyInput) =>
  apiPost<DiscussionPost>(`/courses/${encodeURIComponent(courseSlug)}/discussions/${encodeURIComponent(threadId)}/posts`, input);

export const acceptDiscussionAnswer = (courseSlug: string, threadId: string, postId: string, accepted = true) =>
  apiPost<DiscussionThread>(`/courses/${encodeURIComponent(courseSlug)}/discussions/${encodeURIComponent(threadId)}/accept`, { postId, accepted });

export const moderateDiscussion = (courseSlug: string, threadId: string, input: DiscussionModerationInput) =>
  apiPost<DiscussionThread>(`/courses/${encodeURIComponent(courseSlug)}/discussions/${encodeURIComponent(threadId)}/moderate`, input);

export const fetchStudioDiscussionInbox = () =>
  apiGet<{ items: DiscussionThread[] }>('/studio/discussions');
