import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Pin, PinOff, Trash2 } from 'lucide-react';
import { ApiError } from '@/shared/lib/apiClient';
import { MarkdownRenderer } from '@/shared/components/Editor/MarkdownRenderer';
import {
  deleteCourseAnnouncement,
  fetchCourseAnnouncements,
  setCourseAnnouncementPinned,
} from '@/features/studio/announcements/data/announcementFetchers';
import './announcements.css';
import type { CourseAnnouncement } from '@/features/studio/announcements/types';

type Props = {
  courseSlug: string;
  refreshKey?: number;
  onEdit?: (row: CourseAnnouncement) => void;
};

const formatDate = (value: string) => new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export const StudioAnnouncementList: React.FC<Props> = ({ courseSlug, refreshKey = 0, onEdit }) => {
  const [items, setItems] = useState<CourseAnnouncement[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  // Loading is derived from the key stored with the last resolved fetch, so a
  // course or refresh change restores the loading state without a sync setState.
  const [loadedKey, setLoadedKey] = useState('');
  const listKey = `${courseSlug}#${refreshKey}`;
  const loading = loadedKey !== listKey;

  const load = useCallback(() => {
    void fetchCourseAnnouncements(courseSlug)
      .then((result) => {
        setItems(result);
        setLoadedKey(listKey);
      })
      .catch((reason) => {
        setError(reason instanceof Error ? reason.message : 'تعذّر تحميل الإعلانات.');
        setLoadedKey(listKey);
      });
  }, [courseSlug, listKey]);
  useEffect(() => {
    void load();
  }, [load]);

  const togglePin = async (row: CourseAnnouncement) => {
    setBusyId(row.id);
    try {
      const updated = await setCourseAnnouncementPinned(courseSlug, row.id, !row.pinned);
      setItems((current) => current.map((item) => item.id === row.id ? updated : item));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'تعذّر تغيير التثبيت.');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (row: CourseAnnouncement) => {
    if (!window.confirm(`حذف الإعلان «${row.title}»؟`)) return;
    setBusyId(row.id);
    try {
      await deleteCourseAnnouncement(courseSlug, row.id);
      setItems((current) => current.filter((item) => item.id !== row.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذّر حذف الإعلان.');
    } finally {
      setBusyId('');
    }
  };

  if (loading) return <section className="announcement-list announcement-state" role="status">جارٍ تحميل الإعلانات…</section>;
  if (error) return <section className="announcement-list announcement-state" role="alert">{error}<button type="button" className="announcement-button announcement-button-muted" onClick={() => void load()}>إعادة المحاولة</button></section>;
  if (items.length === 0) return <section className="announcement-list announcement-state"><strong>لا توجد إعلانات بعد.</strong><span>سيظهر ما تنشره هنا مع معاينة آمنة للمحتوى.</span></section>;

  return (
    <section className="announcement-list" aria-label="إعلانات الدورة" dir="rtl">
      <div className="announcement-list-head"><div><span className="announcement-kicker">المكتبة</span><h2>الإعلانات المنشورة</h2></div><span className="announcement-count">{items.length.toLocaleString('ar-EG')}</span></div>
      <div className="announcement-card-stack">
        {items.map((row) => <article className={`announcement-card ${row.pinned ? 'is-pinned' : ''}`} key={row.id}>
          <div className="announcement-card-head">
            <div><div className="announcement-card-meta">{row.pinned && <span className="announcement-pin-label"><Pin size={13} /> مثبت</span>}<time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time></div><h3>{row.title}</h3></div>
            <div className="announcement-card-actions">
              <button type="button" className="announcement-icon-button" disabled={busyId === row.id} onClick={() => void togglePin(row)} aria-label={row.pinned ? 'إلغاء تثبيت الإعلان' : 'تثبيت الإعلان'}>{row.pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>
              {onEdit && <button type="button" className="announcement-icon-button" onClick={() => onEdit(row)} aria-label="تحرير الإعلان"><Edit3 size={15} /></button>}
              <button type="button" className="announcement-icon-button announcement-danger" disabled={busyId === row.id} onClick={() => void remove(row)} aria-label="حذف الإعلان"><Trash2 size={15} /></button>
            </div>
          </div>
          <MarkdownRenderer value={row.body} className="announcement-markdown" />
        </article>)}
      </div>
    </section>
  );
};
