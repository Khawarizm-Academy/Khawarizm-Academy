import React, { useCallback, useEffect, useState } from "react";
import { Download, Gift, RefreshCw } from "lucide-react";
import { useAuth } from "@/features/auth/context/authContext";
import { can } from "@/shared/lib/permissions";
import { ApiError } from "@/shared/lib/apiClient";
import {
  downloadQuizResultsCsv,
  fetchQuizAttempts,
  fetchQuizStats,
  grantQuizExtraAttempt,
  type QuizAttemptsPage,
  type QuizStats,
  type StudioQuiz,
} from "@/features/studio/quizzes/data/quizFetchers";

export const QuizResultsView: React.FC<{ quiz: StudioQuiz }> = ({ quiz }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptsPage | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"overview" | "questions" | "attempts">(
    "overview",
  );
  const [error, setError] = useState("");
  const [grantTarget, setGrantTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);
  // Loading is derived from the key stored with the last resolved fetch, so a
  // page change restores the loading state without a sync setState.
  const [loadedKey, setLoadedKey] = useState("");
  const resultsKey = `${quiz.id}#${page}`;
  const loading = loadedKey !== resultsKey;

  const load = useCallback(() => {
    void Promise.all([fetchQuizStats(quiz.id), fetchQuizAttempts(quiz.id, page)])
      .then(([nextStats, nextAttempts]) => {
        setStats(nextStats);
        setAttempts(nextAttempts);
      })
      .catch((reason) =>
        setError(
          reason instanceof ApiError ? reason.message : "تعذّر تحميل النتائج.",
        ),
      )
      .finally(() => setLoadedKey(resultsKey));
  }, [quiz.id, page, resultsKey]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!can(user, "quizzes.results_own") && !can(user, "quizzes.results_any"))
    return (
      <section className="quiz-no-permission">
        <h2>نتائج الاختبار محجوبة</h2>
        <p>لا تظهر بيانات المتعلمين إلا لمن يملك صلاحية عرض النتائج.</p>
      </section>
    );

  const exportCsv = async () => {
    try {
      const blob = await downloadQuizResultsCsv(quiz.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `quiz-${quiz.id}-results.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "تعذّر تصدير النتائج.",
      );
    }
  };
  const grant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!grantTarget) return;
    setGranting(true);
    setError("");
    try {
      await grantQuizExtraAttempt(quiz.id, grantTarget.id, 1, grantNote.trim());
      setGrantTarget(null);
      setGrantNote("");
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "تعذّر منح المحاولة.",
      );
    } finally {
      setGranting(false);
    }
  };
  const histogram = stats ? Object.entries(stats.scoreHistogram) : [];
  const maxBand = Math.max(1, ...histogram.map(([, count]) => count));
  return (
    <section
      className="quiz-results-layout"
      aria-labelledby="quiz-results-title"
    >
      <div
        className="quiz-results-tabs"
        role="tablist"
        aria-label="تبويبات النتائج"
      >
        <button
          type="button"
          className={`quiz-tab ${tab === "overview" ? "is-active" : ""}`}
          onClick={() => setTab("overview")}
        >
          نظرة عامة
        </button>
        <button
          type="button"
          className={`quiz-tab ${tab === "questions" ? "is-active" : ""}`}
          onClick={() => setTab("questions")}
        >
          إحصاءات الأسئلة
        </button>
        <button
          type="button"
          className={`quiz-tab ${tab === "attempts" ? "is-active" : ""}`}
          onClick={() => setTab("attempts")}
        >
          المحاولات
        </button>
        <button
          type="button"
          className="btn-outline-blue"
          onClick={() => void load()}
        >
          <RefreshCw size={15} /> تحديث
        </button>
      </div>
      {error && (
        <p className="studio-form-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="quiz-empty">جارٍ تحميل النتائج…</div>
      ) : !stats ? (
        <div className="quiz-empty">لا توجد بيانات نتائج بعد.</div>
      ) : tab === "overview" ? (
        <>
          <div className="quiz-kpi-grid">
            <div className="quiz-kpi">
              <span>المحاولات المكتملة</span>
              <strong>{stats.attempts.toLocaleString("ar")}</strong>
            </div>
            <div className="quiz-kpi">
              <span>نسبة النجاح</span>
              <strong>
                {(stats.passRate * 100).toLocaleString("ar", {
                  maximumFractionDigits: 1,
                })}
                %
              </strong>
            </div>
            <div className="quiz-kpi">
              <span>متوسط الدرجة</span>
              <strong>
                {stats.meanScore.toLocaleString("ar", {
                  maximumFractionDigits: 1,
                })}
                %
              </strong>
            </div>
            <div className="quiz-kpi">
              <span>الوسيط</span>
              <strong>
                {stats.medianScore.toLocaleString("ar", {
                  maximumFractionDigits: 1,
                })}
                %
              </strong>
            </div>
          </div>
          <section className="quiz-results-panel">
            <div className="quiz-panel-title">
              <h2 id="quiz-results-title">توزيع الدرجات</h2>
              <span className="quiz-muted">المصدر: quiz_stats</span>
            </div>
            <div className="quiz-histogram" aria-label="مخطط توزيع الدرجات">
              {histogram.map(([band, count]) => (
                <div
                  className="quiz-histogram-bar"
                  key={band}
                  title={`${band}: ${count}`}
                >
                  <span>{count.toLocaleString("ar")}</span>
                  <i
                    style={{
                      height: `${Math.max(4, (count / maxBand) * 130)}px`,
                    }}
                  />
                  <small>{band}</small>
                </div>
              ))}
            </div>
            <details>
              <summary>عرض البيانات</summary>
              <table className="quiz-table">
                <thead>
                  <tr>
                    <th>النطاق</th>
                    <th>المحاولات</th>
                  </tr>
                </thead>
                <tbody>
                  {histogram.map(([band, count]) => (
                    <tr key={band}>
                      <td>{band}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>
        </>
      ) : tab === "questions" ? (
        <section className="quiz-results-panel">
          <div className="quiz-panel-title">
            <h2>نسبة الإجابة الصحيحة لكل سؤال</h2>
          </div>
          <div className="quiz-table-wrap">
            <table className="quiz-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>السؤال</th>
                  <th>الصحيح</th>
                  <th>أكثر إجابة خاطئة</th>
                </tr>
              </thead>
              <tbody>
                {stats.perQuestion.map((row, index) => {
                  const question = quiz.questions.find(
                    (item) => item.id === row.questionId,
                  );
                  const wrong = question?.options.find(
                    (option) => option.id === row.mostChosenWrongOptionId,
                  )?.label;
                  return (
                    <tr key={row.questionId}>
                      <td>{(index + 1).toLocaleString("ar")}</td>
                      <td>
                        {question?.prompt.replace(/[#*_`]/g, "").slice(0, 90) ||
                          row.questionId}
                      </td>
                      <td>{row.correctPercent.toLocaleString("ar")}%</td>
                      <td>{wrong || "لا توجد بيانات"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="quiz-results-panel">
          <div className="quiz-panel-title">
            <h2>محاولات المتعلمين</h2>
            <button
              type="button"
              className="btn-outline-blue"
              onClick={() => void exportCsv()}
            >
              <Download size={15} /> تصدير CSV
            </button>
          </div>
          <div className="quiz-table-wrap">
            <table className="quiz-table">
              <thead>
                <tr>
                  <th>المتعلم</th>
                  <th>النتيجة</th>
                  <th>الحالة</th>
                  <th>بدأت</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {attempts?.results.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{attempt.name}</td>
                    <td>
                      {attempt.percent === null ? "—" : `${attempt.percent}%`}
                    </td>
                    <td>
                      {attempt.passed
                        ? "اجتاز"
                        : attempt.status === "expired"
                          ? "انتهت"
                          : "لم يجتز"}
                    </td>
                    <td>{new Date(attempt.startedAt).toLocaleString("ar")}</td>
                    <td className="quiz-attempt-actions">
                      {can(user, "quizzes.reset_attempts") && (
                        <button
                          type="button"
                          className="quiz-icon-btn"
                          title="منح محاولة إضافية"
                          aria-label={`منح محاولة إضافية لـ ${attempt.name}`}
                          onClick={() =>
                            setGrantTarget({
                              id: attempt.userId,
                              name: attempt.name,
                            })
                          }
                        >
                          <Gift size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="quiz-actions" aria-label="صفحات المحاولات">
            <button
              type="button"
              className="btn-outline-blue"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              السابق
            </button>
            <span className="quiz-muted">
              صفحة {page} من{" "}
              {Math.max(
                1,
                Math.ceil((attempts?.total || 0) / (attempts?.pageSize || 20)),
              )}
            </span>
            <button
              type="button"
              className="btn-outline-blue"
              disabled={
                !attempts ||
                page >= Math.ceil(attempts.total / attempts.pageSize)
              }
              onClick={() => setPage((value) => value + 1)}
            >
              التالي
            </button>
          </nav>
        </section>
      )}
      {grantTarget && (
        <div
          className="quiz-drawer-scrim"
          role="presentation"
          onMouseDown={() => setGrantTarget(null)}
        >
          <section
            className="quiz-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="grant-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="quiz-drawer-head">
              <h2 id="grant-title">منح محاولة إضافية</h2>
              <button
                type="button"
                className="quiz-icon-btn"
                onClick={() => setGrantTarget(null)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            <form className="quiz-drawer-body" onSubmit={grant}>
              <p>
                ستُمنح محاولة واحدة لـ <strong>{grantTarget.name}</strong>.
              </p>
              <label className="quiz-field">
                ملاحظة اختيارية
                <textarea
                  value={grantNote}
                  maxLength={200}
                  onChange={(event) => setGrantNote(event.target.value)}
                />
              </label>
              <button className="btn-gold" type="submit" disabled={granting}>
                {granting ? "جارٍ المنح…" : "تأكيد المنح"}
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
};
