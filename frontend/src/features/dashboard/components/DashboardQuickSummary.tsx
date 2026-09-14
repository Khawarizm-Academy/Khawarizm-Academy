import React from 'react';

interface DashboardQuickSummaryProps {
  activeCoursesCount?: number;
  closingScholarshipsCount?: number;
  registeredCompetitionsCount?: number;
  earnedCertificatesCount?: number;
  onChipClick?: (type: 'courses' | 'scholarships' | 'competitions' | 'certificates') => void;
}

export const DashboardQuickSummary: React.FC<DashboardQuickSummaryProps> = ({
  activeCoursesCount = 3,
  closingScholarshipsCount = 2,
  registeredCompetitionsCount = 1,
  earnedCertificatesCount = 6,
  onChipClick,
}) => {
  const chips = [
    {
      id: 'courses' as const,
      label: `${activeCoursesCount} دورات نشطة ومسجلة`,
      icon: (
        <span className="text-base" role="img" aria-label="دورات">
          📚
        </span>
      ),
    },
    {
      id: 'scholarships' as const,
      label: `${closingScholarshipsCount} منحتان قريبتا الانتهاء`,
      icon: (
        <span className="text-base" role="img" aria-label="منح">
          🎓
        </span>
      ),
    },
    {
      id: 'competitions' as const,
      label: `${registeredCompetitionsCount} مسابقة ذكاء اصطناعي مسجّل بها`,
      icon: (
        <span className="text-base" role="img" aria-label="مسابقات">
          🏆
        </span>
      ),
    },
    {
      id: 'certificates' as const,
      label: `${earnedCertificatesCount} شهادات موثقة`,
      icon: (
        <span className="text-base" role="img" aria-label="شهادات">
          📜
        </span>
      ),
    },
  ];

  return (
    <div className="w-full overflow-x-auto pb-1 scrollbar-none">
      <div className="flex items-center gap-3 min-w-max py-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => onChipClick?.(chip.id)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#061A3A]/70 hover:bg-[#0D2E68]/80 border border-[#167BDB]/30 hover:border-[#29A9FF]/60 text-xs sm:text-sm font-['Tajawal',sans-serif] text-[#8299B5] hover:text-[#DCE5EE] transition-all duration-200 cursor-pointer active:scale-95 shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
          >
            {chip.icon}
            <span className="font-medium">{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
