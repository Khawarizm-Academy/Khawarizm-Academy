import React from 'react';
import { Globe } from 'lucide-react';
import { useNavigate } from '../routerContext';
import { NAV_TARGETS } from '../../shared/lib/navigation';
import { OrbitalEmblem, OrbitalStageStars } from '../../shared/components/Placeholder/OrbitalEmblem';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="content-container">
      <div className="w-full py-20 px-6 flex-col-center text-center gap-5 relative overflow-hidden">
        {/* Starfield behind the lost-in-space chamber */}
        <OrbitalStageStars />

        <div className="animate-pop-in">
          <OrbitalEmblem tone="blue" icon={<Globe size={36} />} />
        </div>

        <h1 className="relative z-10 text-4xl sm:text-5xl font-extrabold text-white font-['IBM_Plex_Sans_Arabic'] tracking-tight animate-pop-in animation-delay-100 drop-shadow-[0_0_20px_rgba(41,169,255,0.35)]">
          404
        </h1>
        <h2 className="relative z-10 text-2xl font-bold text-white font-['IBM_Plex_Sans_Arabic'] animate-pop-in animation-delay-150">
          الصفحة المطلوبة غير موجودة
        </h2>
        <p className="relative z-10 max-w-md text-slate-400 text-sm font-['Tajawal'] leading-relaxed animate-pop-in animation-delay-200">
          عذرًا، الرابط الذي تحاول الوصول إليه غير صحيح أو لم يعد متاحًا. يمكنك العودة إلى الصفحة الرئيسية للاستكشاف.
        </p>
        <button
          type="button"
          onClick={() => navigate(NAV_TARGETS.home)}
          className="btn-gold py-2.5 px-8 text-sm font-bold mt-4 animate-pop-in animation-delay-300"
        >
          العودة إلى الرئيسية
        </button>
      </div>
    </main>
  );
};
