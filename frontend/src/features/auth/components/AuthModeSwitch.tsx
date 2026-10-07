import React from 'react';
import { AUTH_MODE_OPTIONS, type AuthMode } from '../types';

interface AuthModeSwitchProps {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}

/** Active pill colors per mode, keyed so no branch chain is needed. */
const ACTIVE_CLASS: Record<AuthMode, string> = {
  login: 'auth-mode-option-login',
  'welcome-back': 'auth-mode-option-returning',
};

/** One pill for both surfaces: viewport breakpoints pick the label and the size. */
export const AuthModeSwitch: React.FC<AuthModeSwitchProps> = ({ mode, onChange }) => (
  <div className="auth-mode-switch">
    {AUTH_MODE_OPTIONS.map((option) => (
      <button
        key={option.key}
        type="button"
        onClick={() => onChange(option.key)}
        className={`auth-mode-option ${mode === option.key ? ACTIVE_CLASS[option.key] : ''}`}
      >
        <span className="lg:hidden">{option.shortLabel}</span>
        <span className="hidden lg:inline">{option.longLabel}</span>
      </button>
    ))}
  </div>
);
