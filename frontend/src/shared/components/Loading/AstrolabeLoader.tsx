import React, { useState } from 'react';
import loadingLogo from '@/assets/brand/generated/loading-logo.png';

interface AstrolabeLoaderProps {
  fullScreen?: boolean;
  message?: string;
}

export const AstrolabeLoader: React.FC<AstrolabeLoaderProps> = ({
  fullScreen = false,
  message = 'جاري رصد البيانات الفلكية...',
}) => {
  const [imgError, setImgError] = useState(false);

  const content = (
    <div className="loader-wrap">
      {/* Animated Astrolabe Gyroscopic Device */}
      <div className="loader-device flex-center">
        {/* Ambient Pulsing Gold Glow */}
        <div className="loader-glow animate-celestial-pulse" />

        {/* Outermost Ring — Brass Degree Marks rotating clockwise */}
        <div className="loader-ring-outer animate-orbit-slow" />

        {/* Middle Ring — Tech Cyan Celestial Ring rotating counter-clockwise */}
        <div className="loader-ring-mid animate-counter-orbit-slow">
          <span className="loader-ring-dot" />
        </div>

        {/* Inner Astrolabe Ecliptic Ellipse */}
        <div className="loader-ring-inner" />

        {/* Central Luminous Core Star */}
        <div className="loader-core-star flex-center">
          <div className="loader-core-dot" />
        </div>
      </div>

      {/* Brand & Loading Label */}
      <div className="loader-brand">
        {!imgError && (
          <img
            src={loadingLogo}
            alt="شعار أكاديمية خوارزم"
            className="loader-logo"
            onError={() => setImgError(true)}
          />
        )}
        <span className="loader-name">أكاديمية خوارزم</span>
        <span className="loader-message">{message}</span>
      </div>
    </div>
  );

  if (fullScreen) {
    return <div className="loader-screen flex-center">{content}</div>;
  }

  return <div className="loader-inline flex-center">{content}</div>;
};
