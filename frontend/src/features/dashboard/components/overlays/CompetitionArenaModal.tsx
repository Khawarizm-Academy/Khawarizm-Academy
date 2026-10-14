import React, { useState } from 'react';
import { Trophy, Play, CheckCircle2, X, Code2 } from 'lucide-react';
import type { CompetitionItem } from '@/features/dashboard/components/views/CompetitionsCertificatesView';
import { useDashboardContent } from '@/features/dashboard/context/DashboardContentContext';
import { DashboardSectionEmpty } from '@/features/dashboard/components/states/DashboardSectionEmpty';

interface CompetitionArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  competition: CompetitionItem | null;
}

type ArenaLang = 'python' | 'ts';

/** Live leaderboard rows (empty until the challenge provides them). */
const LEADERS: Array<{ name: string; score: string; tone: 'gold' | 'plain' }> = [];

/** Leaderboard row + score tones by place. */
const LEADER_TONE = {
  gold: {
    row: 'bg-gold-400/10 border border-gold-400/40 text-gold-400 font-bold',
    score: 'font-mono',
  },
  plain: {
    row: 'bg-navy-900/70 border border-navy-600/40 text-slate-300',
    score: 'font-mono text-slate-400',
  },
} as const;

export const CompetitionArenaModal: React.FC<CompetitionArenaModalProps> = ({
  isOpen,
  onClose,
  competition,
}) => {
  const { chambers } = useDashboardContent();
  const LANGUAGES = chambers.arenaLanguages;
  const [code, setCode] = useState('');
  const [selectedLang, setSelectedLang] = useState<ArenaLang>('python');
  const [testResult, setTestResult] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');

  if (!isOpen || !competition) return null;

  const handleRunTests = () => {
    setTestResult('running');
    setTimeout(() => {
      setTestResult('passed');
    }, 1200);
  };

  return (
    <div dir="rtl" className="dash-modal-overlay">
      <div className="dash-modal-shell max-w-5xl">
        {/* Arena header */}
        <div className="dash-modal-head">
          <div className="dash-modal-lead">
            <div className="dash-modal-icon dash-modal-icon-gold">
              <Trophy size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="dash-modal-title">{competition.title}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
                  الجولة المباشرة
                </span>
              </div>
              <span className="dash-modal-sub">
                الترتيب الحالي: المركز الأول (950 نقطة) • المتبقي: 01:24:18
              </span>
            </div>
          </div>

          <button type="button" onClick={onClose} className="dash-modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Arena body */}
        <div className="dash-modal-body">
          {/* Problem description & leaderboard (right in RTL) */}
          <div className="w-full lg:w-96 p-5 md:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-l border-navy-600/60 space-y-5 bg-navy-950/40">
            <DashboardSectionEmpty
              icon={<Trophy size={28} className="text-gold-400" />}
              title="لا يوجد تحدٍّ متاح حالياً"
              text="سيظهر وصف التحدي البرمجي هنا بمجرد نشره."
            />

            {/* Mini live leaderboard, or its empty state */}
            <div className="space-y-2 pt-2 border-t border-navy-600/40">
              <h4 className="text-slate-300 font-bold text-xs font-display">
                لوحة الصدارة المباشرة
              </h4>
              {LEADERS.length === 0 ? (
                <p className="text-slate-500 text-xs py-2">لا توجد نتائج بعد.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {LEADERS.map((leader) => {
                    const tone = LEADER_TONE[leader.tone];
                    return (
                      <div key={leader.name} className={`dash-leader ${tone.row}`}>
                        <span>{leader.name}</span>
                        <span className={tone.score}>{leader.score}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Interactive code editor arena (left in RTL) */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto flex flex-col justify-between gap-4 bg-navy-950">
            {/* Editor toolbar */}
            <div className="flex justify-between items-center pb-2 border-b border-navy-600/60">
              <div className="flex items-center gap-2 text-xs">
                <Code2 size={16} className="text-blue-400" />
                <span className="text-slate-300 font-bold">محرر الأكواد التفاعلي</span>
              </div>

              {/* Language selector */}
              <div className="flex items-center gap-1 bg-navy-900 p-1 rounded-xl border border-navy-600/60 text-xs font-mono">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLang(lang.id)}
                    className={`dash-lang ${selectedLang === lang.id ? 'dash-lang-on' : 'dash-lang-off'}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code input textarea */}
            <div className="flex-1 min-h-[260px] relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="dash-editor"
              />
            </div>

            {/* Test results output */}
            {testResult === 'running' && (
              <div className="p-3 bg-navy-950/60 border border-blue-400/40 rounded-xl flex items-center gap-2 text-blue-400 text-xs">
                <span className="size-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>جاري تشغيل حالات الاختبار...</span>
              </div>
            )}
            {testResult === 'passed' && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-400 text-xs font-bold animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>اجتاز الكود كافة حالات الاختبار (5/5 Passed) • زمن التنفيذ: 42ms</span>
                </div>
                <span className="font-mono">+100 نقطة</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={handleRunTests} className="dash-cta-run">
                <Play size={14} />
                <span>تشغيل حالات الاختبار</span>
              </button>

              <button type="button" onClick={handleRunTests} className="btn-gold">
                <span>تسليم الحل النهائي</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
