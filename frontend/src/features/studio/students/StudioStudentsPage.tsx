import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search, UserRound, X } from "lucide-react";
import { useAuth } from "@/features/auth/context/authContext";
import { can } from "@/shared/lib/permissions";
import { ApiError } from "@/shared/lib/apiClient";
import { StudioShell } from "@/features/studio/components/layout/StudioShell";
import {
  createStudentNote,
  downloadStudentsCsv,
  fetchStudentCourses,
  fetchStudentDetail,
  fetchStudents,
  grantStudentAttempt,
  nudgeStudent,
  type StudentCourseOption,
  type StudentDetail,
  type StudentRosterPage,
  type StudentRosterRow,
} from "./studentsApi";
import "./students.css";

const EMPTY_PAGE: StudentRosterPage = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
};
const STATUS_LABELS: Record<StudentRosterRow["status"], string> = {
  active: "نشط",
  struggling: "متعثّر",
  completed: "أنهى",
};

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function initials(
  row: Pick<StudentRosterRow, "name" | "avatarInitials">,
): string {
  return row.avatarInitials || row.name.trim().slice(0, 2) || "ط";
}

const StudentAvatar: React.FC<{
  student: Pick<StudentRosterRow, "name" | "avatarUrl" | "avatarInitials">;
}> = ({ student }) =>
  student.avatarUrl ? (
    <img className="studio-students-avatar" src={student.avatarUrl} alt="" />
  ) : (
    <span className="studio-students-avatar studio-students-avatar-fallback">
      {initials(student)}
    </span>
  );

const StatusChip: React.FC<{ status: StudentRosterRow["status"] }> = ({
  status,
}) => (
  <span className={`studio-students-status studio-students-status-${status}`}>
    {STATUS_LABELS[status]}
  </span>
);

const StudentDrawer: React.FC<{
  student: StudentRosterRow;
  canGrant: boolean;
  onClose: () => void;
  onChanged: () => void;
}> = ({ student, canGrant, onClose, onChanged }) => {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetchStudentDetail(student.id, student.course.slug)
      .then((value) => {
        if (mounted) setDetail(value);
      })
      .catch((reason) => {
        if (mounted)
          setError(
            reason instanceof ApiError
              ? reason.message
              : "تعذّر تحميل تفاصيل الطالب.",
          );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [student.id, student.course.slug]);

  const sendNudge = async () => {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await nudgeStudent(student.id, student.course.slug);
      setNotice("أُرسل التنبيه للطالب. لا يمكن تكراره قبل 24 ساعة.");
      onChanged();
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر إرسال التنبيه.",
      );
    } finally {
      setBusy(false);
    }
  };

  const grantAttempt = async (quizId: string) => {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await grantStudentAttempt(student.id, student.course.slug, quizId);
      setNotice("مُنحت محاولة إضافية لهذا الاختبار.");
      onChanged();
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر منح المحاولة.",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    const body = noteDraft.trim();
    if (!body) return;
    setNoteSaving(true);
    setError("");
    setNotice("");
    try {
      const note = await createStudentNote(
        student.id,
        student.course.slug,
        body,
      );
      setDetail((current) =>
        current ? { ...current, notes: [note, ...current.notes] } : current,
      );
      setNoteDraft("");
      setNotice("حُفظت الملاحظة لفريق التدريس فقط.");
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر حفظ الملاحظة.",
      );
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <aside
      className="studio-students-drawer"
      aria-label={`تفاصيل ${student.name}`}
    >
      <header className="studio-students-drawer-head">
        <div className="studio-students-drawer-person">
          <StudentAvatar student={student} />
          <div>
            <span className="studio-students-kicker">ملف الطالب</span>
            <h2>{student.name}</h2>
          </div>
        </div>
        <button
          type="button"
          className="studio-students-icon-button"
          aria-label="إغلاق"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div className="studio-students-drawer-body">
        {loading && (
          <div className="studio-students-loading">
            جارٍ تحميل المسار التعليمي…
          </div>
        )}
        {error && (
          <p className="studio-students-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="studio-students-notice" role="status">
            {notice}
          </p>
        )}
        {detail && (
          <>
            <section className="studio-students-detail-summary">
              <div>
                <span>التقدم</span>
                <strong>{detail.progress}%</strong>
              </div>
              <div>
                <span>الدورة</span>
                <strong>{detail.course.title}</strong>
              </div>
              <div>
                <span>البريد</span>
                <strong dir="ltr">{detail.email || "—"}</strong>
              </div>
            </section>
            <section className="studio-students-drawer-section">
              <div className="studio-students-section-title">
                <h3>تقدم الدروس</h3>
                <span>
                  {detail.lessons.filter((lesson) => lesson.completed).length}/
                  {detail.lessons.length} مكتمل
                </span>
              </div>
              <div className="studio-students-lesson-list">
                {detail.lessons.length ? (
                  detail.lessons.map((lesson) => (
                    <div className="studio-students-lesson-row" key={lesson.id}>
                      <span
                        className={
                          lesson.completed
                            ? "studio-students-check is-complete"
                            : "studio-students-check"
                        }
                        aria-hidden="true"
                      >
                        {lesson.completed ? "✓" : ""}
                      </span>
                      <div>
                        <strong>{lesson.title}</strong>
                        <small>
                          {lesson.moduleTitle} ·{" "}
                          {lesson.completed ? "مكتمل" : "لم يكتمل بعد"}
                        </small>
                      </div>
                      <time>{formatDate(lesson.updatedAt)}</time>
                    </div>
                  ))
                ) : (
                  <p className="studio-students-muted">
                    لا توجد دروس مسجلة لهذه الدورة.
                  </p>
                )}
              </div>
            </section>
            <section className="studio-students-drawer-section">
              <div className="studio-students-section-title">
                <h3>محاولات الاختبارات</h3>
                <span>{detail.attempts.length} محاولة</span>
              </div>
              <div className="studio-students-attempt-list">
                {detail.attempts.length ? (
                  detail.attempts.map((attempt) => (
                    <div
                      className="studio-students-attempt-row"
                      key={attempt.id}
                    >
                      <div>
                        <strong>{attempt.quizTitle}</strong>
                        <small>
                          {attempt.percent == null
                            ? "غير مصححة"
                            : `${attempt.percent}%`}{" "}
                          · {attempt.passed ? "ناجح" : "لم ينجح"}
                        </small>
                      </div>
                      {canGrant && (
                        <button
                          type="button"
                          className="btn-outline-blue"
                          disabled={busy}
                          onClick={() => void grantAttempt(attempt.quizId)}
                        >
                          منح محاولة
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="studio-students-muted">
                    لا توجد محاولات مكتملة.
                  </p>
                )}
              </div>
            </section>
            <section className="studio-students-drawer-section">
              <div className="studio-students-section-title">
                <h3>ملاحظات</h3>
                <span>خاصة بفريق التدريس</span>
              </div>
              <label className="studio-students-note-composer">
                <span className="sr-only">ملاحظة خاصة بفريق التدريس</span>
                <textarea
                  value={noteDraft}
                  maxLength={2000}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="سجّل ملاحظة داخلية عن متابعة الطالب…"
                />
              </label>
              <button
                type="button"
                className="btn-outline-blue"
                disabled={noteSaving || !noteDraft.trim()}
                onClick={() => void saveNote()}
              >
                {noteSaving ? "جارٍ حفظ الملاحظة…" : "حفظ ملاحظة داخلية"}
              </button>
              {detail.notes.length ? (
                detail.notes.map((note) => (
                  <article className="studio-students-note" key={note.id}>
                    <p>{note.body}</p>
                    <small>
                      {note.authorName} · {formatDate(note.createdAt)}
                    </small>
                  </article>
                ))
              ) : (
                <p className="studio-students-muted">
                  لا توجد ملاحظات محفوظة بعد.
                </p>
              )}
            </section>
            <footer className="studio-students-drawer-actions">
              <button
                type="button"
                className="btn-gold"
                disabled={busy}
                onClick={() => void sendNudge()}
              >
                تنبيه / تشجيع
              </button>
              <button
                type="button"
                className="btn-outline-blue"
                onClick={onClose}
              >
                إغلاق
              </button>
            </footer>
          </>
        )}
      </div>
    </aside>
  );
};

const StudentRow: React.FC<{
  student: StudentRosterRow;
  onOpen: (student: StudentRosterRow) => void;
}> = ({ student, onOpen }) => (
  <button
    type="button"
    className="studio-students-row"
    onClick={() => onOpen(student)}
  >
    <span className="studio-students-person">
      <StudentAvatar student={student} />
      <span>
        <strong>{student.name}</strong>
        <small dir="ltr">{student.email}</small>
      </span>
    </span>
    <span className="studio-students-course">{student.course.title}</span>
    <span className="studio-students-progress">
      <b>{student.progress}%</b>
      <span className="studio-students-progress-track">
        <i
          style={{ width: `${Math.max(0, Math.min(100, student.progress))}%` }}
        />
      </span>
      <small>
        {student.completedLessons}/{student.totalLessons} درس
      </small>
    </span>
    <span>{formatDate(student.lastActive)}</span>
    <span>
      {student.quizAverage == null
        ? "—"
        : `${Math.round(student.quizAverage)}%`}
    </span>
    <StatusChip status={student.status} />
  </button>
);

const StudioStudentsContent: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<StudentCourseOption[]>([]);
  const [page, setPage] = useState<StudentRosterPage>(EMPTY_PAGE);
  const [course, setCourse] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<StudentRosterRow | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const canView =
    can(user, "students.view_own") || can(user, "students.view_any");
  const canGrant = can(user, "quizzes.reset_attempts");
  const canViewAny = can(user, "students.view_any");
  const params = useMemo(
    () => ({
      course: course || undefined,
      q: query || undefined,
      status: status || undefined,
      sort,
      page: currentPage,
    }),
    [course, query, status, sort, currentPage],
  );

  // Loading is derived from the key stored with the last resolved fetch, so a
  // filter or page change restores the loading state without a sync setState.
  const [loadedKey, setLoadedKey] = useState("");
  const rosterKey = `${canView}#${params.course ?? ""}#${params.q ?? ""}#${params.status ?? ""}#${params.sort}#${params.page}`;
  const loading = loadedKey !== rosterKey;

  const load = useCallback(() => {
    return fetchStudents(params)
      .then(setPage)
      .catch((reason) =>
        setError(
          reason instanceof ApiError
            ? reason.message
            : "تعذّر تحميل قائمة الطلاب.",
        ),
      )
      .finally(() => setLoadedKey(rosterKey));
  }, [params, rosterKey]);

  useEffect(() => {
    if (canView)
      void fetchStudentCourses()
        .then((result) => setCourses(result.items))
        .catch(() => setCourses([]));
  }, [canView]);
  useEffect(() => {
    if (canView) void load();
  }, [canView, load]);

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };
  const exportCsv = async () => {
    setExporting(true);
    setError("");
    try {
      await downloadStudentsCsv(params);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذّر تصدير القائمة.",
      );
    } finally {
      setExporting(false);
    }
  };

  if (!canView)
    return (
      <StudioShell>
        <div className="studio-students-denied" role="alert">
          <UserRound size={28} />
          <h1>لا تملك صلاحية عرض الطلاب</h1>
          <p>اطلب من مسؤول الأكاديمية منحك صلاحية students.view_own.</p>
        </div>
      </StudioShell>
    );

  return (
    <StudioShell>
      <div className="studio-students-page">
        <header className="studio-students-head">
          <div>
            <span className="studio-students-kicker">مرصد التعلّم</span>
            <h1>الطلاب</h1>
            <p>
              تابع تقدّم المتعلّمين وتدخّل في الوقت المناسب، مع حماية بياناتهم
              الشخصية.
            </p>
          </div>
          <button
            type="button"
            className="btn-outline-blue"
            disabled={exporting}
            onClick={() => void exportCsv()}
          >
            <Download size={16} />
            {exporting ? "جارٍ التصدير…" : "تصدير CSV"}
          </button>
        </header>
        <section
          className="studio-students-toolbar"
          aria-label="تصفية قائمة الطلاب"
        >
          <label className="studio-students-search">
            <Search size={16} />
            <input
              value={query}
              placeholder={
                canViewAny ? "ابحث باسم الطالب أو البريد…" : "ابحث باسم الطالب…"
              }
              onChange={(event) => updateFilter(setQuery, event.target.value)}
            />
          </label>
          <select
            aria-label="اختيار الدورة"
            value={course}
            onChange={(event) => updateFilter(setCourse, event.target.value)}
          >
            <option value="">كل دوراتي</option>
            {courses.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title} · {item.enrolledCount}
              </option>
            ))}
          </select>
          <select
            aria-label="تصفية حسب الحالة"
            value={status}
            onChange={(event) => updateFilter(setStatus, event.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="struggling">متعثر</option>
            <option value="completed">أنهى</option>
          </select>
          <select
            aria-label="ترتيب القائمة"
            value={sort}
            onChange={(event) => updateFilter(setSort, event.target.value)}
          >
            <option value="name">الاسم</option>
            <option value="progress">التقدم</option>
            <option value="lastActive">آخر نشاط</option>
            <option value="quizAverage">متوسط الاختبارات</option>
          </select>
        </section>
        {error && (
          <p className="studio-students-error" role="alert">
            {error}
          </p>
        )}
        <section className="studio-students-card" aria-label="قائمة الطلاب">
          <div className="studio-students-table-head">
            <span>الطالب</span>
            <span>الدورة</span>
            <span>التقدم</span>
            <span>آخر نشاط</span>
            <span>متوسط الاختبارات</span>
            <span>الحالة</span>
          </div>
          {loading ? (
            <div className="studio-students-loading">جارٍ تحميل القائمة…</div>
          ) : page.items.length ? (
            page.items.map((student) => (
              <StudentRow
                key={`${student.id}-${student.course.slug}`}
                student={student}
                onOpen={setSelected}
              />
            ))
          ) : (
            <div className="studio-students-empty">
              <UserRound size={30} />
              <h2>لا توجد نتائج</h2>
              <p>غيّر الدورة أو معايير البحث لتظهر قائمة المتعلّمين.</p>
            </div>
          )}
        </section>
        <footer className="studio-students-pagination">
          <span>
            {page.total ? `${page.total} طالب` : "لا طلاب"}
            {canViewAny ? " · عرض شامل" : " · بيانات الدورات المملوكة فقط"}
          </span>
          <div>
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((value) => value - 1)}
            >
              السابق
            </button>
            <strong>
              صفحة {page.page} من{" "}
              {Math.max(1, Math.ceil(page.total / page.pageSize))}
            </strong>
            <button
              type="button"
              disabled={
                currentPage >= Math.ceil(page.total / page.pageSize) || loading
              }
              onClick={() => setCurrentPage((value) => value + 1)}
            >
              التالي
            </button>
          </div>
        </footer>
        {/* Keyed by student to remount (and reload) the drawer for each selection. */}
        {selected && (
          <StudentDrawer
            key={`${selected.id}#${selected.course.slug}`}
            student={selected}
            canGrant={canGrant}
            onClose={() => setSelected(null)}
            onChanged={() => void load()}
          />
        )}
      </div>
    </StudioShell>
  );
};

export const StudioStudentsPage: React.FC = () => {
  const { user } = useAuth();
  return <StudioStudentsContent key={user?.id ?? "anonymous"} />;
};
