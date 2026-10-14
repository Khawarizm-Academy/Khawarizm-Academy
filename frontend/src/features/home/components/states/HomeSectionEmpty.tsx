import React from 'react';
import { BookOpen, GraduationCap, LayoutGrid, type LucideIcon } from 'lucide-react';
import { StatePanel } from '@/shared/components/State/StatePanel';

export type HomeSectionKey = 'courses' | 'scholarships' | 'quickLinks';

interface HomeSectionEmptyCopy {
  icon: LucideIcon;
  title: string;
  text: string;
}

/** Arabic copy for every empty home rail, shared by the desktop and mobile surfaces. */
const SECTION_EMPTY: Record<HomeSectionKey, HomeSectionEmptyCopy> = {
  courses: {
    icon: BookOpen,
    title: 'لا توجد دورات مميزة حالياً',
    text: 'نعمل على إضافة دورات جديدة قريباً. تفضل بزيارة الكتالوج لاستكشاف كل المتاح.',
  },
  scholarships: {
    icon: GraduationCap,
    title: 'لا توجد منح متاحة حالياً',
    text: 'لم تُنشر منح جديدة بعد. عُد قريباً لاكتشاف أحدث الفرص الدولية.',
  },
  quickLinks: {
    icon: LayoutGrid,
    title: 'لا توجد اختصارات متاحة',
    text: 'ستظهر روابط الوصول السريع هنا بمجرد إتاحتها.',
  },
};

/** On-brand empty chamber for one home rail; the section heading stays above it. */
export const HomeSectionEmpty: React.FC<{ section: HomeSectionKey }> = ({ section }) => {
  const { icon: Icon, title, text } = SECTION_EMPTY[section];
  return <StatePanel title={title} text={text} icon={<Icon size={32} />} />;
};
