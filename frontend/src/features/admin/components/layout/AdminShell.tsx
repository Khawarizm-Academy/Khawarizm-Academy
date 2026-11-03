import React from 'react';
import { useAuth } from '@/features/auth/context/authContext';
import { useAdmin } from '@/features/admin/context/adminContext';
import { AdminHeader } from '@/features/admin/components/chrome/AdminHeader';
import { AdminPageHead } from '@/features/admin/components/chrome/AdminPageHead';
import { AdminMobileTabs, AdminSectionNav } from '@/features/admin/components/chrome/AdminSectionNav';
import { AdminNotice } from '@/features/admin/components/chrome/AdminNotice';
import { UserDetailPage } from '@/features/admin/components/views/UserDetailPage';
import { OverviewView } from '@/features/admin/components/views/OverviewView';
import { UsersView } from '@/features/admin/components/views/UsersView';
import { ContentView } from '@/features/admin/components/views/ContentView';
import { SessionsView } from '@/features/admin/components/views/SessionsView';
import { AnalyticsView } from '@/features/admin/components/views/AnalyticsView';
import { ActivityView } from '@/features/admin/components/views/ActivityView';
import { VideoHostingView } from '@/features/admin/components/views/VideoHostingView';
import { AdminSystemView } from '@/features/admin/components/views/AdminSystemView';
import { RolesView } from '@/features/admin/components/views/RolesView';
import { AuditLogView } from '@/features/admin/components/views/AuditLogView';
import { ReviewQueueView } from '@/features/admin/components/views/ReviewQueueView';
import { AdminEmptyState } from '@/features/admin/components/states/AdminEmptyState';
import { SECTION_LABELS } from '@/features/admin/types';
import type { AdminSectionKey } from '@/features/admin/types';
import { canAccessAdminSection } from '@/features/admin/data/adminSectionAccess';
import roleCopy from '@/features/admin/data/roleCopy.json';

/** One view per section, keyed by the `?tab=` value the provider reads. */
const SECTION_VIEWS: Record<AdminSectionKey, React.FC> = {
  overview: OverviewView,
  users: UsersView,
  content: ContentView,
  videos: VideoHostingView,
  system: AdminSystemView,
  sessions: SessionsView,
  analytics: AnalyticsView,
  activity: ActivityView,
  roles: RolesView,
  audit: AuditLogView,
  'review-queue': ReviewQueueView,
};

/** Console chrome: rail, top bar, page head, mobile pills, and the account page. */
export const AdminShell: React.FC = () => {
  const { user } = useAuth();
  const { currentSection, selectSection, selectedUserId, error, clearError } = useAdmin();

  // The route guard already redirects visitors; this only guards a session that ends mid-view.
  if (!user) return null;

  const ActiveView = SECTION_VIEWS[currentSection];

  return (
    <div className="admin-page">
      {/* Rail first, so RTL puts it on the far right */}
      <AdminSectionNav
        currentSection={currentSection}
        onSelect={selectSection}
        operator={{ fullName: user.fullName, email: user.email, avatarUrl: user.avatarUrl, role: user.role }}
        actor={user}
      />

      <main className="admin-main">
        <AdminHeader />
        <AdminNotice message={error} onDismiss={clearError} />

        <div className="admin-container">
          {/* A selected account takes over the whole content column as its own page */}
          {selectedUserId !== null ? (
            <UserDetailPage />
          ) : (
            <>
              <div className="animate-fade-in-up">
                <AdminPageHead />
              </div>

              {/* The pills strip is the only section nav below the desktop rail */}
              <div className="lg:hidden">
                <AdminMobileTabs currentSection={currentSection} onSelect={selectSection} actor={user} />
              </div>

              {/* Every section window gets the same h1 rhythm: registry answers it */}
              <section className="animate-fade-in-up animation-delay-100">
                <h2 className="sr-only">{SECTION_LABELS[currentSection]}</h2>
                {canAccessAdminSection(user, currentSection) ? (
                  <ActiveView />
                ) : (
                  <AdminEmptyState title={roleCopy.forbiddenTitle} hint={roleCopy.forbiddenHint} />
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
