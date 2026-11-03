export interface DiscussionAuthor {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface DiscussionPost {
  id: string;
  threadId: string;
  body: string;
  isInstructorAnswer: boolean;
  isAccepted: boolean;
  createdAt: string;
  updatedAt: string;
  author: DiscussionAuthor;
}

export interface DiscussionThread {
  id: string;
  courseId: string;
  courseSlug?: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  title: string;
  body: string;
  status: 'open' | 'answered' | 'hidden';
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: DiscussionAuthor;
  posts?: DiscussionPost[];
}

export interface DiscussionInput {
  title: string;
  body: string;
  lessonId: string;
}

export interface DiscussionReplyInput {
  body: string;
}

export interface DiscussionModerationInput {
  hidden?: boolean;
  pinned?: boolean;
}

export interface DiscussionTimestampTarget {
  seconds: number;
  href: string;
}
