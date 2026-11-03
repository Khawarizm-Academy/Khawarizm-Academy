export type LiveSessionState = 'upcoming' | 'live' | 'past';
export type LiveSessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface StudioLiveSession {
  id: string;
  uuid?: string;
  courseSlug?: string;
  courseTitle?: string;
  title: string;
  state: LiveSessionState;
  status: LiveSessionStatus;
  startsAt: string | null;
  serverNow?: string;
  durationMinutes: number;
  timezone: string;
  meetUrl: string | null;
  recordingUrl: string | null;
  recordingAssetId: string | null;
  notes: string;
  dateLabel: string;
  timeLabel: string;
  order?: number;
}

export interface LiveSessionInput {
  title: string;
  startsAt: string | null;
  durationMinutes: number;
  timezone: string;
  meetUrl: string;
  recordingUrl?: string;
  recordingAssetId?: string;
  notes: string;
  sessionId?: string;
}

export const STATUS_LABELS: Record<LiveSessionStatus, string> = {
  scheduled: 'مجدولة',
  live: 'مباشرة الآن',
  ended: 'انتهت',
  cancelled: 'ملغاة',
};

export const STATE_LABELS: Record<LiveSessionState, string> = {
  upcoming: 'قادمة',
  live: 'مباشرة الآن',
  past: 'سابقة',
};
