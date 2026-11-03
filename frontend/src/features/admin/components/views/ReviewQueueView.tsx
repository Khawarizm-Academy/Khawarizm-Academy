import React from 'react';
import { ExternalLink, RotateCcw, Send, ClipboardCheck } from 'lucide-react';
import { apiPost } from '@/shared/lib/apiClient';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { AdminPageHead } from '@/features/admin/components/chrome/AdminPageHead';
import { formatShortDateTime } from '@/features/admin/data/adminFormatters';
import { fetchReviewQueue } from '@/features/admin/data/adminFetchers';
import { useAdmin } from '@/features/admin/context/adminContext';
import type { ReviewQueueItem } from '@/features/admin/types';
import { ConfirmAction } from '@/features/admin/components/controls/ConfirmAction';

/** Snapshot at mount so the SLA chip is stable across re-renders. */
const useNowSnapshot = (): number => {
  const [now] = React.useState(() => Date.now());
  return now;
};

/**
 * Phase 12 admin section: courses submitted by instructors that are waiting
 * for an editorial verdict. Approve publishes; Request changes returns the
 * course to draft with a required note (>=10 chars per the studio service).
 */
export const ReviewQueueView: React.FC = () => {
  const { refresh } = useAdmin();
  const queue = useCachedData<ReviewQueueItem[]>(['admin', 'review-queue'], fetchReviewQueue, {
    initialData: [],
  });
  const rows = queue.data ?? [];
  const now = useNowSnapshot();
  const [busySlug, setBusySlug] = React.useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = React.useState<Record<string, string>>({});

  const approve = async (slug: string) => {
    setBusySlug(slug);
    try {
      await apiPost(`/admin/review-queue/${slug}/approve`);
      await Promise.all([queue.refetch(), refresh()]);
    } finally {
      setBusySlug(null);
    }
  };

  const requestChanges = async (slug: string, note: string) => {
    setBusySlug(slug);
    try {
      await apiPost(`/admin/review-queue/${slug}/request-changes`, { note });
      setNoteDrafts((prev) => ({ ...prev, [slug]: '' }));
      await Promise.all([queue.refetch(), refresh()]);
    } finally {
      setBusySlug(null);
    }
  };

  if (!queue.isLoading && rows.length === 0) {
    return (
      <AdminEmptyState
        icon={ClipboardCheck}
        title="لا توجد دورات بانتظار المراجعة"
        hint="تظهر هنا الدورات التي أرسلها المدرّبون بعد إتمام تحريرها."
      />
    );
  }

  return (
    <div className="admin-view">
      <AdminPageHead />
      <ul className="review-queue-list" role="list">
        {rows.map((row) => {
          const note = noteDrafts[row.slug] ?? '';
          const submittedMs = row.submittedAt ? new Date(row.submittedAt).getTime() : 0;
          const waitingHours = submittedMs ? Math.max(0, (now - submittedMs) / 3_600_000) : 0;
          const slaBreached = waitingHours >= 48;
          const disabled = busySlug === row.slug;
          const noteReady = note.trim().length >= 10;
          return (
            <li key={row.id} className="review-queue-item">
              <div className="review-queue-item-head">
                <div>
                  <span className="review-queue-title">{row.title}</span>
                  <span className="review-queue-meta">
                    {row.instructor} · {formatShortDateTime(row.submittedAt ?? '')}
                    {slaBreached && (
                      <span className="review-queue-sla" role="status">
                        تأخرت المراجعة (+48س)
                      </span>
                    )}
                  </span>
                </div>
                <a
                  className="admin-link"
                  href={`/courses/${row.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} /> معاينة
                </a>
              </div>

              <div className="review-queue-actions">
                <input
                  type="text"
                  className="admin-input"
                  placeholder="ملاحظة الطلب (10 أحرف على الأقل)"
                  value={note}
                  disabled={disabled}
                  onChange={(event) =>
                    setNoteDrafts((prev) => ({ ...prev, [row.slug]: event.target.value }))
                  }
                />
                <ConfirmAction
                  label="طلب تعديلات"
                  confirmLabel="تأكيد الإرجاع"
                  tone="gold"
                  onConfirm={() => {
                    if (!noteReady) return;
                    void requestChanges(row.slug, note.trim());
                  }}
                  icon={RotateCcw}
                  busy={disabled}
                  disabled={disabled || !noteReady}
                />
                <ConfirmAction
                  label="نشر الدورة"
                  confirmLabel="تأكيد النشر"
                  tone="gold"
                  onConfirm={() => {
                    void approve(row.slug);
                  }}
                  icon={Send}
                  busy={disabled}
                  disabled={disabled}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
