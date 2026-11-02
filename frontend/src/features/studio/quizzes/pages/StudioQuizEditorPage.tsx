import React from 'react';
import { useParams } from '@/app/routerContext';
import { StudioShell } from '@/features/studio/components/layout/StudioShell';
import { StudioProvider } from '@/features/studio/context/StudioProvider';
import { QuizEditorView } from '@/features/studio/quizzes/components/QuizEditorView';
import '@/features/studio/quizzes/quiz.css';

export const StudioQuizEditorPage: React.FC = () => { const { id } = useParams<{ id: string }>(); return <StudioProvider><StudioShell><QuizEditorView quizId={id} /></StudioShell></StudioProvider>; };
