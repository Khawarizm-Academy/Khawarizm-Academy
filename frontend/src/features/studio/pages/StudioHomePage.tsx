import React from 'react';
import { StudioShell } from '@/features/studio/components/layout/StudioShell';
import { StudioProvider } from '@/features/studio/context/StudioProvider';
import { StudioPageHead } from '@/features/studio/components/layout/StudioPageHead';
import { HomeView } from '@/features/studio/components/views/HomeView';
export const StudioHomePage: React.FC = () => <StudioProvider><StudioShell><StudioPageHead title="مرصد الاستوديو" subtitle="نظرة سريعة على ورشة عملك" showActions /><HomeView /></StudioShell></StudioProvider>;
