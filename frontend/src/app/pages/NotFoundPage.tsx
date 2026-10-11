import React from 'react';
import { Globe } from 'lucide-react';
import { useNavigate } from '@/app/routerContext';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import { OrbitalEmblem, OrbitalStageStars } from '@/shared/components/Placeholder/OrbitalEmblem';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="content-container">
      <div className="placeholder-stage">
        {/* Starfield behind the lost-in-space chamber */}
        <OrbitalStageStars />

        <div className="animate-pop-in">
          <OrbitalEmblem tone="blue" icon={<Globe size={36} />} />
        </div>

        <h1 className="placeholder-code animate-pop-in animation-delay-100 drop-shadow-[0_0_20px_rgba(41,169,255,0.35)]">
          404
        </h1>
        <h2 className="placeholder-subtitle animate-pop-in animation-delay-150">
          الصفحة المطلوبة غير موجودة
        </h2>
        <p className="placeholder-desc animate-pop-in animation-delay-200">
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
