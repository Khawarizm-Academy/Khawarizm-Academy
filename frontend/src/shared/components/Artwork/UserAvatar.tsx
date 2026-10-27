import React, { useState } from 'react';

/**
 * An account's real avatar photo; falls back to the initials tile when the
 * API has none or the URL fails. The shell keeps its own styling class.
 */
export const UserAvatar: React.FC<{ src?: string; initials: string; className: string }> = ({
  src,
  initials,
  className,
}) => {
  const [isBroken, setIsBroken] = useState(false);

  return (
    <span className={className}>
      {src && !isBroken ? (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
          onError={() => setIsBroken(true)}
        />
      ) : (
        initials || '?'
      )}
    </span>
  );
};
