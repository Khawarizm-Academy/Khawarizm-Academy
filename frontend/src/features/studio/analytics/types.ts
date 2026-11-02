export type AnalyticsRange = 7 | 30 | 90;

export interface AnalyticsMetric {
  value: number | null;
  delta: number | null;
  deltaPercent: number | null;
  deltaAvailable: boolean;
}

export interface AnalyticsSeriesPoint {
  date: string;
  value: number;
}

export interface CompletionFunnelPoint {
  id: string;
  lessonId: string;
  courseSlug: string;
  courseTitle: string;
  title: string;
  order: number;
  moduleOrder: number;
  reached: number;
  enrolled: number;
  percent: number | null;
}

export interface LessonWatchPoint {
  lessonId: string;
  courseSlug: string;
  title: string;
  order: number;
  averageWatchPercent: number | null;
  learners: number;
}

export interface QuizScoreBucket {
  bucket: string;
  count: number;
}

export interface MissedQuestion {
  questionId: string;
  prompt: string;
  missed: number;
  attempts: number;
  missPercent: number | null;
}

export interface AnalyticsPayload {
  scope: 'overview' | 'course';
  range: AnalyticsRange;
  period: { start: string; end: string };
  course: { slug: string; title: string } | null;
  courseCount: number;
  kpis: {
    enrollments: AnalyticsMetric;
    activeLearners: AnalyticsMetric;
    completionRate: AnalyticsMetric;
    averageWatchPercent: AnalyticsMetric;
    certificates: AnalyticsMetric;
  };
  enrollmentsByDay: AnalyticsSeriesPoint[];
  activeLearnersByDay: AnalyticsSeriesPoint[];
  completionFunnel: CompletionFunnelPoint[];
  lessonWatch: LessonWatchPoint[];
  quizScoreHistogram: QuizScoreBucket[];
  topMissedQuestions: MissedQuestion[];
  certificates: { available: boolean; count: number };
  ratings: { available: boolean; distribution: Array<{ label: string; count: number }>; reason?: string };
  dataState: 'empty' | 'low' | 'ready';
}
