import React from 'react';
import { useLocation, useNavigate } from '@/app/routerContext';
import { useStudioNav } from '@/features/studio/hooks/useStudioNav';
export const StudioBottomBar: React.FC = () => { const nav = useNavigate(); const { pathname } = useLocation(); const sections = useStudioNav().filter((item) => item.mobile).slice(0, 5); return <nav className="studio-bottom-bar" aria-label="تنقل الاستوديو المحمول">{sections.map(({ icon: Icon, ...item }) => <button type="button" key={item.key} onClick={() => nav(item.route)} className={pathname === item.route ? 'is-active' : ''}><Icon size={18} /><span>{item.label}</span></button>)}</nav>; };
