import React from 'react';
import { useDashboard } from '@/features/dashboard/context/dashboardContext';
import { DesktopDashboardSidebar } from '@/features/dashboard/components/chrome/DesktopDashboardSidebar';
import { DashboardMain } from '@/features/dashboard/components/layout/DashboardMain';
import { CourseWorkspaceModal } from '@/features/dashboard/components/overlays/CourseWorkspaceModal';
import { LiveClassroomModal } from '@/features/dashboard/components/overlays/LiveClassroomModal';
import { ScholarshipApplicationModal } from '@/features/dashboard/components/overlays/ScholarshipApplicationModal';
import { CompetitionArenaModal } from '@/features/dashboard/components/overlays/CompetitionArenaModal';
import { CertificatePreviewModal } from '@/features/dashboard/components/overlays/CertificatePreviewModal';

/** Sidebar rail + main body + in-dashboard chambers, all reading page state. */
export const DashboardShell: React.FC = () => {
  const {
    currentView,
    selectView,
    activeWorkspaceCourse,
    closeWorkspace,
    isLiveClassroomOpen,
    closeLiveClassroom,
    selectedScholarship,
    closeScholarship,
    selectedCompetition,
    closeCompetition,
    previewCertificateItem,
    closeCertificate,
    unreadCount,
  } = useDashboard();

  return (
    <div dir="rtl" className="dash-page">
      {/* Sidebar first, so RTL puts it on the far right */}
      <DesktopDashboardSidebar
        currentView={currentView}
        onSelectView={selectView}
        unreadNotificationsCount={unreadCount}
      />

      <DashboardMain />

      {/* In-dashboard chambers, no page change */}
      <CourseWorkspaceModal
        isOpen={!!activeWorkspaceCourse}
        onClose={closeWorkspace}
        courseTitle={activeWorkspaceCourse || undefined}
      />

      {/* Live classroom */}
      <LiveClassroomModal isOpen={isLiveClassroomOpen} onClose={closeLiveClassroom} />

      {/* Scholarship application */}
      <ScholarshipApplicationModal
        isOpen={!!selectedScholarship}
        onClose={closeScholarship}
        scholarship={selectedScholarship}
      />

      {/* Competition arena */}
      <CompetitionArenaModal
        isOpen={!!selectedCompetition}
        onClose={closeCompetition}
        competition={selectedCompetition}
      />

      {/* Certificate preview */}
      {previewCertificateItem && (
        <CertificatePreviewModal certificate={previewCertificateItem} onClose={closeCertificate} />
      )}
    </div>
  );
};