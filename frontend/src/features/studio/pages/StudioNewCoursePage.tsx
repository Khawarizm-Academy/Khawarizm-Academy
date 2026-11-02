import React, { useState } from 'react';
import { StudioShell } from '@/features/studio/components/layout/StudioShell';
import { StudioProvider } from '@/features/studio/context/StudioProvider';
import { StudioPageHead } from '@/features/studio/components/layout/StudioPageHead';
import { CreateCourseModal } from '@/features/studio/components/overlays/CreateCourseModal';
export const StudioNewCoursePage: React.FC = () => { const [open, setOpen] = useState(true); return <StudioProvider><StudioShell><StudioPageHead title="دورة جديدة" subtitle="ثلاث خطوات لفتح مساحة المنهج" /><CreateCourseModal isOpen={open} onClose={() => setOpen(false)} /><div className="studio-placeholder"><p>أكمل بيانات الدورة الأساسية لفتح محررها.</p><button type="button" className="btn-outline-blue" onClick={() => setOpen(true)}>فتح النموذج</button></div></StudioShell></StudioProvider>; };
