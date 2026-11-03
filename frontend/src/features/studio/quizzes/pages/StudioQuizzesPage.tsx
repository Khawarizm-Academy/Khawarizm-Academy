import React from 'react';
import { StudioShell } from '@/features/studio/components/layout/StudioShell';
import { StudioProvider } from '@/features/studio/context/StudioProvider';
import { QuizListView } from '@/features/studio/quizzes/components/QuizListView';
import '@/features/studio/quizzes/quiz.css';

export const StudioQuizzesPage: React.FC = () => <StudioProvider><StudioShell><QuizListView /></StudioShell></StudioProvider>;
