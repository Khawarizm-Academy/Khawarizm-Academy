import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from '../../../app/routerContext';
import catalogJson from '../../json/catalog.json';
import type { CatalogItem } from '../../../mocks/catalog';

/** Scholarship status code to its Arabic label. */
const STATUS_LABELS = catalogJson.statusLabels as Record<string, string>;

interface ItemDetailViewProps {
  item: CatalogItem;
  backPath: string;
  primaryLabel: string;
}

/**
 * Shared detail layout for course & scholarship detail pages.
 * Purely presentational — the parent pages own the data fetching.
 */
export const ItemDetailView: React.FC<ItemDetailViewProps> = ({
  item,
  backPath,
  primaryLabel,
}) => {
  const navigate = useNavigate();
  const isCourse = item.type === 'course';

  const metaChips: { label: string; value?: string }[] = isCourse
    ? [
        { label: 'التقييم', value: item.rating ? `${item.rating.toFixed(1)} من 5` : undefined },
        { label: 'المدة', value: item.duration },
        { label: 'الدروس', value: item.lessonsCount ? `${item.lessonsCount} درسًا` : undefined },
        { label: 'المستوى', value: item.courseLevelAr },
        { label: 'اللغة', value: item.language },
        { label: 'التكلفة', value: item.priceLabel },
      ]
    : [
        { label: 'الدولة', value: item.country },
        { label: 'الدرجة العلمية', value: item.degreeLabel },
        { label: 'التغطية', value: item.coverageLabel },
        { label: 'الموعد النهائي', value: item.deadlineBadge },
        { label: 'الحالة', value: STATUS_LABELS[item.status ?? 'closed'] },
        { label: 'اللغة', value: item.language },
      ];

  return (
    <main className="content-container">
      <button
        type="button"
        onClick={() => navigate(backPath)}
        className="inline-flex items-center gap-2 text-[#29A9FF] text-sm font-['Tajawal'] hover:text-white transition-colors mb-6 animate-fade-in-up"
      >
        <ArrowLeft size={16} />
        العودة إلى الدليل
      </button>

      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
        {/* 1. Media / CTA Column */}
        <div className="lg:col-span-1 flex flex-col gap-5 animate-pop-in animation-delay-100">
          <div className={`group relative w-full aspect-video lg:aspect-[4/3] rounded-2xl overflow-hidden border border-[#1B3F80] bg-[#040F24] ${isCourse ? 'card-interactive-blue' : 'card-interactive-gold'}`}>
            <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover opacity-45 transition-all duration-500 group-hover:scale-105 group-hover:opacity-55" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061A3A] via-transparent to-[#040F24]/60" />
            <span
              className={`absolute top-3 right-3 px-3 py-1 rounded-md text-[11px] font-['IBM_Plex_Sans_Arabic'] font-semibold shadow-md ${
                isCourse ? 'bg-[#040F24]/90 border border-[#29A9FF]/50 text-[#29A9FF]' : 'bg-[#040F24]/90 border border-[#E5B65C]/50 text-[#E5B65C]'
              }`}
            >
              {item.category}
            </span>
          </div>

          <button type="button" className={`${isCourse ? 'btn-outline-blue' : 'btn-gold'} w-full py-3.5 text-sm font-bold`}>
            {primaryLabel}
          </button>
          <button type="button" onClick={() => navigate(backPath)} className="btn-pill-subtle w-full py-3 text-sm">
            استكشاف المزيد
          </button>
        </div>

        {/* 2. Info Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className={`${isCourse ? 'badge-blue' : 'badge-gold-subtle'}`}>
              {isCourse ? 'دورة تدريبية' : 'منحة دراسية'}
            </span>
            <span className="text-xs text-[#8299B5] font-['Tajawal']">
              {isCourse ? item.instructor : item.provider}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['IBM_Plex_Sans_Arabic'] leading-tight tracking-tight">
            {item.title}
          </h1>

          <p className="text-slate-400 text-sm sm:text-base font-['Tajawal'] leading-relaxed max-w-2xl">
            وصف تفصيلي للفرصة التعليمية سيتم ربطه هنا مع البيانات الحية من منصة خوارزم. تغطي هذه الصفحة
            {isCourse ? ' المهارات والشهادات المعتمدة ومسار المراجعات والتقييمات.' : ' شروط الترشح، حزمة التمويل الكاملة، والخطوات الزمنية للتقديم.'}
          </p>

          {/* Meta Chips Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metaChips.map((chip, idx) =>
              chip.value ? (
                /* Chips cascade with a soft stagger after the title lands */
                <div
                  key={chip.label}
                  className="glass-panel rounded-xl p-3.5 border border-[#1B3F80]/50 flex flex-col gap-1 animate-pop-in"
                  style={{ animationDelay: `${180 + idx * 60}ms` }}
                >
                  <span className="text-[11px] text-[#8299B5] font-['Tajawal']">{chip.label}</span>
                  <span className="text-sm font-bold text-white font-['IBM_Plex_Sans_Arabic']">{chip.value}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Placeholder section */}
          <div className="glass-panel rounded-2xl p-6 border border-[#1B3F80]/50 flex flex-col gap-3">
            <h2 className="text-lg font-bold text-white font-['IBM_Plex_Sans_Arabic']">
              {isCourse ? 'ماذا ستتعلم في هذه الدورة؟' : 'مميزات هذه المنحة'}
            </h2>
            <ul className="flex flex-col gap-2.5">
              {Array.from({ length: 4 }).map((_, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isCourse ? 'bg-[#29A9FF]' : 'bg-[#E5B65C]'}`} />
                  <span className="text-sm text-slate-400 font-['Tajawal']">
                    {isCourse
                      ? ['محتوى علمي منظّم بوحدات تفاعلية', 'تطبيق عملي ومشاريع حقيقية', 'شهادة إتمام معتمدة', 'متابعة وتقييم من خبراء المجال'][idx]
                      : ['تغطية رسوم الدراسة بالكامل', 'دعم نفقات المعيشة والسفر', 'إشراف أكاديمي من جامعات عالمية', 'فرصة لشبكة علاقات دولية'][idx]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
};