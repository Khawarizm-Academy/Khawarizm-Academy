import React from 'react';
import { StudioRail } from '@/features/studio/components/chrome/StudioRail';
import { StudioTopBar } from '@/features/studio/components/chrome/StudioTopBar';
import { StudioBottomBar } from '@/features/studio/components/layout/StudioBottomBar';

export const StudioShell: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="studio-page" dir="rtl"><StudioRail /><div className="studio-main"><StudioTopBar /><main className="studio-container">{children}</main></div><StudioBottomBar /></div>;
