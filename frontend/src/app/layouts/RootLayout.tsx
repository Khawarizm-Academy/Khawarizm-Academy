import React from 'react';
import { Outlet } from '../router';
import { useLocation, useNavigate, useActiveRoute } from '../routerContext';
import { DesktopNavbar } from '../../shared/components/Navbar/DesktopNavbar';
import { MobileHeader } from '../../shared/components/Navbar/MobileHeader';
import { MobileBottomBar } from '../../shared/components/BottomNav/MobileBottomBar';
import { Footer } from '../../shared/components/Footer/Footer';
import type { NavTabKey } from '../../shared/lib/localization';

export const RootLayout: React.FC = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const activeRoute = useActiveRoute();

  // Resolve active navbar tab key
  const queryParams = new URLSearchParams(search);
  const catalogType = queryParams.get('type');

  let activeTab: NavTabKey = 'home';
  if (pathname === '/catalog') {
    if (catalogType === 'courses') activeTab = 'courses';
    else if (catalogType === 'scholarships') activeTab = 'scholarships';
    else activeTab = 'catalog';
  } else if (pathname === '/courses') {
    activeTab = 'courses';
  } else if (pathname === '/scholarships') {
    activeTab = 'scholarships';
  } else if (activeRoute?.meta?.activeTab) {
    activeTab = activeRoute.meta.activeTab;
  }

  const handleNavSelect = (tab: NavTabKey) => {
    if (tab === 'home') {
      navigate('/');
    } else if (tab === 'courses') {
      navigate('/catalog?type=courses');
    } else if (tab === 'scholarships') {
      navigate('/catalog?type=scholarships');
    } else if (tab === 'catalog') {
      navigate('/catalog');
    } else if (tab === 'events') {
      navigate('/events');
    } else if (tab === 'competitions') {
      navigate('/competitions');
    } else if (tab === 'dashboard') {
      navigate('/dashboard');
    } else if (tab === 'profile') {
      navigate('/profile');
    }
  };

  return (
    <div className="page-wrapper">
      {/* 1. Permanent Celestial Ambient Atmospheric Washes */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[4%] right-[5%] w-[650px] h-[650px] rounded-full bg-[#29A9FF]/[0.045] blur-[140px]" />
        <div className="absolute top-[20%] left-[5%] w-[550px] h-[550px] rounded-full bg-[#E5B65C]/[0.035] blur-[130px]" />
        <div className="absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full bg-[#167BDB]/[0.035] blur-[150px]" />
        <div className="absolute bottom-[10%] left-[15%] w-[700px] h-[500px] rounded-full bg-[#E5B65C]/[0.03] blur-[160px]" />
      </div>

      {/* 2. Permanent Sticky Header Shell */}
      <div className="w-full hidden md:block relative z-30">
        <DesktopNavbar activeTab={activeTab} onSelectTab={handleNavSelect} />
      </div>
      <div className="w-full block md:hidden relative z-30">
        <MobileHeader onLogoClick={() => navigate('/')} />
      </div>

      {/* 3. Dynamic Page View with 60fps Entrance Transition */}
      <div key={pathname} className="page-transition-wrapper animate-page-enter relative z-10">
        <Outlet />
      </div>

      {/* 4. Permanent Footer Shell (Desktop / Tablet) */}
      <div className="w-full hidden md:block relative z-10 mt-auto">
        <Footer />
      </div>

      {/* 5. Permanent Mobile Floating Bottom Bar */}
      <div className="block md:hidden relative z-40">
        <MobileBottomBar activeTab={activeTab} onSelectTab={handleNavSelect} />
      </div>
    </div>
  );
};
