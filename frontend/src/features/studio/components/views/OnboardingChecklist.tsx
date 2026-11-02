import React from 'react';
import { Check } from 'lucide-react';
import { useStudio } from '@/features/studio/context/studioContext';
import { useNavigate } from '@/app/routerContext';
import { useAuth } from '@/features/auth/context/authContext';
import { can } from '@/shared/lib/permissions';
export const OnboardingChecklist: React.FC = () => { const { overview } = useStudio(); const { user } = useAuth(); const nav = useNavigate(); const hasCourse = Object.values(overview?.courses ?? {}).some(Boolean); const steps = [['profile', 'أكمل ملفك كمدرّب', Boolean(overview)], ['course', 'أنشئ أول دورة', hasCourse], ['video', 'ارفع فيديو أو أضف رابطًا', false], ['review', 'أرسلها للمراجعة', Boolean(overview?.inReview)]]; return <section className="studio-onboarding"><span className="studio-kicker">مسار البداية</span><h2>حوّل الفكرة إلى تجربة تعليمية</h2>{steps.map(([id, label, done]) => <div className={`studio-onboarding-step ${done ? 'is-done' : ''}`} key={id}><span>{done ? <Check size={15} /> : id}</span><strong>{label}</strong></div>)}{can(user, 'courses.create') && <button type="button" className="btn-gold" onClick={() => nav('/studio/courses/new')}>إنشاء أول دورة</button>}</section>; };
