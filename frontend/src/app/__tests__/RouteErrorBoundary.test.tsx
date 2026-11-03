import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RouteErrorBoundary } from '@/app/RouteErrorBoundary';
import { ApiError } from '@/shared/lib/apiClient';

// Flipped by the test between render passes: the page under the boundary throws
// until the learner retries.
let shouldThrow = true;

const FailingPage: React.FC = () => {
  if (shouldThrow) {
    throw new ApiError(500, 'تعذر تحميل الدروس.', 'server_error', undefined, undefined, 'req-42');
  }
  return <p>الدرس جاهز</p>;
};

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the request id so support can correlate the failure', () => {
    render(
      <RouteErrorBoundary>
        <FailingPage />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText(/رمز الخطأ: req-42/).textContent).toContain('req-42');
  });

  it('retries by re-rendering the route instead of reloading the document', () => {
    render(
      <RouteErrorBoundary>
        <FailingPage />
      </RouteErrorBoundary>,
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(screen.getByText('الدرس جاهز')).toBeTruthy();
    expect(screen.queryByText(/تعذر عرض هذه الصفحة/)).toBeNull();
  });
});
