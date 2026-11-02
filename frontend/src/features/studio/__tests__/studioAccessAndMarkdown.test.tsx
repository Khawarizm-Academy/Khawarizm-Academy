import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteGuard } from '@/app/RouteGuard';
import { routes } from '@/app/routes';
import { RouterContext, type RouterContextType } from '@/app/routerContext';
import { AuthContext, type AuthContextValue } from '@/features/auth/context/authContext';
import { EMPTY_AUTH_USER, type AuthUser } from '@/features/auth/types';
import { StudioRail } from '@/features/studio/components/chrome/StudioRail';
import { useAutosave } from '@/features/studio/hooks/useAutosave';
import { MarkdownRenderer } from '@/shared/components/Editor/MarkdownRenderer';
import { renderSafeMarkdown } from '@/shared/components/Editor/markdownSanitizer';
import { ApiError } from '@/shared/lib/apiClient';

const authValue = (user: AuthUser | null): AuthContextValue => ({
  user,
  config: null,
  isReady: true,
  isSubmitting: false,
  notice: null,
  signIn: async () => undefined,
  signOut: async () => undefined,
  setNotice: () => undefined,
});

const userWith = (permissions: AuthUser['permissions']): AuthUser => ({
  ...EMPTY_AUTH_USER,
  id: 'instructor-1',
  email: 'instructor@example.com',
  fullName: 'مدرّب الاختبار',
  role: 'instructor',
  permissions,
});

const routerValue = (
  pathname: string,
  navigate: RouterContextType['navigate'],
  activeRoute: RouterContextType['activeRoute'] = null,
): RouterContextType => ({
  pathname,
  search: '',
  params: {},
  activeRoute,
  navigate,
});

describe('Studio permission navigation and workspace gating', () => {
  it('shows only the videos section for a custom role with videos.* and hides the workspace switch without studio.access', () => {
    const navigate = vi.fn();
    render(
      <RouterContext.Provider value={routerValue('/studio/videos', navigate)}>
        <AuthContext.Provider value={authValue(userWith(['videos.manage_own']))}>
          <StudioRail />
        </AuthContext.Provider>
      </RouterContext.Provider>,
    );

    expect(screen.getByRole('navigation', { name: 'تنقل الاستوديو' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'مكتبة الفيديو' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'الرئيسية' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'دوراتي' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'الملف التدريبي' })).toBeNull();
    expect(screen.queryByRole('tablist', { name: 'مساحة العمل' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'مكتبة الفيديو' }));
    expect(navigate).toHaveBeenCalledWith('/studio/videos');
  });

  it('shows the workspace switch only when studio.access is present and can move back to Studio', () => {
    const navigate = vi.fn();
    render(
      <RouterContext.Provider value={routerValue('/dashboard', navigate)}>
        <AuthContext.Provider value={authValue(userWith(['studio.access']))}>
          <StudioRail />
        </AuthContext.Provider>
      </RouterContext.Provider>,
    );

    const switcher = screen.getByRole('tablist', { name: 'مساحة العمل' });
    expect(switcher).toBeTruthy();
    expect(screen.getByRole('button', { name: 'الرئيسية' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'دوراتي' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ملفي التدريبي' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'الاستوديو' }));
    expect(navigate).toHaveBeenCalledWith('/studio');
  });

  it('guards every declared Studio route for a signed-in learner without its required permission', () => {
    const studioRoutes = routes.filter((route) => route.path.startsWith('/studio/'));
    expect(studioRoutes.length).toBeGreaterThan(0);

    for (const route of studioRoutes) {
      const pathname = route.path.replace(':slug', 'python-basics').replace(':id', 'quiz-1');
      const navigate = vi.fn();
      const rendered = render(
        <RouterContext.Provider value={routerValue(pathname, navigate, route)}>
          <AuthContext.Provider value={authValue({ ...EMPTY_AUTH_USER, id: 'student-1' })}>
            <RouteGuard><div data-testid="studio-page" /></RouteGuard>
          </AuthContext.Provider>
        </RouterContext.Provider>,
      );

      expect(screen.queryByTestId('studio-page')).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/', { replace: true });
      rendered.unmount();
    }
  });
});

describe('Studio Markdown XSS contract', () => {
  it('keeps safe Markdown renderable with links forced to the safe target contract', () => {
    render(
      <MarkdownRenderer
        value={'# Safe lesson\n\n**Readable** article with [a source](https://example.com/docs).\n\n![cover](https://example.com/cover.png)'}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Safe lesson' })).toBeTruthy();
    expect(screen.getByText('Readable')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'a source' });
    expect(link.getAttribute('href')).toBe('https://example.com/docs');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow');
    expect(screen.getByRole('img', { name: 'cover' }).getAttribute('src')).toBe('https://example.com/cover.png');
  });

  it('does not leave executable script, event-handler, or unsafe URL sinks in hostile Markdown', () => {
    const hostilePayloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<div onclick="alert(1)">click</div>',
      '[run](javascript:alert(1))',
      '[run](JaVaScRiPt:alert(1))',
      '![pixel](data:text/html,<script>alert(1)</script>)',
      '<svg onload=alert(1)><circle /></svg>',
      '<math><mtext><img src=x onerror=alert(1)></mtext></math>',
      '<a href="//evil.example">protocol-relative</a>',
      '<img src="HTTPS://safe.example/image.png" onload="alert(1)">',
    ];
    const output = hostilePayloads.map((payload) => renderSafeMarkdown(payload)).join('');
    const probe = document.createElement('div');
    probe.innerHTML = output;

    expect(probe.querySelector('script, svg, math')).toBeNull();
    expect(probe.querySelector('[onerror], [onclick], [onload]')).toBeNull();
    expect([...probe.querySelectorAll('a')].every((link) => {
      const href = link.getAttribute('href');
      return !href || /^https:\/\//i.test(href);
    })).toBe(true);
    expect([...probe.querySelectorAll('img')].every((image) => {
      const src = image.getAttribute('src');
      return !src || /^https:\/\//i.test(src);
    })).toBe(true);
  });
});

describe('useAutosave', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces and coalesces field edits while carrying the latest expected version', async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue({ updatedAt: 'server-2' });
    const { result } = renderHook(() => useAutosave(save, 'server-1'));

    act(() => {
      result.current.queue({ title: 'first' });
      vi.advanceTimersByTime(400);
      result.current.queue({ about: 'latest' });
    });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(700);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ title: 'first', about: 'latest', expectedUpdatedAt: 'server-1' });
    expect(result.current.state).toBe('saved');
    expect(result.current.expectedUpdatedAt).toBe('server-2');
  });

  it('surfaces a stale-write conflict instead of silently discarding the failed save', async () => {
    vi.useFakeTimers();
    const conflict = new ApiError(409, 'هناك نسخة أحدث من هذا التعديل.', 'stale_write');
    const save = vi.fn().mockRejectedValue(conflict);
    const { result } = renderHook(() => useAutosave(save, 'server-1'));

    act(() => {
      result.current.queue({ content: 'new article body' });
    });
    await act(async () => {
      vi.advanceTimersByTime(700);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledWith({ content: 'new article body', expectedUpdatedAt: 'server-1' });
    expect(result.current.state).toBe('error');
    expect(result.current.conflict).toBe(conflict);
  });
});
