import React, { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { MarkdownEditor } from "@/shared/components/Editor/MarkdownEditor";
import { QuizQuestionCard } from "@/shared/components/Quiz/QuizQuestionCard";
import { isQuestionValid } from "@/features/studio/quizzes/data/quizValidation";
import type {
  QuizQuestion,
  QuestionKind,
} from "@/features/studio/quizzes/data/quizFetchers";

type DraftQuestion = QuizQuestion;
const KIND_LABELS: Record<QuestionKind, string> = {
  single: "اختيار واحد",
  multiple: "اختيار متعدد",
  true_false: "صح / خطأ",
};

const defaultOptions = (kind: QuestionKind) =>
  kind === "true_false"
    ? [
        {
          id: `new-${Date.now()}-true`,
          label: "صح",
          isCorrect: true,
          order: 0,
        },
        {
          id: `new-${Date.now()}-false`,
          label: "خطأ",
          isCorrect: false,
          order: 1,
        },
      ]
    : [
        { id: `new-${Date.now()}-a`, label: "", isCorrect: true, order: 0 },
        { id: `new-${Date.now()}-b`, label: "", isCorrect: false, order: 1 },
      ];

export const QuizQuestionForm: React.FC<{
  question: QuizQuestion;
  onSave: (question: QuizQuestion) => Promise<void>;
  saving?: boolean;
}> = ({ question, onSave, saving = false }) => {
  // Remounted by the editor on question switch (keyed by id), so initial values
  // come from props and no reset effect is needed.
  const [draft, setDraft] = useState<DraftQuestion>(question);
  const [previewAnswers, setPreviewAnswers] = useState<string[]>([]);
  const patch = (next: Partial<DraftQuestion>) =>
    setDraft((current) => ({ ...current, ...next }));
  const switchKind = (kind: QuestionKind) => {
    const options =
      kind === "true_false"
        ? defaultOptions(kind)
        : draft.kind === "true_false"
          ? defaultOptions(kind)
          : draft.options.map((option, index) => ({
              ...option,
              isCorrect: kind === "single" ? index === 0 : option.isCorrect,
            }));
    patch({
      kind,
      options,
      partialCredit: kind === "multiple" ? draft.partialCredit : false,
    });
  };
  const updateOption = (
    index: number,
    next: Partial<QuizQuestion["options"][number]>,
  ) =>
    patch({
      options: draft.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...next } : option,
      ),
    });
  const toggleCorrect = (index: number) => {
    if (draft.kind === "single" || draft.kind === "true_false")
      patch({
        options: draft.options.map((option, optionIndex) => ({
          ...option,
          isCorrect: optionIndex === index,
        })),
      });
    else updateOption(index, { isCorrect: !draft.options[index].isCorrect });
  };
  const addOption = () => {
    if (draft.kind === "true_false") return;
    patch({
      options: [
        ...draft.options,
        {
          id: `new-${Date.now()}`,
          label: "",
          isCorrect: false,
          order: draft.options.length,
        },
      ],
    });
  };
  const removeOption = (index: number) => {
    if (draft.options.length <= 2 || draft.kind === "true_false") return;
    patch({
      options: draft.options
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, order) => ({ ...option, order })),
    });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isQuestionValid(draft)) return;
    await onSave({
      ...draft,
      options: draft.options.map((option, index) => ({
        ...option,
        order: index,
      })),
    });
  };
  const sharedQuestion = {
    ...draft,
    options: draft.options.map((option) => ({
      ...option,
      id: option.id || `preview-${option.order}`,
    })),
  };
  return (
    <div className="quiz-editor-main">
      <form className="quiz-form-panel" onSubmit={submit}>
        <div className="quiz-panel-title">
          <div>
            <h2>محتوى السؤال</h2>
            {draft.previousAnswerCount > 0 && (
              <small className="quiz-error-text">
                ⚠ {draft.previousAnswerCount.toLocaleString("ar")} إجابة سابقة —
                تغييرات الخيارات قد تتطلب حذرًا.
              </small>
            )}
          </div>
          <button
            className="btn-gold"
            type="submit"
            disabled={saving || !isQuestionValid(draft)}
          >
            <Save size={15} />
            {saving ? "جارٍ الحفظ…" : "حفظ السؤال"}
          </button>
        </div>
        <div className="quiz-form-grid">
          <div className="quiz-field span-2">
            <fieldset>
              <legend>نوع السؤال</legend>
              <div className="quiz-kind-tabs">
                {(Object.keys(KIND_LABELS) as QuestionKind[]).map((kind) => (
                  <button
                    type="button"
                    key={kind}
                    className={draft.kind === kind ? "is-active" : ""}
                    onClick={() => switchKind(kind)}
                  >
                    {KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="quiz-field span-2">
            <MarkdownEditor
              id={`question-prompt-${draft.id}`}
              value={draft.prompt}
              maxLength={10000}
              label="نص السؤال · Markdown"
              placeholder="اكتب السؤال بصيغة Markdown…"
              onChange={(prompt) => patch({ prompt })}
            />
          </div>
          <div className="quiz-field span-2">
            <label htmlFor={`question-code-${draft.id}`}>
              كتلة كود اختيارية
            </label>
            <textarea
              id={`question-code-${draft.id}`}
              className="quiz-code-editor"
              dir="ltr"
              value={draft.code}
              onChange={(event) => patch({ code: event.target.value })}
              placeholder="const answer = 42;"
            />
          </div>
          <fieldset className="quiz-field span-2">
            <legend>الخيارات</legend>
            <div className="quiz-option-editor">
              {draft.options.map((option, index) => (
                <div className="quiz-option-row" key={option.id || index}>
                  <span className="quiz-option-index">
                    {(index + 1).toLocaleString("ar")}
                  </span>
                  <input
                    type="text"
                    value={option.label}
                    disabled={draft.kind === "true_false"}
                    aria-label={`نص الخيار ${index + 1}`}
                    onChange={(event) =>
                      updateOption(index, { label: event.target.value })
                    }
                  />
                  <label className="quiz-option-correct">
                    <input
                      type={draft.kind === "multiple" ? "checkbox" : "radio"}
                      name={`correct-${draft.id}`}
                      checked={option.isCorrect}
                      onChange={() => toggleCorrect(index)}
                    />{" "}
                    صحيح
                  </label>
                  <button
                    type="button"
                    className="quiz-icon-btn quiz-option-remove"
                    disabled={
                      draft.kind === "true_false" || draft.options.length <= 2
                    }
                    onClick={() => removeOption(index)}
                    aria-label={`حذف الخيار ${index + 1}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {draft.kind !== "true_false" && (
                <button
                  type="button"
                  className="btn-outline-blue"
                  onClick={addOption}
                >
                  <Plus size={15} /> إضافة خيار
                </button>
              )}
            </div>
          </fieldset>
          <div className="quiz-field">
            <label htmlFor={`question-points-${draft.id}`}>النقاط</label>
            <input
              id={`question-points-${draft.id}`}
              type="number"
              min={0}
              max={1000}
              value={draft.points}
              onChange={(event) =>
                patch({ points: Math.max(0, Number(event.target.value)) })
              }
            />
          </div>
          <div className="quiz-field">
            <label className="quiz-switch-row">
              <input
                type="checkbox"
                checked={draft.partialCredit}
                disabled={draft.kind !== "multiple"}
                onChange={(event) =>
                  patch({ partialCredit: event.target.checked })
                }
              />{" "}
              تصحيح جزئي للاختيار المتعدد
            </label>
            <small>
              يُحتسب عند اختيار بعض الإجابات الصحيحة، ويُتحقق نهائيًا من الخادم.
            </small>
          </div>
          <div className="quiz-field">
            <label htmlFor={`question-explanation-${draft.id}`}>
              التفسير بعد الإظهار
            </label>
            <textarea
              id={`question-explanation-${draft.id}`}
              value={draft.explanation}
              maxLength={5000}
              onChange={(event) => patch({ explanation: event.target.value })}
            />
          </div>
          <div className="quiz-field">
            <label htmlFor={`question-hint-${draft.id}`}>تلميح للمتعلم</label>
            <textarea
              id={`question-hint-${draft.id}`}
              value={draft.hint}
              maxLength={2000}
              onChange={(event) => patch({ hint: event.target.value })}
            />
          </div>
        </div>
        {!isQuestionValid(draft) && (
          <p className="studio-form-error" role="alert">
            أكمل نص السؤال، خيارين صالحين على الأقل، وحدد الإجابة الصحيحة قبل
            الحفظ.
          </p>
        )}
      </form>
      <section className="quiz-preview-panel">
        <div className="quiz-panel-title">
          <div>
            <h2>معاينة الطالب</h2>
            <p className="quiz-preview-note">
              هذه نفس بطاقة السؤال التقديمية المستخدمة في تجربة المتعلم.
            </p>
          </div>
        </div>
        <QuizQuestionCard
          question={sharedQuestion}
          selectedOptionIds={previewAnswers}
          onChange={setPreviewAnswers}
        />
      </section>
    </div>
  );
};
