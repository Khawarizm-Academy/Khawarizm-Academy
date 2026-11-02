import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useAuth } from '@/features/auth/context/authContext';
import { StudioShell } from '@/features/studio/components/layout/StudioShell';
import { StudioProvider } from '@/features/studio/context/StudioProvider';
import { fetchAnnouncementCourses } from '@/features/studio/announcements/data/announcementFetchers';
import { StudioAnnouncementComposer } from '@/features/studio/announcements/components/StudioAnnouncementComposer';
import { StudioAnnouncementList } from '@/features/studio/announcements/components/StudioAnnouncementList';
import type { CourseAnnouncement } from '@/features/studio/announcements/types';
import '../components/announcements.css';

const StudioAnnouncementsContent: React.FC = () => {
  const [courses, setCourses] = useState<Array<{ slug: string; title: string; status?: string }>>([]);
  const [courseSlug, setCourseSlug] = useState('');
  const [editing, setEditing] = useState<CourseAnnouncement | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchAnnouncementCourses().then((result) => {
      setCourses(result.items);
      setCourseSlug((current) => current || result.items[0]?.slug || '');
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'تعذّر تحميل دوراتك.'));
  }, []);

  const options = useMemo(() => courses.map((course) => ({ slug: course.slug, title: course.title })), [courses]);
  const selectedCourse = courses.find((course) => course.slug === courseSlug);
  const shell = (content: React.ReactNode) => <StudioProvider><StudioShell>{content}</StudioShell></StudioProvider>;

  if (error) return shell(<main className="announcement-feature announcement-page" dir="rtl"><p className="announcement-error" role="alert">{error}</p></main>);
  if (!courseSlug) return shell(<main className="announcement-feature announcement-page" dir="rtl"><section className="announcement-state"><Megaphone size={24} /><strong>لا توجد دورة متاحة للإعلانات.</strong><span>اختر دورة تملك صلاحية نشر إعلاناتها ثم أعد المحاولة.</span></section></main>);

  return shell(
    <main className="announcement-feature announcement-page" dir="rtl">
      <header className="announcement-page-head">
        <div><span className="announcement-kicker">استوديو التدريس</span><h1>الإعلانات</h1><p>تواصل مع المتعلّمين من مساحة واحدة، مع معاينة آمنة وتثبيت للتحديثات المهمة.</p></div>
        <Megaphone size={28} aria-hidden="true" />
      </header>
      <label className="announcement-course-picker">اختر الدورة<select value={courseSlug} onChange={(event) => { setCourseSlug(event.target.value); setEditing(null); }}>
        {options.map((course) => <option key={course.slug} value={course.slug}>{course.title}</option>)}
      </select></label>
      <div className="announcement-page-grid">
        <StudioAnnouncementComposer
          key={`${courseSlug}:${editing?.id ?? 'new'}`}
          courseSlug={courseSlug}
          courses={options}
          initial={editing}
          onSaved={() => { setEditing(null); setRefreshKey((value) => value + 1); }}
          onCancel={editing ? () => setEditing(null) : undefined}
        />
        <StudioAnnouncementList courseSlug={courseSlug} refreshKey={refreshKey} onEdit={setEditing} />
      </div>
      {selectedCourse && <p className="announcement-page-note">تُنشر الإعلانات باسم فريق «{selectedCourse.title}». الحد اليومي يطبّق على الدورة من الخادم.</p>}
    </main>
  );
};

export const StudioAnnouncementsPage: React.FC = () => {
  const { user } = useAuth();
  return <StudioAnnouncementsContent key={user?.id ?? 'anonymous'} />;
};
