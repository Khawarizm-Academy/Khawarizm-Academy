import React, { useState } from 'react';
import { useNavigate } from '../../../app/routerContext';

interface SavedScholarshipItem {
  id: string;
  title: string;
  provider: string;
  deadlineText: string;
  isUrgent: boolean;
}

interface FavoriteCourseItem {
  id: string;
  title: string;
  provider: string;
  durationText: string;
}

const initialScholarships: SavedScholarshipItem[] = [
  {
    id: 'sch-kaust-01',
    title: 'منحة التميز لعلوم الحاسب والابتكار التقني',
    provider: 'جامعة الملك عبدالله للعلوم والتقنية',
    deadlineText: 'باقي 18 ساعة',
    isUrgent: true,
  },
  {
    id: 'sch-tuwaiq-02',
    title: 'برنامج الابتعاث الثقافي والتقني الدولي',
    provider: 'وزارة الثقافة ومؤسسة طويق',
    deadlineText: 'باقي 5 أيام',
    isUrgent: false,
  },
  {
    id: 'sch-sdaia-03',
    title: 'منحة الذكاء الاصطناعي وعلوم البيانات المتقدمة',
    provider: 'الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا)',
    deadlineText: 'باقي 12 يومًا',
    isUrgent: false,
  },
  {
    id: 'sch-oxford-04',
    title: 'زمالة أكسفورد لأبحاث الحوسبة السحابية',
    provider: 'جامعة أكسفورد بالشراكة مع الأكاديمية',
    deadlineText: 'باقي 20 يومًا',
    isUrgent: false,
  },
];

const initialFavoriteCourses: FavoriteCourseItem[] = [
  {
    id: 'course-fav-1',
    title: 'الأمن السيبراني والدفاع الرقمي الاستباقي',
    provider: 'مسار الأمن المتقدم • 10 أسابيع',
    durationText: 'معتمدة دولياً',
  },
  {
    id: 'course-fav-2',
    title: 'الحوسبة الكمية ومستقبل الخوارزميات',
    provider: 'مسار الفيزياء التقنية • 6 أسابيع',
    durationText: 'مستوى متقدم',
  },
];

export const SavedScholarshipsView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'scholarships' | 'courses'>('scholarships');
  const [scholarships, setScholarships] = useState<SavedScholarshipItem[]>(initialScholarships);
  const [favoriteCourses, setFavoriteCourses] = useState<FavoriteCourseItem[]>(initialFavoriteCourses);

  const handleDeleteScholarship = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScholarships((prev) => prev.filter((s) => s.id !== id));
  };

  const handleDeleteFavoriteCourse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteCourses((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div dir="rtl" className="w-full flex flex-col gap-6">
      {/* Header-Filter matching lines 177-197 of Saved Scholarships - Dashboard - Desktop.html */}
      <div
        data-layer="Header-Filter"
        className="HeaderFilter self-stretch flex justify-between items-center flex-wrap gap-4"
      >
        {/* Title on Right in RTL */}
        <h2
          data-layer="إدارة المحفوظات"
          className="text-slate-200 text-xl font-bold font-['Cairo'] leading-6"
        >
          إدارة المحفوظات
        </h2>

        {/* Toggle-Filter on Left in RTL */}
        <div
          data-layer="Toggle-Filter"
          className="ToggleFilter p-1 bg-slate-900 rounded-full outline outline-1 outline-offset-[-1px] outline-blue-900 flex items-center"
        >
          <button
            type="button"
            onClick={() => setActiveTab('scholarships')}
            className={`px-5 md:px-6 py-2 rounded-full text-xs md:text-sm transition-all cursor-pointer ${
              activeTab === 'scholarships'
                ? 'bg-orange-300/10 text-orange-300 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            المنح المحفوظة ({scholarships.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`px-5 md:px-6 py-2 rounded-full text-xs md:text-sm transition-all cursor-pointer ${
              activeTab === 'courses'
                ? 'bg-orange-300/10 text-orange-300 font-bold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            الدورات المفضلة ({favoriteCourses.length})
          </button>
        </div>
      </div>

      {/* List of Saved Scholarships */}
      {activeTab === 'scholarships' && (
        <div data-layer="Scholarships-List" className="flex flex-col gap-3">
          {scholarships.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/50 rounded-2xl border border-blue-900/50 text-slate-400 text-sm">
              لا توجد منح دراسية محفوظة حالياً.
            </div>
          ) : (
            scholarships.map((item) => (
              <div
                key={item.id}
                data-layer="Scholarship-Row"
                onClick={() => navigate(`/scholarships/${item.id}`)}
                className="ScholarshipRow self-stretch p-4 bg-blue-950 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center gap-4 hover:border-sky-400/40 transition-all cursor-pointer group"
              >
                {/* Right in RTL: Text-Metadata */}
                <div data-layer="Text-Metadata" className="flex-1 flex flex-col justify-start items-start gap-1 text-right min-w-0">
                  <h3
                    data-layer={item.title}
                    className="text-slate-200 text-sm md:text-base font-bold font-['Tajawal'] leading-6 truncate w-full group-hover:text-sky-300 transition-colors"
                  >
                    {item.title}
                  </h3>
                  <span
                    data-layer={item.provider}
                    className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4"
                  >
                    {item.provider}
                  </span>
                </div>

                {/* Left in RTL: Left-Controls (Deadline Tag + Delete Button) */}
                <div data-layer="Left-Controls" className="flex items-center gap-3 shrink-0">
                  {/* Deadline-Tag */}
                  <div
                    data-layer="Deadline-Tag"
                    className={`px-3 py-1.5 rounded-lg outline outline-1 outline-offset-[-1px] flex items-center justify-center ${
                      item.isUrgent
                        ? 'bg-red-500/10 outline-red-500 text-red-500 animate-pulse'
                        : 'bg-orange-300/10 outline-orange-300 text-orange-300'
                    }`}
                  >
                    <span className="text-xs font-bold font-['Tajawal'] leading-4 whitespace-nowrap">
                      {item.deadlineText}
                    </span>
                  </div>

                  {/* Delete-Btn */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteScholarship(item.id, e)}
                    data-layer="Delete-Btn"
                    title="إزالة من المحفوظات"
                    className="size-8 p-1.5 bg-slate-900 hover:bg-red-500/20 rounded-lg outline outline-1 outline-offset-[-1px] outline-blue-900 hover:outline-red-500 flex justify-center items-center cursor-pointer transition-all text-slate-400 hover:text-red-400"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* List of Favorite Courses */}
      {activeTab === 'courses' && (
        <div data-layer="Courses-List" className="flex flex-col gap-3">
          {favoriteCourses.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/50 rounded-2xl border border-blue-900/50 text-slate-400 text-sm">
              لا توجد دورات مفضلة محفوظة حالياً.
            </div>
          ) : (
            favoriteCourses.map((item) => (
              <div
                key={item.id}
                data-layer="Course-Row"
                onClick={() => navigate(`/courses/${item.id}`)}
                className="self-stretch p-4 bg-blue-950 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.07)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex justify-between items-center gap-4 hover:border-sky-400/40 transition-all cursor-pointer group"
              >
                {/* Right: Info */}
                <div className="flex-1 flex flex-col justify-start items-start gap-1 text-right min-w-0">
                  <h3 className="text-slate-200 text-sm md:text-base font-bold font-['Tajawal'] leading-6 truncate w-full group-hover:text-sky-300 transition-colors">
                    {item.title}
                  </h3>
                  <span className="text-slate-400 text-xs font-normal font-['Tajawal'] leading-4">
                    {item.provider}
                  </span>
                </div>

                {/* Left: Tag + Delete */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="px-3 py-1.5 rounded-lg outline outline-1 outline-offset-[-1px] bg-sky-400/10 outline-sky-400 text-sky-400 flex items-center justify-center">
                    <span className="text-xs font-bold font-['Tajawal'] leading-4 whitespace-nowrap">
                      {item.durationText}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteFavoriteCourse(item.id, e)}
                    title="إزالة من المفضلة"
                    className="size-8 p-1.5 bg-slate-900 hover:bg-red-500/20 rounded-lg outline outline-1 outline-offset-[-1px] outline-blue-900 hover:outline-red-500 flex justify-center items-center cursor-pointer transition-all text-slate-400 hover:text-red-400"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
