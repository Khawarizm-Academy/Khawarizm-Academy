import React, { useMemo } from 'react';
import { renderSafeMarkdown } from '@/shared/components/Editor/markdownSanitizer';

export const MarkdownRenderer: React.FC<{ value: string; className?: string }> = ({ value, className = '' }) => {
  const html = useMemo(() => renderSafeMarkdown(value), [value]);
  return <div dir="auto" className={`markdown-renderer ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
};
