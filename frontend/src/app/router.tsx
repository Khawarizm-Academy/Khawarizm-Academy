import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { findRoute } from '@/app/routes';
import { RouterContext } from '@/app/routerContext';
import { Navigate } from '@/app/Navigate';

interface BrowserLocation {
  pathname: string;
  search: string;
}

/** Current URL as the browser sees it. */
const readLocation = (): BrowserLocation => ({
  pathname: window.location.pathname || '/',
  search: window.location.search || '',
});

/** The slice of the View Transition API we depend on. */
interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
}

/** Document augmented with the optional View Transition API. */
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike;
};

/** Runs a state update inside the native View Transition when the browser has it. */
function withViewTransition(update: () => void) {
  const doc = document as ViewTransitionDocument;
  if (!doc.startViewTransition) {
    update();
    return;
  }
  const transition = doc.startViewTransition(update);
  // A newer navigation can abort an in-flight transition; that rejection is expected.
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
}

export const Router: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState(readLocation);
  const [, startTransition] = useTransition();
  const scrollPositions = useRef(new Map<string, number>());
  const pathnameRef = useRef(location.pathname);

  const match = useMemo(() => findRoute(location.pathname), [location.pathname]);

  // Lets CSS drop the entrance animation so it never plays twice.
  useEffect(() => {
    if ('startViewTransition' in document) document.documentElement.dataset.vtEnabled = 'true';
  }, []);

  useEffect(() => {
    if (match?.route.meta?.title) document.title = match.route.meta.title;
  }, [match]);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const url = new URL(to, window.location.origin);
    const next = { pathname: url.pathname || '/', search: url.search || '' };
    const isNewPage = next.pathname !== pathnameRef.current;

    scrollPositions.current.set(`${pathnameRef.current}${window.location.search}`, window.scrollY);
    window.history[options?.replace ? 'replaceState' : 'pushState'](null, '', to);

    withViewTransition(() => startTransition(() => setLocation(next)));

    pathnameRef.current = next.pathname;
    // Same page + new query keeps the reader where they were.
    if (isNewPage) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Back / Forward restores the exact scroll of the page being returned to.
  useEffect(() => {
    const onPopState = () => {
      const next = readLocation();
      pathnameRef.current = next.pathname;
      withViewTransition(() => startTransition(() => setLocation(next)));
      const saved = scrollPositions.current.get(`${next.pathname}${next.search}`) ?? 0;
      requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'instant' as ScrollBehavior }));
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const value = useMemo(
    () => ({
      ...location,
      params: match?.params ?? {},
      activeRoute: match?.route ?? null,
      navigate,
    }),
    [location, match, navigate]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

/** Renders the matched page, or redirects when the route only points elsewhere. */
export const Outlet: React.FC = () => {
  const { activeRoute } = useContext(RouterContext);
  if (!activeRoute) return null;
  if ('redirect' in activeRoute) return <Navigate to={activeRoute.redirect} replace />;
  const Page = activeRoute.component;
  return <Page />;
};