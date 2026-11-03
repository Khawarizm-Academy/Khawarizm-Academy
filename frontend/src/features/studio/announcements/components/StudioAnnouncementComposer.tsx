import React, { useState } from 'react';
import { Pin, Send, X } from 'lucide-react';
import { ApiError } from '@/shared/lib/apiClient';
import { MarkdownEditor } from '@/shared/components/Editor/MarkdownEditor';
import {
  createCourseAnnouncement,
  updateCourseAnnouncement,
} from '@/features/studio/announcements/data/announcementFetchers';
import './announcements.css';
import type {
  AnnouncementCourseOption,
  AnnouncementInput,
  CourseAnnouncement,
} from '@/features/studio/announcements/types';

type Props = {
  courseSlug: string;
  courses?: AnnouncementCourseOption[];
  initial?: CourseAnnouncement | null;
  onSaved?: (row: CourseAnnouncement) => void;
  onCancel?: () => void;
};

export const StudioAnnouncementComposer: React.FC<Props> = ({
  courseSlug,
  courses = [],
  initial = null,
  onSaved,
  onCancel,
}) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [selectedCourse, setSelectedCourse] = useState(courseSlug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCourse || title.trim().length < 3 || !body.trim()) {
      setError('أدخل عنوانًا ومحتوى صالحين واختر دورة.');
      return;
    }
    setBusy(true);
    setError('');
    const input: AnnouncementInput = { title: title.trim(), body: body.trim(), pinned };
    try {
      const saved = initial
        ? await updateCourseAnnouncement(selectedCourse, initial.id, input)
        : await createCourseAnnouncement(selectedCourse, input);
      onSaved?.(saved);
      if (!initial) {
        setTitle('');
        setBody('');
        setPinned(false);
      }
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.code === 'announcement_daily_limit'
          ? 'وصلت هذه الدورة إلى ثلاثة إعلانات اليوم. يمكنك المحاولة غدًا.'
          : reason instanceof Error
            ? reason.message
            : 'تعذّر حفظ الإعلان.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="announcement-composer" onSubmit={submit} dir="rtl">
      <div className="announcement-composer-head">
        <div>
          <span className="announcement-kicker">استوديو التدريس</span>
          <h2>{initial ? 'تحرير الإعلان' : 'إعلان جديد'}</h2>
        </div>
        {onCancel && <button type="button" className="announcement-icon-button" onClick={onCancel} aria-label="إغلاق التحرير"><X size={17} /></button>}
      </div>
      <label className="announcement-field">
        الدورة
        <select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)} disabled={Boolean(initial) || courses.length === 0}>
          {courses.length === 0 && <option value={courseSlug}>{courseSlug}</option>}
          {courses.map((course) => <option key={course.slug} value={course.slug}>{course.title}</option>)}
        </select>
      </label>
      <label className="announcement-field">
        العنوان
        <input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} placeholder="مثال: تحديث موعد اللقاء الأسبوعي" />
      </label>
      <MarkdownEditor
        id="course-announcement-body"
        label="المحتوى بصيغة Markdown"
        value={body}
        maxLength={50000}
        onChange={setBody}
        placeholder="اكتب التحديث الذي يحتاجه المتعلّمون…"
      />
      <label className="announcement-pin-toggle">
        <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
        <Pin size={15} />
        تثبيت أعلى قائمة الإعلانات
      </label>
      {error && <p className="announcement-error" role="alert">{error}</p>}
      <div className="announcement-form-actions">
        {onCancel && <button type="button" className="announcement-button announcement-button-muted" onClick={onCancel}>إلغاء</button>}
        <button type="submit" className="announcement-button announcement-button-gold" disabled={busy}>
          <Send size={15} />
          {busy ? 'جارٍ الحفظ…' : initial ? 'حفظ التعديل' : 'نشر الإعلان'}
        </button>
      </div>
    </form>
  );
};
