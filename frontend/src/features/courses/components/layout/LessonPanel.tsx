import React from 'react';
import { BookOpen, CheckCheck, ClipboardCheck } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { useAuth } from '@/features/auth/context/authContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { fetchCourseLessonContent } from '@/features/courses/data/courseFetchers';
import { MarkdownRenderer } from '@/shared/components/Editor/MarkdownRenderer';

/** Lesson tab body: the key-points recap plus the mark-complete CTA. */
export const LessonPanel: React.FC = () => {
  const { activeLesson, courseSlug, completedIds, completeLesson } = useCoursePlayer();
  const { user } = useAuth();
  const contentKey = ['course-article-content', courseSlug, activeLesson?.contentId ?? '', user?.id ?? 'anonymous'];
  const contentState = useCachedData(
    contentKey,
    () => activeLesson?.contentId ? fetchCourseLessonContent(courseSlug, activeLesson.contentId) : Promise.resolve(null),
    { enabled: activeLesson?.kind === 'article' && Boolean(activeLesson.contentId), initialData: null, staleTime: 60_000 },
  );
  if (!activeLesson) return null;

  const isDone = completedIds.includes(activeLesson.id);

  return (
    <div className="player-panel">
      <div className="player-panel-head">
        <BookOpen size={16} className="text-blue-400 shrink-0" />
        <h2 className="player-panel-title">{courseCopy.player.summaryTitle}</h2>
      </div>

      {activeLesson.summary && <p className="player-summary-text">{activeLesson.summary}</p>}
      {activeLesson.kind === 'article' && (
        <section className="player-article-content" aria-label="محتوى الدرس">
          {contentState.isLoading ? <p role="status">جارٍ تحميل المقال…</p> : contentState.isError ? (
            <p role="alert">{user ? 'تعذّر تحميل المقال. تحقّق من التسجيل ثم أعد المحاولة.' : 'سجّل الدخول أو افتح درس معاينة مجانيًا لقراءة المقال.'}</p>
          ) : contentState.data ? (
            <>
              <MarkdownRenderer value={contentState.data.content} />
              {contentState.data.resources.length > 0 && <ul className="lesson-resource-list">{contentState.data.resources.map((resource) => <li key={resource.id}><a href={resource.url} target="_blank" rel="noopener noreferrer nofollow">{resource.title}</a></li>)}</ul>}
            </>
          ) : <p>لا يوجد محتوى مكتوب لهذا الدرس بعد.</p>}
        </section>
      )}

      {isDone ? (
        <span className="badge-pill bg-success-500/10 border border-success-500/40 text-success-500 self-start">
          <CheckCheck size={13} />
          {courseCopy.player.completedLabel}
        </span>
      ) : (
        <button type="button" onClick={() => completeLesson()} className="btn-outline-blue self-start text-sm">
          <ClipboardCheck size={16} />
          {courseCopy.player.markComplete}
        </button>
      )}
    </div>
  );
};
