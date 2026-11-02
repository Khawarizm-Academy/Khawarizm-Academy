import React from 'react';

export const WorkspaceRail: React.FC<React.HTMLAttributes<HTMLElement>> = ({ children, className = '', ...props }) => (
  <aside className={`workspace-rail ${className}`} {...props}>{children}</aside>
);
