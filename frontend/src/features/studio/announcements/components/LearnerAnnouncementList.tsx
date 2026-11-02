import React, { useEffect, useState } from 'react';
import { Megaphone, Pin } from 'lucide-react';
import { MarkdownRenderer } from '@/shared/components/Editor/MarkdownRenderer';
import { fetchCourseAnnouncements } from '@/features/studio/announcements/data/announcementFetchers';
import type { CourseAnnouncement } from '@/features/studio/announcements/types';
import './announcements.css';

type Props = { courseSlug: string };
const formatDate = (value: string) => new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export const LearnerAnnouncementList: React.FC<Props> = ({ courseSlug }) => {
  const [items, setItems] = useState<CourseAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchCourseAnnouncements(courseSlug).then((result) => { if (active) setItems(result); }).catch(() => { if (active) setItems([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseSlug]);
  const pinned = items.find((item) => item.pinned);
  const visibleItems = items.filter((item) => item.id !== pinned?.id);
  return (
    <section className="announcement-learner-list" aria-label="الإعلانات" dir="rtl">
      {pinned && <aside className="announcement-learner-banner" aria-label="إعلان مثبت"><div className="announcement-banner-icon"><Megaphone size={18} /></div><div className="announcement-banner-body"><div className="announcement-card-meta"><Pin size={13} /> إعلان مثبت</div><h2>{pinned.title}</h2><MarkdownRenderer value={pinned.body} className="announcement-markdown" /></div></aside>}
      <div className="announcement-list-head"><div><span className="announcement-kicker">تحديثات الدورة</span><h2><Megaphone size={18} /> الإعلانات</h2></div><span className="announcement-count">{items.length.toLocaleString('ar-EG')}</span></div>
      {loading ? <p className="announcement-state">جارٍ تحميل الإعلانات…</p> : items.length === 0 ? <p className="announcement-state">لا توجد إعلانات لهذه الدورة بعد.</p> : visibleItems.length > 0 ? <div className="announcement-card-stack">{visibleItems.map((row) => <details className="announcement-card announcement-learner-card" key={row.id}><summary><span><strong>{row.title}</strong></span><time dateTime={row.createdAt}>{formatDate(row.createdAt)}</time></summary><MarkdownRenderer value={row.body} className="announcement-markdown" /></details>)}</div> : null}
    </section>
  );
};
