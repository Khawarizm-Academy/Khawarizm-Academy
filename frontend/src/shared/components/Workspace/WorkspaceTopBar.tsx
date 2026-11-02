import React from 'react';

export const WorkspaceTopBar: React.FC<React.HTMLAttributes<HTMLElement>> = ({ children, className = '', ...props }) => (
  <header className={`workspace-topbar ${className}`} {...props}>
    <span className="workspace-topbar-hairline" aria-hidden="true" />
    {children}
  </header>
);
