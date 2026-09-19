import React, { useState } from 'react';
import { Trophy, Play, CheckCircle2, X, Code2 } from 'lucide-react';
import type { CompetitionItem } from './CompetitionsCertificatesView';

interface CompetitionArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  competition: CompetitionItem | null;
}

const starterPython = `def solve(arr, k):
    # مسألة اليوم: إيجاد العنصر الأكثر تكراراً في المصفوفة
    counts = {}
    for num in arr:
        counts[num] = counts.get(num, 0) + 1
    
    # فرز العناصر بناءً على التكرار
    sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    return [item[0] for item in sorted_items[:k]]

# اختبار الكود
print(solve([1,1,1,2,2,3], 2)) # المتوقع: [1, 2]
`;

export const CompetitionArenaModal: React.FC<CompetitionArenaModalProps> = ({
  isOpen,
  onClose,
  competition,
}) => {
  const [code, setCode] = useState(starterPython);
  const [selectedLang, setSelectedLang] = useState<'python' | 'ts' | 'cpp'>('python');
  const [testResult, setTestResult] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');

  if (!isOpen || !competition) return null;

  const handleRunTests = () => {
    setTestResult('running');
    setTimeout(() => {
      setTestResult('passed');
    }, 1200);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="w-full max-w-5xl bg-slate-900 border border-blue-900/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Arena Header */}
        <div className="px-6 py-4 border-b border-blue-900/60 bg-blue-950/40 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-[#E5B65C]/15 border border-[#E5B65C]/40 flex items-center justify-center text-[#E5B65C]">
              <Trophy size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-slate-100 font-bold font-['Cairo'] text-base md:text-lg">
                  {competition.title}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
                  الجولة المباشرة
                </span>
              </div>
              <span className="text-slate-400 text-xs font-['Tajawal']">
                الترتيب الحالي: المركز الأول (950 نقطة) • المتبقي: 01:24:18
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

        {/* Arena Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Problem Description & Leaderboard (Right in RTL) */}
          <div className="w-full lg:w-96 p-5 md:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-l border-blue-900/60 space-y-5 bg-slate-950/40">
            <div>
              <span className="text-[#E5B65C] font-bold text-xs font-['Cairo'] uppercase">
                التحدي البرمجي رقم #42
              </span>
              <h3 className="text-slate-100 font-bold text-base font-['Cairo'] mt-0.5">
                تصفية العناصر الأكثر تكراراً في تدفق البيانات
              </h3>
              <p className="text-slate-400 text-xs font-['Tajawal'] leading-relaxed mt-2">
                لديك قائمة أعداد صحيحة `nums` وعدد صحيح `k`، المطلوب كتابة دالة تعيد أكثر `k` عناصر تكراراً بأفضل تعقيد زمني ممكن (أقل من O(n log n)).
              </p>
            </div>

            {/* Test Case Example */}
            <div className="p-3 bg-slate-900 rounded-xl border border-blue-900/60 font-mono text-xs space-y-1.5 text-right">
              <span className="text-slate-400 text-[11px] block font-['Tajawal']">مثال الاختبار الأول:</span>
              <div className="text-slate-300">المدخل: nums = [1,1,1,2,2,3], k = 2</div>
              <div className="text-emerald-400">المخرج: [1, 2]</div>
            </div>

            {/* Mini Live Leaderboard */}
            <div className="space-y-2 pt-2 border-t border-blue-900/40">
              <h4 className="text-slate-300 font-bold text-xs font-['Cairo']">
                لوحة الصدارة المباشرة
              </h4>
              <div className="space-y-1.5 text-xs font-['Tajawal']">
                <div className="p-2 bg-[#E5B65C]/10 border border-[#E5B65C]/40 rounded-lg flex justify-between items-center text-[#E5B65C] font-bold">
                  <span>1. أحمد الغامدي (أنت)</span>
                  <span className="font-mono">950 نقطة</span>
                </div>
                <div className="p-2 bg-slate-900/70 border border-blue-900/40 rounded-lg flex justify-between items-center text-slate-300">
                  <span>2. نورة السبيعي</span>
                  <span className="font-mono text-slate-400">920 نقطة</span>
                </div>
                <div className="p-2 bg-slate-900/70 border border-blue-900/40 rounded-lg flex justify-between items-center text-slate-300">
                  <span>3. راكان العتيبي</span>
                  <span className="font-mono text-slate-400">880 نقطة</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Code Editor Arena (Left in RTL) */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto flex flex-col justify-between gap-4 bg-slate-950">
            {/* Editor Toolbar */}
            <div className="flex justify-between items-center pb-2 border-b border-blue-900/60">
              <div className="flex items-center gap-2 text-xs font-['Tajawal']">
                <Code2 size={16} className="text-sky-400" />
                <span className="text-slate-300 font-bold">محرر الأكواد التفاعلي</span>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-blue-900/60 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setSelectedLang('python')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedLang === 'python'
                      ? 'bg-sky-400 text-slate-900 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Python 3.12
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLang('ts')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedLang === 'ts'
                      ? 'bg-sky-400 text-slate-900 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  TypeScript
                </button>
              </div>
            </div>

            {/* Code Input Textarea */}
            <div className="flex-1 min-h-[260px] relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="w-full h-full bg-[#030914] border border-blue-900/80 rounded-2xl p-4 font-mono text-xs md:text-sm text-sky-200 outline-none focus:border-sky-400 leading-relaxed transition-colors resize-none shadow-inner"
              />
            </div>

            {/* Test Results Output */}
            {testResult === 'running' && (
              <div className="p-3 bg-blue-950/60 border border-sky-400/40 rounded-xl flex items-center gap-2 text-sky-400 text-xs font-['Tajawal']">
                <span className="size-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <span>جاري تشغيل حالات الاختبار...</span>
              </div>
            )}
            {testResult === 'passed' && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-400 text-xs font-['Tajawal'] font-bold animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>اجتاز الكود كافة حالات الاختبار (5/5 Passed) • زمن التنفيذ: 42ms</span>
                </div>
                <span className="font-mono">+100 نقطة</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleRunTests}
                className="px-6 py-2.5 rounded-xl border border-sky-400 text-sky-400 hover:bg-sky-400/10 font-bold font-['Tajawal'] text-xs md:text-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <Play size={14} />
                <span>تشغيل حالات الاختبار</span>
              </button>

              <button
                type="button"
                onClick={handleRunTests}
                className="px-6 py-2.5 rounded-xl bg-[#E5B65C] hover:bg-amber-300 text-slate-900 font-bold font-['Tajawal'] text-xs md:text-sm flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(229,182,92,0.3)] transition-all"
              >
                <span>تسليم الحل النهائي</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
