import React from 'react';
import { useAuth } from '@/features/auth/context/authContext';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminHeader } from '@/features/admin/components/chrome/AdminHeader';
import { AdminMobileTabs, AdminSectionNav } from '@/features/admin/components/chrome/AdminSectionNav';
import { AdminNotice } from '@/features/admin/components/chrome/AdminNotice';
import { UserDetailPanel } from '@/features/admin/components/views/UserDetailPanel';
import { OverviewView } from '@/features/admin/components/views/OverviewView';
import { UsersView } from '@/features/admin/components/views/UsersView';
import { ContentView } from '@/features/admin/components/views/ContentView';
import { SessionsView } from '@/features/admin/components/views/SessionsView';
import { AnalyticsView } from '@/features/admin/components/views/AnalyticsView';
import { ActivityView } from '@/features/admin/components/views/ActivityView';
import { VideoHostingView } from '@/features/admin/components/views/VideoHostingView';
import type { AdminSectionKey } from '@/features/admin/types';

/** One view per section, keyed by the `?tab=` value the provider reads. */
const SECTION_VIEWS: Record<AdminSectionKey, React.FC> = {
  overview: OverviewView,
  users: UsersView,
  content: ContentView,
  videos: VideoHostingView,
  sessions: SessionsView,
  analytics: AnalyticsView,
  activity: ActivityView,
};

/** Console chrome: sticky rail, top bar, section pills, and the detail modal. */
export const AdminShell: React.FC = () => {
  const { user } = useAuth();
  const { currentSection, selectSection, error, clearError } = useAdmin();

  // The route guard already redirects visitors; this only guards a session that ends mid-view.
  if (!user) return null;

  const ActiveView = SECTION_VIEWS[currentSection];

  return (
    <div className="admin-page">
      <AdminSectionNav currentSection={currentSection} onSelect={selectSection} />

      <main className="admin-main">
        <AdminHeader />
        <AdminNotice message={error} onDismiss={clearError} />

        <div className="admin-container">
          <AdminMobileTabs currentSection={currentSection} onSelect={selectSection} />
          <ActiveView />
        </div>
      </main>

      <UserDetailPanel />
    </div>
  );
};
