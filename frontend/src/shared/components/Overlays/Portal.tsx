import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders floating UI (toasts, menus) straight into <body>. This keeps
 * `position: fixed` pinned to the viewport even when an animated ancestor
 * (the page-transition wrapper) would otherwise become its containing block.
 */
export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  createPortal(children, document.body);
