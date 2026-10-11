import { createContext, useContext, useCallback, useMemo } from 'react';
import type { RouteDefinition } from '@/app/routes';

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

/** Everything about the current URL in one hook. */
export const useRouter = () => useContext(RouterContext);

export const useNavigate = () => useContext(RouterContext).navigate;

export const useLocation = () => useContext(RouterContext);

export const useParams = <T extends Record<string, string> = Record<string, string>>(): T =>
  useContext(RouterContext).params as T;

export const useActiveRoute = () => useContext(RouterContext).activeRoute;

/** Query params plus a setter that replaces the URL and keeps the scroll. */
export const useSearchParams = (): [
  URLSearchParams,
  (params: URLSearchParams | Record<string, string>) => void,
] => {
  const { pathname, search, navigate } = useContext(RouterContext);

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  const setSearchParams = useCallback(
    (params: URLSearchParams | Record<string, string>) => {
      const next = params instanceof URLSearchParams ? params : new URLSearchParams(params);
      const query = next.toString();
      navigate(query ? `${pathname}?${query}` : pathname, { replace: true });
    },
    [pathname, navigate]
  );

  return [searchParams, setSearchParams];
};