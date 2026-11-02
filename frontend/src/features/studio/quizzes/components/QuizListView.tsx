import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Filter, Plus, Search } from 'lucide-react';
import { useAuth } from '@/features/auth/context/authContext';
import { useNavigate, useSearchParams } from '@/app/routerContext';
import { can } from '@/shared/lib/permissions';
import { ApiError } from '@/shared/lib/apiClient';
import { fetchCourseQuizzes, fetchQuizCourses, fetchQuizStats, createStudioQuiz, type QuizCourseOption, type QuizKind, type QuizStats, type StudioQuiz } from '@/features/studio/quizzes/data/quizFetchers';

interface QuizListRow extends StudioQuiz { course: QuizCourseOption; stats?: QuizStats; }
const KIND_LABELS: Record<QuizKind, string> = { practice: 'تدريب', lesson_quiz: 'اختبار درس', exam: 'اختبار نهائي' };
const metric = (value: number | undefined, suffix = '') => value === undefined ? '—' : `${value.toLocaleString('ar')}${suffix}`;

export const QuizListView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedCourseSlug = params.get('course') || '';
  const [courses, setCourses] = useState<QuizCourseOption[]>([]);
  const [rows, setRows] = useState<QuizListRow[]>([]);
  const [filter, setFilter] = useState({ q: '', course: '', kind: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createCourse, setCreateCourse] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createKind, setCreateKind] = useState<QuizKind>('practice');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const coursePage = await fetchQuizCourses();
      const courseOptions = coursePage.items.map((course) => ({ id: course.id, slug: course.slug, title: course.title }));
      setCourses(courseOptions);
      if (requestedCourseSlug) {
        const requestedCourse = courseOptions.find((course) => course.slug === requestedCourseSlug);
        if (requestedCourse) setFilter((current) => ({ ...current, course: requestedCourse.id }));
      }
      const quizPages = await Promise.all(courseOptions.map(async (course) => {
        const response = await fetchCourseQuizzes(course.slug);
        return response.items.map((quiz) => ({ ...quiz, course }));
      }));
      const all = quizPages.flat();
      if (can(user, 'quizzes.results_own') || can(user, 'quizzes.results_any')) {
        const withStats = await Promise.all(all.map(async (quiz) => {
          try { return { ...quiz, stats: await fetchQuizStats(quiz.id) }; } catch { return quiz; }
        }));
        setRows(withStats);
      } else setRows(all);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'تعذّر تحميل الاختبارات.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [user, requestedCourseSlug]);

  const filtered = useMemo(() => rows.filter((quiz) => {
    const query = filter.q.trim().toLocaleLowerCase();
    return (!query || `${quiz.title} ${quiz.course.title}`.toLocaleLowerCase().includes(query))
      && (!filter.course || quiz.course.id === filter.course)
      && (!filter.kind || quiz.kind === filter.kind)
      && (!filter.status || (filter.status === 'published' ? quiz.isPublished : !quiz.isPublished));
  }), [filter, rows]);

  const createQuiz = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createCourse || createTitle.trim().length < 1) return;
    setCreating(true); setError('');
    try {
      const created = await createStudioQuiz(createCourse, { title: createTitle.trim(), kind: createKind, instructions: '' });
      setCreateOpen(false); setCreateTitle('');
      navigate(`/studio/quizzes/${created.id}`);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'تعذّر إنشاء الاختبار.'); }
    finally { setCreating(false); }
  };

  if (!can(user, 'quizzes.edit_own') && !can(user, 'quizzes.edit_any') && !can(user, 'quizzes.create')) return <section className="quiz-no-permission"><h2>لا تملك صلاحية إدارة الاختبارات</h2><p>اطلب من مسؤول الدورة منحك صلاحية تحرير الاختبارات.</p></section>;
  return <section className="quiz-feature studio-container">
    <header className="quiz-page-head"><div><span className="quiz-eyebrow">مرصد التقييم</span><h1>الاختبارات</h1><p className="quiz-muted">ابنِ أسئلة تقيس التقدم بوضوح، ثم راقب أثرها على المتعلمين.</p></div><div className="quiz-head-actions">{can(user, 'quizzes.create') && <button type="button" className="btn-gold" onClick={() => { setCreateCourse(courses.find((course) => course.id === filter.course)?.slug || courses[0]?.slug || ''); setCreateOpen(true); }}><Plus size={16} /> اختبار جديد</button>}</div></header>
    <div className="quiz-toolbar" role="search" aria-label="تصفية الاختبارات"><label className="quiz-filter-label"><Search size={16} /><input className="quiz-input" value={filter.q} onChange={(event) => setFilter((current) => ({ ...current, q: event.target.value }))} placeholder="ابحث بعنوان الاختبار أو الدورة" /></label><label className="quiz-filter-label"><Filter size={16} /><select className="quiz-select" value={filter.course} aria-label="تصفية حسب الدورة" onChange={(event) => setFilter((current) => ({ ...current, course: event.target.value }))}><option value="">كل الدورات</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><select className="quiz-select" value={filter.kind} aria-label="تصفية حسب النوع" onChange={(event) => setFilter((current) => ({ ...current, kind: event.target.value }))}><option value="">كل الأنواع</option>{Object.entries(KIND_LABELS).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select><select className="quiz-select" value={filter.status} aria-label="تصفية حسب الحالة" onChange={(event) => setFilter((current) => ({ ...current, status: event.target.value }))}><option value="">كل الحالات</option><option value="published">منشور</option><option value="draft">مسودة</option></select></div>
    {error && <p className="studio-form-error" role="alert">{error}</p>}
    {loading ? <div className="quiz-empty" role="status">جارٍ تحميل الاختبارات…</div> : filtered.length === 0 ? <div className="quiz-empty"><BarChart3 size={34} /><h2>لا توجد اختبارات بهذه المعايير</h2><p>اختر دورة أو غيّر التصفية، ثم أنشئ اختبارًا من سياق الدورة المناسب.</p></div> : <div className="quiz-table-wrap"><table className="quiz-table"><thead><tr><th>الاختبار</th><th>النوع</th><th>الأسئلة</th><th>المحاولات</th><th>نسبة النجاح</th><th>متوسط الدرجة</th><th>الحالة</th></tr></thead><tbody>{filtered.map((quiz) => <tr key={quiz.id} onClick={() => navigate(`/studio/quizzes/${quiz.id}`)}><td><div className="quiz-title-cell"><span className="quiz-health-dot" aria-hidden="true" /><div><strong>{quiz.title}</strong><small>{quiz.course.title}</small></div></div></td><td><span className="quiz-kind-badge">{KIND_LABELS[quiz.kind] || quiz.kind}</span></td><td className="quiz-metric">{quiz.questions.length.toLocaleString('ar')}</td><td className="quiz-metric">{metric(quiz.stats?.attempts)}</td><td className="quiz-metric">{metric(quiz.stats ? quiz.stats.passRate * 100 : undefined, '%')}</td><td className="quiz-metric">{metric(quiz.stats?.meanScore, '%')}</td><td><span className={`quiz-status ${quiz.isPublished ? 'is-published' : ''}`}>{quiz.isPublished ? 'منشور' : 'مسودة'}</span></td></tr>)}</tbody></table></div>}
    {createOpen && <div className="quiz-drawer-scrim" role="presentation" onMouseDown={() => setCreateOpen(false)}><section className="quiz-drawer" role="dialog" aria-modal="true" aria-labelledby="quiz-create-title" onMouseDown={(event) => event.stopPropagation()}><div className="quiz-drawer-head"><h2 id="quiz-create-title">اختبار جديد</h2><button type="button" className="quiz-icon-btn" onClick={() => setCreateOpen(false)} aria-label="إغلاق">×</button></div><form className="quiz-drawer-body" onSubmit={createQuiz}><div className="quiz-field"><label htmlFor="quiz-create-course">الدورة</label><select id="quiz-create-course" value={createCourse} onChange={(event) => setCreateCourse(event.target.value)} required><option value="">اختر دورة</option>{courses.map((course) => <option key={course.id} value={course.slug}>{course.title}</option>)}</select></div><div className="quiz-field"><label htmlFor="quiz-create-title-input">العنوان</label><input id="quiz-create-title-input" value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} required maxLength={160} placeholder="مثال: أساسيات الجبر" /></div><div className="quiz-field"><label htmlFor="quiz-create-kind">النوع</label><select id="quiz-create-kind" value={createKind} onChange={(event) => setCreateKind(event.target.value as QuizKind)}><option value="practice">تدريب</option><option value="lesson_quiz">اختبار درس</option><option value="exam">اختبار نهائي</option></select></div><button className="btn-gold" type="submit" disabled={creating || !createCourse}>{creating ? 'جارٍ الإنشاء…' : 'إنشاء وفتح المحرر'}</button></form></section></div>}
  </section>;
};
