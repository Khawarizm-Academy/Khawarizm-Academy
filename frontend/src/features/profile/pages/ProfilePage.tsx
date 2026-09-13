import React from 'react';
import { FeaturePlaceholder } from '../../../shared/components/Placeholder/FeaturePlaceholder';

export const ProfilePage: React.FC = () => {
  return (
    <FeaturePlaceholder
      title="الملف الشخصي"
      description="بياناتك الشخصية، شاراتك، شهاداتك المعتمدة، وإعدادات حسابك — قريبًا على هذه الصفحة."
      icon={
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      }
    />
  );
};