import React from 'react';
import { useAuthLogin } from '@/features/auth/context/authLoginContext';
import { DefaultLoginCard } from '@/features/auth/components/cards/DefaultLoginCard';
import { WelcomeBackCard } from '@/features/auth/components/cards/WelcomeBackCard';
import type { AuthMode, AuthSurface } from '@/features/auth/types';

interface ActiveAuthCardProps {
  surface: AuthSurface;
}

/** One active card per mode, chosen by lookup so both surfaces never branch. */
export const ActiveAuthCard: React.FC<ActiveAuthCardProps> = ({ surface }) => {
  const { authMode, user, completeAuth, changeMode } = useAuthLogin();

  const cardByMode: Record<AuthMode, React.ReactNode> = {
    login: (
      <DefaultLoginCard
        variant={surface}
        onSubmitEmail={completeAuth}
        onSwitchToReturningUser={() => changeMode('welcome-back')}
      />
    ),
    'welcome-back': (
      <WelcomeBackCard
        user={user}
        variant={surface}
        onQuickLogin={completeAuth}
        onSwitchToEmail={() => changeMode('login')}
      />
    ),
  };

  return <>{cardByMode[authMode]}</>;
};