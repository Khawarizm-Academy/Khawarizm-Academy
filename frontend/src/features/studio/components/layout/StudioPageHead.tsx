import React from 'react';
import { Plus, Upload } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { can } from '@/shared/lib/permissions';
import { SectionHeading } from '@/shared/components/Workspace/SectionHeading';

export const StudioPageHead: React.FC<{ title: string; subtitle?: string; showActions?: boolean }> = ({ title, subtitle, showActions = false }) => { const nav = useNavigate(); const { user } = useAuth(); return <div className="studio-page-head"><SectionHeading title={title} eyebrow={subtitle} action={showActions ? <div className="studio-head-actions">{can(user, 'videos.upload') && <button type="button" className="btn-outline-blue" onClick={() => nav('/studio/videos')}><Upload size={16} />رفع فيديو</button>}{can(user, 'courses.create') && <button type="button" className="btn-gold" onClick={() => nav('/studio/courses/new')}><Plus size={16} />دورة جديدة</button>}</div> : undefined} /></div>; };
