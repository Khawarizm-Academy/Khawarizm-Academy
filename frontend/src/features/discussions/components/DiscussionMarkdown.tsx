import React from 'react';
import { renderSafeMarkdown } from '@/shared/components/Editor/markdownSanitizer';

export const DiscussionMarkdown: React.FC<{
  value: string;
  onJumpToTimestamp?: (seconds: number) => void;
}> = ({ value, onJumpToTimestamp }) => {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onJumpToTimestamp) return;
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    try {
      const url = new URL(href, window.location.href);
      const raw = url.searchParams.get('t');
      if (raw === null) return;
      const seconds = Number(raw);
      if (!Number.isFinite(seconds) || seconds < 0) return;
      event.preventDefault();
      onJumpToTimestamp(seconds);
    } catch {
      // The shared sanitizer already removes unsafe links; malformed links stay inert.
    }
  };

  return (
    <div
      className="discussion-markdown"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(value) }}
    />
  );
};
