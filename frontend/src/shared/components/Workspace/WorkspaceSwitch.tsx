import React from 'react';
import { BookOpen, Hammer } from 'lucide-react';
import { useLocation, useNavigate } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { can } from '@/shared/lib/permissions';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { SlidingSegmentedControl } from '@/shared/components/Controls/SlidingSegmentedControl';

export const WorkspaceSwitch: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  if (!can(user, 'studio.access')) return null;
  const value = pathname.startsWith('/studio') ? 'studio' : 'learning';
  return <div className={`workspace-switch-wrap ${className}`}><SlidingSegmentedControl aria-label="مساحة العمل" tone="blue" value={value} onChange={(next) => navigate(next === 'studio' ? NAV_TARGETS.studio : NAV_TARGETS.dashboard)} options={[{ id: 'learning', label: 'التعلّم' }, { id: 'studio', label: 'الاستوديو' }]} /><span className="workspace-switch-icon" aria-hidden="true">{value === 'studio' ? <Hammer size={13} /> : <BookOpen size={13} />}</span></div>;
};
