import React from 'react';

export const DashboardStatsSidebar: React.FC = () => {
  return (
    <aside
      dir="rtl"
      data-layer="Sidebar-Widgets"
      className="SidebarWidgets w-full md:w-96 flex flex-col justify-start items-start gap-6 shrink-0"
    >
      {/* 1. Achievement Stats Widget Card */}
      <div
        data-layer="Widget-Card"
        className="WidgetCard self-stretch p-6 bg-slate-900 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex flex-col justify-start items-start gap-5"
      >
        <h3
          data-layer="إحصائيات الإنجاز"
          className="text-right text-orange-300 text-lg font-bold font-['Cairo'] leading-6"
        >
          إحصائيات الإنجاز
        </h3>

        <div data-layer="Stat-List" className="StatList self-stretch flex flex-col justify-start items-start gap-3">
          {/* Row 1: Attendance */}
          <div
            data-layer="Widget-Row"
            className="WidgetRow self-stretch p-3 bg-slate-900/90 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center"
          >
            <div
              data-layer="Value-Group"
              className="ValueGroup flex flex-col justify-start items-start gap-0.5 text-left"
            >
              <span
                data-layer="98%"
                className="text-sky-400 text-base font-bold font-['Tajawal'] leading-6"
              >
                98%
              </span>
              <span
                data-layer="ملتزم بالحصص المباشرة"
                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                ملتزم بالحصص المباشرة
              </span>
            </div>
            <span
              data-layer="معدل الحضور"
              className="text-right text-slate-200 text-base font-medium font-['Tajawal'] leading-6"
            >
              معدل الحضور
            </span>
          </div>

          {/* Row 2: GPA */}
          <div
            data-layer="Widget-Row"
            className="WidgetRow self-stretch p-3 bg-slate-900/90 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center"
          >
            <div
              data-layer="Value-Group"
              className="ValueGroup flex flex-col justify-start items-start gap-0.5 text-left"
            >
              <span
                data-layer="4.9 / 5.0"
                className="text-orange-300 text-base font-bold font-['Tajawal'] leading-6"
              >
                4.9 / 5.0
              </span>
              <span
                data-layer="تصنيف ممتاز"
                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                تصنيف ممتاز
              </span>
            </div>
            <span
              data-layer="المعدل التراكمي"
              className="text-right text-slate-200 text-base font-medium font-['Tajawal'] leading-6"
            >
              المعدل التراكمي
            </span>
          </div>

          {/* Row 3: Earned Points */}
          <div
            data-layer="Widget-Row"
            className="WidgetRow self-stretch p-3 bg-slate-900/90 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center"
          >
            <div
              data-layer="Value-Group"
              className="ValueGroup flex flex-col justify-start items-start gap-0.5 text-left"
            >
              <span
                data-layer="1,240 نقطة"
                className="text-emerald-500 text-base font-bold font-['Tajawal'] leading-6"
              >
                1,240 نقطة
              </span>
              <span
                data-layer="الترتيب العاشر على الدفعة"
                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                الترتيب العاشر على الدفعة
              </span>
            </div>
            <span
              data-layer="النقاط المكتسبة"
              className="text-right text-slate-200 text-base font-medium font-['Tajawal'] leading-6"
            >
              النقاط المكتسبة
            </span>
          </div>
        </div>
      </div>

      {/* 2. Upcoming Events Widget Card */}
      <div
        data-layer="Widget-Card"
        className="WidgetCard self-stretch p-6 bg-slate-900 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex flex-col justify-start items-start gap-5"
      >
        <h3
          data-layer="الأحداث الهامة القادمة"
          className="text-right text-orange-300 text-lg font-bold font-['Cairo'] leading-6"
        >
          الأحداث الهامة القادمة
        </h3>

        <div data-layer="Event-List" className="EventList self-stretch flex flex-col justify-start items-start gap-3">
          {/* Event 1: Project Submission */}
          <div
            data-layer="Event-Row"
            className="EventRow self-stretch p-3 bg-slate-900/90 rounded-xl border border-blue-900/50 flex justify-between items-center gap-3"
          >
            <div
              data-layer="Type-Tag"
              className="TypeTag px-2 py-1 bg-red-500/10 rounded-md flex justify-center items-center shrink-0 border border-red-500/20"
            >
              <span
                data-layer="تسليم"
                className="text-red-500 text-xs font-bold font-['Tajawal'] leading-4"
              >
                تسليم
              </span>
            </div>

            <div data-layer="Details" className="Details flex-1 flex flex-col justify-start items-start gap-0.5 text-right">
              <h4
                data-layer="تسليم مشروع تخرج الويب"
                className="text-slate-200 text-sm font-bold font-['Tajawal'] leading-5 truncate w-full"
              >
                تسليم مشروع تخرج الويب
              </h4>
              <span
                data-layer="الأحد، 15 يناير • 11:59 م"
                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                الأحد، 15 يناير • 11:59 م
              </span>
            </div>
          </div>

          {/* Event 2: Final Exam */}
          <div
            data-layer="Event-Row"
            className="EventRow self-stretch p-3 bg-slate-900/90 rounded-xl border border-blue-900/50 flex justify-between items-center gap-3"
          >
            <div
              data-layer="Type-Tag"
              className="TypeTag px-2 py-1 bg-sky-400/10 rounded-md flex justify-center items-center shrink-0 border border-sky-400/20"
            >
              <span
                data-layer="اختبار"
                className="text-sky-400 text-xs font-bold font-['Tajawal'] leading-4"
              >
                اختبار
              </span>
            </div>

            <div data-layer="Details" className="Details flex-1 flex flex-col justify-start items-start gap-0.5 text-right">
              <h4
                data-layer="الاختبار النهائي - بايثون"
                className="text-slate-200 text-sm font-bold font-['Tajawal'] leading-5 truncate w-full"
              >
                الاختبار النهائي - بايثون
              </h4>
              <span
                data-layer="الأربعاء، 18 يناير • 06:00 م"
                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                الأربعاء، 18 يناير • 06:00 م
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
