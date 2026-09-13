import React from 'react';
import { useNavigate } from '../routerContext';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="content-container">
      <div className="w-full py-20 px-6 flex-col-center text-center gap-5 animate-fade-in-up">
        <div className="w-20 h-20 rounded-2xl bg-[#092557] border border-[#1B3F80] flex-center text-[#29A9FF] shadow-lg">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <path d="M12 7v5" />
          </svg>
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