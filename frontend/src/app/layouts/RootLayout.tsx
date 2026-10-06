import React, { Suspense, useCallback, useState } from 'react';
import { Outlet } from '../router';
import { useRouter } from '../routerContext';
import { resolveActiveTab } from '../routes';
import { RouteErrorBoundary } from '../RouteErrorBoundary';
import { DesktopNavbar } from '../../shared/components/Navbar/DesktopNavbar';
import { MobileHeader } from '../../shared/components/Navbar/MobileHeader';
import { MobileBottomBar } from '../../shared/components/BottomNav/MobileBottomBar';
import { Footer } from '../../shared/components/Footer/Footer';
import { PageSkeleton } from '../../shared/components/Loading/PageSkeleton';
import { NotificationsDrawer } from '../../features/dashboard/components/NotificationsDrawer';
import { NAV_TARGETS } from '../../shared/lib/navigation';
import type { NavTabKey } from '../../shared/lib/localization';

export const RootLayout: React.FC = () => {
  const { pathname, search, activeRoute, navigate } = useRouter();
  const [isGlobalNotificationsOpen, setIsGlobalNotificationsOpen] = useState(false);

  const hideShell = !!activeRoute?.meta?.hideShell;
  const showHeaderAndFooter = !hideShell && !activeRoute?.meta?.immersive;
  const activeTab = resolveActiveTab(pathname, search);

  const selectTab = useCallback(
    (tab: NavTabKey) => navigate(NAV_TARGETS[tab]),
    [navigate]
  );

  return (
    <div className="page-wrapper">
      {/* Celestial ambient washes */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[4%] right-[5%] w-[650px] h-[650px] rounded-full bg-[#29A9FF]/[0.045] blur-[140px]" />
        <div className="absolute top-[20%] left-[5%] w-[550px] h-[550px] rounded-full bg-[#E5B65C]/[0.035] blur-[130px]" />
        <div className="absolute top-[50%] right-[10%] w-[600px] h-[600px] rounded-full bg-[#167BDB]/[0.035] blur-[150px]" />
        <div className="absolute bottom-[10%] left-[15%] w-[700px] h-[500px] rounded-full bg-[#E5B65C]/[0.03] blur-[160px]" />
      </div>

      {/* Sticky header, desktop and mobile handled by CSS */}
      {showHeaderAndFooter && (
        <>
          <div className="w-full hidden md:block relative z-30">
            <DesktopNavbar
              activeTab={activeTab}
              onSelectTab={selectTab}
              onNotificationsClick={() => setIsGlobalNotificationsOpen(true)}
            />
          </div>
          <div className="w-full block md:hidden relative z-30">
            <MobileHeader
              onLogoClick={() => navigate(NAV_TARGETS.home)}
              onLoginClick={() => navigate(NAV_TARGETS.login)}
              onNotificationsClick={() => setIsGlobalNotificationsOpen(true)}
            />
          </div>
        </>
      )}

      {/* Page area: full-page skeleton while the route chunk loads */}
      <div key={pathname} className="page-transition-wrapper animate-page-enter relative z-10 w-full flex-1">
        <RouteErrorBoundary>
          <Suspense fallback={<PageSkeleton variant={activeRoute?.skeletonVariant ?? 'default'} />}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </div>

      {/* Footer, desktop and tablet only */}
      {showHeaderAndFooter && (
        <div className="w-full hidden md:block relative z-10 mt-auto">
          <Footer />
        </div>
      )}

      {/* Mobile bottom bar */}
      {!hideShell && (
        <div className="block md:hidden relative z-40">
          <MobileBottomBar
            activeTab={activeTab}
            onSelectTab={selectTab}
          />
        </div>
      )}

      <NotificationsDrawer
        isOpen={isGlobalNotificationsOpen}
        onClose={() => setIsGlobalNotificationsOpen(false)}
        onNavigate={(path) => navigate(path)}
      />
    </div>
  );
};