import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronRight, CircleAlert, Copy, FileText, GripVertical,
  Link2, ListChecks, LockKeyhole, Paperclip, PlayCircle, Plus, Settings, Sparkles, Trash2, Users, X,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { can } from '@/shared/lib/permissions';
import { StudioShell } from '@/features/studio/components/layout/StudioShell';
import { StatusChip } from '@/features/studio/components/controls/StatusChip';
import { ReadinessRing } from '@/features/studio/components/cards/ReadinessRing';
import { MarkdownEditor } from '@/shared/components/Editor/MarkdownEditor';
import { useAutosave, type ConflictChoice } from '@/features/studio/hooks/useAutosave';
import { LiveSessionsManager } from '@/features/studio/liveSessions/LiveSessionsManager';
import { StudioAnalyticsPage } from '@/features/studio/analytics/StudioAnalyticsPage';
import '@/features/studio/liveSessions/liveSessions.css';
import {
  addStudioStaff, createStudioLesson, createStudioLessonResource, createStudioModule,
  createStudioVideoLink, deleteStudioLesson, deleteStudioLessonResource, deleteStudioModule,
  deleteStudioCourse, duplicateStudioLesson, fetchPublishedStudioRelatedCourses, fetchStudioCategories,
  fetchStudioEditor, fetchStudioPickerAssets, linkStudioLessonVideo, moveStudioLessons, patchStudioCourse,
  patchStudioLesson, patchStudioModule, publishStudioCourse, replaceStudioOutcomes, replaceStudioRelated,
  fetchStudioStaffCandidates, removeStudioStaff, reorderStudioLessons, reorderStudioModules, submitStudioCourse, unpublishStudioCourse,
} from '@/features/studio/data/studioFetchers';
import type { LessonKind, StudioEditorCourse, StudioLesson, StudioModule, StudioPickerAsset, StudioResource, StudioStaff } from '@/features/studio/types';
import { ApiError, apiPost } from '@/shared/lib/apiClient';

const tabs = [
  ['info', 'المعلومات'], ['curriculum', 'المنهج'], ['quizzes', 'الاختبارات'], ['sessions', 'الجلسات'], ['analytics', 'التحليلات'], ['team', 'الفريق'], ['publish', 'النشر'], ['settings', 'الإعدادات'],
] as const;
type Tab = typeof tabs[number][0];
const kindMeta: Record<LessonKind, { label: string; icon: React.ReactNode }> = {
  video: { label: 'فيديو', icon: <PlayCircle size={15} /> }, article: { label: 'مقال', icon: <FileText size={15} /> },
  quiz: { label: 'اختبار', icon: <ListChecks size={15} /> }, resource: { label: 'ملف', icon: <Paperclip size={15} /> },
};

const SaveStateChip: React.FC<{ state: string }> = ({ state }) => (
  <span className={`studio-save-state studio-save-${state}`} aria-live="polite">
    {state === 'saving' ? 'جارٍ الحفظ…' : state === 'saved' ? '✓ تم الحفظ' : state === 'offline' ? 'لا يوجد اتصال — سنحفظ عند عودته' : state === 'error' ? 'تعذّر الحفظ' : 'جاهز للتحرير'}
  </span>
);

type ConflictDetails = { local: Record<string, unknown>; server: Record<string, unknown> };

function conflictServerValues(error: ApiError | null): Record<string, unknown> {
  const current = error?.fields?.current;
  return current && typeof current === 'object' ? current as Record<string, unknown> : {};
}

function conflictFieldLabel(key: string): string {
  const labels: Record<string, string> = {
    slug: 'المعرّف العام', title: 'العنوان', categoryLabel: 'التصنيف', categorySlug: 'معرّف التصنيف', thumbnailUrl: 'صورة الغلاف',
    courseLevel: 'المستوى', courseLevelAr: 'اسم المستوى', priceType: 'نوع السعر', priceLabel: 'السعر', language: 'اللغة',
    tagline: 'الشعار التعريفي', about: 'الوصف', outcomes: 'النتائج التعليمية', relatedIds: 'الدورات المرتبطة',
    lessonId: 'معرّف الدرس', duration: 'المدة', summary: 'الملخص', order: 'الترتيب', kind: 'نوع الدرس',
    content: 'محتوى المقال', isFreePreview: 'المعاينة المجانية', isPublished: 'النشر', updatedAt: 'آخر تحديث',
  };
  return labels[key] || key;
}

function conflictValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function sameConflictValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  return conflictValue(left) === conflictValue(right);
}

const staffCapabilityLabels: Record<string, string[]> = {
  owner: ['تحرير المعلومات والمنهج', 'إدارة أعضاء الفريق', 'النشر والأرشفة'],
  co_instructor: ['تحرير المعلومات والمنهج', 'إدارة الجلسات والإعلانات'],
  assistant: ['مساعدة الطلاب والنتائج', 'الإعلانات والنقاشات'],
};

function editorCourseKey(key: string): string {
  return key === 'categoryLabel' ? 'category' : key === 'courseLevelAr' ? 'levelLabel' : key;
}

function mergeConflictValues<T extends object>(base: T, details: ConflictDetails, choices: Record<string, ConflictChoice>): T {
  const next = { ...base } as unknown as Record<string, unknown>;
  Object.entries(details.server).forEach(([key, value]) => {
    const targetKey = editorCourseKey(key);
    if (targetKey in next) next[targetKey] = value;
  });
  Object.entries(details.local).forEach(([key, value]) => {
    const targetKey = editorCourseKey(key);
    if (key !== 'expectedUpdatedAt' && (choices[key] ?? 'mine') === 'mine' && targetKey in next) next[targetKey] = value;
  });
  return next as T;
}

function updateLessonInCourse(course: StudioEditorCourse, lessonId: string, next: StudioLesson): StudioEditorCourse {
  return {
    ...course,
    modules: course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => lesson.id === lessonId ? next : lesson),
    })),
  };
}

export const StudioCourseEditorPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'info';
  const activeLessonId = params.get('lesson');
  const [course, setCourse] = useState<StudioEditorCourse | null>(null);
  const [categories, setCategories] = useState<Array<{ slug: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const courseRef = useRef<StudioEditorCourse | null>(null);
  useEffect(() => { courseRef.current = course; }, [course]);
  useEffect(() => {
    let alive = true;
    Promise.all([fetchStudioEditor(slug), fetchStudioCategories()]).then(([next, taxonomy]) => {
      if (alive) { setCourse(next); setCategories(taxonomy.items); }
    }).catch(() => alive && setNotice('تعذّر تحميل محرر الدورة.')).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [slug]);
  const saveCourse = useCallback(async (payload: Record<string, unknown>) => {
    const current = courseRef.current;
    const next = await patchStudioCourse(slug, { ...payload, expectedUpdatedAt: payload.expectedUpdatedAt ?? current?.updatedAt });
    setCourse(next);
    if (next.slug !== slug) navigate(`/studio/courses/${encodeURIComponent(next.slug)}?tab=settings`);
    return next;
  }, [navigate, slug]);
  const basics = useAutosave(saveCourse, course?.updatedAt);
  const about = useAutosave(saveCourse, course?.updatedAt);
  const patchLocal = (next: StudioEditorCourse) => { courseRef.current = next; setCourse(next); };
  const openTab = (next: Tab) => { const nextParams = new URLSearchParams(params); nextParams.set('tab', next); setParams(nextParams); };
  const openLesson = (id: string | null) => { const nextParams = new URLSearchParams(params); if (id) nextParams.set('lesson', id); else nextParams.delete('lesson'); setParams(nextParams); };
  const resolveCourseConflict = (choices: Record<string, ConflictChoice>) => {
    const owner = basics.conflict ? basics : about;
    const resolution = owner.resolveConflict(choices);
    if (!resolution || !course) return;
    const queued = Object.entries(resolution.local).reduce<Record<string, unknown>>((payload, [key, value]) => {
      const targetKey = editorCourseKey(key);
      const currentValue = (course as unknown as Record<string, unknown>)[targetKey];
      if (key !== 'expectedUpdatedAt' && targetKey in course && !sameConflictValue(currentValue, value)) payload[key] = currentValue;
      return payload;
    }, {});
    patchLocal(mergeConflictValues(course, resolution, choices));
    if (Object.keys(queued).length) owner.queue(queued);
  };
  const publishAction = async () => {
    const mayPublish = can(user, 'courses.publish');
    const maySubmit = can(user, 'courses.submit_for_review');
    if (course?.status === 'in_review' && !mayPublish) {
      setNotice('لا تملك صلاحية نشر الدورة مباشرةً؛ يمكن اعتمادها من مراجع مخوّل.');
      return;
    }
    if (course?.status !== 'in_review' && !mayPublish && !maySubmit) {
      setNotice('لا تملك صلاحية النشر أو إرسال الدورة للمراجعة. اطلب من مسؤول منحك إحدى الصلاحيتين.');
      return;
    }
    try {
      const next = course?.status === 'in_review' || mayPublish ? await publishStudioCourse(slug) : await submitStudioCourse(slug);
      patchLocal(next);
      setNotice(next.status === 'published' ? 'تم نشر الدورة.' : 'أُرسلت الدورة للمراجعة.');
    } catch (error) { setNotice(error instanceof ApiError ? error.message : 'تعذّر تنفيذ الإجراء.'); }
  };
  if (loading) return <StudioShell><div className="studio-editor-loading">جارٍ فتح ورشة الدورة…</div></StudioShell>;
  if (!course) return <StudioShell><div className="studio-empty"><CircleAlert /><h2>{notice || 'الدورة غير موجودة'}</h2><button className="btn-outline-blue" type="button" onClick={() => navigate('/studio/courses')}>العودة إلى دوراتي</button></div></StudioShell>;
  const canPublish = can(user, 'courses.publish');
  const canSubmit = can(user, 'courses.submit_for_review');
  const canManageStaff = can(user, 'courses.manage_staff');
  const publishDisabledReason = course.status === 'in_review' && !canPublish
    ? 'لا تملك صلاحية النشر المباشر.'
    : course.status !== 'in_review' && !canPublish && !canSubmit
      ? 'لا تملك صلاحية النشر أو الإرسال للمراجعة.'
      : '';
  const visibleTabs = tabs.filter(([id]) => {
    if (id === 'team') return canManageStaff;
    if (id === 'sessions') return can(user, 'live_sessions.manage_own') || can(user, 'live_sessions.manage_any');
    if (id === 'quizzes') return can(user, 'quizzes.edit_own') || can(user, 'quizzes.edit_any') || can(user, 'quizzes.create');
    if (id === 'analytics') return can(user, 'analytics.view_own') || can(user, 'analytics.view_any');
    return true;
  });
  const activeLesson = course.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === activeLessonId) || null;
  const saveState = basics.state === 'saving' || about.state === 'saving' ? 'saving' : basics.state === 'error' || about.state === 'error' ? 'error' : basics.state === 'saved' || about.state === 'saved' ? 'saved' : 'idle';
  return <StudioShell>
    <div className="studio-editor" dir="rtl">
      <header className="studio-editor-header">
        <div className="studio-editor-heading"><button type="button" className="studio-back-button" onClick={() => navigate('/studio/courses')} aria-label="العودة إلى دوراتي"><ArrowLeft size={17} /> دوراتي</button><span className="studio-editor-separator">/</span><input aria-label="عنوان الدورة" value={course.title} onChange={(event) => patchLocal({ ...course, title: event.target.value })} onBlur={() => basics.queue({ title: course.title })} /><StatusChip status={course.status} /></div>
        <div className="studio-editor-header-actions"><ReadinessRing value={course.checklist.completeness} size={46} /><SaveStateChip state={saveState} /><button type="button" className="btn-outline-blue" onClick={() => navigate(`/courses/${course.slug}?view=learner`)}>معاينة كمتعلم ↗</button><button type="button" className="btn-gold" title={publishDisabledReason} disabled={course.status === 'published' || !course.checklist.ready || Boolean(publishDisabledReason)} onClick={() => void publishAction()}>{course.status === 'in_review' ? 'نشر الآن' : canPublish ? 'نشر الآن' : 'إرسال للمراجعة'}</button></div>
      </header>
      <nav className="studio-editor-tabs" aria-label="أقسام محرر الدورة">{visibleTabs.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => openTab(id)}>{label}</button>)}</nav>
      {notice && <div className="studio-editor-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="إغلاق"><X size={15} /></button></div>}
      <main className="studio-editor-data">
        {tab === 'info' && <BasicsTab course={course} categories={categories} onCourse={patchLocal} saveBasics={basics.queue} saveAbout={about.queue} aboutState={about.state} />}
        {tab === 'curriculum' && <CurriculumTab course={course} onCourse={patchLocal} openLesson={openLesson} />}
        {tab === 'quizzes' && <QuizzesTab course={course} onManage={() => navigate(`/studio/quizzes?course=${encodeURIComponent(course.slug)}`)} onOpen={(id) => navigate(`/studio/quizzes/${encodeURIComponent(id)}`)} canEdit={can(user, 'quizzes.edit_own') || can(user, 'quizzes.edit_any')} />}
        {tab === 'sessions' && <LiveSessionsManager courseSlug={course.slug} />}
        {tab === 'analytics' && <StudioAnalyticsPage courseSlug={course.slug} embedded />}
        {tab === 'team' && canManageStaff && <TeamTab course={course} onCourse={patchLocal} />}
        {tab === 'publish' && <PublishTab course={course} onAction={() => void publishAction()} canPublish={canPublish} canSubmit={canSubmit} />}
        {tab === 'settings' && <SettingsTab key={course.slug} course={course} onCourse={patchLocal} saveSlug={basics.queue} onDeleted={() => navigate('/studio/courses')} />}
      </main>
      {activeLesson && <LessonDrawer lesson={activeLesson} course={course} onCourse={patchLocal} close={() => openLesson(null)} />}
      {(basics.conflict || about.conflict) && (basics.conflict ? basics.conflictDetails : about.conflictDetails) && <ConflictDialog key={basics.conflict ? 'basics' : 'about'} error={basics.conflict || about.conflict} details={(basics.conflict ? basics.conflictDetails : about.conflictDetails) as ConflictDetails} onResolve={resolveCourseConflict} />}
    </div>
  </StudioShell>;
};

const BasicsTab: React.FC<{ course: StudioEditorCourse; categories: Array<{ slug: string; label: string }>; onCourse: (course: StudioEditorCourse) => void; saveBasics: (payload: Record<string, unknown>) => void; saveAbout: (payload: Record<string, unknown>) => void; aboutState: string }> = ({ course, categories, onCourse, saveBasics, saveAbout, aboutState }) => {
  const update = (key: string, value: unknown) => onCourse({ ...course, [key]: value } as StudioEditorCourse);
  const [outcome, setOutcome] = useState('');
  const [relatedQuery, setRelatedQuery] = useState('');
  const [relatedOptions, setRelatedOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [relatedError, setRelatedError] = useState('');
  const [thumbnailMeta, setThumbnailMeta] = useState<{ width: number; height: number; error?: boolean } | null>(null);
  useEffect(() => {
    if (!relatedQuery.trim()) return undefined;
    let alive = true;
    const timer = window.setTimeout(() => {
      void fetchPublishedStudioRelatedCourses(relatedQuery.trim()).then((result) => { if (alive) setRelatedOptions(result.items.filter((item) => item.id !== course.slug)); }).catch(() => alive && setRelatedError('تعذّر تحميل الدورات المنشورة.'));
    }, 250);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [course.slug, relatedQuery]);
  const addOutcome = () => { const value = outcome.trim(); if (!value || course.outcomes.includes(value) || course.outcomes.length >= 12) return; const outcomes = [...course.outcomes, value]; update('outcomes', outcomes); setOutcome(''); void replaceStudioOutcomes(course.slug, outcomes, course.updatedAt).then(onCourse).catch(() => undefined); };
  const toggleRelated = (id: string) => {
    const relatedIds = course.relatedIds.includes(id) ? course.relatedIds.filter((item) => item !== id) : course.relatedIds.length >= 6 ? course.relatedIds : [...course.relatedIds, id];
    const previous = course;
    onCourse({ ...course, relatedIds });
    void replaceStudioRelated(course.slug, relatedIds, course.updatedAt).then(onCourse).catch(() => { onCourse(previous); setRelatedError('تعذّر حفظ الدورات المرتبطة.'); });
  };
  const changeAbout = (value: string) => { onCourse({ ...course, about: value }); saveAbout({ about: value }); };
  return <div className="studio-basics-grid">
    <section className="studio-editor-panel"><div className="studio-panel-title"><div><span className="studio-kicker">المعلومات</span><h2>هوية الدورة</h2></div><Sparkles size={18} /></div><div className="studio-form-grid"><label>العنوان<input value={course.title} maxLength={200} onChange={(e) => update('title', e.target.value)} onBlur={() => saveBasics({ title: course.title })} /></label><label>الشعار التعريفي<input value={course.tagline || ''} maxLength={240} onChange={(e) => update('tagline', e.target.value)} onBlur={() => saveBasics({ tagline: course.tagline })} /></label><label>التصنيف<select value={course.categorySlug || ''} onChange={(e) => { const item = categories.find((row) => row.slug === e.target.value); const next = { categorySlug: e.target.value, categoryLabel: item?.label || '' }; update('categorySlug', e.target.value); update('category', item?.label || ''); saveBasics(next); }}><option value="">اختر من تصنيف الكتالوج</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label><label>المستوى<select value={course.courseLevel || 'beginner'} onChange={(e) => { update('courseLevel', e.target.value); saveBasics({ courseLevel: e.target.value }); }}><option value="beginner">مبتدئ</option><option value="intermediate">متوسط</option><option value="advanced">متقدم</option></select></label><label>اللغة<select value={course.language || 'arabic'} onChange={(e) => { update('language', e.target.value); saveBasics({ language: e.target.value }); }}><option value="arabic">العربية</option><option value="english">الإنجليزية</option><option value="french">الفرنسية</option></select></label><label>نوع السعر<select value={course.priceType || 'free'} onChange={(e) => { update('priceType', e.target.value); saveBasics({ priceType: e.target.value }); }}><option value="free">مجانية</option><option value="paid">مدفوعة</option></select></label><label className="studio-field-wide">صورة الغلاف (HTTPS)<input type="url" value={course.thumbnailUrl || ''} onChange={(e) => { update('thumbnailUrl', e.target.value); setThumbnailMeta(null); }} onBlur={() => saveBasics({ thumbnailUrl: course.thumbnailUrl })} placeholder="https://…" />{course.thumbnailUrl && <img className="studio-thumbnail-preview" src={course.thumbnailUrl} alt="معاينة صورة الغلاف" onLoad={(e) => setThumbnailMeta({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} onError={() => setThumbnailMeta({ width: 0, height: 0, error: true })} />}{thumbnailMeta?.error && <span className="studio-thumbnail-warning" role="alert">تعذّر تحميل معاينة الصورة؛ تأكد من أن الرابط HTTPS ويشير إلى صورة مباشرة.</span>}{thumbnailMeta && !thumbnailMeta.error && <div className="studio-thumbnail-diagnostics" role="status"><span>{thumbnailMeta.width}×{thumbnailMeta.height} بكسل</span>{(thumbnailMeta.width < 640 || thumbnailMeta.height < 360) && <span className="studio-thumbnail-warning">يفضّل استخدام صورة لا تقل عن 640×360.</span>}{(thumbnailMeta.width / thumbnailMeta.height < 1.6 || thumbnailMeta.width / thumbnailMeta.height > 1.82) && <span className="studio-thumbnail-warning">نسبة الصورة بعيدة عن 16:9؛ قد تُقصّ في البطاقات.</span>}</div>}</label></div></section>
    <section className="studio-editor-panel"><div className="studio-panel-title"><div><span className="studio-kicker">المادة</span><h2>عن الدورة</h2></div><SaveStateChip state={aboutState} /></div><MarkdownEditor id="course-about" value={course.about || ''} maxLength={20000} label="وصف الدورة بصيغة Markdown" placeholder="اكتب ما الذي سيخرج به المتعلم…" onChange={changeAbout} /><p className="studio-muted">يُحفظ الوصف تلقائيًا بعد التوقف عن الكتابة.</p></section>
    <section className="studio-editor-panel studio-field-wide"><div className="studio-panel-title"><div><span className="studio-kicker">النتائج</span><h2>ماذا سيتعلم الطالب؟</h2></div></div><div className="studio-outcomes">{course.outcomes.map((item, index) => <span className="studio-outcome-chip" key={`${item}-${index}`}>{item}<button type="button" aria-label={`حذف ${item}`} onClick={() => { const outcomes = course.outcomes.filter((_, i) => i !== index); onCourse({ ...course, outcomes }); void replaceStudioOutcomes(course.slug, outcomes, course.updatedAt).then(onCourse).catch(() => undefined); }}>×</button></span>)}<input value={outcome} maxLength={140} placeholder="أضف نتيجة ثم اضغط Enter" onChange={(e) => setOutcome(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOutcome(); } }} /></div></section>
    <section className="studio-editor-panel studio-field-wide"><div className="studio-panel-title"><div><span className="studio-kicker">الروابط</span><h2>دورات مرتبطة</h2></div></div><p className="studio-muted">تظهر هنا نتائج الدورات المنشورة التي يوافق عليها الخادم فقط، وبحد أقصى ٦ دورات.</p><div className="studio-outcomes">{course.relatedIds.map((id) => <span className="studio-outcome-chip" key={id}>{id}<button type="button" aria-label={`إزالة ${id}`} onClick={() => toggleRelated(id)}>×</button></span>)}<input value={relatedQuery} maxLength={100} placeholder="ابحث في الدورات المنشورة…" onChange={(e) => { setRelatedQuery(e.target.value); setRelatedOptions([]); setRelatedError(''); }} /></div>{relatedQuery.trim() && relatedOptions.length > 0 && <div className="studio-picker-list studio-related-results">{relatedOptions.map((item) => <button type="button" className="studio-picker-row" key={item.id} onClick={() => toggleRelated(item.id)}><span><strong>{item.title}</strong><small>{item.id}</small></span><span className="studio-picker-action">{course.relatedIds.includes(item.id) ? 'إزالة' : course.relatedIds.length >= 6 ? 'الحد الأقصى' : 'اختيار'}</span></button>)}</div>}{relatedError && <p className="studio-muted" role="alert">{relatedError}</p>}</section>
  </div>;
};

const CurriculumTab: React.FC<{ course: StudioEditorCourse; onCourse: (course: StudioEditorCourse) => void; openLesson: (id: string) => void }> = ({ course, onCourse, openLesson }) => {
  const [expanded, setExpanded] = useState<string[]>(course.modules.map((module) => module.id));
  const [dragged, setDragged] = useState<{ type: 'module' | 'lesson'; id: string; moduleId?: string } | null>(null);
  const [undo, setUndo] = useState<{ kind: 'module' | 'lesson'; id: string; snapshot: StudioEditorCourse } | null>(null);
  const [toast, setToast] = useState('');
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkTargetModule, setBulkTargetModule] = useState('');
  const announce = (message: string) => setToast(message);
  const toggleLessonSelection = (lessonId: string) => setSelectedLessonIds((current) => current.includes(lessonId) ? current.filter((id) => id !== lessonId) : [...current, lessonId]);
  const selectedLessons = course.modules.flatMap((module) => module.lessons.filter((lesson) => selectedLessonIds.includes(lesson.id)));
  const bulkSetPublished = async (isPublished: boolean) => {
    if (!selectedLessons.length) return;
    const snapshot = course;
    setBulkBusy(true);
    onCourse({ ...course, modules: course.modules.map((module) => ({ ...module, lessons: module.lessons.map((lesson) => selectedLessonIds.includes(lesson.id) ? { ...lesson, isPublished } : lesson) })) });
    try {
      await Promise.all(selectedLessons.map((lesson) => patchStudioLesson(lesson.id, { isPublished, expectedUpdatedAt: lesson.updatedAt })));
      announce(isPublished ? `نُشر ${selectedLessons.length} دروس.` : `أُخفي ${selectedLessons.length} دروس.`);
      setSelectedLessonIds([]);
    } catch {
      onCourse(snapshot);
      setToast('تعذّر تطبيق الإجراء الجماعي؛ أُعيدت الدروس إلى حالتها السابقة.');
    } finally { setBulkBusy(false); }
  };
  const bulkDelete = async () => {
    if (!selectedLessons.length) return;
    const snapshot = course;
    setBulkBusy(true);
    onCourse({ ...course, modules: course.modules.map((module) => ({ ...module, lessons: module.lessons.filter((lesson) => !selectedLessonIds.includes(lesson.id)) })) });
    try {
      await Promise.all(selectedLessons.map((lesson) => deleteStudioLesson(lesson.id)));
      announce(`حُذفت ${selectedLessons.length} دروس.`);
      setSelectedLessonIds([]);
    } catch {
      onCourse(snapshot);
      setToast('تعذّر حذف كل الدروس؛ أُعيد المنهج إلى حالته السابقة.');
    } finally { setBulkBusy(false); }
  };
  const bulkMove = async (targetId: string) => {
    const target = course.modules.find((module) => module.id === targetId);
    const moving = selectedLessons.filter((lesson) => course.modules.find((module) => module.lessons.some((row) => row.id === lesson.id))?.id !== targetId);
    if (!target || !moving.length) return;
    const snapshot = course;
    const affectedIds = new Set([target.id, ...course.modules.filter((module) => moving.some((lesson) => module.lessons.some((row) => row.id === lesson.id))).map((module) => module.id)]);
    const movingIds = new Set(moving.map((lesson) => lesson.id));
    const nextModules = course.modules.map((module) => {
      if (module.id === target.id) return { ...module, lessons: [...module.lessons, ...moving].map((lesson, index) => ({ ...lesson, order: index })) };
      if (affectedIds.has(module.id)) return { ...module, lessons: module.lessons.filter((lesson) => !movingIds.has(lesson.id)).map((lesson, index) => ({ ...lesson, order: index })) };
      return module;
    });
    onCourse({ ...course, modules: nextModules });
    setBulkBusy(true);
    try {
      await moveStudioLessons(course.modules.find((module) => module.lessons.some((lesson) => moving.some((row) => row.id === lesson.id)))?.id || target.id, moving.map((lesson, index) => ({ lessonId: lesson.lessonId, moduleId: target.moduleId, order: target.lessons.length + index })));
      for (const module of nextModules.filter((row) => affectedIds.has(row.id))) await reorderStudioLessons(module.id, module.lessons.map((lesson) => lesson.lessonId));
      announce(`نُقلت ${moving.length} دروس إلى ${target.title || 'الوحدة'}.`);
      setSelectedLessonIds([]);
      setBulkTargetModule('');
    } catch {
      onCourse(snapshot);
      setToast('تعذّر نقل كل الدروس؛ أُعيد المنهج إلى حالته السابقة.');
    } finally { setBulkBusy(false); }
  };
  const reorderModules = async (from: number, to: number) => { if (from === to) return; const snapshot = course; const modules = [...course.modules]; const [row] = modules.splice(from, 1); modules.splice(to, 0, row); onCourse({ ...course, modules }); announce(`نُقلت الوحدة إلى الموضع ${to + 1}`); try { await reorderStudioModules(course.slug, modules.map((item) => item.moduleId)); } catch { onCourse(snapshot); setToast('فشل النقل؛ أُعيد المنهج إلى حالته السابقة.'); } };
  const reorderLessons = async (moduleId: string, from: number, to: number) => { if (from === to) return; const module = course.modules.find((item) => item.id === moduleId); if (!module) return; const snapshot = course; const lessons = [...module.lessons]; const [row] = lessons.splice(from, 1); lessons.splice(to, 0, row); onCourse({ ...course, modules: course.modules.map((item) => item.id === moduleId ? { ...item, lessons } : item) }); announce(`نُقل الدرس إلى الموضع ${to + 1}`); try { await reorderStudioLessons(moduleId, lessons.map((item) => item.lessonId)); } catch { onCourse(snapshot); setToast('فشل النقل؛ أُعيد الدرس إلى موضعه السابق.'); } };
  const moveLessonToModule = async (lesson: StudioLesson, source: StudioModule, target: StudioModule, targetIndex = target.lessons.length) => {
    if (source.id === target.id) return;
    const snapshot = course;
    const sourceLessons = source.lessons.filter((row) => row.id !== lesson.id);
    const targetLessons = [...target.lessons];
    const insertionIndex = Math.max(0, Math.min(targetIndex, targetLessons.length));
    targetLessons.splice(insertionIndex, 0, lesson);
    const nextModules = course.modules.map((item) => {
      if (item.id === source.id) return { ...item, lessons: sourceLessons.map((row, index) => ({ ...row, order: index })) };
      if (item.id === target.id) return { ...item, lessons: targetLessons.map((row, index) => ({ ...row, order: index })) };
      return item;
    });
    onCourse({ ...course, modules: nextModules });
    announce(`نُقل ${lesson.title || 'الدرس'} إلى ${target.title || 'الوحدة'}، الموضع ${insertionIndex + 1}`);
    try {
      await moveStudioLessons(source.id, [{ lessonId: lesson.lessonId, moduleId: target.moduleId, order: insertionIndex }]);
      await reorderStudioLessons(source.id, sourceLessons.map((row) => row.lessonId));
      await reorderStudioLessons(target.id, targetLessons.map((row) => row.lessonId));
    } catch {
      onCourse(snapshot);
      setToast('فشل النقل؛ أُعيد الدرس إلى موضعه السابق.');
    }
  };
  const handleLessonKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, module: StudioModule, lesson: StudioLesson, lessonIndex: number) => {
    if (!event.altKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const nextIndex = lessonIndex + (event.key === 'ArrowUp' ? -1 : 1);
      if (nextIndex >= 0 && nextIndex < module.lessons.length) void reorderLessons(module.id, lessonIndex, nextIndex);
      return;
    }
    const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const moduleDelta = event.key === 'ArrowLeft' ? (isRtl ? 1 : -1) : (isRtl ? -1 : 1);
    const moduleIndex = course.modules.findIndex((item) => item.id === module.id);
    const target = course.modules[moduleIndex + moduleDelta];
    if (target) void moveLessonToModule(lesson, module, target);
  };
  const addModule = async () => { try { const row = await createStudioModule(course.slug, { title: `وحدة ${course.modules.length + 1}`, order: course.modules.length }); onCourse({ ...course, modules: [...course.modules, row] }); setExpanded((current) => [...current, row.id]); } catch { setToast('تعذّر إضافة الوحدة.'); } };
  const addLesson = async (module: StudioModule) => { try { const row = await createStudioLesson(module.id, { title: `درس ${module.lessons.length + 1}`, order: module.lessons.length, kind: 'article' }); onCourse({ ...course, modules: course.modules.map((item) => item.id === module.id ? { ...item, lessons: [...item.lessons, row] } : item) }); openLesson(row.id); } catch { setToast('تعذّر إضافة الدرس.'); } };
  const duplicateLesson = async (module: StudioModule, lesson: StudioLesson) => { try { const row = await duplicateStudioLesson(lesson.id); const lessons = [...module.lessons]; const sourceIndex = lessons.findIndex((item) => item.id === lesson.id); lessons.splice(Math.max(0, sourceIndex + 1), 0, row); onCourse({ ...course, modules: course.modules.map((item) => item.id === module.id ? { ...item, lessons: lessons.map((item, index) => ({ ...item, order: index })) } : item) }); announce('تم نسخ الدرس ووضعه بعد المصدر.'); } catch { setToast('تعذّر نسخ الدرس.'); } };
  const deleteModule = (module: StudioModule) => { const snapshot = course; setUndo({ kind: 'module', id: module.id, snapshot }); onCourse({ ...course, modules: course.modules.filter((item) => item.id !== module.id) }); setToast('حُذفت الوحدة مؤقتًا. لديك 8 ثوانٍ للتراجع.'); window.setTimeout(() => setUndo((current) => { if (current?.id === module.id) { void deleteStudioModule(module.id); return null; } return current; }), 8000); };
  const deleteLesson = (module: StudioModule, lesson: StudioLesson) => { const snapshot = course; setUndo({ kind: 'lesson', id: lesson.id, snapshot }); onCourse({ ...course, modules: course.modules.map((item) => item.id === module.id ? { ...item, lessons: item.lessons.filter((row) => row.id !== lesson.id) } : item) }); setToast('حُذف الدرس مؤقتًا. لديك 8 ثوانٍ للتراجع.'); window.setTimeout(() => setUndo((current) => { if (current?.id === lesson.id) { void deleteStudioLesson(lesson.id); return null; } return current; }), 8000); };
  const moveTouch = async (lesson: StudioLesson, targetId: string) => { const target = course.modules.find((item) => item.id === targetId); const source = course.modules.find((item) => item.lessons.some((row) => row.id === lesson.id)); if (!target || !source || target.id === source.id) return; await moveLessonToModule(lesson, source, target, target.lessons.length); };
  return <section className="studio-curriculum"><div className="studio-curriculum-toolbar"><div><span className="studio-kicker">ورشة المنهج</span><h2>ابنِ الرحلة درسًا بعد درس</h2></div><div><button type="button" className="btn-outline-blue" onClick={() => setExpanded(course.modules.map((module) => module.id))}>توسيع الكل</button><button type="button" className="btn-gold" onClick={() => void addModule()}><Plus size={15} /> إضافة وحدة</button></div></div>{selectedLessonIds.length > 0 && <div className="studio-bulkbar studio-lesson-bulkbar" role="toolbar" aria-label="إجراءات الدروس المحددة"><strong>{selectedLessonIds.length} محدد</strong><button type="button" className="btn-outline-blue" disabled={bulkBusy} onClick={() => void bulkSetPublished(true)}>نشر</button><button type="button" className="btn-outline-blue" disabled={bulkBusy} onClick={() => void bulkSetPublished(false)}>إخفاء</button><select value={bulkTargetModule} disabled={bulkBusy} aria-label="نقل الدروس المحددة إلى وحدة" onChange={(event) => { setBulkTargetModule(event.target.value); if (event.target.value) void bulkMove(event.target.value); }}><option value="">نقل إلى…</option>{course.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select><button type="button" className="icon-action danger" disabled={bulkBusy} onClick={() => void bulkDelete()} aria-label="حذف الدروس المحددة"><Trash2 size={15} /></button></div>}<div className="studio-tree" aria-label="شجرة المنهج">{course.modules.map((module, moduleIndex) => <article key={module.id} className="studio-module-card" draggable onDragStart={() => setDragged({ type: 'module', id: module.id })} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragged?.type === 'module') void reorderModules(course.modules.findIndex((row) => row.id === dragged.id), moduleIndex); if (dragged?.type === 'lesson' && dragged.moduleId !== module.id) { const source = course.modules.find((row) => row.id === dragged.moduleId); const lesson = source?.lessons.find((row) => row.id === dragged.id); if (source && lesson) void moveLessonToModule(lesson, source, module, module.lessons.length); } }}><div className="studio-module-head"><button type="button" className="drag-handle" aria-label="سحب الوحدة"><GripVertical size={16} /></button><button type="button" className="studio-collapse" onClick={() => setExpanded((current) => current.includes(module.id) ? current.filter((id) => id !== module.id) : [...current, module.id])}>{expanded.includes(module.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button><input aria-label="اسم الوحدة" defaultValue={module.title} onDoubleClick={(e) => e.currentTarget.select()} onKeyDown={(e) => { if (e.key === 'F2') e.currentTarget.focus(); if (e.key === 'Enter') { e.currentTarget.blur(); void patchStudioModule(module.id, { title: e.currentTarget.value, expectedUpdatedAt: module.updatedAt }); } }} onBlur={(e) => { if (e.currentTarget.value !== module.title) void patchStudioModule(module.id, { title: e.currentTarget.value, expectedUpdatedAt: module.updatedAt }); }} /><span className="studio-module-count">{module.lessons.length} دروس</span><button type="button" onClick={() => void addLesson(module)} className="icon-action" aria-label="إضافة درس"><Plus size={15} /></button><button type="button" onClick={() => deleteModule(module)} className="icon-action danger" aria-label="حذف الوحدة"><Trash2 size={15} /></button></div>{expanded.includes(module.id) && <div className="studio-lesson-list">{module.lessons.map((lesson, lessonIndex) => <div key={lesson.id} className="studio-lesson-row" tabIndex={0} draggable onKeyDown={(event) => handleLessonKeyDown(event, module, lesson, lessonIndex)} onDragStart={() => setDragged({ type: 'lesson', id: lesson.id, moduleId: module.id })} onDragOver={(e) => e.preventDefault()} onDrop={(event) => { event.stopPropagation(); if (dragged?.type === 'lesson' && dragged.moduleId === module.id) void reorderLessons(module.id, module.lessons.findIndex((row) => row.id === dragged.id), lessonIndex); if (dragged?.type === 'lesson' && dragged.moduleId !== module.id) { const source = course.modules.find((row) => row.id === dragged.moduleId); const moved = source?.lessons.find((row) => row.id === dragged.id); if (source && moved) void moveLessonToModule(moved, source, module, lessonIndex); } }} onDoubleClick={() => openLesson(lesson.id)}><button type="button" className="drag-handle" aria-label="سحب الدرس"><GripVertical size={15} /></button><input type="checkbox" checked={selectedLessonIds.includes(lesson.id)} onChange={() => toggleLessonSelection(lesson.id)} aria-label={`تحديد ${lesson.title || 'الدرس'}`} /><span className={`studio-health-dot ${lesson.kind === 'video' && !lesson.video ? 'is-empty' : lesson.kind === 'video' && lesson.video?.status !== 'ready' ? 'is-processing' : 'is-ready'}`} title={lesson.kind === 'video' && !lesson.video ? 'لا يوجد محتوى' : lesson.video?.status === 'ready' ? 'جاهز' : 'قيد المعالجة'} /><span className="studio-kind-icon">{kindMeta[lesson.kind].icon}</span><button type="button" className="studio-lesson-title" onClick={() => openLesson(lesson.id)}>{lesson.title || 'درس بلا عنوان'}</button><span className="studio-lesson-duration">{lesson.duration || '—'}</span><select aria-label="نقل الدرس إلى وحدة أخرى" value="" onChange={(e) => void moveTouch(lesson, e.target.value)}><option value="">نقل إلى…</option>{course.modules.filter((item) => item.id !== module.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><span className="studio-keyboard-hint" title="Alt+↑/↓ للترتيب، Alt+←/→ للنقل بين الوحدات"><ArrowUp size={11} /><ArrowDown size={11} /></span><button type="button" className="icon-action" onClick={() => void duplicateLesson(module, lesson)} aria-label="نسخ الدرس"><Copy size={14} /></button><button type="button" className="icon-action danger" onClick={() => deleteLesson(module, lesson)} aria-label="حذف الدرس"><Trash2 size={14} /></button></div>)}</div>}</article>)}</div><div className="studio-live-announcer" aria-live="polite">{toast}</div>{undo && <div className="studio-undo-toast"><span>{undo.kind === 'module' ? 'حُذفت الوحدة' : 'حُذف الدرس'}</span><button type="button" onClick={() => { onCourse(undo.snapshot); setUndo(null); setToast('تم التراجع.'); }}>تراجع</button></div>}</section>;
};

const LessonDrawer: React.FC<{ lesson: StudioLesson; course: StudioEditorCourse; onCourse: (course: StudioEditorCourse) => void; close: () => void }> = ({ lesson, course, onCourse, close }) => {
  const [picker, setPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerStatus, setPickerStatus] = useState('ready');
  const [assets, setAssets] = useState<StudioPickerAsset[]>([]);
  const [previewAsset, setPreviewAsset] = useState<StudioPickerAsset | null>(null);
  const [previewGrant, setPreviewGrant] = useState<{ mode?: string; playUrl?: string; sourceUrl?: string; embedUrl?: string } | null>(null);
  const [waitingForUpload, setWaitingForUpload] = useState(false);
  const [uploadBaseline, setUploadBaseline] = useState<Set<string>>(new Set());
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceError, setResourceError] = useState('');
  const [resourceBusy, setResourceBusy] = useState(false);
  const [conflict, setConflict] = useState<ApiError | null>(null);
  const [manualConflictPayload, setManualConflictPayload] = useState<Record<string, unknown> | null>(null);
  const applyLesson = useCallback((next: StudioLesson) => onCourse(updateLessonInCourse(course, lesson.id, next)), [course, lesson.id, onCourse]);
  const saveArticle = useCallback(async (payload: Record<string, unknown>) => { const next = await patchStudioLesson(lesson.id, payload); applyLesson(next); return next; }, [applyLesson, lesson.id]);
  const articleAutosave = useAutosave(saveArticle, lesson.updatedAt);
  const patch = useCallback(async (payload: Record<string, unknown>) => {
    try {
      const next = await patchStudioLesson(lesson.id, { ...payload, expectedUpdatedAt: articleAutosave.expectedUpdatedAt ?? lesson.updatedAt });
      applyLesson(next);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) { setConflict(error); setManualConflictPayload(payload); }
      else setResourceError('تعذّر حفظ الدرس.');
    }
  }, [applyLesson, articleAutosave.expectedUpdatedAt, lesson.id, lesson.updatedAt]);
  const chooseAsset = useCallback(async (asset: StudioPickerAsset) => {
    if (asset.status !== 'ready') { setResourceError('لا يمكن اختيار فيديو قبل أن يصبح جاهزًا.'); return; }
    try { const next = await linkStudioLessonVideo(lesson.id, asset.id); applyLesson(next); setPicker(false); } catch { setResourceError('تعذّر ربط الفيديو.'); }
  }, [applyLesson, lesson.id]);
  const preview = useCallback(async (asset: StudioPickerAsset) => {
    if (asset.status !== 'ready') { setResourceError('المعاينة متاحة بعد جاهزية الفيديو.'); return; }
    try {
      const grant = await apiPost<{ mode?: string; playUrl?: string; sourceUrl?: string; embedUrl?: string }>(`/videos/${encodeURIComponent(asset.slug)}/token`, { lessonRef: { course: course.slug, lesson: lesson.lessonId } });
      setPreviewAsset(asset);
      setPreviewGrant(grant);
      setResourceError('');
    } catch { setResourceError('تعذّر فتح معاينة الفيديو.'); }
  }, [course.slug, lesson.lessonId]);
  const startNewUpload = useCallback(async () => {
    setResourceError('');
    let popup: Window | null;
    try { popup = window.open('', '_blank'); } catch { popup = null; }
    if (!popup) { setResourceError('تعذّر فتح نافذة الرفع؛ اسمح بالنوافذ المنبثقة ثم حاول مجددًا.'); return; }
    try {
      popup.opener = null;
      const current = await fetchStudioPickerAssets({ status: '' });
      setUploadBaseline(new Set(current.items.map((asset) => asset.id)));
      setWaitingForUpload(true);
      popup.location.replace('/studio/videos?add=1');
    } catch {
      popup.close();
      setWaitingForUpload(false);
      setResourceError('تعذّر تجهيز مكتبة الفيديو للرفع؛ بقيت في محرر الدرس.');
    }
  }, []);
  useEffect(() => {
    if (!waitingForUpload) return undefined;
    let alive = true;
    const poll = () => {
      void fetchStudioPickerAssets({ status: 'ready' }).then((result) => {
        if (!alive) return;
        const next = result.items.find((asset) => !uploadBaseline.has(asset.id));
        if (next) { setWaitingForUpload(false); void chooseAsset(next); }
      }).catch(() => undefined);
    };
    poll();
    const timer = window.setInterval(poll, 2500);
    return () => { alive = false; window.clearInterval(timer); };
  }, [chooseAsset, uploadBaseline, waitingForUpload]);
  const createLink = async () => { if (!linkTitle.trim() || !linkUrl.trim()) return; try { const asset = await createStudioVideoLink(linkTitle.trim(), linkUrl.trim()); await chooseAsset(asset); setLinkOpen(false); setLinkTitle(''); setLinkUrl(''); } catch { setResourceError('تعذّر إضافة رابط الفيديو.'); } };
  const addResource = async () => { const title = resourceTitle.trim(); const url = resourceUrl.trim(); if (!title || !url) { setResourceError('أدخل عنوان المورد ورابط HTTPS.'); return; } try { if (new URL(url).protocol !== 'https:') throw new Error('https'); } catch { setResourceError('رابط المورد يجب أن يبدأ بـ HTTPS.'); return; } setResourceBusy(true); setResourceError(''); try { const resource = await createStudioLessonResource(lesson.id, { title, url, kind: 'link', order: lesson.resources.length }); applyLesson({ ...lesson, resources: [...lesson.resources, resource] }); setResourceTitle(''); setResourceUrl(''); } catch { setResourceError('تعذّر إضافة المورد.'); } finally { setResourceBusy(false); } };
  const removeResource = async (resource: StudioResource) => { setResourceBusy(true); setResourceError(''); try { await deleteStudioLessonResource(lesson.id, resource.id); applyLesson({ ...lesson, resources: lesson.resources.filter((item) => item.id !== resource.id) }); } catch { setResourceError('تعذّر حذف المورد.'); } finally { setResourceBusy(false); } };
  const resolveArticleConflict = (choices: Record<string, ConflictChoice>) => {
    const resolution = articleAutosave.resolveConflict(choices);
    if (!resolution) return;
    const queued = Object.entries(resolution.local).reduce<Record<string, unknown>>((payload, [key, value]) => {
      const currentValue = (lesson as unknown as Record<string, unknown>)[key];
      if (key !== 'expectedUpdatedAt' && key in lesson && !sameConflictValue(currentValue, value)) payload[key] = currentValue;
      return payload;
    }, {});
    applyLesson(mergeConflictValues(lesson, resolution, choices));
    if (Object.keys(queued).length) articleAutosave.queue(queued);
  };
  const resolveManualConflict = async (choices: Record<string, ConflictChoice>) => {
    if (!conflict || !manualConflictPayload) return;
    const details: ConflictDetails = { local: manualConflictPayload, server: conflictServerValues(conflict) };
    const nextLesson = mergeConflictValues(lesson, details, choices);
    applyLesson(nextLesson);
    const mine = Object.entries(manualConflictPayload).reduce<Record<string, unknown>>((payload, [key, value]) => {
      if (key !== 'expectedUpdatedAt' && (choices[key] ?? 'mine') === 'mine') payload[key] = value;
      return payload;
    }, {});
    const expectedUpdatedAt = details.server.updatedAt;
    setConflict(null);
    setManualConflictPayload(null);
    if (!Object.keys(mine).length) return;
    try {
      const saved = await patchStudioLesson(lesson.id, { ...mine, ...(typeof expectedUpdatedAt === 'string' ? { expectedUpdatedAt } : {}) });
      applyLesson(saved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) { setConflict(error); setManualConflictPayload(mine); }
      else setResourceError('تعذّرت إعادة محاولة حفظ الحقول المختارة.');
    }
  };
  const activeConflict = articleAutosave.conflict || conflict;
  const activeConflictDetails: ConflictDetails | null = articleAutosave.conflict
    ? articleAutosave.conflictDetails
    : conflict && manualConflictPayload ? { local: manualConflictPayload, server: conflictServerValues(conflict) } : null;
  return <><aside className="studio-lesson-drawer" aria-label="محرر الدرس"><div className="studio-drawer-head"><div><span className="studio-kicker">تفاصيل الدرس</span><h2>{lesson.title || 'درس بلا عنوان'}</h2></div><button type="button" onClick={close} aria-label="إغلاق الدرس"><X size={18} /></button></div><div className="studio-drawer-body"><label>العنوان<input value={lesson.title} onChange={(e) => onCourse(updateLessonInCourse(course, lesson.id, { ...lesson, title: e.target.value }))} onBlur={() => void patch({ title: lesson.title })} /></label><label>نوع الدرس<select value={lesson.kind} onChange={(e) => void patch({ kind: e.target.value })}>{Object.entries(kindMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></label>{lesson.kind === 'video' && <section className="studio-drawer-section"><div className="studio-drawer-section-title"><strong>الفيديو</strong><button type="button" className="btn-outline-blue" onClick={() => { setPicker(true); void fetchStudioPickerAssets({ q: pickerQuery, status: pickerStatus }).then((result) => setAssets(result.items)).catch(() => setAssets([])); }}>اختيار فيديو</button></div>{lesson.video ? <div className="studio-asset-card"><span className={`studio-status-dot status-${lesson.video.status}`} /><div><strong>{lesson.video.title}</strong><small>{lesson.video.status} · {lesson.video.playbackMode || '—'} · {lesson.video.protection || '—'}</small></div></div> : <p className="studio-muted">لا يوجد فيديو مرتبط بعد.</p>}<button type="button" className="studio-link-affordance" onClick={() => setLinkOpen((open) => !open)}><Link2 size={15} /> إضافة رابط فيديو</button>{linkOpen && <div className="studio-link-form"><input placeholder="عنوان الرابط" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} /><input type="url" placeholder="https://youtube.com/…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} /><button type="button" className="btn-gold" onClick={() => void createLink()}>إضافة الرابط</button></div>}</section>}{lesson.kind === 'article' && <><MarkdownEditor id={`lesson-${lesson.id}`} value={lesson.content || ''} maxLength={60000} label="محتوى المقال" placeholder="اكتب المقال هنا…" onChange={(value) => { applyLesson({ ...lesson, content: value }); articleAutosave.queue({ content: value }); }} /><SaveStateChip state={articleAutosave.state} /></>}{lesson.kind === 'article' && <label>الملخص<textarea value={lesson.summary || ''} maxLength={50000} onChange={(e) => onCourse(updateLessonInCourse(course, lesson.id, { ...lesson, summary: e.target.value }))} onBlur={() => void patch({ summary: lesson.summary })} /></label>}<label className="studio-switch-row"><input type="checkbox" checked={lesson.isFreePreview} onChange={(e) => void patch({ isFreePreview: e.target.checked })} /> معاينة مجانية <span title="يمكن للزوار مشاهدة هذا الدرس قبل التسجيل">ⓘ</span></label><label className="studio-switch-row"><input type="checkbox" checked={lesson.isPublished} onChange={(e) => void patch({ isPublished: e.target.checked })} /> منشور في المنهج</label><section className="studio-drawer-section"><div className="studio-drawer-section-title"><strong>الموارد</strong><span className="studio-drawer-meta">روابط HTTPS فقط</span></div>{lesson.resources.length ? <ul className="studio-resource-editor-list">{lesson.resources.map((resource) => <li key={resource.id}><a href={resource.url} target="_blank" rel="noopener noreferrer nofollow">{resource.title}</a><button type="button" className="icon-action danger" disabled={resourceBusy} onClick={() => void removeResource(resource)} aria-label={`حذف ${resource.title}`}><Trash2 size={14} /></button></li>)}</ul> : <p className="studio-muted">لا توجد موارد مرتبطة بهذا الدرس.</p>}<div className="studio-link-form"><input value={resourceTitle} placeholder="عنوان المورد" onChange={(e) => setResourceTitle(e.target.value)} /><input type="url" value={resourceUrl} placeholder="https://…" onChange={(e) => setResourceUrl(e.target.value)} /><button type="button" className="btn-outline-blue" disabled={resourceBusy} onClick={() => void addResource()}>{resourceBusy ? 'جارٍ الحفظ…' : 'إضافة مورد'}</button></div>{resourceError && <p className="studio-muted" role="alert">{resourceError}</p>}</section>{lesson.durationSeconds > 0 || (lesson.video?.durationSeconds || 0) > 0 ? <div className="studio-drawer-meta">المدة: <b>{lesson.duration || 'غير معروفة'}</b> <span>تُشتق من الأصل عند توفره.</span></div> : <label>المدة اليدوية (عند عدم توفر مدة من الفيديو)<input value={lesson.duration || ''} maxLength={20} placeholder="مثال: 12:30" onChange={(e) => applyLesson({ ...lesson, duration: e.target.value })} onBlur={() => void patch({ duration: lesson.duration })} /><small className="studio-muted">هذه قيمة إرشادية فقط، وتختفي عند توفر مدة أصل الفيديو.</small></label>}</div>{picker && <div className="studio-modal-scrim" role="presentation"><div className="studio-modal studio-picker-modal" role="dialog" aria-modal="true" aria-labelledby="picker-title"><div className="studio-modal-head"><h2 id="picker-title">اختيار فيديو</h2><button type="button" onClick={() => setPicker(false)} aria-label="إغلاق"><X size={17} /></button></div><div className="studio-picker-toolbar"><input value={pickerQuery} placeholder="ابحث في مكتبتك…" onChange={(event) => { setPickerQuery(event.target.value); void fetchStudioPickerAssets({ q: event.target.value, status: pickerStatus }).then((result) => setAssets(result.items)); }} /><select value={pickerStatus} onChange={(event) => { setPickerStatus(event.target.value); void fetchStudioPickerAssets({ q: pickerQuery, status: event.target.value }).then((result) => setAssets(result.items)); }}><option value="ready">جاهز فقط</option><option value="">كل الحالات</option><option value="processing">قيد المعالجة</option><option value="staged">قيد التجهيز</option></select><button type="button" className="btn-outline-blue" disabled={waitingForUpload} onClick={() => void startNewUpload()}>{waitingForUpload ? 'بانتظار الفيديو…' : 'رفع جديد'}</button></div><div className="studio-picker-list">{assets.length ? assets.map((asset) => <div className="studio-picker-row" key={asset.id}><span className={`studio-status-dot status-${asset.status}`} /><span><strong>{asset.title}</strong><small>{asset.status === 'ready' ? '✓ جاهز للاستخدام' : asset.status === 'staged' ? '⚠ يحتاج تغليفًا قبل التشغيل' : '⏳ قيد التجهيز'} · {asset.playbackMode || '—'} · {asset.protection || '—'}</small></span><span className="studio-picker-action"><button type="button" className="btn-outline-blue" disabled={asset.status !== 'ready'} onClick={() => void preview(asset)}>معاينة</button><button type="button" className="btn-gold" disabled={asset.status !== 'ready'} onClick={() => void chooseAsset(asset)}>اختيار هذا الفيديو</button></span></div>) : <p className="studio-muted">لا توجد أصول فيديو جاهزة في مكتبتك بعد. يمكنك إضافة رابط خارجي.</p>}</div></div></div>}{previewAsset && previewGrant && <div className="studio-modal-scrim" role="presentation"><div className="studio-modal studio-video-preview-modal" role="dialog" aria-modal="true" aria-labelledby="video-preview-title"><div className="studio-modal-head"><h2 id="video-preview-title">معاينة الفيديو: {previewAsset.title}</h2><button type="button" onClick={() => { setPreviewAsset(null); setPreviewGrant(null); }} aria-label="إغلاق المعاينة"><X size={17} /></button></div>{previewGrant.embedUrl ? <iframe title={`معاينة ${previewAsset.title}`} src={previewGrant.embedUrl} allow="autoplay; fullscreen" allowFullScreen /> : (previewGrant.playUrl || previewGrant.sourceUrl) ? <video controls playsInline src={previewGrant.playUrl || previewGrant.sourceUrl} /> : <p className="studio-muted">لم يُرجع الخادم رابط تشغيل صالحًا لهذه المعاينة.</p>}<div className="studio-conflict-actions"><button type="button" className="btn-outline-blue" onClick={() => { setPreviewAsset(null); setPreviewGrant(null); }}>إغلاق</button><button type="button" className="btn-gold" onClick={() => { void chooseAsset(previewAsset); setPreviewAsset(null); setPreviewGrant(null); }}>اختيار هذا الفيديو</button></div></div></div>}</aside>{activeConflict && activeConflictDetails && <ConflictDialog key={articleAutosave.conflict ? 'article' : 'manual'} error={activeConflict} details={activeConflictDetails} onResolve={articleAutosave.conflict ? resolveArticleConflict : resolveManualConflict} />}</>;
};

const QuizzesTab: React.FC<{ course: StudioEditorCourse; onManage: () => void; onOpen: (id: string) => void; canEdit: boolean }> = ({ course, onManage, onOpen, canEdit }) => <section className="studio-editor-panel"><div className="studio-panel-title"><div><span className="studio-kicker">الاختبارات</span><h2>مخطط القياس</h2></div><ListChecks size={18} /></div>{course.quizzes.length ? <div className="studio-quiz-list">{course.quizzes.map((quiz) => <button type="button" className="studio-quiz-row" key={quiz.id} disabled={!canEdit} onClick={() => onOpen(quiz.id)}><strong>{quiz.title}</strong><span>{quiz.kind}</span><span>{quiz.questionCount} سؤال</span><span>{quiz.attemptsCount} محاولة</span></button>)}</div> : <p className="studio-muted">لا توجد اختبارات مرتبطة بهذه الدورة بعد.</p>}<div className="studio-quiz-actions"><p className="studio-muted">تُدار الأسئلة والنتائج من منشئ الاختبارات، مع تصحيح ونتائج معتمدة من الخادم.</p><button type="button" className="btn-outline-blue" onClick={onManage}>{canEdit ? 'إدارة اختبارات هذه الدورة' : 'فتح خيارات إنشاء الاختبار'}</button></div></section>;
const ComingTab: React.FC<{ title: string; text: string }> = ({ title, text }) => <section className="studio-coming"><Sparkles size={22} /><h2>{title}</h2><p>{text}</p></section>;
const TeamTab: React.FC<{ course: StudioEditorCourse; onCourse: (course: StudioEditorCourse) => void }> = ({ course, onCourse }) => { const [query, setQuery] = useState(''); const [kind, setKind] = useState('co_instructor'); const [candidates, setCandidates] = useState<Array<{ id: string; name: string; headline: string; avatarUrl: string }>>([]); const [error, setError] = useState(''); const search = (value: string) => { setQuery(value); setError(''); if (!value.trim()) { setCandidates([]); return; } void fetchStudioStaffCandidates(course.slug, value).then((result) => setCandidates(result.items)).catch(() => setError('تعذّر البحث في مستخدمي الاستوديو.')); }; const add = async (id: string) => { try { await addStudioStaff(course.slug, id, kind); const next = await fetchStudioEditor(course.slug); onCourse(next); setCandidates([]); setQuery(''); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'تعذّرت إضافة العضو.'); } }; const remove = async (member: StudioStaff) => { if (member.kind === 'owner') return; try { await removeStudioStaff(course.slug, member.id); onCourse(await fetchStudioEditor(course.slug)); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'تعذّرت إزالة العضو.'); } }; return <section className="studio-editor-panel"><div className="studio-panel-title"><div><span className="studio-kicker">الفريق</span><h2>من يملك مفاتيح الورشة؟</h2></div><Users size={18} /></div><p className="studio-muted">تظهر هنا العضويات الحالية وصلاحياتها. البحث يعرض مستخدمين لديهم صلاحية الدخول إلى الاستوديو فقط.</p><div className="studio-staff-list">{course.staff.map((member) => <div className="studio-staff-row" key={member.id}><span className="studio-avatar">{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.kind === 'co_instructor' ? 'محرر مشارك' : member.kind === 'assistant' ? 'مساعد' : 'مالك الدورة'} · {(staffCapabilityLabels[member.kind] || []).join(' · ') || 'صلاحيات مخصصة'}</small></div>{member.kind !== 'owner' && <button type="button" className="icon-action danger" onClick={() => void remove(member)} aria-label={`إزالة ${member.name}`}><Trash2 size={14} /></button>}</div>)}</div><div className="studio-staff-add"><input value={query} onChange={(e) => search(e.target.value)} placeholder="ابحث بالاسم أو البريد عن مستخدم studio.access" /><select value={kind} onChange={(e) => setKind(e.target.value)}><option value="co_instructor">محرر مشارك</option><option value="assistant">مساعد</option></select></div>{candidates.length > 0 && <div className="studio-picker-list">{candidates.map((candidate) => <button type="button" className="studio-picker-row" key={candidate.id} onClick={() => void add(candidate.id)}><span><strong>{candidate.name}</strong><small>{candidate.headline || 'مستخدم استوديو مؤهل'}</small></span><span className="studio-picker-action">إضافة</span></button>)}</div>}{error && <p className="studio-form-error" role="alert">{error}</p>}</section>; };
const PublishTab: React.FC<{ course: StudioEditorCourse; onAction: () => void; canPublish: boolean; canSubmit: boolean }> = ({ course, onAction, canPublish, canSubmit }) => { const unavailable = course.status === 'published' || (course.status === 'in_review' ? !canPublish : !canPublish && !canSubmit); const reason = course.status === 'published' ? 'هذه الدورة منشورة بالفعل.' : course.status === 'in_review' ? 'تحتاج الدورة قيد المراجعة إلى صلاحية courses.publish لاعتمادها.' : 'تحتاج إلى courses.publish للنشر المباشر أو courses.submit_for_review للإرسال.'; return <section className="studio-publish-layout"><div className="studio-astrolabe"><ReadinessRing value={course.checklist.completeness} size={164} /><span className="studio-kicker">جاهزية النشر</span><strong>{course.checklist.ready ? 'المسار مستعد' : 'هناك نقاط تحتاج انتباهًا'}</strong></div><div className="studio-editor-panel"><div className="studio-panel-title"><div><span className="studio-kicker">قائمة التحقق</span><h2>قبل أن تفتح الدورة أبوابها</h2></div></div><div className="studio-issues">{course.checklist.issues.map((issue) => <a key={`${issue.code}-${issue.target}`} className={`studio-issue studio-issue-${issue.severity}`} href={`#${issue.target.replace(':', '-')}`}><CircleAlert size={15} /><span>{issue.message}</span><small>{issue.target}</small></a>)}</div>{unavailable && <p className="studio-muted" role="note">{reason}</p>}<button type="button" className="btn-gold" disabled={!course.checklist.ready || unavailable} onClick={onAction}>{course.status === 'published' ? 'منشورة' : course.status === 'in_review' ? 'نشر الآن' : canPublish ? 'نشر الآن' : 'إرسال للمراجعة'}</button>{course.reviewNote && <div className="studio-review-note">ملاحظة المراجع: {course.reviewNote}</div>}</div></section>; };
const SettingsTab: React.FC<{ course: StudioEditorCourse; onCourse: (course: StudioEditorCourse) => void; saveSlug: (payload: Record<string, unknown>) => void; onDeleted: () => void }> = ({ course, onCourse, saveSlug, onDeleted }) => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [archiveConfirmation, setArchiveConfirmation] = useState('');
  const [slugDraft, setSlugDraft] = useState(course.slug);
  const staffMembership = course.staff.find((member) => member.userId === user?.id)?.kind;
  const canArchive = course.status === 'published' && (can(user, 'courses.publish') || staffMembership === 'owner' || staffMembership === 'co_instructor');
  const canDelete = can(user, 'courses.delete_any') || (can(user, 'courses.delete_own') && staffMembership === 'owner');
  const archive = async () => {
    if (archiveConfirmation !== course.title) return;
    setBusy(true); setError('');
    try { onCourse(await unpublishStudioCourse(course.slug)); setArchiveOpen(false); setArchiveConfirmation(''); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'تعذّر أرشفة الدورة.'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (confirmation !== course.title) return;
    setBusy(true); setError('');
    try { await deleteStudioCourse(course.slug); onDeleted(); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'تعذّر حذف الدورة.'); setBusy(false); }
  };
  return <section className="studio-editor-panel"><div className="studio-panel-title"><div><span className="studio-kicker">الإعدادات</span><h2>حدود الدورة</h2></div><Settings size={18} /></div><label>المعرّف العام<input value={slugDraft} disabled={course.status !== 'draft'} onChange={(e) => setSlugDraft(e.target.value)} /><small>{course.status === 'draft' ? 'يمكن تعديله حتى أول نشر.' : 'مقفل بعد أول نشر للحفاظ على الروابط.'}</small></label>{course.status === 'draft' && <button type="button" className="btn-outline-blue" disabled={!slugDraft.trim() || slugDraft === course.slug} onClick={() => saveSlug({ slug: slugDraft })}>حفظ المعرّف</button>}<div className="studio-setting-warning"><LockKeyhole size={16} /> إلغاء النشر يعيد الدورة إلى مسودة إذا لم يكن بها متعلّمون، أما إذا وُجد تسجيل واحد على الأقل فسيؤرشفها ويحافظ على وصول المسجلين إليها. لن يتغير ذلك إلا بعد تأكيد صريح.</div><div className="studio-settings-actions"><div><h3>إجراءات دورة خطرة</h3><p className="studio-muted">تتحقق الخوادم من الملكية والتسجيلات قبل أي تغيير.</p></div>{canArchive && <button type="button" className="btn-outline-blue" disabled={busy} onClick={() => { setArchiveOpen(true); setArchiveConfirmation(''); }}>إلغاء النشر / أرشفة</button>}{canDelete && <button type="button" className="btn-outline-danger" disabled={busy} onClick={() => { setDeleteOpen(true); setConfirmation(''); }}>حذف الدورة</button>}{!canArchive && !canDelete && <p className="studio-muted">لا تملك صلاحية الأرشفة أو الحذف لهذه الدورة.</p>}</div>{error && <p className="studio-form-error" role="alert">{error}</p>}<div className="studio-setting-warning studio-setting-muted"><LockKeyhole size={16} /> نقل الملكية غير متاح هنا: لا يوفّر الخادم عقدًا آمنًا لنقل الملكية، لذلك لم يُضف هذا الإجراء.</div>{archiveOpen && <div className="studio-inline-confirm"><strong>إلغاء النشر قد يؤدي إلى الأرشفة عند وجود تسجيلات. اكتب عنوان الدورة حرفيًا للتأكيد.</strong><input value={archiveConfirmation} onChange={(e) => setArchiveConfirmation(e.target.value)} placeholder={course.title} /><div><button type="button" className="btn-outline-blue" onClick={() => setArchiveOpen(false)}>إلغاء</button><button type="button" className="btn-outline-danger" disabled={busy || archiveConfirmation !== course.title} onClick={() => void archive()}>تأكيد إلغاء النشر / الأرشفة</button></div></div>}{deleteOpen && <div className="studio-inline-confirm"><strong>اكتب عنوان الدورة حرفيًا للتأكيد</strong><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder={course.title} /><div><button type="button" className="btn-outline-blue" onClick={() => setDeleteOpen(false)}>إلغاء</button><button type="button" className="btn-outline-danger" disabled={busy || confirmation !== course.title} onClick={() => void remove()}>تأكيد الحذف</button></div></div>}</section>;
};
const ConflictDialog: React.FC<{ error: ApiError | null; details: ConflictDetails; onResolve: (choices: Record<string, ConflictChoice>) => void }> = ({ error, details, onResolve }) => {
  const fields = Object.keys(details.local).filter((key) => key !== 'expectedUpdatedAt' && key !== 'updatedAt');
  const initialChoices = () => Object.fromEntries(fields.map((key) => [key, 'mine'])) as Record<string, ConflictChoice>;
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>(initialChoices);
  return <div className="studio-modal-scrim" role="presentation"><div className="studio-modal studio-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="conflict-title"><div className="studio-modal-head"><h2 id="conflict-title">تعارض في التعديل</h2></div><p>{error?.message || 'تغيّرت بعض الحقول في نافذة أخرى. اختر قيمة كل حقل ثم أعد المحاولة.'}</p><p className="studio-muted">إصدار الخادم الحالي: {conflictValue(details.server.updatedAt)}</p><div className="studio-conflict-fields">{fields.map((key) => <div className="studio-conflict-field" key={key}><strong>{conflictFieldLabel(key)}</strong><div className="studio-conflict-values"><label><input type="radio" name={`conflict-${key}`} checked={choices[key] === 'mine'} onChange={() => setChoices((current) => ({ ...current, [key]: 'mine' }))} /> نسختي: <span>{conflictValue(details.local[key])}</span></label><label><input type="radio" name={`conflict-${key}`} checked={choices[key] === 'theirs'} onChange={() => setChoices((current) => ({ ...current, [key]: 'theirs' }))} /> نسخة الخادم: <span>{conflictValue(details.server[key])}</span></label></div></div>)}</div><div className="studio-conflict-actions"><button type="button" className="btn-gold" onClick={() => onResolve(choices)}>تطبيق الاختيارات وإعادة المحاولة</button></div></div></div>;
};
