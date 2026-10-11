import React, { useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Lightbulb, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import type { CourseProblemOption } from '@/shared/types/entities';

/** Every practice option renders the same grammar; only the tone changes. */
type OptionTone = 'idle' | 'correct' | 'wrong' | 'dim';

const OPTION_CLASS: Record<OptionTone, string> = {
  idle: 'player-option player-option-idle',
  correct: 'player-option player-option-correct',
  wrong: 'player-option player-option-wrong',
  dim: 'player-option player-option-idle opacity-50',
};

/** The state mark shown on the option pill, per tone. */
const MARK_BY_TONE: Record<OptionTone, { icon: LucideIcon | null; className: string }> = {
  idle: { icon: null, className: '' },
  correct: { icon: CheckCircle2, className: 'text-success-500' },
  wrong: { icon: XCircle, className: 'text-danger-500' },
  dim: { icon: null, className: '' },
};

/** RTL answer letters in order, matched to option position. */
const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'];

/** Tone a single option gets once a choice is made; correct beats the picked one. */
function optionTone(optionId: string, problemId: string, selectedId: string | null): OptionTone {
  if (!selectedId) return 'idle';
  if (optionId === problemId) return 'correct';
  if (optionId === selectedId) return 'wrong';
  return 'dim';
}

/** Problem tab: unlimited-attempt practice set with instant feedback and a hint. */
export const ProblemsPanel: React.FC = () => {
  const { problems, activeLesson } = useCoursePlayer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const problem = currentIndex < problems.length ? problems[currentIndex] : null;
  if (!problem || !activeLesson) return null;

  const isCorrect = selectedId === problem.correctOptionId;

  const moveTo = (index: number) => {
    setCurrentIndex(index);
    setSelectedId(null);
    setShowHint(false);
  };

  return (
    <div className="player-panel">
      <div className="player-panel-head">
        <ClipboardCheck size={16} className="text-blue-400 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <h2 className="player-panel-title">{courseCopy.player.problemsTitle}</h2>
          <span className="text-[11px] text-slate-400 font-body">{courseCopy.player.practiceLabel}</span>
        </div>
      </div>

      <p className="player-problem-prompt">{problem.prompt}</p>

      <pre className="player-code">{problem.code}</pre>

      <div className="flex flex-col gap-2.5">
        {problem.options.map((option: CourseProblemOption, index: number) => {
          const tone = optionTone(option.id, problem.correctOptionId, selectedId);
          const mark = MARK_BY_TONE[tone];
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedId(option.id)}
              disabled={selectedId !== null}
              className={OPTION_CLASS[tone]}
            >
              <span className="player-option-mark border-navy-600/60">
                {mark.icon ? (
                  <mark.icon size={13} className={mark.className} />
                ) : (
                  OPTION_LETTERS[index]
                )}
              </span>
              <span className="flex-1 text-sm">{option.label}</span>
            </button>
          );
        })}
      </div>

      {selectedId && (
        <div className={isCorrect ? 'player-feedback player-feedback-ok' : 'player-feedback player-feedback-bad'}>
          {isCorrect ? (
            <CheckCircle2 size={17} className="text-success-500 shrink-0" />
          ) : (
            <XCircle size={17} className="text-danger-500 shrink-0" />
          )}
          <div className="flex flex-col gap-1.5">
            <span className="font-display font-bold">{isCorrect ? courseCopy.player.problemCorrect : courseCopy.player.problemWrong}</span>
            <span className="text-slate-300">{problem.explanation}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowHint((open) => !open)}
        className="link-action link-action-blue self-start"
      >
        <Lightbulb size={14} />
        {courseCopy.player.problemHint}
      </button>

      {showHint && (
        <p className="text-sm text-slate-400 font-body bg-navy-950/60 border border-navy-600/40 rounded-xl px-4 py-3">
          {problem.hint}
        </p>
      )}

      <div className="player-pager">
        <button
          type="button"
          onClick={() => moveTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="btn-pill-subtle px-4 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={14} />
          {courseCopy.player.problemPrevious}
        </button>

        <span className="text-xs text-slate-400 font-body tabular-nums">
          {courseCopy.player.problemProgress} {currentIndex + 1} من {problems.length}
        </span>

        <button
          type="button"
          onClick={() => moveTo(currentIndex + 1)}
          disabled={currentIndex === problems.length - 1}
          className="btn-pill-subtle px-4 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {courseCopy.player.problemNext}
          <ChevronLeft size={14} />
        </button>
      </div>
    </div>
  );
};