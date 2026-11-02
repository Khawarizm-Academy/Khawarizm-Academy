import React from 'react';

interface SectionHeadingProps { title: string; eyebrow?: string; action?: React.ReactNode; className?: string; }
export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, eyebrow, action, className = '' }) => (
  <div className={`workspace-section-heading ${className}`}><div>{eyebrow && <span>{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>
);
