import React, { useState } from 'react';
import { Award, CheckCircle2, Clock, FileCheck, Send, X, Sparkles } from 'lucide-react';
import type { SavedScholarshipItem } from './SavedScholarshipsView';

interface ScholarshipApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scholarship: SavedScholarshipItem | null;
}

export const ScholarshipApplicationModal: React.FC<ScholarshipApplicationModalProps> = ({
  isOpen,
  onClose,
  scholarship,
}) => {
  const [statement, setStatement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !scholarship) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-blue-900/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-blue-900/60 bg-blue-950/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-[#E5B65C]/15 border border-[#E5B65C]/40 flex items-center justify-center text-[#E5B65C]">
              <Award size={18} />
            </div>
            <div>
              <h2 className="text-slate-100 font-bold font-['IBM_Plex_Sans_Arabic'] text-base md:text-lg truncate max-w-md">
                {scholarship.title}
              </h2>
              <span className="text-slate-400 text-xs font-['Tajawal']">
                الجهة المانحة: {scholarship.provider}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Deadline Banner */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-blue-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-slate-300 font-['Tajawal']">
              <Clock size={16} className={scholarship.isUrgent ? 'text-red-400' : 'text-[#E5B65C]'} />
              <span>المهلة المتبقية لغلق باب التقديم:</span>
            </div>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${
                scholarship.isUrgent
                  ? 'bg-red-500/15 text-red-400 border border-red-500/40 animate-pulse'
                  : 'bg-[#E5B65C]/15 text-[#E5B65C] border border-[#E5B65C]/40'
              }`}
            >
              {scholarship.deadlineText}
            </span>
          </div>

          {/* Coverage & Eligibility Details */}
          <div className="space-y-3">
            <h3 className="text-slate-200 font-bold text-sm font-['IBM_Plex_Sans_Arabic']">مزايا وشروط المنحة</h3>
            <p className="text-slate-400 text-xs font-['Tajawal'] leading-relaxed bg-blue-950/30 p-3 rounded-xl border border-blue-900/40">
              {scholarship.coverage}
            </p>
          </div>

          {/* Automatic Profile Verification Checklist */}
          <div className="space-y-3">
            <h3 className="text-slate-200 font-bold text-sm font-['IBM_Plex_Sans_Arabic']">
              المستندات والمعايير المطابقة من ملفك الأكاديمي
            </h3>
            <div className="space-y-2">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-['Tajawal']">
                <span className="text-slate-200">المعدل التراكمي المطلوب: {scholarship.gpaRequirement}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={14} /> مطابق ومكتمل
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-['Tajawal']">
                <span className="text-slate-200">شهادة إتقان اللغة الإنجليزية (IELTS / TOEFL)</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <FileCheck size={14} /> موثقة في ملفك
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs font-['Tajawal']">
                <span className="text-slate-200">خطاب التوصية الأكاديمي المعتمد من الأكاديمية</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <FileCheck size={14} /> جاهز ومرفق
                </span>
              </div>
            </div>
          </div>

          {/* Submission Form or Success State */}
          {isSubmitted ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl text-center space-y-3 animate-fade-in">
              <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <h4 className="text-slate-100 font-bold text-base font-['IBM_Plex_Sans_Arabic']">
                تم تقديم طلبك للمنحة بنجاح!
              </h4>
              <p className="text-slate-400 text-xs font-['Tajawal'] max-w-sm mx-auto">
                رقم التقديم المرجعي: <span className="text-sky-300 font-mono font-bold">KHW-SCH-2026-881</span>.
                ستتلقى إشعارًا فوريًا في مركز الإشعارات بمجرد تحديث حالة الطلب.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold font-['Tajawal'] text-xs rounded-xl cursor-pointer transition-all"
              >
                العودة للوحة المحفوظات
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-bold font-['IBM_Plex_Sans_Arabic'] mb-1.5">
                  خطاب النية أو الدافع الشخصي (اختياري)
                </label>
                <textarea
                  rows={3}
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="اكتب بإيجاز أهدافك الأكاديمية والمهنية وسبب اختيارك لهذه المنحة..."
                  className="w-full bg-slate-950 border border-blue-900/80 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-sky-400 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-[#E5B65C] to-amber-400 hover:from-amber-400 hover:to-[#E5B65C] text-slate-900 font-bold font-['Tajawal'] text-base rounded-full flex justify-center items-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(229,182,92,0.3)] hover:shadow-[0_4px_24px_rgba(229,182,92,0.5)] transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span className="size-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>جاري إرسال الطلب والمستندات...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>تأكيد وتقديم الطلب الآن</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
