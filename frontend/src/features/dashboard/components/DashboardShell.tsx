import React from 'react';
import { UNREAD_COUNT, useDashboard } from '../context/dashboardContext';
import { DesktopDashboardSidebar } from './DesktopDashboardSidebar';
import { DashboardMain } from './DashboardMain';
import { CourseWorkspaceModal } from './CourseWorkspaceModal';
import { LiveClassroomModal } from './LiveClassroomModal';
import { ScholarshipApplicationModal } from './ScholarshipApplicationModal';
import { CompetitionArenaModal } from './CompetitionArenaModal';
import { CertificatePreviewModal } from './CertificatePreviewModal';

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
  } = useDashboard();

  return (
    <div dir="rtl" className="dash-page">
      {/* Sidebar first, so RTL puts it on the far right */}
      <DesktopDashboardSidebar
        currentView={currentView}
        onSelectView={selectView}
        unreadNotificationsCount={UNREAD_COUNT}
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