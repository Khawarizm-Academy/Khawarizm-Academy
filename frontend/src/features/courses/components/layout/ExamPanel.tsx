import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, Check, Clock3, FileQuestion, Flag, LoaderCircle, Lock, RotateCcw, Send, X } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import { courseEmptyStates } from '@/features/courses/data/courseStates';
import { CourseSectionEmpty } from '@/features/courses/components/states/CourseSectionEmpty';
import { fetchQuizAttempt, saveQuizAnswers, startQuizAttempt, submitQuizAttempt } from '@/features/courses/data/courseFetchers';
import { countdownSeconds, milestoneFor } from '@/features/courses/quizTypes';
import type { AttemptAnswer, QuizAttempt } from '@/features/courses/quizTypes';

const clock = (seconds: number) => `${String(Math.max(0, Math.floor(seconds / 60))).padStart(2, '0')}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`;
const activeAttempt = (value: QuizAttempt | null) => Boolean(value && !value.result && value.status !== 'submitted' && value.status !== 'expired');

export const ExamPanel: React.FC = () => {
  const { course, quizzes, quizzesLoading, quizzesError, retryQuizzes, isExamUnlocked } = useCoursePlayer();
  const exam = quizzes.find((quiz) => quiz.kind === 'exam');
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<AttemptAnswer[]>([]);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [milestone, setMilestone] = useState<10 | 5 | 1 | null>(null);
  const submitOnce = useRef(false);
  const hydrated = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const answersRef = useRef(answers);
  const queueSave = useCallback((attemptId: string, pending: AttemptAnswer[]) => {
    const operation = saveQueue.current.catch(() => undefined).then(() => saveQuizAnswers(attemptId, pending));
    saveQueue.current = operation;
    return operation;
  }, []);
  const key = exam ? `quiz-attempt:${exam.id}` : '';
  const submit = useCallback(async (confirm = true) => {
    if (!attempt) return;
    if (busy) { if (!confirm) submitOnce.current = false; return; }
    if (confirm && !window.confirm('هل أنت متأكد من تسليم الاختبار؟')) return;
    setBusy(true);
    try {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      await queueSave(attempt.attemptId, answersRef.current);
      setSaveState('saved');
      const next = await submitQuizAttempt(attempt.attemptId);
      setAttempt(next);
      sessionStorage.removeItem(key);
    } catch {
      setSaveState('error');
      setSaveError('تعذّر حفظ الإجابات أو تسليم الاختبار. حاول مرة أخرى.');
      if (confirm) submitOnce.current = false;
    } finally { setBusy(false); }
  }, [attempt, busy, key, queueSave]);

  useEffect(() => {
    if (!exam || attempt) return;
    const saved = sessionStorage.getItem(key);
    if (!saved) return;
    void fetchQuizAttempt(saved).then((next) => {
      if (activeAttempt(next)) { setAttempt(next); setAnswers(next.answers ?? []); setOffset(Date.parse(next.serverNow) - Date.now()); hydrated.current = true; }
      else sessionStorage.removeItem(key);
    }).catch(() => sessionStorage.removeItem(key));
  }, [exam, attempt, key]);
  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => {
    if (!attempt?.deadlineAt || !activeAttempt(attempt)) return;
    const tick = () => {
      const seconds = countdownSeconds(attempt.deadlineAt!, Date.now(), offset); setRemaining(seconds);
      const nextMilestone = milestoneFor(seconds);
      if (nextMilestone && nextMilestone !== milestone) { setMilestone(nextMilestone); }
      if (seconds === 0 && !submitOnce.current) { submitOnce.current = true; void submit(false); }
    };
    tick(); const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer);
  }, [attempt, offset, milestone, submit]);
  useEffect(() => {
    if (!activeAttempt(attempt)) return;
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', leave); return () => window.removeEventListener('beforeunload', leave);
  }, [attempt]);
  useEffect(() => {
    if (!attempt || !hydrated.current || !activeAttempt(attempt)) return;
    setSaveState('pending'); setSaveError(null);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void queueSave(attempt.attemptId, answersRef.current).then(() => setSaveState('saved')).catch((error) => { setSaveState('error'); setSaveError(error instanceof Error ? error.message : 'تعذّر حفظ الإجابة.'); });
    }, 500);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [answers, attempt, queueSave]);
  const begin = async () => {
    if (!exam || exam.locked || exam.attemptsLeft === 0) return;
    setBusy(true);
    try { const next = await startQuizAttempt(exam.id); setAttempt(next); setAnswers(next.answers ?? []); setOffset(Date.parse(next.serverNow) - Date.now()); sessionStorage.setItem(`quiz-attempt:${exam.id}`, next.attemptId); hydrated.current = true; }
    catch { setSaveError('تعذّر بدء الاختبار. حاول مرة أخرى.'); } finally { setBusy(false); }
  };
  const question = attempt?.questions[index];
  const chosen = useMemo(() => answers.find((answer) => answer.questionId === question?.id)?.optionIds ?? [], [answers, question]);
  const select = (optionId: string) => {
    if (!question || !attempt) return;
    const ids = question.kind === 'multiple' ? (chosen.includes(optionId) ? chosen.filter((id) => id !== optionId) : [...chosen, optionId]) : [optionId];
    setAnswers([...answers.filter((answer) => answer.questionId !== question.id), { questionId: question.id, optionIds: ids }]);
  };
  if (quizzesLoading) return <div className="player-panel" role="status"><LoaderCircle className="animate-spin" /> جاري تجهيز الاختبار…</div>;
  if (quizzesError) return <div className="player-panel" role="alert">تعذّر تحميل الاختبار. <button type="button" onClick={() => void retryQuizzes()}><RotateCcw size={14} />{courseCopy.player.retryLabel}</button></div>;
  if (!exam) {
    if (!course) return <div className="player-panel"><CourseSectionEmpty copy={courseEmptyStates.exam} icon={<FileQuestion size={18} />} /></div>;
    const fallback = course.exam;
    return <div className={`player-exam-card ${isExamUnlocked ? 'player-exam-open' : 'player-exam-locked'}`}>
      {isExamUnlocked ? <Award size={28} className="text-gold-400" /> : <Lock size={24} className="text-slate-400" />}
      <h2 className="text-xl font-bold text-white">{isExamUnlocked ? courseCopy.player.examUnlocked : courseCopy.player.examLocked}</h2>
      <p className="text-sm text-slate-400">{isExamUnlocked ? 'لم يُنشر اختبار تفاعلي لهذه الدورة بعد.' : courseCopy.player.examLockedNote}</p>
      <div className="player-exam-stats">
        <div className="player-exam-stat"><b>{fallback.questionCount}</b><span>{courseCopy.player.examQuestions}</span></div>
        <div className="player-exam-stat"><b>{fallback.minutes}</b><span>{courseCopy.player.examMinutes}</span></div>
        <div className="player-exam-stat"><b>{fallback.passThreshold}%</b><span>{courseCopy.landing.examThreshold}</span></div>
        <div className="player-exam-stat"><b>{fallback.attemptsLeft}</b><span>{courseCopy.player.examAttempts}</span></div>
      </div>
    </div>;
  }
  if (!attempt) return <div className="player-exam-card player-exam-open"><Award size={28} className="text-gold-400" /><h2 className="text-xl font-bold text-white">{exam.title}</h2><p className="text-sm text-slate-400">{exam.instructions}</p><div className="player-exam-stats"><div className="player-exam-stat"><b>{exam.timeLimitMinutes ?? '—'}</b><span>{courseCopy.player.examMinutes}</span></div><div className="player-exam-stat"><b>{exam.attemptsLeft ?? '∞'}</b><span>{courseCopy.player.examAttempts}</span></div></div>{exam.locked || !isExamUnlocked ? <p role="note"><Lock size={14} /> {exam.locked?.reason ?? courseCopy.player.examLockedNote}</p> : <button type="button" className="btn-gold" onClick={() => void begin()} disabled={busy}>{busy ? 'جاري البدء…' : courseCopy.player.examStart}</button>}</div>;
  if (attempt.result) return <div className="player-exam-card player-exam-open"><Award size={32} className="text-gold-400" /><h2 className="text-xl font-bold text-white">{attempt.result.passed ? 'اجتزت الاختبار بنجاح' : 'لم تجتز الاختبار هذه المرة'}</h2><strong className="text-4xl text-gold-400">{attempt.result.percent}%</strong>{attempt.result.revealPolicy !== 'never' && attempt.result.questions?.map((item) => <p key={item.questionId}>{item.correct ? 'إجابة صحيحة' : 'إجابة غير صحيحة'}{item.explanation && ` — ${item.explanation}`}</p>)}{(exam.attemptsLeft === null || (exam.attemptsLeft ?? 0) > 0) && <button type="button" className="btn-gold" onClick={() => { setAttempt(null); setAnswers([]); }}>إعادة المحاولة</button>}</div>;
  if (!question) return null;
  const tone = remaining !== null && remaining <= 60 ? 'text-danger-500' : remaining !== null && remaining <= 300 ? 'text-gold-400' : 'text-blue-400';
  return <div className="player-panel"><div className={`flex items-center justify-between ${tone}`}><span><Clock3 size={15} className="inline" /> {remaining === null ? '—' : clock(remaining)}</span><span role="status" aria-live="polite">{milestone ? `تبقّى ${milestone} دقائق` : ''}</span></div><div className="flex flex-wrap gap-2" role="navigation" aria-label="تقدم الأسئلة">{attempt.questions.map((item, i) => <button key={item.id} type="button" aria-label={`السؤال ${i + 1}${flags[item.id] ? '، للمراجعة' : ''}`} aria-current={i === index ? 'step' : undefined} onClick={() => setIndex(i)} className={`player-option-mark ${i === index ? 'border-blue-400 text-blue-400' : ''} ${flags[item.id] ? 'border-gold-400 text-gold-400' : ''}`}>{i + 1}</button>)}</div><p className="text-xs text-slate-400">السؤال {index + 1} من {attempt.questions.length}</p><fieldset aria-label={`السؤال ${index + 1}: ${question.prompt}`}><legend className="player-problem-prompt">{question.prompt}</legend>{question.code && <pre className="player-code">{question.code}</pre>}{question.options.map((option) => <label key={option.id} className={`player-option ${chosen.includes(option.id) ? 'player-option-selected' : 'player-option-idle'}`}><input className="sr-only" type={question.kind === 'multiple' ? 'checkbox' : 'radio'} name={`question-${question.id}`} checked={chosen.includes(option.id)} onChange={() => select(option.id)} />{option.label}</label>)}</fieldset><div aria-live="polite" className="text-xs text-slate-400">{saveState === 'pending' && 'جارٍ الحفظ…'}{saveState === 'saved' && <><Check size={14} className="inline" /> حُفظ</>}{saveState === 'error' && <><X size={14} className="inline" /> {saveError} <button type="button" className="link-action link-action-blue" onClick={() => { hydrated.current = true; setAnswers([...answers]); }}>إعادة المحاولة</button></>}</div><div className="player-pager"><button type="button" className="btn-pill-subtle" onClick={() => setIndex(Math.max(0, index - 1))} disabled={!index}>السابق</button><button type="button" className={`btn-pill-subtle ${flags[question.id] ? 'border-gold-400' : ''}`} onClick={() => setFlags((current) => ({ ...current, [question.id]: !current[question.id] }))}><Flag size={14} />{flags[question.id] ? 'إلغاء المراجعة' : 'مراجعة لاحقًا'}</button>{index < attempt.questions.length - 1 ? <button type="button" className="btn-pill-subtle" onClick={() => setIndex(index + 1)}>التالي</button> : <button type="button" className="btn-gold" onClick={() => void submit()} disabled={busy}><Send size={14} />تسليم</button>}</div></div>;
};
