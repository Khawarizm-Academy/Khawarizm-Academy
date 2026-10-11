import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import catalogJson from '@/shared/json/catalog.json';
import type { CatalogItem } from '@/shared/mocks/catalog';

/** Scholarship status code to its Arabic label. */
const STATUS_LABELS = catalogJson.statusLabels as Record<string, string>;

interface ItemDetailViewProps {
  item: CatalogItem;
  backPath: string;
  primaryLabel: string;
}

/** Course vs scholarship tone classes so the two share one layout. */
const TONE = {
  course: {
    frame: 'card-interactive-blue',
    category: 'detail-category detail-category-blue',
    bullet: 'detail-bullet detail-bullet-blue',
    primary: 'btn-outline-blue',
    badge: 'badge-blue',
  },
  scholarship: {
    frame: 'card-interactive-gold',
    category: 'detail-category detail-category-gold',
    bullet: 'detail-bullet detail-bullet-gold',
    primary: 'btn-gold',
    badge: 'badge-gold-subtle',
  },
} as const;

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
  const tone = TONE[isCourse ? 'course' : 'scholarship'];

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
      <button type="button" onClick={() => navigate(backPath)} className="detail-back animate-fade-in-up">
        <ArrowLeft size={16} />
        العودة إلى الدليل
      </button>

      <div className="detail-layout animate-fade-in-up">
        {/* 1. Media / CTA Column */}
        <div className="detail-media-col animate-pop-in animation-delay-100">
          <div className={`detail-frame group ${tone.frame}`}>
            <img src={item.thumbnailUrl} alt={item.title} className="detail-frame-img" />
            <div className="detail-frame-shade" />
            <span className={tone.category}>{item.category}</span>
          </div>

          <button type="button" className={`${tone.primary} w-full py-3.5 text-sm font-bold`}>
            {primaryLabel}
          </button>
          <button type="button" onClick={() => navigate(backPath)} className="btn-pill-subtle w-full py-3 text-sm">
            استكشاف المزيد
          </button>
        </div>

        {/* 2. Info Column */}
        <div className="detail-info-col">
          <div className="detail-meta-line">
            <span className={tone.badge}>{isCourse ? 'دورة تدريبية' : 'منحة دراسية'}</span>
            <span className="detail-provider">
              {isCourse ? item.instructor : item.provider}
            </span>
          </div>

          <h1 className="detail-title">{item.title}</h1>

          <p className="detail-desc">
            وصف تفصيلي للفرصة التعليمية سيتم ربطه هنا مع البيانات الحية من منصة خوارزم. تغطي هذه الصفحة
            {isCourse ? ' المهارات والشهادات المعتمدة ومسار المراجعات والتقييمات.' : ' شروط الترشح، حزمة التمويل الكاملة، والخطوات الزمنية للتقديم.'}
          </p>

          {/* Meta Chips Grid */}
          <div className="detail-chips">
            {metaChips.map((chip, idx) =>
              chip.value ? (
                /* Chips cascade with a soft stagger after the title lands */
                <div
                  key={chip.label}
                  className="detail-chip animate-pop-in"
                  style={{ animationDelay: `${180 + idx * 60}ms` }}
                >
                  <span className="detail-chip-label">{chip.label}</span>
                  <span className="detail-chip-value">{chip.value}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Placeholder section */}
          <div className="detail-panel">
            <h2 className="detail-panel-title">
              {isCourse ? 'ماذا ستتعلم في هذه الدورة؟' : 'مميزات هذه المنحة'}
            </h2>
            <ul className="detail-list">
              {Array.from({ length: 4 }).map((_, idx) => (
                <li key={idx} className="detail-list-item">
                  <span className={tone.bullet} />
                  <span className="detail-li-text">
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
