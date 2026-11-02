import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, Lightbulb, LoaderCircle, RotateCcw, XCircle } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { checkPracticeAnswer } from '@/features/courses/data/courseFetchers';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';
import type { CourseProblem, CourseProblemOption } from '@/shared/types/entities';
import type { PracticeVerdict } from '@/features/courses/quizTypes';

export const ProblemsPanel: React.FC = () => {
  const { problems, activeLesson, problemsLoading, problemsError, retryProblems } = useCoursePlayer();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<PracticeVerdict | null>(null);
  const [pending, setPending] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const problem = currentIndex < problems.length ? problems[currentIndex] : null;

  useEffect(() => () => controllerRef.current?.abort(), []);
  const moveTo = (index: number) => {
    controllerRef.current?.abort();
    requestRef.current += 1;
    setCurrentIndex(index); setSelectedIds([]); setVerdict(null); setCheckError(null); setPending(false); setShowHint(false);
  };
  const choose = async (problemValue: CourseProblem, optionId: string | string[]) => {
    const next = Array.isArray(optionId) ? optionId : problemValue.kind === 'multiple' ? (selectedIds.includes(optionId) ? selectedIds.filter((id) => id !== optionId) : [...selectedIds, optionId]) : [optionId];
    setSelectedIds(next); setVerdict(null); setCheckError(null); setShowHint(false);
    if (!next.length) return;
    controllerRef.current?.abort();
    const controller = new AbortController(); controllerRef.current = controller;
    const sequence = ++requestRef.current; setPending(true);
    try {
      const result = await checkPracticeAnswer(problemValue, next, controller.signal);
      if (sequence === requestRef.current && !controller.signal.aborted) setVerdict(result);
    } catch (error) {
      if (sequence === requestRef.current && !controller.signal.aborted) setCheckError(error instanceof Error ? error.message : 'تعذّر التحقق. حاول مرة أخرى.');
    } finally { if (sequence === requestRef.current) setPending(false); }
  };
  const head = <div className="player-panel-head"><ClipboardCheck size={16} className="text-blue-400" /><div><h2 className="player-panel-title">{courseCopy.player.problemsTitle}</h2><span className="text-[11px] text-slate-400 font-body">{courseCopy.player.practiceLabel}</span></div></div>;
  if (!activeLesson) return null;
  if (problemsLoading) return <div className="player-panel" role="status">{head}<LoaderCircle className="animate-spin text-blue-400" aria-label="جاري التحميل" /></div>;
  if (problemsError) return <div className="player-panel" role="alert">{head}<p className="text-sm text-slate-300">تعذّر تحميل المسائل.</p><button type="button" className="btn-pill-subtle self-start" onClick={() => void retryProblems()}><RotateCcw size={14} />{courseCopy.player.retryLabel}</button></div>;
  if (!problem) return <div className="player-panel">{head}<CourseSectionEmpty copy={courseEmptyStates.problems} icon={<ClipboardList size={18} />} /></div>;
  const multiple = problem.kind === 'multiple';
  return <div className="player-panel">
    {head}<p className="player-problem-prompt">{problem.prompt}</p>{problem.code && <pre className="player-code">{problem.code}</pre>}
    <fieldset className="flex flex-col gap-2.5" aria-label={`خيارات المسألة: ${problem.prompt}`}>
      <legend className="sr-only">خيارات الإجابة</legend>{problem.options.map((option: CourseProblemOption, index) => <label key={option.id} className={`player-option ${selectedIds.includes(option.id) ? 'player-option-selected' : 'player-option-idle'} cursor-pointer`}>
        <input className="sr-only" type={multiple ? 'checkbox' : 'radio'} name={`problem-${problem.id}`} checked={selectedIds.includes(option.id)} onChange={() => void choose(problem, option.id)} disabled={pending} />
        <span className="player-option-mark">{selectedIds.includes(option.id) ? <CheckCircle2 size={13} /> : ['أ', 'ب', 'ج', 'د'][index]}</span><span className="flex-1 text-sm">{option.label}</span>
      </label>)}</fieldset>
    {pending && <p className="text-xs text-slate-400" role="status">جارٍ التحقق…</p>}
    {checkError && <div className="player-feedback player-feedback-bad" role="alert"><XCircle size={17} /><div><strong>{checkError}</strong><button type="button" className="link-action link-action-blue mr-3" onClick={() => selectedIds.length && void choose(problem, selectedIds)}><RotateCcw size={14} />{courseCopy.player.retryLabel}</button></div></div>}
    {verdict && <div className={`player-feedback ${verdict.correct ? 'player-feedback-ok' : 'player-feedback-bad'}`} role="status">{verdict.correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}<div><strong>{verdict.correct ? courseCopy.player.problemCorrect : courseCopy.player.problemWrong}</strong>{verdict.explanation && <p className="text-slate-300 mt-1">{verdict.explanation}</p>}</div></div>}
    {verdict?.hint && <button type="button" onClick={() => setShowHint((open) => !open)} className="link-action link-action-blue self-start"><Lightbulb size={14} />{courseCopy.player.problemHint}</button>}
    {showHint && verdict?.hint && <p className="text-sm text-slate-400 bg-navy-950/60 border border-navy-600/40 rounded-xl px-4 py-3">{verdict.hint}</p>}
    <div className="player-pager"><button type="button" onClick={() => moveTo(currentIndex - 1)} disabled={!currentIndex} className="btn-pill-subtle px-4 py-2 text-xs"><ChevronRight size={14} />{courseCopy.player.problemPrevious}</button><span className="text-xs text-slate-400">{courseCopy.player.problemProgress} {currentIndex + 1} من {problems.length}</span><button type="button" onClick={() => moveTo(currentIndex + 1)} disabled={currentIndex === problems.length - 1} className="btn-pill-subtle px-4 py-2 text-xs">{courseCopy.player.problemNext}<ChevronLeft size={14} /></button></div>
  </div>;
};
