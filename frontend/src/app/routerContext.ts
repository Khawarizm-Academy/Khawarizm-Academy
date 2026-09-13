import { createContext, useContext, useCallback } from 'react';
import type { RouteDefinition } from './routes';

export interface RouterContextType {
  pathname: string;
  search: string;
  params: Record<string, string>;
  activeRoute: RouteDefinition | null;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

export const RouterContext = createContext<RouterContextType>({
  pathname: '/',
  search: '',
  params: {},
  activeRoute: null,
  navigate: () => {},
});

/**
 * Matches a URL path against a route pattern with parameter support (e.g. /courses/:slug)
 */
export function matchRoutePattern(
  pattern: string,
  pathname: string
): { matches: boolean; params: Record<string, string> } {
  if (pattern === pathname) {
    return { matches: true, params: {} };
  }

  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);

  if (pattern === '*') {
    return { matches: true, params: { wildcard: pathname } };
  }

  if (patternSegments.length !== pathSegments.length) {
    return { matches: false, params: {} };
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const pSeg = patternSegments[i];
    const uSeg = pathSegments[i];

    if (pSeg.startsWith(':')) {
      const paramName = pSeg.slice(1);
      params[paramName] = decodeURIComponent(uSeg);
    } else if (pSeg !== uSeg) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params };
}

export const useRouter = () => useContext(RouterContext);

export const useNavigate = () => {
  const { navigate } = useContext(RouterContext);
  return navigate;
};

export const useLocation = () => {
  const { pathname, search } = useContext(RouterContext);
  return { pathname, search };
};

export const useParams = <T extends Record<string, string> = Record<string, string>>(): T => {
  const { params } = useContext(RouterContext);
  return params as T;
};

export const useActiveRoute = () => {
  const { activeRoute } = useContext(RouterContext);
  return activeRoute;
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
