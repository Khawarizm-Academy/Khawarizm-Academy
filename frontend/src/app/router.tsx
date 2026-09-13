import React, {
  useState,
  useEffect,
  useCallback,
  useTransition,
  useRef,
  useContext,
} from 'react';
import type { RouteDefinition } from './routes';
import { RouterContext, matchRoutePattern } from './routerContext';

interface RouterProps {
  routes?: RouteDefinition[];
  children: React.ReactNode;
}

export const Router: React.FC<RouterProps> = ({ routes = [], children }) => {
  const [currentLocation, setCurrentLocation] = useState(() => ({
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  }));

  const [, startTransition] = useTransition();
  const scrollMap = useRef<Map<string, number>>(new Map());
  const prevPathRef = useRef<string>(currentLocation.pathname);

  // Flag native View Transition support once so CSS can disable the
  // CSS-entrance fallback (avoiding a double animation on supported browsers).
  useEffect(() => {
    if ('startViewTransition' in document) {
      document.documentElement.dataset.vtEnabled = 'true';
    }
  }, []);

  // Determine active route and params
  let matchedRoute: RouteDefinition | null = null;
  let matchedParams: Record<string, string> = {};

  for (const route of routes) {
    const result = matchRoutePattern(route.path, currentLocation.pathname);
    if (result.matches) {
      matchedRoute = route;
      matchedParams = result.params;
      break;
    }
  }

  // Update document title when route changes
  useEffect(() => {
    if (matchedRoute?.meta?.title) {
      document.title = matchedRoute.meta.title;
    }
  }, [matchedRoute]);

  // Handle browser popstate (Back / Forward)
  useEffect(() => {
    const handlePopState = () => {
      const targetPath = window.location.pathname || '/';
      const targetSearch = window.location.search || '';
      const fullKey = `${targetPath}${targetSearch}`;

      const updateState = () => {
        setCurrentLocation({
          pathname: targetPath,
          search: targetSearch,
        });
      };

      // Native View Transitions if supported
      if ('startViewTransition' in document) {
        (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
          startTransition(updateState);
        });
      } else {
        startTransition(updateState);
      }

      // Restore scroll position
      requestAnimationFrame(() => {
        const savedY = scrollMap.current.get(fullKey) ?? 0;
        window.scrollTo({ top: savedY, behavior: 'instant' as ScrollBehavior });
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Programmatic navigation
  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    // Save current scroll position before leaving
    const currentKey = `${window.location.pathname}${window.location.search}`;
    scrollMap.current.set(currentKey, window.scrollY);

    const url = new URL(to, window.location.origin);
    const newPathname = url.pathname || '/';
    const newSearch = url.search || '';
    const isDifferentPage = newPathname !== prevPathRef.current;

    if (options?.replace) {
      window.history.replaceState(null, '', to);
    } else {
      window.history.pushState(null, '', to);
    }

    const performTransition = () => {
      startTransition(() => {
        setCurrentLocation({
          pathname: newPathname,
          search: newSearch,
        });
      });
    };

    // Use native View Transitions API if supported
    if ('startViewTransition' in document && isDifferentPage) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(
        performTransition
      );
    } else {
      performTransition();
    }

    // Scroll handling:
    // If navigating to a new page, smooth scroll to top.
    // If only query params changed on the same page, PRESERVE current scroll position!
    if (isDifferentPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      prevPathRef.current = newPathname;
    }
  }, []);

  return (
    <RouterContext.Provider
      value={{
        pathname: currentLocation.pathname,
        search: currentLocation.search,
        params: matchedParams,
        activeRoute: matchedRoute,
        navigate,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

/**
 * Outlet component: Renders the active matched route component within a persistent layout
 */
export const Outlet: React.FC = () => {
  const { activeRoute } = useContext(RouterContext);
  if (!activeRoute) return null;
  const Component = activeRoute.component;
  return <Component />;
};
