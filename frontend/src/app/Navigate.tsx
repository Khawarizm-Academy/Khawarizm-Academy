import { useEffect } from 'react';
import { useNavigate } from '@/app/routerContext';

interface NavigateProps {
  to: string;
  replace?: boolean;
}

/** Redirects on mount and renders nothing, so history keeps no extra hop. */
export const Navigate: React.FC<NavigateProps> = ({ to, replace = true }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace });
  }, [to, navigate, replace]);
  return null;
};