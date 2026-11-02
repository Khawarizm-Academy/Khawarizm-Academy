import React from 'react';
import { useLocation, useNavigate } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { ROLE_LABELS } from '@/features/auth/types';
import { useStudioNav } from '@/features/studio/hooks/useStudioNav';
import { WorkspaceRail } from '@/shared/components/Workspace/WorkspaceRail';
import { WorkspaceRailItem } from '@/shared/components/Workspace/WorkspaceRailItem';
import { WorkspaceUserChip } from '@/shared/components/Workspace/WorkspaceUserChip';
import { WorkspaceSwitch } from '@/shared/components/Workspace/WorkspaceSwitch';
import brandIcon from '@/assets/brand/generated/icon-192.png';

export const StudioRail: React.FC = () => { const nav = useNavigate(); const { pathname } = useLocation(); const { user } = useAuth(); const sections = useStudioNav(); return <WorkspaceRail dir="rtl" className="studio-rail"><div className="studio-rail-top"><button type="button" className="studio-brand" onClick={() => nav('/')}><img src={brandIcon} alt="شعار أكاديمية خوارزم" /><span>أكاديمية خوارزم</span></button><WorkspaceSwitch className="studio-rail-switch" /><nav className="studio-nav" aria-label="تنقل الاستوديو">{sections.map(({ icon: Icon, ...section }) => <WorkspaceRailItem key={section.key} icon={Icon} label={section.label} active={pathname === section.route || pathname.startsWith(`${section.route}/`)} onClick={() => nav(section.route)} className="studio-nav-item" />)}</nav></div><WorkspaceUserChip name={user?.fullName} role={user ? ROLE_LABELS[user.role] : ''} avatarUrl={user?.avatarUrl} initials={user?.avatarInitials} onClick={() => nav('/studio/profile')} /></WorkspaceRail>; };
