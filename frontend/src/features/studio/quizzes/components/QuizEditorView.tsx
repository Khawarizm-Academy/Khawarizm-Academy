import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  GripVertical,
  Settings2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/context/authContext";
import { can } from "@/shared/lib/permissions";
import { ApiError } from "@/shared/lib/apiClient";
import {
  createQuizQuestion,
  deleteQuizQuestion,
  fetchStudioQuiz,
  importQuizQuestions,
  publishStudioQuiz,
  reorderQuizQuestions,
  updateQuizQuestion,
  updateStudioQuiz,
  type QuizImportResult,
  type QuizQuestion,
  type StudioQuiz,
} from "@/features/studio/quizzes/data/quizFetchers";
import { QuizQuestionForm } from "./QuizQuestionForm";
import { isQuestionValid } from "@/features/studio/quizzes/data/quizValidation";
import { QuizResultsView } from "./QuizResultsView";

const kindLabel: Record<string, string> = {
  single: "اختيار واحد",
  multiple: "اختيار متعدد",
  true_false: "صح / خطأ",
};
const quizPayload = (quiz: StudioQuiz) => ({
  title: quiz.title,
  kind: quiz.kind,
  instructions: quiz.instructions,
  lessonId: quiz.lessonId,
  timeLimitMinutes: quiz.timeLimitMinutes,
  passThreshold: quiz.passThreshold,
  maxAttempts: quiz.maxAttempts,
  drawCount: quiz.drawCount,
  shuffleQuestions: quiz.shuffleQuestions,
  shuffleOptions: quiz.shuffleOptions,
  revealPolicy: quiz.revealPolicy,
  unlockProgressPercent: quiz.unlockProgressPercent,
});

const ImportPanel: React.FC<{
  quizId: string;
  onImported: (count: number) => void;
}> = ({ quizId, onImported }) => {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<QuizImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const readFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result || ""));
    reader.readAsText(file);
  };
  const dryRun = async (commit = false) => {
    setBusy(true);
    setError("");
    try {
      const next = await importQuizQuestions(quizId, csv, !commit);
      setResult(next);
      if (commit) onImported(next.committed);
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر تحليل ملف CSV.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="quiz-results-panel">
      <div className="quiz-panel-title">
        <div>
          <h2>استيراد CSV</h2>
          <p className="quiz-muted">
            حمّل القالب، ثم عاين أخطاء كل صف قبل الالتزام.
          </p>
        </div>
        <label className="btn-outline-blue">
          اختيار ملف
          <input
            hidden
            type="file"
            accept=".csv,text/csv"
            onChange={readFile}
          />
        </label>
      </div>
      <div className="quiz-import-grid">
        <div className="quiz-field">
          <label htmlFor="quiz-import-csv">CSV</label>
          <textarea
            id="quiz-import-csv"
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            placeholder="kind,prompt,code,explanation,hint,points,partialCredit,options"
            rows={9}
          />
          <div className="quiz-actions">
            <button
              type="button"
              className="btn-outline-blue"
              onClick={() => {
                const template =
                  'kind,prompt,code,explanation,hint,points,partialCredit,options\nsingle,ما نتيجة 2+2؟,,, ,1,false,"[{""label"":""4"",""isCorrect"":true},{""label"":""5"",""isCorrect"":false}]"';
                const blob = new Blob([template], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "quiz-template.csv";
                anchor.click();
                URL.revokeObjectURL(url);
              }}
            >
              تنزيل القالب
            </button>
            <button
              type="button"
              className="btn-gold"
              disabled={!csv.trim() || busy}
              onClick={() => void dryRun(false)}
            >
              فحص جاف
            </button>
          </div>
        </div>
        <div className="quiz-import-table">
          {result ? (
            <>
              <p>
                صالح: {result.valid.toLocaleString("ar")} · ملتزم:{" "}
                {result.committed.toLocaleString("ar")}
              </p>
              {result.errors.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>الصف</th>
                      <th>الأخطاء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((item) => (
                      <tr key={item.row}>
                        <td>{item.row}</td>
                        <td className="quiz-error-text">
                          {item.errors.join("، ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="quiz-muted">
                  لا توجد أخطاء. يمكنك الالتزام بالصفوف الصالحة.
                </p>
              )}
              {result.dryRun && result.valid > 0 && (
                <button
                  type="button"
                  className="btn-gold"
                  disabled={busy}
                  onClick={() => void dryRun(true)}
                >
                  التزام {result.valid.toLocaleString("ar")} صف
                </button>
              )}
            </>
          ) : (
            <p className="quiz-muted">ستظهر هنا أخطاء كل صف بعد الفحص.</p>
          )}
          {error && (
            <p className="studio-form-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

const SettingsDrawer: React.FC<{
  quiz: StudioQuiz;
  onClose: () => void;
  onSaved: (quiz: StudioQuiz) => void;
}> = ({ quiz, onClose, onSaved }) => {
  const [draft, setDraft] = useState(quiz);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      onSaved(await updateStudioQuiz(quiz.id, quizPayload(draft)));
      onClose();
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر حفظ الإعدادات.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="quiz-drawer-scrim"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        className="quiz-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="quiz-drawer-head">
          <h2 id="quiz-settings-title">إعدادات الاختبار</h2>
          <button
            type="button"
            className="quiz-icon-btn"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>
        <form className="quiz-drawer-body" onSubmit={save}>
          <label className="quiz-field">
            العنوان
            <input
              value={draft.title}
              maxLength={160}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
            />
          </label>
          <label className="quiz-field">
            تعليمات
            <textarea
              value={draft.instructions}
              onChange={(event) =>
                setDraft({ ...draft, instructions: event.target.value })
              }
            />
          </label>
          <label className="quiz-field">
            الوقت بالدقائق
            <input
              type="number"
              min={0}
              max={600}
              value={draft.timeLimitMinutes ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  timeLimitMinutes: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
            />
            <small>اتركه فارغًا لاختبار بلا مؤقت.</small>
          </label>
          <label className="quiz-field">
            حد النجاح{" "}
            <span className="quiz-range-value">{draft.passThreshold}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.passThreshold}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  passThreshold: Number(event.target.value),
                })
              }
            />
          </label>
          <label className="quiz-field">
            عدد المحاولات
            <input
              type="number"
              min={1}
              value={draft.maxAttempts ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  maxAttempts: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              placeholder="غير محدود"
            />
          </label>
          <label className="quiz-field">
            حجم السحب من بنك الأسئلة
            <input
              type="number"
              min={1}
              value={draft.drawCount ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  drawCount: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              placeholder={`${quiz.questions.length} سؤال متاح`}
            />
          </label>
          <label className="quiz-switch-row">
            <input
              type="checkbox"
              checked={draft.shuffleQuestions}
              onChange={(event) =>
                setDraft({ ...draft, shuffleQuestions: event.target.checked })
              }
            />{" "}
            خلط ترتيب الأسئلة
          </label>
          <label className="quiz-switch-row">
            <input
              type="checkbox"
              checked={draft.shuffleOptions}
              onChange={(event) =>
                setDraft({ ...draft, shuffleOptions: event.target.checked })
              }
            />{" "}
            خلط ترتيب الخيارات
          </label>
          <label className="quiz-field">
            سياسة كشف الإجابة
            <select
              value={draft.revealPolicy}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  revealPolicy: event.target
                    .value as StudioQuiz["revealPolicy"],
                })
              }
            >
              <option value="never">لا تُكشف الإجابات</option>
              <option value="after_submit">بعد التسليم</option>
              <option value="after_pass">بعد الاجتياز</option>
              <option value="after_close">بعد إغلاق الاختبار</option>
            </select>
            <small>
              {draft.revealPolicy === "never"
                ? "يرى المتعلم النتيجة دون الحلول."
                : draft.revealPolicy === "after_pass"
                  ? "تظهر الحلول لمن اجتاز الاختبار فقط."
                  : draft.revealPolicy === "after_close"
                    ? "تظهر الحلول بعد إغلاق الاختبار."
                    : "تظهر الحلول عند تسليم المحاولة."}
            </small>
          </label>
          <label className="quiz-field">
            نسبة فتح الاختبار
            <input
              type="number"
              min={0}
              max={100}
              value={draft.unlockProgressPercent}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  unlockProgressPercent: Number(event.target.value),
                })
              }
            />
            <small>نسبة إكمال الدورة المطلوبة قبل الإتاحة.</small>
          </label>
          <label className="quiz-field">
            إرفاق بدرس (اختياري)
            <input
              disabled={quiz.kind !== "lesson_quiz"}
              value={draft.lessonId ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, lessonId: event.target.value || null })
              }
              placeholder={
                quiz.kind === "lesson_quiz"
                  ? "معرّف الدرس"
                  : "متاح لاختبار الدرس فقط"
              }
            />
            <small>
              يُرسل مع lesson_quiz إلى الخادم؛ اتركه فارغًا للتمرين العام.
            </small>
          </label>
          {error && (
            <p className="studio-form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn-gold" type="submit" disabled={saving}>
            {saving ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
          </button>
        </form>
      </aside>
    </div>
  );
};

export const QuizEditorView: React.FC<{ quizId: string }> = ({ quizId }) => {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<StudioQuiz | null>(null);
  const [activeId, setActiveId] = useState("");
  const [tab, setTab] = useState<"edit" | "import" | "results">("edit");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [undo, setUndo] = useState<QuizQuestion | null>(null);
  const [, setToast] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // Loading is derived from the key stored with the last resolved fetch.
  const [loadedKey, setLoadedKey] = useState("");
  const loading = loadedKey !== quizId;
  const editable =
    can(user, "quizzes.edit_own") || can(user, "quizzes.edit_any");
  const load = useCallback(() => {
    void fetchStudioQuiz(quizId)
      .then((next) => {
        setQuiz(next);
        setActiveId((current) => current || next.questions[0]?.id || "");
      })
      .catch((reason) =>
        setError(
          reason instanceof ApiError ? reason.message : "تعذّر تحميل الاختبار.",
        ),
      )
      .finally(() => setLoadedKey(quizId));
  }, [quizId]);
  useEffect(() => {
    void load();
  }, [load]);
  const active = useMemo(
    () => quiz?.questions.find((question) => question.id === activeId) || null,
    [quiz, activeId],
  );
  if (!editable)
    return (
      <section className="quiz-feature studio-container">
        <div className="quiz-no-permission">
          <h2>لا تملك صلاحية تحرير هذا الاختبار</h2>
          <p>يمكن لمسؤول الدورة منحك quizzes.edit_own أو quizzes.edit_any.</p>
        </div>
      </section>
    );
  if (loading)
    return (
      <section className="quiz-feature studio-container">
        <div className="quiz-empty">جارٍ تحميل محرر الاختبار…</div>
      </section>
    );
  if (!quiz)
    return (
      <section className="quiz-feature studio-container">
        <div className="quiz-empty">{error || "الاختبار غير موجود."}</div>
      </section>
    );
  const setQuizFromServer = (next: StudioQuiz) => {
    setQuiz(next);
    setActiveId((current) =>
      next.questions.some((question) => question.id === current)
        ? current
        : next.questions[0]?.id || "",
    );
  };
  const addQuestion = async () => {
    setSaving(true);
    setError("");
    try {
      const created = await createQuizQuestion(quiz.id, {
        kind: "single",
        prompt: "سؤال جديد",
        code: "",
        explanation: "",
        hint: "",
        points: 1,
        partialCredit: false,
        options: [
          { label: "الخيار الأول", isCorrect: true, order: 0 },
          { label: "الخيار الثاني", isCorrect: false, order: 1 },
        ],
      });
      setQuiz({ ...quiz, questions: [...quiz.questions, created] });
      setActiveId(created.id);
      setTab("edit");
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر إضافة السؤال.",
      );
    } finally {
      setSaving(false);
    }
  };
  const saveQuestion = async (question: QuizQuestion) => {
    setSaving(true);
    setError("");
    try {
      const saved = await updateQuizQuestion(question.id, {
        kind: question.kind,
        prompt: question.prompt,
        code: question.code,
        explanation: question.explanation,
        hint: question.hint,
        points: question.points,
        partialCredit: question.partialCredit,
        options: question.options.map(({ id, ...option }, order) => ({
          ...(id && !id.startsWith("new-") ? { id } : {}),
          ...option,
          order,
        })),
      });
      setQuiz({
        ...quiz,
        questions: quiz.questions.map((item) =>
          item.id === saved.id ? saved : item,
        ),
      });
      setToast("تم حفظ السؤال.");
      window.setTimeout(() => setToast(""), 2200);
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر حفظ السؤال.",
      );
    } finally {
      setSaving(false);
    }
  };
  const duplicate = async (question: QuizQuestion) => {
    setSaving(true);
    try {
      const created = await createQuizQuestion(quiz.id, {
        kind: question.kind,
        prompt: `${question.prompt}\n\nنسخة`,
        code: question.code,
        explanation: question.explanation,
        hint: question.hint,
        points: question.points,
        partialCredit: question.partialCredit,
        options: question.options.map(({ id: _id, ...option }, order) => ({
          ...option,
          order,
        })),
      });
      const index = quiz.questions.findIndex((item) => item.id === question.id);
      setQuiz({
        ...quiz,
        questions: [
          ...quiz.questions.slice(0, index + 1),
          created,
          ...quiz.questions.slice(index + 1),
        ],
      });
      setActiveId(created.id);
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر نسخ السؤال.",
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = async (question: QuizQuestion) => {
    setSaving(true);
    try {
      await deleteQuizQuestion(question.id);
      const nextQuestions = quiz.questions.filter(
        (item) => item.id !== question.id,
      );
      setQuiz({ ...quiz, questions: nextQuestions });
      setActiveId(
        nextQuestions[
          Math.max(
            0,
            quiz.questions.findIndex((item) => item.id === question.id) - 1,
          )
        ]?.id ||
          nextQuestions[0]?.id ||
          "",
      );
      setUndo(question);
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر حذف السؤال.",
      );
    } finally {
      setSaving(false);
    }
  };
  const restore = async () => {
    if (!undo) return;
    try {
      const restored = await createQuizQuestion(quiz.id, {
        kind: undo.kind,
        prompt: undo.prompt,
        code: undo.code,
        explanation: undo.explanation,
        hint: undo.hint,
        points: undo.points,
        partialCredit: undo.partialCredit,
        options: undo.options.map(({ id: _id, ...option }, order) => ({
          ...option,
          order,
        })),
      });
      setQuiz({ ...quiz, questions: [...quiz.questions, restored] });
      setActiveId(restored.id);
      setUndo(null);
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر التراجع عن الحذف.",
      );
    }
  };
  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= quiz.questions.length) return;
    const ordered = [...quiz.questions];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setQuiz({ ...quiz, questions: ordered });
    try {
      const result = await reorderQuizQuestions(
        quiz.id,
        ordered.map((question) => question.id),
      );
      setQuiz({ ...quiz, questions: result.items });
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "تعذّر حفظ ترتيب الأسئلة.",
      );
      void load();
    }
  };
  const dropQuestion = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const ordered = [...quiz.questions];
    const [moved] = ordered.splice(draggedIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    setQuiz({ ...quiz, questions: ordered });
    void reorderQuizQuestions(
      quiz.id,
      ordered.map((question) => question.id),
    )
      .then((result) => setQuiz({ ...quiz, questions: result.items }))
      .catch((reason) => {
        setError(
          reason instanceof ApiError
            ? reason.message
            : "تعذّر حفظ ترتيب الأسئلة.",
        );
        void load();
      })
      .finally(() => setDraggedIndex(null));
  };
  const keyReorder = (event: React.KeyboardEvent, index: number) => {
    if (!event.altKey || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    void move(index, event.key === "ArrowUp" ? -1 : 1);
  };
  const publish = async () => {
    setValidationIssues([]);
    try {
      setQuiz(await publishStudioQuiz(quiz.id));
      setToast("نُشر الاختبار بعد اجتياز التحقق.");
    } catch (reason) {
      if (reason instanceof ApiError && Array.isArray(reason.fields?.issues))
        setValidationIssues(reason.fields.issues.map(String));
      else
        setError(
          reason instanceof ApiError ? reason.message : "تعذّر نشر الاختبار.",
        );
    }
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(quiz, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quiz-${quiz.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="quiz-feature studio-container">
      <header className="quiz-editor-heading">
        <div>
          <span className="quiz-eyebrow">
            محرر الاختبار · {quiz.isPublished ? "منشور" : "مسودة"}
          </span>
          <h1>{quiz.title}</h1>
          <p className="quiz-subtitle">
            {quiz.questions.length.toLocaleString("ar")} أسئلة ·{" "}
            {kindLabel[quiz.kind] || quiz.kind}
          </p>
        </div>
        <div className="quiz-head-actions">
          <button
            type="button"
            className="btn-outline-blue"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={16} /> الإعدادات
          </button>
          <button
            type="button"
            className="btn-outline-blue"
            onClick={exportJson}
          >
            <Download size={16} /> تصدير JSON
          </button>
          {can(user, "quizzes.edit_own") || can(user, "quizzes.edit_any") ? (
            <button
              type="button"
              className="btn-gold"
              onClick={() => void publish()}
              disabled={quiz.questions.length === 0}
            >
              {quiz.isPublished ? "إعادة التحقق والنشر" : "نشر الاختبار"}
            </button>
          ) : null}
        </div>
      </header>
      {error && (
        <p className="studio-form-error" role="alert">
          {error}
        </p>
      )}
      {validationIssues.length > 0 && (
        <section className="quiz-validation" aria-live="polite">
          <h3>تحقق النشر</h3>
          <ul>
            {validationIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      )}
      <div
        className="quiz-results-tabs"
        role="tablist"
        aria-label="أقسام محرر الاختبار"
      >
        <button
          type="button"
          className={`quiz-tab ${tab === "edit" ? "is-active" : ""}`}
          onClick={() => setTab("edit")}
        >
          الأسئلة
        </button>
        <button
          type="button"
          className={`quiz-tab ${tab === "import" ? "is-active" : ""}`}
          onClick={() => setTab("import")}
        >
          <Upload size={15} /> استيراد CSV
        </button>
        <button
          type="button"
          className={`quiz-tab ${tab === "results" ? "is-active" : ""}`}
          onClick={() => setTab("results")}
        >
          النتائج
        </button>
      </div>
      {tab === "results" ? (
        <QuizResultsView quiz={quiz} />
      ) : tab === "import" ? (
        <ImportPanel quizId={quiz.id} onImported={() => void load()} />
      ) : (
        <div className="quiz-editor-layout">
          <aside className="quiz-question-rail" aria-label="ترتيب الأسئلة">
            <div className="quiz-rail-title">
              <h2>بنك الأسئلة</h2>
              <button
                type="button"
                className="btn-outline-blue"
                onClick={() => void addQuestion()}
                disabled={saving}
              >
                + سؤال
              </button>
            </div>
            <div className="quiz-question-list">
              {quiz.questions.map((question, index) => (
                <div
                  key={question.id}
                  className={`quiz-question-rail-item ${question.id === activeId ? "is-active" : ""}`}
                  tabIndex={0}
                  draggable
                  onDragStart={() => setDraggedIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropQuestion(index)}
                  onKeyDown={(event) => keyReorder(event, index)}
                  onClick={() => setActiveId(question.id)}
                >
                  <GripVertical size={14} />
                  <span className="rail-index">
                    {(index + 1).toLocaleString("ar")}
                  </span>
                  <span
                    className={`quiz-health-dot ${isQuestionValid(question) ? "is-valid" : ""}`}
                    aria-label={
                      isQuestionValid(question) ? "صالح" : "يحتاج مراجعة"
                    }
                  />
                  <span className="rail-text">
                    {question.prompt.replace(/[#*_`]/g, "").trim() ||
                      "سؤال بلا عنوان"}
                  </span>
                  <div className="quiz-rail-item-actions">
                    <button
                      type="button"
                      className="quiz-icon-btn"
                      aria-label="تحريك لأعلى"
                      disabled={index === 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        void move(index, -1);
                      }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="quiz-icon-btn"
                      aria-label="تحريك لأسفل"
                      disabled={index === quiz.questions.length - 1}
                      onClick={(event) => {
                        event.stopPropagation();
                        void move(index, 1);
                      }}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="quiz-icon-btn"
                      aria-label="نسخ السؤال"
                      onClick={(event) => {
                        event.stopPropagation();
                        void duplicate(question);
                      }}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      className="quiz-icon-btn"
                      aria-label="حذف السؤال"
                      onClick={(event) => {
                        event.stopPropagation();
                        void remove(question);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {quiz.questions.length === 0 && (
              <p className="quiz-muted">أضف أول سؤال لبدء الاختبار.</p>
            )}
          </aside>
          {active ? (
            <QuizQuestionForm
              key={active.id}
              question={active}
              onSave={saveQuestion}
              saving={saving}
            />
          ) : (
            <div className="quiz-empty">
              <h2>اختر سؤالًا</h2>
              <p>استخدم زر «+ سؤال» لإنشاء سؤال جديد.</p>
            </div>
          )}
        </div>
      )}
      {undo && (
        <div className="quiz-live-announcer">
          <div className="quiz-undo">
            <span>حُذف السؤال.</span>
            <button
              type="button"
              className="btn-gold"
              onClick={() => void restore()}
            >
              تراجع
            </button>
            <button
              type="button"
              className="quiz-icon-btn"
              onClick={() => setUndo(null)}
              aria-label="إخفاء"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {settingsOpen && (
        <SettingsDrawer
          quiz={quiz}
          onClose={() => setSettingsOpen(false)}
          onSaved={setQuizFromServer}
        />
      )}
    </section>
  );
};
