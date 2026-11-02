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
import { useAutosave } from '@/features/studio/hooks/useAutosave';
import {
  addStudioStaff, createStudioLesson, createStudioLessonResource, createStudioModule,
  createStudioVideoLink, deleteStudioLesson, deleteStudioLessonResource, deleteStudioModule,
  deleteStudioCourse, duplicateStudioLesson, fetchPublishedStudioRelatedCourses, fetchStudioCategories,
  fetchStudioEditor, fetchStudioPickerAssets, linkStudioLessonVideo, moveStudioLessons, patchStudioCourse,
  patchStudioLesson, patchStudioModule, publishStudioCourse, replaceStudioOutcomes, replaceStudioRelated,
  reorderStudioLessons, reorderStudioModules, submitStudioCourse,
} from '@/features/studio/data/studioFetchers';
import type { LessonKind, StudioEditorCourse, StudioLesson, StudioModule, StudioPickerAsset, StudioResource } from '@/features/studio/types';
import { ApiError } from '@/shared/lib/apiClient';

const tabs = [
  ['info', 'المعلومات'], ['curriculum', 'المنهج'], ['quizzes', 'الاختبارات'], ['sessions', 'الجلسات'], ['team', 'الفريق'], ['publish', 'النشر'], ['settings', 'الإعدادات'],
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
    setLoading(true);
    Promise.all([fetchStudioEditor(slug), fetchStudioCategories()]).then(([next, taxonomy]) => {
      if (alive) { setCourse(next); setCategories(taxonomy.items); }
    }).catch(() => alive && setNotice('تعذّر تحميل محرر الدورة.')).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [slug]);
  const saveCourse = useCallback(async (payload: Record<string, unknown>) => {
    const current = courseRef.current;
    const next = await patchStudioCourse(slug, { ...payload, expectedUpdatedAt: payload.expectedUpdatedAt ?? current?.updatedAt });
    setCourse(next);
    return next;
  }, [slug]);
  const basics = useAutosave(saveCourse, course?.updatedAt);
  const about = useAutosave(saveCourse, course?.updatedAt);
  const patchLocal = (next: StudioEditorCourse) => { courseRef.current = next; setCourse(next); };
  const openTab = (next: Tab) => { const nextParams = new URLSearchParams(params); nextParams.set('tab', next); setParams(nextParams); };
  const openLesson = (id: string | null) => { const nextParams = new URLSearchParams(params); if (id) nextParams.set('lesson', id); else nextParams.delete('lesson'); setParams(nextParams); };
  const publishAction = async () => {
    try {
      const next = course?.status === 'in_review' ? await publishStudioCourse(slug) : await submitStudioCourse(slug);
      patchLocal(next);
      setNotice(next.status === 'published' ? 'تم نشر الدورة.' : 'أُرسلت الدورة للمراجعة.');
    } catch (error) { setNotice(error instanceof ApiError ? error.message : 'تعذّر تنفيذ الإجراء.'); }
  };
  if (loading) return <StudioShell><div className="studio-editor-loading">جارٍ فتح ورشة الدورة…</div></StudioShell>;
  if (!course) return <StudioShell><div className="studio-empty"><CircleAlert /><h2>{notice || 'الدورة غير موجودة'}</h2><button className="btn-outline-blue" type="button" onClick={() => navigate('/studio/courses')}>العودة إلى دوراتي</button></div></StudioShell>;
  const activeLesson = course.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === activeLessonId) || null;
  const saveState = basics.state === 'saving' || about.state === 'saving' ? 'saving' : basics.state === 'error' || about.state === 'error' ? 'error' : basics.state === 'saved' || about.state === 'saved' ? 'saved' : 'idle';
  return <StudioShell>
    <div className="studio-editor" dir="rtl">
      <header className="studio-editor-header">
        <div className="studio-editor-heading"><button type="button" className="studio-back-button" onClick={() => navigate('/studio/courses')} aria-label="العودة إلى دوراتي"><ArrowLeft size={17} /> دوراتي</button><span className="studio-editor-separator">/</span><input aria-label="عنوان الدورة" value={course.title} onChange={(event) => patchLocal({ ...course, title: event.target.value })} onBlur={() => basics.queue({ title: course.title })} /><StatusChip status={course.status} /></div>
        <div className="studio-editor-header-actions"><ReadinessRing value={course.checklist.completeness} size={46} /><SaveStateChip state={saveState} /><button type="button" className="btn-outline-blue" onClick={() => navigate(`/courses/${course.slug}`)}>معاينة ↗</button><button type="button" className="btn-gold" disabled={course.status === 'published' || !course.checklist.ready} onClick={() => void publishAction()}>{course.status === 'in_review' ? 'نشر الآن' : 'إرسال للمراجعة'}</button></div>
      </header>
      <nav className="studio-editor-tabs" aria-label="أقسام محرر الدورة">{tabs.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'is-active' : ''} onClick={() => openTab(id)}>{label}</button>)}</nav>
      {notice && <div className="studio-editor-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="إغلاق"><X size={15} /></button></div>}
      <main className="studio-editor-data">
        {tab === 'info' && <BasicsTab course={course} categories={categories} onCourse={patchLocal} saveBasics={basics.queue} saveAbout={about.queue} aboutState={about.state} />}
        {tab === 'curriculum' && <CurriculumTab course={course} onCourse={patchLocal} openLesson={openLesson} />}
        {tab === 'quizzes' && <QuizzesTab course={course} />}
        {tab === 'sessions' && <ComingTab title="الجلسات" text="مساحة الجلسات ستستخدم بيانات الجلسات الحية الحالية للدورة." />}
        {tab === 'team' && <TeamTab course={course} onCourse={patchLocal} />}
        {tab === 'publish' && <PublishTab course={course} onAction={() => void publishAction()} />}
        {tab === 'settings' && <SettingsTab course={course} onCourse={patchLocal} onDeleted={() => navigate('/studio/courses')} />}
      </main>
      {activeLesson && <LessonDrawer lesson={activeLesson} course={course} onCourse={patchLocal} close={() => openLesson(null)} />}
      {(basics.conflict || about.conflict) && <ConflictDialog error={basics.conflict || about.conflict} onClose={() => { basics.clearConflict(); about.clearConflict(); }} onReload={() => window.location.reload()} />}
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
    if (!relatedQuery.trim()) { setRelatedOptions([]); return undefined; }
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
    <section className="studio-editor-panel studio-field-wide"><div className="studio-panel-title"><div><span className="studio-kicker">الروابط</span><h2>دورات مرتبطة</h2></div></div><p className="studio-muted">تظهر هنا نتائج الدورات المنشورة التي يوافق عليها الخادم فقط، وبحد أقصى ٦ دورات.</p><div className="studio-outcomes">{course.relatedIds.map((id) => <span className="studio-outcome-chip" key={id}>{id}<button type="button" aria-label={`إزالة ${id}`} onClick={() => toggleRelated(id)}>×</button></span>)}<input value={relatedQuery} maxLength={100} placeholder="ابحث في الدورات المنشورة…" onChange={(e) => { setRelatedQuery(e.target.value); setRelatedError(''); }} /></div>{relatedOptions.length > 0 && <div className="studio-picker-list studio-related-results">{relatedOptions.map((item) => <button type="button" className="studio-picker-row" key={item.id} onClick={() => toggleRelated(item.id)}><span><strong>{item.title}</strong><small>{item.id}</small></span><span className="studio-picker-action">{course.relatedIds.includes(item.id) ? 'إزالة' : course.relatedIds.length >= 6 ? 'الحد الأقصى' : 'اختيار'}</span></button>)}</div>}{relatedError && <p className="studio-muted" role="alert">{relatedError}</p>}</section>
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
  const duplicateLesson = async (module: StudioModule, lesson: StudioLesson) => { try { const row = await duplicateStudioLesson(lesson.id); onCourse({ ...course, modules: course.modules.map((item) => item.id === module.id ? { ...item, lessons: [...item.lessons, row] } : item) }); announce('تم نسخ الدرس.'); } catch { setToast('تعذّر نسخ الدرس.'); } };
  const deleteModule = (module: StudioModule) => { const snapshot = course; setUndo({ kind: 'module', id: module.id, snapshot }); onCourse({ ...course, modules: course.modules.filter((item) => item.id !== module.id) }); setToast('حُذفت الوحدة مؤقتًا. لديك 8 ثوانٍ للتراجع.'); window.setTimeout(() => setUndo((current) => { if (current?.id === module.id) { void deleteStudioModule(module.id); return null; } return current; }), 8000); };
  const deleteLesson = (module: StudioModule, lesson: StudioLesson) => { const snapshot = course; setUndo({ kind: 'lesson', id: lesson.id, snapshot }); onCourse({ ...course, modules: course.modules.map((item) => item.id === module.id ? { ...item, lessons: item.lessons.filter((row) => row.id !== lesson.id) } : item) }); setToast('حُذف الدرس مؤقتًا. لديك 8 ثوانٍ للتراجع.'); window.setTimeout(() => setUndo((current) => { if (current?.id === lesson.id) { void deleteStudioLesson(lesson.id); return null; } return current; }), 8000); };
  const moveTouch = async (lesson: StudioLesson, targetId: string) => { const target = course.modules.find((item) => item.id === targetId); const source = course.modules.find((item) => item.lessons.some((row) => row.id === lesson.id)); if (!target || !source || target.id === source.id) return; await moveLessonToModule(lesson, source, target, target.lessons.length); };
  return <section className="studio-curriculum"><div className="studio-curriculum-toolbar"><div><span className="studio-kicker">ورشة المنهج</span><h2>ابنِ الرحلة درسًا بعد درس</h2></div><div><button type="button" className="btn-outline-blue" onClick={() => setExpanded(course.modules.map((module) => module.id))}>توسيع الكل</button><button type="button" className="btn-gold" onClick={() => void addModule()}><Plus size={15} /> إضافة وحدة</button></div></div>{selectedLessonIds.length > 0 && <div className="studio-bulkbar studio-lesson-bulkbar" role="toolbar" aria-label="إجراءات الدروس المحددة"><strong>{selectedLessonIds.length} محدد</strong><button type="button" className="btn-outline-blue" disabled={bulkBusy} onClick={() => void bulkSetPublished(true)}>نشر</button><button type="button" className="btn-outline-blue" disabled={bulkBusy} onClick={() => void bulkSetPublished(false)}>إخفاء</button><select value={bulkTargetModule} disabled={bulkBusy} aria-label="نقل الدروس المحددة إلى وحدة" onChange={(event) => { setBulkTargetModule(event.target.value); if (event.target.value) void bulkMove(event.target.value); }}><option value="">نقل إلى…</option>{course.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select><button type="button" className="icon-action danger" disabled={bulkBusy} onClick={() => void bulkDelete()} aria-label="حذف الدروس المحددة"><Trash2 size={15} /></button></div>}<div className="studio-tree" aria-label="شجرة المنهج">{course.modules.map((module, moduleIndex) => <article key={module.id} className="studio-module-card" draggable onDragStart={() => setDragged({ type: 'module', id: module.id })} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragged?.type === 'module') void reorderModules(course.modules.findIndex((row) => row.id === dragged.id), moduleIndex); if (dragged?.type === 'lesson' && dragged.moduleId !== module.id) { const source = course.modules.find((row) => row.id === dragged.moduleId); const lesson = source?.lessons.find((row) => row.id === dragged.id); if (source && lesson) void moveLessonToModule(lesson, source, module, module.lessons.length); } }}><div className="studio-module-head"><button type="button" className="drag-handle" aria-label="سحب الوحدة"><GripVertical size={16} /></button><button type="button" className="studio-collapse" onClick={() => setExpanded((current) => current.includes(module.id) ? current.filter((id) => id !== module.id) : [...current, module.id])}>{expanded.includes(module.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button><input aria-label="اسم الوحدة" defaultValue={module.title} onDoubleClick={(e) => e.currentTarget.select()} onKeyDown={(e) => { if (e.key === 'F2') e.currentTarget.focus(); if (e.key === 'Enter') { e.currentTarget.blur(); void patchStudioModule(module.id, { title: e.currentTarget.value, expectedUpdatedAt: module.updatedAt }); } }} onBlur={(e) => { if (e.currentTarget.value !== module.title) void patchStudioModule(module.id, { title: e.currentTarget.value, expectedUpdatedAt: module.updatedAt }); }} /><span className="studio-module-count">{module.lessons.length} دروس</span><button type="button" onClick={() => void addLesson(module)} className="icon-action" aria-label="إضافة درس"><Plus size={15} /></button><button type="button" onClick={() => deleteModule(module)} className="icon-action danger" aria-label="حذف الوحدة"><Trash2 size={15} /></button></div>{expanded.includes(module.id) && <div className="studio-lesson-list">{module.lessons.map((lesson, lessonIndex) => <div key={lesson.id} className="studio-lesson-row" tabIndex={0} draggable onKeyDown={(event) => handleLessonKeyDown(event, module, lesson, lessonIndex)} onDragStart={() => setDragged({ type: 'lesson', id: lesson.id, moduleId: module.id })} onDragOver={(e) => e.preventDefault()} onDrop={(event) => { event.stopPropagation(); if (dragged?.type === 'lesson' && dragged.moduleId === module.id) void reorderLessons(module.id, module.lessons.findIndex((row) => row.id === dragged.id), lessonIndex); if (dragged?.type === 'lesson' && dragged.moduleId !== module.id) { const source = course.modules.find((row) => row.id === dragged.moduleId); const moved = source?.lessons.find((row) => row.id === dragged.id); if (source && moved) void moveLessonToModule(moved, source, module, lessonIndex); } }} onDoubleClick={() => openLesson(lesson.id)}><button type="button" className="drag-handle" aria-label="سحب الدرس"><GripVertical size={15} /></button><input type="checkbox" checked={selectedLessonIds.includes(lesson.id)} onChange={() => toggleLessonSelection(lesson.id)} aria-label={`تحديد ${lesson.title || 'الدرس'}`} /><span className={`studio-health-dot ${lesson.kind === 'video' && !lesson.video ? 'is-empty' : lesson.kind === 'video' && lesson.video?.status !== 'ready' ? 'is-processing' : 'is-ready'}`} title={lesson.kind === 'video' && !lesson.video ? 'لا يوجد محتوى' : lesson.video?.status === 'ready' ? 'جاهز' : 'قيد المعالجة'} /><span className="studio-kind-icon">{kindMeta[lesson.kind].icon}</span><button type="button" className="studio-lesson-title" onClick={() => openLesson(lesson.id)}>{lesson.title || 'درس بلا عنوان'}</button><span className="studio-lesson-duration">{lesson.duration || '—'}</span><select aria-label="نقل الدرس إلى وحدة أخرى" value="" onChange={(e) => void moveTouch(lesson, e.target.value)}><option value="">نقل إلى…</option>{course.modules.filter((item) => item.id !== module.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><span className="studio-keyboard-hint" title="Alt+↑/↓ للترتيب، Alt+←/→ للنقل بين الوحدات"><ArrowUp size={11} /><ArrowDown size={11} /></span><button type="button" className="icon-action" onClick={() => void duplicateLesson(module, lesson)} aria-label="نسخ الدرس"><Copy size={14} /></button><button type="button" className="icon-action danger" onClick={() => deleteLesson(module, lesson)} aria-label="حذف الدرس"><Trash2 size={14} /></button></div>)}</div>}</article>)}</div><div className="studio-live-announcer" aria-live="polite">{toast}</div>{undo && <div className="studio-undo-toast"><span>{undo.kind === 'module' ? 'حُذفت الوحدة' : 'حُذف الدرس'}</span><button type="button" onClick={() => { onCourse(undo.snapshot); setUndo(null); setToast('تم التراجع.'); }}>تراجع</button></div>}</section>;
};

const LessonDrawer: React.FC<{ lesson: StudioLesson; course: StudioEditorCourse; onCourse: (course: StudioEditorCourse) => void; close: () => void }> = ({ lesson, course, onCourse, close }) => {
  const [picker, setPicker] = useState(false);
  const [assets, setAssets] = useState<StudioPickerAsset[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceError, setResourceError] = useState('');
  const [resourceBusy, setResourceBusy] = useState(false);
  const [conflict, setConflict] = useState<ApiError | null>(null);
  const applyLesson = (next: StudioLesson) => onCourse(updateLessonInCourse(course, lesson.id, next));
  const saveArticle = useCallback(async (payload: Record<string, unknown>) => { const next = await patchStudioLesson(lesson.id, payload); applyLesson(next); return next; }, [course, lesson.id]);
  const articleAutosave = useAutosave(saveArticle, lesson.updatedAt);
  const patch = async (payload: Record<string, unknown>) => { try { const next = await patchStudioLesson(lesson.id, { ...payload, expectedUpdatedAt: articleAutosave.expectedUpdatedAt ?? lesson.updatedAt }); applyLesson(next); } catch (error) { if (error instanceof ApiError && error.status === 409) setConflict(error); else setResourceError('تعذّر حفظ الدرس.'); } };
  const chooseAsset = async (asset: StudioPickerAsset) => { try { const next = await linkStudioLessonVideo(lesson.id, asset.id); applyLesson(next); setPicker(false); } catch { setResourceError('تعذّر ربط الفيديو.'); } };
  const createLink = async () => { if (!linkTitle.trim() || !linkUrl.trim()) return; try { const asset = await createStudioVideoLink(linkTitle.trim(), linkUrl.trim()); await chooseAsset(asset); setLinkOpen(false); setLinkTitle(''); setLinkUrl(''); } catch { setResourceError('تعذّر إضافة رابط الفيديو.'); } };
  const addResource = async () => { const title = resourceTitle.trim(); const url = resourceUrl.trim(); if (!title || !url) { setResourceError('أدخل عنوان المورد ورابط HTTPS.'); return; } try { if (new URL(url).protocol !== 'https:') throw new Error('https'); } catch { setResourceError('رابط المورد يجب أن يبدأ بـ HTTPS.'); return; } setResourceBusy(true); setResourceError(''); try { const resource = await createStudioLessonResource(lesson.id, { title, url, kind: 'link', order: lesson.resources.length }); applyLesson({ ...lesson, resources: [...lesson.resources, resource] }); setResourceTitle(''); setResourceUrl(''); } catch { setResourceError('تعذّر إضافة المورد.'); } finally { setResourceBusy(false); } };
  const removeResource = async (resource: StudioResource) => { setResourceBusy(true); setResourceError(''); try { await deleteStudioLessonResource(lesson.id, resource.id); applyLesson({ ...lesson, resources: lesson.resources.filter((item) => item.id !== resource.id) }); } catch { setResourceError('تعذّر حذف المورد.'); } finally { setResourceBusy(false); } };
  return <aside className="studio-lesson-drawer" aria-label="محرر الدرس"><div className="studio-drawer-head"><div><span className="studio-kicker">تفاصيل الدرس</span><h2>{lesson.title || 'درس بلا عنوان'}</h2></div><button type="button" onClick={close} aria-label="إغلاق الدرس"><X size={18} /></button></div><div className="studio-drawer-body"><label>العنوان<input value={lesson.title} onChange={(e) => onCourse(updateLessonInCourse(course, lesson.id, { ...lesson, title: e.target.value }))} onBlur={() => void patch({ title: lesson.title })} /></label><label>نوع الدرس<select value={lesson.kind} onChange={(e) => void patch({ kind: e.target.value })}>{Object.entries(kindMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></label>{lesson.kind === 'video' && <section className="studio-drawer-section"><div className="studio-drawer-section-title"><strong>الفيديو</strong><button type="button" className="btn-outline-blue" onClick={() => { setPicker(true); void fetchStudioPickerAssets().then((result) => setAssets(result.items)).catch(() => setAssets([])); }}>اختيار فيديو</button></div>{lesson.video ? <div className="studio-asset-card"><span className={`studio-status-dot status-${lesson.video.status}`} /><div><strong>{lesson.video.title}</strong><small>{lesson.video.status} · {lesson.video.playbackMode || '—'} · {lesson.video.protection || '—'}</small></div></div> : <p className="studio-muted">لا يوجد فيديو مرتبط بعد.</p>}<button type="button" className="studio-link-affordance" onClick={() => setLinkOpen((open) => !open)}><Link2 size={15} /> إضافة رابط فيديو</button>{linkOpen && <div className="studio-link-form"><input placeholder="عنوان الرابط" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} /><input type="url" placeholder="https://youtube.com/…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} /><button type="button" className="btn-gold" onClick={() => void createLink()}>إضافة الرابط</button></div>}</section>}{lesson.kind === 'article' && <><MarkdownEditor id={`lesson-${lesson.id}`} value={lesson.content || ''} maxLength={60000} label="محتوى المقال" placeholder="اكتب المقال هنا…" onChange={(value) => { applyLesson({ ...lesson, content: value }); articleAutosave.queue({ content: value }); }} /><SaveStateChip state={articleAutosave.state} /></>}{lesson.kind === 'article' && <label>الملخص<textarea value={lesson.summary || ''} maxLength={50000} onChange={(e) => onCourse(updateLessonInCourse(course, lesson.id, { ...lesson, summary: e.target.value }))} onBlur={() => void patch({ summary: lesson.summary })} /></label>}<label className="studio-switch-row"><input type="checkbox" checked={lesson.isFreePreview} onChange={(e) => void patch({ isFreePreview: e.target.checked })} /> معاينة مجانية <span title="يمكن للزوار مشاهدة هذا الدرس قبل التسجيل">ⓘ</span></label><label className="studio-switch-row"><input type="checkbox" checked={lesson.isPublished} onChange={(e) => void patch({ isPublished: e.target.checked })} /> منشور في المنهج</label><section className="studio-drawer-section"><div className="studio-drawer-section-title"><strong>الموارد</strong><span className="studio-drawer-meta">روابط HTTPS فقط</span></div>{lesson.resources.length ? <ul className="studio-resource-editor-list">{lesson.resources.map((resource) => <li key={resource.id}><a href={resource.url} target="_blank" rel="noopener noreferrer nofollow">{resource.title}</a><button type="button" className="icon-action danger" disabled={resourceBusy} onClick={() => void removeResource(resource)} aria-label={`حذف ${resource.title}`}><Trash2 size={14} /></button></li>)}</ul> : <p className="studio-muted">لا توجد موارد مرتبطة بهذا الدرس.</p>}<div className="studio-link-form"><input value={resourceTitle} placeholder="عنوان المورد" onChange={(e) => setResourceTitle(e.target.value)} /><input type="url" value={resourceUrl} placeholder="https://…" onChange={(e) => setResourceUrl(e.target.value)} /><button type="button" className="btn-outline-blue" disabled={resourceBusy} onClick={() => void addResource()}>{resourceBusy ? 'جارٍ الحفظ…' : 'إضافة مورد'}</button></div>{resourceError && <p className="studio-muted" role="alert">{resourceError}</p>}</section>{lesson.durationSeconds > 0 || (lesson.video?.durationSeconds || 0) > 0 ? <div className="studio-drawer-meta">المدة: <b>{lesson.duration || 'غير معروفة'}</b> <span>تُشتق من الأصل عند توفره.</span></div> : <label>المدة اليدوية (عند عدم توفر مدة من الفيديو)<input value={lesson.duration || ''} maxLength={20} placeholder="مثال: 12:30" onChange={(e) => applyLesson({ ...lesson, duration: e.target.value })} onBlur={() => void patch({ duration: lesson.duration })} /><small className="studio-muted">هذه قيمة إرشادية فقط، وتختفي عند توفر مدة أصل الفيديو.</small></label>}</div>{picker && <div className="studio-modal-scrim" role="presentation"><div className="studio-modal studio-picker-modal" role="dialog" aria-modal="true" aria-labelledby="picker-title"><div className="studio-modal-head"><h2 id="picker-title">اختيار فيديو</h2><button type="button" onClick={() => setPicker(false)} aria-label="إغلاق"><X size={17} /></button></div><div className="studio-picker-list">{assets.length ? assets.map((asset) => <button type="button" className="studio-picker-row" key={asset.id} onClick={() => void chooseAsset(asset)}><span className={`studio-status-dot status-${asset.status}`} /><span><strong>{asset.title}</strong><small>{asset.status} · {asset.playbackMode || '—'} · {asset.protection || '—'}</small></span><span className="studio-picker-action">اختيار</span></button>) : <p className="studio-muted">لا توجد أصول فيديو جاهزة في مكتبتك بعد. يمكنك إضافة رابط خارجي.</p>}</div></div></div>}</aside>{(articleAutosave.conflict || conflict) && <ConflictDialog error={articleAutosave.conflict || conflict} onClose={() => { articleAutosave.clearConflict(); setConflict(null); }} onReload={() => window.location.reload()} />}</>;
};

const QuizzesTab: React.FC<{ course: StudioEditorCourse }> = ({ course }) => <section className="studio-editor-panel"><div className="studio-panel-title"><div><span className="studio-kicker">الاختبارات</span><h2>مخطط القياس</h2></div><ListChecks size={18} /></div>{course.quizzes.length ? <div className="studio-quiz-list">{course.quizzes.map((quiz) => <div className="studio-quiz-row" key={quiz.id}><strong>{quiz.title}</strong><span>{quiz.kind}</span><span>{quiz.questionCount} سؤال</span><span>{quiz.attemptsCount} محاولة</span></div>)}</div> : <ComingTab title="منشئ الاختبارات قادم في المرحلة التالية" text="ستظهر هنا اختبارات الممارسة والدرس والامتحان مع إبقاء صلاحيات الإنشاء على الخادم." />}</section>;
const ComingTab: React.FC<{ title: string; text: string }> = ({ title, text }) => <section className="studio-coming"><Sparkles size={22} /><h2>{title}</h2><p>{text}</p></section>;
const TeamTab: React.FC<{ course: StudioEditorCourse; onCourse: (course: StudioEditorCourse) => void }> = ({ course }) => { const [userId, setUserId] = useState(''); const [kind, setKind] = useState('co_instructor'); return <section className="studio-editor-panel"><div className="studio-panel-title"><div><span className="studio-kicker">الفريق</span><h2>من يملك مفاتيح الورشة؟</h2></div><Users size={18} /></div><div className="studio-staff-list">{course.staff.map((member) => <div className="studio-staff-row" key={member.id}><span className="studio-avatar">{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.kind === 'co_instructor' ? 'محرر مشارك' : member.kind === 'assistant' ? 'مساعد' : 'مالك الدورة'}</small></div></div>)}</div><div className="studio-staff-add"><input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="معرّف مستخدم studio.access" /><select value={kind} onChange={(e) => setKind(e.target.value)}><option value="co_instructor">محرر مشارك</option><option value="assistant">مساعد</option></select><button type="button" className="btn-outline-blue" onClick={() => { if (!userId.trim()) return; void addStudioStaff(course.slug, userId.trim(), kind).then(() => window.location.reload()); }}>إضافة</button></div></section>; };
const PublishTab: React.FC<{ course: StudioEditorCourse; onAction: () => void }> = ({ course, onAction }) => <section className="studio-publish-layout"><div className="studio-astrolabe"><ReadinessRing value={course.checklist.completeness} size={164} /><span className="studio-kicker">جاهزية النشر</span><strong>{course.checklist.ready ? 'المسار مستعد' : 'هناك نقاط تحتاج انتباهًا'}</strong></div><div className="studio-editor-panel"><div className="studio-panel-title"><div><span className="studio-kicker">قائمة التحقق</span><h2>قبل أن تفتح الدورة أبوابها</h2></div></div><div className="studio-issues">{course.checklist.issues.map((issue) => <a key={`${issue.code}-${issue.target}`} className={`studio-issue studio-issue-${issue.severity}`} href={`#${issue.target.replace(':', '-')}`}><CircleAlert size={15} /><span>{issue.message}</span><small>{issue.target}</small></a>)}</div><button type="button" className="btn-gold" disabled={!course.checklist.ready} onClick={onAction}>{course.status === 'in_review' ? 'نشر الآن' : 'إرسال للمراجعة'}</button>{course.reviewNote && <div className="studio-review-note">ملاحظة المراجع: {course.reviewNote}</div>}</div></section>;
const SettingsTab: React.FC<{ course: StudioEditorCourse; onCourse: (course: StudioEditorCourse) => void; onDeleted: () => void }> = ({ course, onCourse, onDeleted }) => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const staffMembership = course.staff.find((member) => member.id === user?.id)?.kind;
  const canArchive = can(user, 'courses.publish') && (can(user, 'courses.edit_any') || staffMembership === 'owner' || staffMembership === 'co_instructor') && course.status === 'published';
  const canDelete = can(user, 'courses.delete_any') || (can(user, 'courses.delete_own') && staffMembership === 'owner');
  const archive = async () => {
    setBusy(true); setError('');
    try { onCourse(await unpublishStudioCourse(course.slug)); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'تعذّر أرشفة الدورة.'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (confirmation !== course.title) return;
    setBusy(true); setError('');
    try { await deleteStudioCourse(course.slug); onDeleted(); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'تعذّر حذف الدورة.'); setBusy(false); }
  };
  return <section className="studio-editor-panel"><div className="studio-panel-title"><div><span className="studio-kicker">الإعدادات</span><h2>حدود الدورة</h2></div><Settings size={18} /></div><label>المعرّف العام<input value={course.slug} disabled={course.status !== 'draft'} onChange={(e) => onCourse({ ...course, slug: e.target.value })} /><small>{course.status === 'draft' ? 'يمكن تعديله حتى أول نشر.' : 'مقفل بعد أول نشر للحفاظ على الروابط.'}</small></label><div className="studio-setting-warning"><LockKeyhole size={16} /> لا يمكن حذف دورة لها تسجيلات نشطة؛ الأرشفة تحفظ وصول المسجلين.</div><div className="studio-settings-actions"><div><h3>إجراءات دورة خطرة</h3><p className="studio-muted">تتحقق الخوادم من الملكية والتسجيلات قبل أي تغيير.</p></div>{canArchive && <button type="button" className="btn-outline-blue" disabled={busy} onClick={() => void archive()}>إلغاء النشر / أرشفة</button>}{canDelete && <button type="button" className="btn-outline-danger" disabled={busy} onClick={() => { setDeleteOpen(true); setConfirmation(''); }}>حذف الدورة</button>}{!canArchive && !canDelete && <p className="studio-muted">لا تملك صلاحية الأرشفة أو الحذف لهذه الدورة.</p>}</div>{error && <p className="studio-form-error" role="alert">{error}</p>}<div className="studio-setting-warning studio-setting-muted"><LockKeyhole size={16} /> نقل الملكية غير متاح هنا: لا يوفّر الخادم عقدًا آمنًا لنقل الملكية، لذلك لم يُضف هذا الإجراء.</div>{deleteOpen && <div className="studio-inline-confirm"><strong>اكتب عنوان الدورة حرفيًا للتأكيد</strong><input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder={course.title} /><div><button type="button" className="btn-outline-blue" onClick={() => setDeleteOpen(false)}>إلغاء</button><button type="button" className="btn-outline-danger" disabled={busy || confirmation !== course.title} onClick={() => void remove()}>تأكيد الحذف</button></div></div>}</section>;
};
const ConflictDialog: React.FC<{ error: ApiError | null; onClose: () => void; onReload: () => void }> = ({ error, onClose, onReload }) => <div className="studio-modal-scrim" role="presentation"><div className="studio-modal studio-conflict-modal" role="dialog" aria-modal="true"><div className="studio-modal-head"><h2>تعارض في التعديل</h2><button type="button" onClick={onClose} aria-label="إغلاق"><X size={17} /></button></div><p>{error?.message || 'تغيّر هذا الحقل في نافذة أخرى.'}</p><div className="studio-conflict-actions"><button type="button" className="btn-outline-blue" onClick={onClose}>الاحتفاظ بنسختي</button><button type="button" className="btn-gold" onClick={onReload}>استخدام نسخة الخادم</button></div></div></div>;
