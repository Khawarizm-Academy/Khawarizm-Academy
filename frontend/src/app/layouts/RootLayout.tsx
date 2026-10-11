import React, { Suspense, useCallback, useState } from 'react';
import { Outlet } from '@/app/router';
import { useRouter } from '@/app/routerContext';
import { resolveActiveTab } from '@/app/routes';
import { RouteErrorBoundary } from '@/app/RouteErrorBoundary';
import { DesktopNavbar } from '@/shared/components/Navbar/DesktopNavbar';
import { MobileHeader } from '@/shared/components/Navbar/MobileHeader';
import { MobileBottomBar } from '@/shared/components/BottomNav/MobileBottomBar';
import { Footer } from '@/shared/components/Footer/Footer';
import { PageSkeleton } from '@/shared/components/Loading/PageSkeleton';
import { NotificationsDrawer } from '@/features/dashboard/components/overlays/NotificationsDrawer';
import { NAV_TARGETS } from '@/shared/lib/navigation';
import type { NavTabKey } from '@/shared/lib/localization';

/** Celestial atmosphere washes: geometry, tone and drift delay of each glow. */
const ATMOSPHERE_WASHES = [
  { geometry: 'top-[4%] right-[5%] w-[650px] h-[650px] blur-[140px]', tone: 'bg-blue-400/[0.045]', delay: '0s' },
  { geometry: 'top-[20%] left-[5%] w-[550px] h-[550px] blur-[130px]', tone: 'bg-gold-400/[0.035]', delay: '2s' },
  { geometry: 'top-[50%] right-[10%] w-[600px] h-[600px] blur-[150px]', tone: 'bg-blue-500/[0.035]', delay: '4s' },
  { geometry: 'bottom-[10%] left-[15%] w-[700px] h-[500px] blur-[160px]', tone: 'bg-gold-400/[0.03]', delay: '6s' },
];

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
      {/* Celestial ambient washes — slowly drifting so every page breathes */}
      <div className="app-atmosphere" aria-hidden="true">
        {ATMOSPHERE_WASHES.map((wash) => (
          <div
            key={wash.delay}
            className={`app-wash animate-float-slow ${wash.geometry} ${wash.tone}`}
            style={{ animationDelay: wash.delay }}
          />
        ))}
      </div>

      {/* Sticky header, desktop and mobile handled by CSS */}
      {showHeaderAndFooter && (
        <>
          <div className="shell-chrome hidden md:block">
            <DesktopNavbar
              activeTab={activeTab}
              onSelectTab={selectTab}
              onNotificationsClick={() => setIsGlobalNotificationsOpen(true)}
            />
          </div>
          <div className="shell-chrome block md:hidden">
            <MobileHeader
              onLogoClick={() => navigate(NAV_TARGETS.home)}
              onLoginClick={() => navigate(NAV_TARGETS.login)}
              onNotificationsClick={() => setIsGlobalNotificationsOpen(true)}
            />
          </div>
        </>
      )}

      {/* Page area: full-page skeleton while the route chunk loads */}
      <div key={pathname} className="page-transition-wrapper animate-page-enter">
        <RouteErrorBoundary>
          <Suspense fallback={<PageSkeleton variant={activeRoute?.skeletonVariant ?? 'default'} />}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </div>

      {/* Footer, desktop and tablet only */}
      {showHeaderAndFooter && (
        <div className="shell-footer hidden md:block">
          <Footer />
        </div>
      )}

      {/* Mobile bottom bar */}
      {!hideShell && (
        <div className="shell-bottom-bar block md:hidden">
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