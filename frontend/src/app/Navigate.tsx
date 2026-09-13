import { useEffect } from 'react';
import { useNavigate } from './routerContext';

interface NavigateProps {
  to: string;
  replace?: boolean;
}

/**
 * Declarative redirect used for canonical-route normalization.
 * Renders nothing; on mount it navigates to `to` (replace by default)
 * so browser history is not polluted with redirect hops.
 */
export const Navigate: React.FC<NavigateProps> = ({ to, replace = true }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
  }, [to, navigate, replace]);
  return null;
};