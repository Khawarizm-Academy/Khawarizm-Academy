/** Console chrome: sticky rail, top bar, section pills, and the detail modal. */
export const AdminShell: React.FC = () => {
  const { user } = useAuth();
  const { currentSection, selectSection, error, clearError } = useAdmin();

  if (!user) return null;

  const ActiveView = SECTION_VIEWS[currentSection];

  return (
    <div className="admin-page">
      <AdminSectionNav currentSection={currentSection} onSelect={selectSection} />

      <main className="admin-main">
        <div className="animate-fade-in-down">
          <AdminHeader />
        </div>
        <AdminNotice message={error} onDismiss={clearError} />

        <div className="content-container animate-fade-in-up animation-delay-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-1">
            <h1 className="dash-view-h1 text-white">{SECTION_LABELS[currentSection]}</h1>
          </div>
          <AdminMobileTabs currentSection={currentSection} onSelect={selectSection} />
          {/* Wrap active view so every section gets the same entrance treatment */}
          <section className="animate-fade-in-up animation-delay-200">
            <ActiveView />
          </section>
        </div>
      </main>

      <UserDetailPanel />
    </div>
  );
};

/** Map each section key to an Arabic display label used as the page h1. */
const SECTION_LABELS: Record<string, string> = {
  overview: 'النظرة العامة',
  users: 'إدارة المستخدمين',
  sessions: 'الجلسات والأجهزة',
  content: 'المحتوى',
  videos: 'استضافة الفيديو',
  analytics: 'تحليلات الدخول',
  activity: 'سجل الأحداث',
  system: 'فحص المنظومة',
};
