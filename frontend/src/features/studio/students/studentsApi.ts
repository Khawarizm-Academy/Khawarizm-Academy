import { apiGet, apiPost, buildQuery } from '@/shared/lib/apiClient';
import { getAccessToken } from '@/shared/lib/authStorage';

export interface StudentCourseOption {
  id: string;
  slug: string;
  title: string;
  enrolledCount: number;
}

export interface StudentRosterRow {
  id: string;
  name: string;
  avatarUrl?: string;
  avatarInitials?: string;
  email?: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  lastActive?: string;
  quizAverage?: number;
  status: 'active' | 'struggling' | 'completed';
  course: { id: string; slug: string; title: string };
}

export interface StudentRosterPage {
  items: StudentRosterRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StudentLessonDetail {
  id: string;
  lessonId: string;
  title: string;
  moduleTitle: string;
  completed: boolean;
  watchedSeconds: number;
  durationSeconds: number;
  updatedAt?: string;
}

export interface StudentAttemptDetail {
  id: string;
  quizId: string;
  quizTitle: string;
  status: string;
  score: number;
  maxScore: number;
  percent?: number;
  passed?: boolean;
  startedAt?: string;
  submittedAt?: string;
}

export interface StudentNote {
  id: string;
  body: string;
  authorName: string;
  createdAt?: string;
}

export interface StudentDetail {
  id: string;
  name: string;
  avatarUrl?: string;
  avatarInitials?: string;
  email?: string;
  course: { id: string; slug: string; title: string };
  progress: number;
  completed: boolean;
  lessons: StudentLessonDetail[];
  attempts: StudentAttemptDetail[];
  notes: StudentNote[];
}

export interface StudentRosterParams {
  course?: string;
  q?: string;
  status?: string;
  sort?: string;
  page?: number;
}

export const fetchStudentCourses = () => apiGet<{ items: StudentCourseOption[] }>('/studio/students/courses');

export const fetchStudents = (params: StudentRosterParams = {}) =>
  apiGet<StudentRosterPage>(`/studio/students${buildQuery({ ...params })}`);

export const fetchStudentDetail = (studentId: string, course: string) =>
  apiGet<StudentDetail>(`/studio/students/${encodeURIComponent(studentId)}${buildQuery({ course })}`);

export const createStudentNote = (studentId: string, course: string, body: string) =>
  apiPost<StudentNote>(`/studio/students/${encodeURIComponent(studentId)}/notes`, { course, body });

export const nudgeStudent = (studentId: string, course: string, message?: string) =>
  apiPost(`/studio/students/${encodeURIComponent(studentId)}/nudge`, {
    course,
    ...(message ? { message } : {}),
  });

export const grantStudentAttempt = (studentId: string, course: string, quizId: string, note?: string) =>
  apiPost(`/studio/students/${encodeURIComponent(studentId)}/extra-attempt`, {
    course,
    quizId,
    count: 1,
    ...(note ? { note } : {}),
  });

export async function downloadStudentsCsv(params: StudentRosterParams = {}): Promise<void> {
  const base = import.meta.env.VITE_API_BASE_URL as string;
  const response = await fetch(`${base}/studio/students.csv${buildQuery({ ...params })}`, {
    headers: {
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
    },
  });
  if (!response.ok) throw new Error('تعذّر تصدير قائمة الطلاب.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'studio-students.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
