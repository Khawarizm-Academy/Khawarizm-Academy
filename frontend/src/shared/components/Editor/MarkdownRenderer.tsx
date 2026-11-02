import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

export const MARKDOWN_ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'br', 'hr', 'img',
];
export const MARKDOWN_ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'title'];

export function renderSafeMarkdown(markdown: string): string {
  const raw = marked.parse(markdown || '') as string;
  const sanitized = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: MARKDOWN_ALLOWED_TAGS,
    ALLOWED_ATTR: MARKDOWN_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
    ALLOWED_URI_REGEXP: /^https:\/\//i,
  });
  const doc = new DOMParser().parseFromString(sanitized, 'text/html');
  doc.querySelectorAll('a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!/^https:\/\//i.test(href)) link.remove();
    else {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
  doc.querySelectorAll('img').forEach((image) => {
    const src = image.getAttribute('src') || '';
    if (!/^https:\/\//i.test(src)) image.remove();
  });
  return doc.body.innerHTML;
}

export const MarkdownRenderer: React.FC<{ value: string; className?: string }> = ({ value, className = '' }) => {
  const html = useMemo(() => renderSafeMarkdown(value), [value]);
  return <div dir="auto" className={`markdown-renderer ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
};
