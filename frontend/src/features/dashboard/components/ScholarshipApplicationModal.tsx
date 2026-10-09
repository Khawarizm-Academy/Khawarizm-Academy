import React, { useState } from 'react';
import { Award, CheckCircle2, Clock, FileCheck, Send, X, Sparkles, type LucideIcon } from 'lucide-react';
import type { SavedScholarshipItem } from './SavedScholarshipsView';
import dashboardChambersJson from '../../../shared/json/dashboardChambers.json';

interface ScholarshipApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scholarship: SavedScholarshipItem | null;
}

interface ScholarshipCheck {
  kind: 'gpa' | 'static';
  label?: string;
  icon: 'CheckCircle2' | 'FileCheck';
  status: string;
}

/** Deadline chip + clock tone by urgency. */
const DEADLINE = {
  urgent: {
    chip: 'bg-red-500/15 text-red-400 border border-red-500/40 animate-pulse',
    icon: 'text-red-400',
  },
  normal: { chip: 'bg-gold-400/15 text-gold-400 border border-gold-400/40', icon: 'text-gold-400' },
} as const;

const CHECK_ICON: Record<string, LucideIcon> = { CheckCircle2, FileCheck };
const CHECKS = dashboardChambersJson.scholarshipChecks as ScholarshipCheck[];

/** GPA row reads the live requirement; static rows carry their own label. */
const checkLabel = (check: ScholarshipCheck, scholarship: SavedScholarshipItem) =>
  check.kind === 'gpa'
    ? `المعدل التراكمي المطلوب: ${scholarship.gpaRequirement}`
    : check.label;

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

  const deadline = scholarship.isUrgent ? DEADLINE.urgent : DEADLINE.normal;

  return (
    <div dir="rtl" className="dash-modal-overlay">
      <div className="dash-modal-shell max-w-2xl">
        {/* Header */}
        <div className="dash-modal-head">
          <div className="dash-modal-lead">
            <div className="dash-modal-icon dash-modal-icon-gold">
              <Award size={18} />
            </div>
            <div>
              <h2 className="dash-modal-title truncate max-w-md">{scholarship.title}</h2>
              <span className="dash-modal-sub">الجهة المانحة: {scholarship.provider}</span>
            </div>
          </div>

          <button type="button" onClick={onClose} className="dash-modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Deadline banner */}
          <div className="p-4 bg-navy-950 rounded-2xl border border-navy-600/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <Clock size={16} className={deadline.icon} />
              <span>المهلة المتبقية لغلق باب التقديم:</span>
            </div>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold font-mono ${deadline.chip}`}>
              {scholarship.deadlineText}
            </span>
          </div>

          {/* Coverage & eligibility details */}
          <div className="space-y-3">
            <h3 className="dash-modal-h3">مزايا وشروط المنحة</h3>
            <p className="text-slate-400 text-xs leading-relaxed bg-navy-950/30 p-3 rounded-xl border border-navy-600/40">
              {scholarship.coverage}
            </p>
          </div>

          {/* Automatic profile verification checklist */}
          <div className="space-y-3">
            <h3 className="dash-modal-h3">المستندات والمعايير المطابقة من ملفك الأكاديمي</h3>
            <div className="space-y-2">
              {CHECKS.map((check) => {
                const CheckIcon = CHECK_ICON[check.icon];
                return (
                  <div key={check.status} className="dash-check">
                    <span className="text-slate-200">{checkLabel(check, scholarship)}</span>
                    <span className="dash-check-ok">
                      <CheckIcon size={14} /> {check.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submission form or success state */}
          {isSubmitted ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl text-center space-y-3 animate-fade-in">
              <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <Sparkles size={24} />
              </div>
              <h4 className="text-slate-100 font-bold text-base font-display">
                تم تقديم طلبك للمنحة بنجاح!
              </h4>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                رقم التقديم المرجعي:{' '}
                <span className="text-sky-300 font-mono font-bold">KHW-SCH-2026-881</span>.
                ستتلقى إشعارًا فوريًا في مركز الإشعارات بمجرد تحديث حالة الطلب.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-navy-900 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                العودة للوحة المحفوظات
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-bold font-display mb-1.5">
                  خطاب النية أو الدافع الشخصي (اختياري)
                </label>
                <textarea
                  rows={3}
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="اكتب بإيجاز أهدافك الأكاديمية والمهنية وسبب اختيارك لهذه المنحة..."
                  className="dash-input"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-gold w-full py-3.5 text-base disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span className="size-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
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
