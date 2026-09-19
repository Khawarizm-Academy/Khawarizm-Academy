import React, { useState } from 'react';
import { Play, Pause, CheckCircle2, BookOpen, Volume2, Maximize2, X, Sparkles } from 'lucide-react';

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

const defaultLessons: LessonItem[] = [
  { id: 'l-1', title: 'مقدمة في مفاهيم الذكاء الاصطناعي وتعلم الآلة', duration: '14:20', isCompleted: true },
  { id: 'l-2', title: 'خوارزميات الانحدار والتصنيف الأساسية', duration: '18:45', isCompleted: true },
  { id: 'l-3', title: 'معالجة وهندسة البيانات للمتعلم الآلي', duration: '22:10', isCompleted: true },
  { id: 'l-4', title: 'مقدمة في الشبكات العصبية الاصطناعية (ANN)', duration: '25:30', isCompleted: false },
  { id: 'l-5', title: 'دوال التنشيط والتحسين العشوائي Gradient Descent', duration: '30:15', isCompleted: false },
  { id: 'l-6', title: 'المشروع التطبيقي الأول: تصنيف البيانات', duration: '40:00', isCompleted: false },
];

export const CourseWorkspaceModal: React.FC<CourseWorkspaceModalProps> = ({
  isOpen,
  onClose,
  courseTitle = 'أساسيات الذكاء الاصطناعي وتعلم الآلة',
  initialLessonIndex = 3,
}) => {
  const [currentIdx, setCurrentIdx] = useState(initialLessonIndex);
  const [lessons, setLessons] = useState<LessonItem[]>(defaultLessons);
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
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="w-full max-w-5xl bg-slate-900 border border-blue-900/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-blue-900/60 bg-blue-950/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-sky-400/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-slate-100 font-bold font-['Cairo'] text-base md:text-lg">
                {courseTitle}
              </h2>
              <span className="text-slate-400 text-xs font-['Tajawal']">
                الدرس {currentIdx + 1} من {lessons.length} • نسبة إنجاز الدورة {progressPercent}%
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Completion Toast banner */}
        {showCompletionToast && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/40 px-6 py-2.5 flex items-center justify-between text-emerald-400 text-sm font-bold animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <span>أحسنت! تم إكمال الدرس وحفظ تقدمك بنجاح.</span>
            </div>
            <span className="text-xs font-mono">+50 نقطة خبرة</span>
          </div>
        )}

        {/* Workspace Body: Video Player + Curriculum sidebar */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Main Player & Content Arena */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto flex flex-col gap-4 border-b lg:border-b-0 lg:border-l border-blue-900/60">
            {/* Simulated 16:9 Lecture Player */}
            <div className="w-full aspect-video bg-slate-950 rounded-2xl border border-blue-900/80 relative overflow-hidden flex flex-col justify-between p-4 shadow-inner group">
              {/* Background ambient visuals */}
              <div className="absolute inset-0 bg-radial from-sky-400/10 via-slate-950/80 to-slate-950 pointer-events-none" />

              {/* Watermark badge */}
              <div className="relative z-10 flex justify-between items-center text-xs text-slate-400 font-mono">
                <span className="bg-slate-900/80 px-2.5 py-1 rounded-md border border-blue-900/60">
                  {currentLesson.title}
                </span>
                <span className="text-sky-400 font-bold">1080p HD</span>
              </div>

              {/* Center Play/Pause button */}
              <div className="relative z-10 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="size-16 rounded-full bg-[#E5B65C] hover:bg-amber-300 text-slate-900 flex items-center justify-center shadow-[0_0_24px_rgba(229,182,92,0.4)] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="translate-x-0.5" />}
                </button>
              </div>

              {/* Player Timeline & Controls */}
              <div className="relative z-10 flex flex-col gap-2">
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-l from-sky-400 to-[#E5B65C] w-2/5 rounded-full" />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-300 font-['Tajawal']">
                  <span>10:14 / {currentLesson.duration}</span>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Volume2 size={16} className="hover:text-slate-200 cursor-pointer" />
                    <Maximize2 size={16} className="hover:text-slate-200 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>

            {/* Lesson Info and Action Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div>
                <h3 className="text-slate-100 font-bold text-lg font-['Cairo']">
                  {currentLesson.title}
                </h3>
                <p className="text-slate-400 text-xs font-['Tajawal'] mt-1">
                  يتضمن هذا الدرس شرحًا عمليًا مدعومًا بالأمثلة البرمجية والتمارين الذاتية.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  className={`px-5 py-2.5 rounded-xl font-bold font-['Tajawal'] text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                    currentLesson.isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-[#E5B65C] hover:bg-amber-300 text-slate-900 shadow-[0_0_12px_rgba(229,182,92,0.3)]'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  <span>{currentLesson.isCompleted ? 'مكتمل ✓' : 'تحديد كمكتمل والمتابعة'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Curriculum Drawer */}
          <div className="w-full lg:w-80 bg-blue-950/20 p-4 overflow-y-auto flex flex-col gap-2 shrink-0">
            <h4 className="text-slate-300 font-bold text-sm font-['Cairo'] px-2 mb-1">
              قائمة دروس المسار ({completedCount}/{lessons.length})
            </h4>

            {lessons.map((lesson, idx) => {
              const isSelected = idx === currentIdx;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-full p-3 rounded-xl flex items-center justify-between gap-2 text-right transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-900/60 border border-[#E5B65C]/60 text-[#E5B65C] font-bold shadow-sm'
                      : 'bg-slate-900/70 hover:bg-slate-800/80 border border-blue-900/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`size-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        lesson.isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isSelected
                          ? 'bg-[#E5B65C]/20 text-[#E5B65C]'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {lesson.isCompleted ? '✓' : idx + 1}
                    </span>
                    <span className="text-xs font-['Tajawal'] truncate">{lesson.title}</span>
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
