import React from 'react';
import { Check, CircleAlert } from 'lucide-react';
import { MarkdownRenderer } from '@/shared/components/Editor/MarkdownRenderer';

export type QuizQuestionCardKind = 'single' | 'multiple' | 'true_false' | string;
export interface QuizQuestionCardOption { id: string; label: string; isCorrect?: boolean; }
export interface QuizQuestionCardQuestion { id: string; kind: QuizQuestionCardKind; prompt: string; code?: string; points?: number; options: QuizQuestionCardOption[]; explanation?: string; hint?: string; }

export interface QuizQuestionCardProps {
  question: QuizQuestionCardQuestion;
  selectedOptionIds?: string[];
  onChange?: (optionIds: string[]) => void;
  disabled?: boolean;
  showCorrectness?: boolean;
  showExplanation?: boolean;
  className?: string;
}

export const QuizQuestionCard: React.FC<QuizQuestionCardProps> = ({ question, selectedOptionIds = [], onChange, disabled = false, showCorrectness = false, showExplanation = false, className = '' }) => {
  const select = (id: string) => {
    if (disabled || !onChange) return;
    if (question.kind === 'multiple') {
      onChange(selectedOptionIds.includes(id) ? selectedOptionIds.filter((value) => value !== id) : [...selectedOptionIds, id]);
      return;
    }
    onChange([id]);
  };
  const inputType = question.kind === 'multiple' ? 'checkbox' : 'radio';
  return (
    <article className={`quiz-question-card ${className}`} dir="rtl" aria-labelledby={`quiz-question-${question.id}`}>
      <div className="quiz-question-card-head">
        <span className="quiz-question-number">سؤال</span>
        {question.points !== undefined && <span className="quiz-question-points">{question.points} نقطة</span>}
      </div>
      <div id={`quiz-question-${question.id}`} className="quiz-question-prompt"><MarkdownRenderer value={question.prompt} /></div>
      {question.code?.trim() && <pre className="quiz-question-code" dir="ltr"><code>{question.code}</code></pre>}
      <fieldset className="quiz-question-options" disabled={disabled}>
        <legend className="sr-only">خيارات الإجابة</legend>
        {question.options.map((option) => {
          const selected = selectedOptionIds.includes(option.id);
          const correct = showCorrectness && option.isCorrect;
          const incorrect = showCorrectness && selected && option.isCorrect === false;
          return (
            <label key={option.id} className={`quiz-question-option ${selected ? 'is-selected' : ''} ${correct ? 'is-correct' : ''} ${incorrect ? 'is-incorrect' : ''}`}>
              <input type={inputType} name={`quiz-question-${question.id}`} checked={selected} onChange={() => select(option.id)} />
              <span className="quiz-question-option-control" aria-hidden="true">{correct ? <Check size={14} /> : incorrect ? <CircleAlert size={14} /> : null}</span>
              <span className="quiz-question-option-label">{option.label}</span>
            </label>
          );
        })}
      </fieldset>
      {showExplanation && (question.explanation || question.hint) && <aside className="quiz-question-feedback">{question.hint && <p><strong>تلميح:</strong> {question.hint}</p>}{question.explanation && <p><strong>التفسير:</strong> {question.explanation}</p>}</aside>}
    </article>
  );
};
