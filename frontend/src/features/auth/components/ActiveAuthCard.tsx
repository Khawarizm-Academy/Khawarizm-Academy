import React from 'react';
import { useAuthLogin } from '../context/authLoginContext';
import { DefaultLoginCard } from './DefaultLoginCard';
import { WelcomeBackCard } from './WelcomeBackCard';
import type { AuthMode, AuthSurface } from '../types';

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