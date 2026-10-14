import React, { useState } from 'react';
import { Play, Pause, CheckCircle2, Check, BookOpen, Volume2, Maximize2, X, Sparkles } from 'lucide-react';
import { useDashboardContent } from '@/features/dashboard/context/DashboardContentContext';

interface CourseWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle?: string;
  initialLessonIndex?: number;
}

interface LessonItem {
  id: string;
  title: string;
  duration: string;
  isCompleted: boolean;
}

/** Lesson index circle tone: completed, current, or upcoming. */
const LESSON_STATE = {
  done: 'bg-emerald-500/20 text-emerald-400',
  current: 'bg-gold-400/20 text-gold-400',
  todo: 'bg-navy-800 text-slate-400',
};

export const CourseWorkspaceModal: React.FC<CourseWorkspaceModalProps> = ({
  isOpen,
  onClose,
  courseTitle = 'أساسيات الذكاء الاصطناعي وتعلم الآلة',
  initialLessonIndex = 3,
}) => {
  const { chambers } = useDashboardContent();
  const [currentIdx, setCurrentIdx] = useState(initialLessonIndex);
  const [lessons, setLessons] = useState<LessonItem[]>(chambers.workspaceLessons);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCompletionToast, setShowCompletionToast] = useState(false);

  if (!isOpen) return null;

  const currentLesson = lessons[currentIdx];
  const completedCount = lessons.filter((l) => l.isCompleted).length;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  const handleMarkComplete = () => {
    setLessons((prev) =>
      prev.map((l, idx) => (idx === currentIdx ? { ...l, isCompleted: true } : l))
    );
    setShowCompletionToast(true);
    setTimeout(() => {
      setShowCompletionToast(false);
      if (currentIdx < lessons.length - 1) {
        setCurrentIdx((c) => c + 1);
      }
    }, 1200);
  };

  return (
    <div dir="rtl" className="dash-modal-overlay">
      <div className="dash-modal-shell max-w-5xl">
        {/* Modal header */}
        <div className="dash-modal-head">
          <div className="dash-modal-lead">
            <div className="dash-modal-icon dash-modal-icon-sky">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="dash-modal-title">{courseTitle}</h2>
              <span className="dash-modal-sub">
                الدرس {currentIdx + 1} من {lessons.length} • نسبة إنجاز الدورة {progressPercent}%
              </span>
            </div>
          </div>

          <button type="button" onClick={onClose} className="dash-modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Completion toast banner */}
        {showCompletionToast && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/40 px-6 py-2.5 flex items-center justify-between text-emerald-400 text-sm font-bold animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span>أحسنت! تم إكمال الدرس وحفظ تقدمك بنجاح.</span>
            </div>
            <span className="text-xs font-mono">+50 نقطة خبرة</span>
          </div>
        )}

        {/* Workspace body: video player + curriculum sidebar */}
        <div className="dash-modal-body">
          {/* Main player & content arena */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto flex flex-col gap-4 border-b lg:border-b-0 lg:border-l border-navy-600/60">
            {/* Simulated 16:9 lecture player */}
            <div className="w-full aspect-video bg-navy-950 rounded-2xl border border-navy-600/80 relative overflow-hidden flex flex-col justify-between p-4 shadow-inner group">
              {/* Background ambient visuals */}
              <div className="absolute inset-0 bg-radial from-blue-400/10 via-navy-950/80 to-navy-950 pointer-events-none" />

              {/* Watermark badge */}
              <div className="relative z-10 flex justify-between items-center text-xs text-slate-400 font-mono">
                <span className="bg-navy-900/80 px-2.5 py-1 rounded-md border border-navy-600/60">
                  {currentLesson.title}
                </span>
                <span className="text-blue-400 font-bold">1080p HD</span>
              </div>

              {/* Center play/pause button */}
              <div className="relative z-10 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="btn-gold size-16 hover:scale-110"
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="translate-x-0.5" />}
                </button>
              </div>

              {/* Player timeline & controls */}
              <div className="relative z-10 flex flex-col gap-2">
                <div className="w-full h-1.5 bg-navy-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-l from-blue-400 to-gold-400 w-2/5 rounded-full" />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>10:14 / {currentLesson.duration}</span>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Volume2 size={16} className="hover:text-slate-200 cursor-pointer" />
                    <Maximize2 size={16} className="hover:text-slate-200 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>

            {/* Lesson info and action row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div>
                <h3 className="text-slate-100 font-bold text-lg font-display">
                  {currentLesson.title}
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  يتضمن هذا الدرس شرحًا عمليًا مدعومًا بالأمثلة البرمجية والتمارين الذاتية.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  className={`dash-complete ${currentLesson.isCompleted ? 'dash-complete-done' : 'btn-gold'}`}
                >
                  <CheckCircle2 size={16} />
                  <span>{currentLesson.isCompleted ? 'مكتمل' : 'تحديد كمكتمل والمتابعة'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Curriculum drawer */}
          <div className="w-full lg:w-80 bg-navy-950/20 p-4 overflow-y-auto flex flex-col gap-2 shrink-0">
            <h4 className="text-slate-300 font-bold text-sm font-display px-2 mb-1">
              قائمة دروس المسار ({completedCount}/{lessons.length})
            </h4>

            {lessons.map((lesson, idx) => {
              const isSelected = idx === currentIdx;
              const state = lesson.isCompleted
                ? LESSON_STATE.done
                : isSelected
                  ? LESSON_STATE.current
                  : LESSON_STATE.todo;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`dash-lesson ${isSelected ? 'dash-lesson-active' : 'dash-lesson-idle'}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`dash-lesson-dot ${state}`}>
                      {lesson.isCompleted ? <Check size={13} /> : idx + 1}
                    </span>
                    <span className="text-xs truncate">{lesson.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {lesson.duration}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
