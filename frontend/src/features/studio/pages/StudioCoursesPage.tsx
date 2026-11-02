import React from 'react';
import { StudioShell } from '@/features/studio/components/layout/StudioShell';
import { StudioProvider } from '@/features/studio/context/StudioProvider';
import { StudioPageHead } from '@/features/studio/components/layout/StudioPageHead';
import { CoursesView } from '@/features/studio/components/views/CoursesView';
export const StudioCoursesPage: React.FC = () => <StudioProvider><StudioShell><StudioPageHead title="دوراتي" subtitle="كل مساراتك التعليمية في مكان واحد" showActions /><CoursesView /></StudioShell></StudioProvider>;
