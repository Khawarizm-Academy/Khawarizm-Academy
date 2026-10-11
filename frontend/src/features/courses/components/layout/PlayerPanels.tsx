import React from 'react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { PANEL_BY_TAB } from '@/features/courses/data/playerPanels';

/** The active tab's body, shared by the desktop and mobile player surfaces. */
export const PlayerPanels: React.FC = () => {
  const { activeTab } = useCoursePlayer();
  const Panel = PANEL_BY_TAB[activeTab];
  return <Panel />;
};