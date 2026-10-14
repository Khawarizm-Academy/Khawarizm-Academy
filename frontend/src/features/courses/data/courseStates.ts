/** Empty-state copy for a course section, so no label is ever typed twice. */
export interface CourseEmptyCopy {
  title: string;
  text: string;
}

/** One entry per course section that can come back empty. */
export const courseEmptyStates: Record<
  'outcomes' | 'curriculum' | 'module' | 'live' | 'problems' | 'exam' | 'related' | 'path' | 'about' | 'instructor',
  CourseEmptyCopy
> = {
  outcomes: {
    title: 'لا توجد نتائج تعلّم بعد',
    text: 'سيُعرض هنا ما سيتقنه الطالب بعد إتمام الدورة.',
  },
  curriculum: {
    title: 'لم تُضف وحدات المنهج بعد',
    text: 'سيظهر المنهج الكامل بمجرد نشر محتوى الدورة.',
  },
  module: {
    title: 'لا توجد دروس في هذه الوحدة بعد',
    text: '',
  },
  live: {
    title: 'لا توجد جلسات مباشرة مجدولة',
    text: 'ستظهر هنا مواعيد المراجعات الأسبوعية عند تحديدها.',
  },
  problems: {
    title: 'لا توجد مسائل تدريبية',
    text: 'لم تُضف مسائل لهذا الدرس بعد.',
  },
  exam: {
    title: 'لا يوجد اختبار نهائي',
    text: 'لم يُضف اختبار لهذه الدورة بعد.',
  },
  related: {
    title: 'لا توجد دورات ذات صلة',
    text: 'لم نقترح دورات مشابهة لهذه الدورة بعد.',
  },
  path: {
    title: 'المسار الدراسي فارغ',
    text: 'لم تُضف دروس إلى هذه الدورة بعد.',
  },
  about: {
    title: 'لا يوجد وصف للدورة',
    text: 'لم يُضف وصف تفصيلي لهذه الدورة بعد.',
  },
  instructor: {
    title: 'لم تُضف بيانات المدرّب',
    text: 'ستظهر هنا نبذة عن مدرّب الدورة بعد إضافتها.',
  },
};
