import React, { createContext, useContext, useState, useEffect, useCallback, useTransition } from 'react';

interface RouterContextType {
  pathname: string;
  search: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType>({
  pathname: '/',
  search: '',
  navigate: () => {},
});

export const Router: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState(() => ({
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
  }));
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handlePopState = () => {
      startTransition(() => {
        setCurrentLocation({
          pathname: window.location.pathname || '/',
          search: window.location.search || '',
        });
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const url = new URL(to, window.location.origin);
    const newPathname = url.pathname || '/';
    const newSearch = url.search || '';

    if (options?.replace) {
      window.history.replaceState(null, '', to);
    } else {
      window.history.pushState(null, '', to);
    }

    startTransition(() => {
      setCurrentLocation({
        pathname: newPathname,
        search: newSearch,
      });
    });

    // Scroll to top on navigation if pathname changed
    if (newPathname !== currentLocation.pathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentLocation.pathname]);

  return (
    <RouterContext.Provider value={{ pathname: currentLocation.pathname, search: currentLocation.search, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);

export const useNavigate = () => {
  const { navigate } = useContext(RouterContext);
  return navigate;
};

export const useLocation = () => {
  const { pathname, search } = useContext(RouterContext);
  return { pathname, search };
};

export const useSearchParams = (): [URLSearchParams, (params: URLSearchParams | Record<string, string>) => void] => {
  const { search, pathname, navigate } = useContext(RouterContext);
  const searchParams = new URLSearchParams(search);

  const setSearchParams = useCallback(
    (newParams: URLSearchParams | Record<string, string>) => {
      const paramsObj = newParams instanceof URLSearchParams ? newParams : new URLSearchParams(newParams);
      const queryString = paramsObj.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      navigate(newUrl, { replace: true });
    },
    [pathname, navigate]
  );

  return [searchParams, setSearchParams];
};
