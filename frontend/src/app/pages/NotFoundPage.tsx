import React from 'react';
import { Globe } from 'lucide-react';
import { useNavigate } from '../routerContext';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="content-container">
      <div className="w-full py-20 px-6 flex-col-center text-center gap-5 animate-fade-in-up">
        <div className="w-20 h-20 rounded-2xl bg-[#092557] border border-[#1B3F80] flex-center text-[#29A9FF] shadow-lg">
          <Globe size={36} />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-['IBM_Plex_Sans_Arabic'] tracking-tight">
          404
        </h1>
        <h2 className="text-2xl font-bold text-white font-['IBM_Plex_Sans_Arabic']">
          الصفحة المطلوبة غير موجودة
        </h2>
        <p className="max-w-md text-slate-400 text-sm font-['Tajawal'] leading-relaxed">
          عذرًا، الرابط الذي تحاول الوصول إليه غير صحيح أو لم يعد متاحًا. يمكنك العودة إلى الصفحة الرئيسية للاستكشاف.
        </p>
        <button type="button" onClick={() => navigate('/')} className="btn-gold py-2.5 px-8 text-sm font-bold mt-4">
          العودة إلى الرئيسية
        </button>
      </div>
    </main>
  );
};