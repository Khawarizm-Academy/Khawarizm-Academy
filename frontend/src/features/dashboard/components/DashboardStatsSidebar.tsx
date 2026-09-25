import React from 'react';

export const DashboardStatsSidebar: React.FC = () => {
  return (
    <aside
      dir="rtl"

      className="SidebarWidgets w-full md:w-96 flex flex-col justify-start items-start gap-6 shrink-0"
    >
      {/* 1. Achievement Stats Widget Card */}
      <div

        className="WidgetCard self-stretch p-6 bg-slate-900 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex flex-col justify-start items-start gap-5"
      >
        <h3

          className="text-right text-orange-300 text-lg font-bold font-['IBM_Plex_Sans_Arabic'] leading-6"
        >
          إحصائيات الإنجاز
        </h3>

        <div className="StatList self-stretch flex flex-col justify-start items-start gap-3">
          {/* Row 1: Attendance */}
          <div

            className="WidgetRow self-stretch p-3 bg-slate-900/90 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center"
          >
            {/* Right: Label in RTL */}
            <span

              className="text-right text-slate-200 text-sm md:text-base font-medium font-['Tajawal'] leading-6"
            >
              معدل الحضور
            </span>

            {/* Left: Value Group in RTL */}
            <div

              className="ValueGroup flex flex-col justify-start items-start gap-0.5 text-left"
            >
              <span

                className="text-sky-400 text-base font-bold font-['Tajawal'] leading-6"
              >
                98%
              </span>
              <span

                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                ملتزم بالحصص المباشرة
              </span>
            </div>
          </div>

          {/* Row 2: GPA */}
          <div

            className="WidgetRow self-stretch p-3 bg-slate-900/90 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center"
          >
            {/* Right: Label in RTL */}
            <span

              className="text-right text-slate-200 text-sm md:text-base font-medium font-['Tajawal'] leading-6"
            >
              المعدل التراكمي
            </span>

            {/* Left: Value Group in RTL */}
            <div

              className="ValueGroup flex flex-col justify-start items-start gap-0.5 text-left"
            >
              <span

                className="text-[#E5B65C] text-base font-bold font-['Tajawal'] leading-6"
              >
                4.9 / 5.0
              </span>
              <span

                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                تصنيف ممتاز
              </span>
            </div>
          </div>

          {/* Row 3: Earned Points */}
          <div

            className="WidgetRow self-stretch p-3 bg-slate-900/90 rounded-xl outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center"
          >
            {/* Right: Label in RTL */}
            <span

              className="text-right text-slate-200 text-sm md:text-base font-medium font-['Tajawal'] leading-6"
            >
              النقاط المكتسبة
            </span>

            {/* Left: Value Group in RTL */}
            <div

              className="ValueGroup flex flex-col justify-start items-start gap-0.5 text-left"
            >
              <span

                className="text-emerald-400 text-base font-bold font-['Tajawal'] leading-6"
              >
                1,240 نقطة
              </span>
              <span

                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                الترتيب العاشر على الدفعة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Upcoming Events Widget Card */}
      <div

        className="WidgetCard self-stretch p-6 bg-slate-900 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex flex-col justify-start items-start gap-5"
      >
        <h3

          className="text-right text-[#E5B65C] text-lg font-bold font-['IBM_Plex_Sans_Arabic'] leading-6"
        >
          الأحداث الهامة القادمة
        </h3>

        <div className="EventList self-stretch flex flex-col justify-start items-start gap-3">
          {/* Event 1: Project Submission */}
          <div

            className="EventRow self-stretch p-3 bg-slate-900/90 rounded-xl border border-blue-900/50 flex justify-between items-center gap-3"
          >
            {/* Right: Event Details in RTL */}
            <div className="Details flex-1 flex flex-col justify-start items-start gap-0.5 text-right">
              <h4

                className="text-slate-200 text-sm font-bold font-['Tajawal'] leading-5 truncate w-full"
              >
                تسليم مشروع تخرج الويب
              </h4>
              <span

                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                الأحد، 15 يناير • 11:59 م
              </span>
            </div>

            {/* Left: Type Tag in RTL */}
            <div

              className="TypeTag px-2 py-1 bg-red-500/10 rounded-md flex justify-center items-center shrink-0 border border-red-500/20"
            >
              <span

                className="text-red-400 text-xs font-bold font-['Tajawal'] leading-4"
              >
                تسليم
              </span>
            </div>
          </div>

          {/* Event 2: Final Exam */}
          <div

            className="EventRow self-stretch p-3 bg-slate-900/90 rounded-xl border border-blue-900/50 flex justify-between items-center gap-3"
          >
            {/* Right: Event Details in RTL */}
            <div className="Details flex-1 flex flex-col justify-start items-start gap-0.5 text-right">
              <h4

                className="text-slate-200 text-sm font-bold font-['Tajawal'] leading-5 truncate w-full"
              >
                الاختبار النهائي - بايثون
              </h4>
              <span

                className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
              >
                الأربعاء، 18 يناير • 06:00 م
              </span>
            </div>

            {/* Left: Type Tag in RTL */}
            <div

              className="TypeTag px-2 py-1 bg-sky-400/10 rounded-md flex justify-center items-center shrink-0 border border-sky-400/20"
            >
              <span

                className="text-sky-400 text-xs font-bold font-['Tajawal'] leading-4"
              >
                اختبار
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
