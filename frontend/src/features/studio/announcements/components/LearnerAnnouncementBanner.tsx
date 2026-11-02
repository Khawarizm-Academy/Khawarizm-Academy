import React, { useEffect, useState } from 'react';
import { Megaphone, Pin } from 'lucide-react';
import { MarkdownRenderer } from '@/shared/components/Editor/MarkdownRenderer';
import { fetchCourseAnnouncements } from '@/features/studio/announcements/data/announcementFetchers';
import type { CourseAnnouncement } from '@/features/studio/announcements/types';
import './announcements.css';

type Props = { courseSlug: string };

export const LearnerAnnouncementBanner: React.FC<Props> = ({ courseSlug }) => {
  const [announcement, setAnnouncement] = useState<CourseAnnouncement | null>(null);
  useEffect(() => {
    let active = true;
    void fetchCourseAnnouncements(courseSlug).then((items) => {
      if (active) setAnnouncement(items.find((item) => item.pinned) ?? null);
    }).catch(() => { if (active) setAnnouncement(null); });
    return () => { active = false; };
  }, [courseSlug]);
  if (!announcement) return null;
  return <aside className="announcement-learner-banner" aria-label="إعلان مثبت" dir="rtl"><div className="announcement-banner-icon"><Megaphone size={18} /></div><div className="announcement-banner-body"><div className="announcement-card-meta"><Pin size={13} /> إعلان مثبت</div><h2>{announcement.title}</h2><MarkdownRenderer value={announcement.body} className="announcement-markdown" /></div></aside>;
};
