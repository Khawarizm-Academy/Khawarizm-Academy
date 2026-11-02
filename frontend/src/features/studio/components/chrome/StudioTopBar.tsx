import React from 'react';
import { Search } from 'lucide-react';
import { useLocation } from '@/app/routerContext';
import { WorkspaceTopBar } from '@/shared/components/Workspace/WorkspaceTopBar';
import { WorkspaceSwitch } from '@/shared/components/Workspace/WorkspaceSwitch';
import { useStudioNav } from '@/features/studio/hooks/useStudioNav';

export const StudioTopBar: React.FC = () => { const { pathname } = useLocation(); const nav = useStudioNav(); const current = nav.find((item) => pathname === item.route || pathname.startsWith(`${item.route}/`)); return <WorkspaceTopBar dir="rtl" className="studio-topbar"><div className="studio-topbar-title"><span>الاستوديو</span><strong>{current?.label ?? 'الرئيسية'}</strong></div><div className="studio-topbar-actions"><WorkspaceSwitch /><button type="button" className="studio-search" aria-label="بحث في الاستوديو"><Search size={16} /><span>بحث سريع</span></button></div></WorkspaceTopBar>; };
