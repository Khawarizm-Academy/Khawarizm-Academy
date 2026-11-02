import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerErrorPanel } from '@/features/videohosting/components/overlays/PlayerErrorPanel';
import { PlayerBadges } from '@/features/videohosting/components/overlays/PlayerBadges';
import { ResumePrompt } from '@/features/videohosting/components/overlays/ResumePrompt';
import { UpNextCard } from '@/features/videohosting/components/overlays/UpNextCard';
import { WatermarkOverlay } from '@/features/videohosting/components/overlays/WatermarkOverlay';

function setReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('player overlays', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('maps entitlement errors to Arabic copy, hides unsafe details, and exposes retry plus enrollment', () => {
    const onRetry = vi.fn();
    const onEnroll = vi.fn();
    render(
      <PlayerErrorPanel
        code="not_entitled"
        message="<img src=x onerror=alert(1)> raw API detail"
        onRetry={onRetry}
        onEnroll={onEnroll}
      />,
    );

    expect(screen.getByRole('heading', { name: 'هذا الدرس للمسجّلين' })).toBeTruthy();
    expect(screen.getByText('سجّل في الدورة لفتح هذا الدرس ومتابعة التقدم.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'التسجيل في الدورة' })).toBeTruthy();
    expect(screen.queryByText(/raw API|<img/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    fireEvent.click(screen.getByRole('button', { name: 'التسجيل في الدورة' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onEnroll).toHaveBeenCalledOnce();
  });

  it('always keeps retry and does not show enrollment for readiness or generic errors', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<PlayerErrorPanel code="processing" onRetry={onRetry} />);
    expect(screen.getByRole('heading', { name: 'الفيديو قيد المعالجة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'التسجيل في الدورة' })).toBeNull();

    rerender(<PlayerErrorPanel code="404" status={404} onRetry={onRetry} />);
    expect(screen.getByRole('heading', { name: 'تعذر العثور على الفيديو' })).toBeTruthy();
    expect(screen.queryByText('404')).toBeNull();
  });

  it('renders resume time in an isolated LTR bidi span and handles both choices', () => {
    const onStartOver = vi.fn();
    const onDismiss = vi.fn();
    render(<ResumePrompt resumeAtSeconds={125} onStartOver={onStartOver} onDismiss={onDismiss} />);

    const time = screen.getByText('2:05');
    expect(time.tagName).toBe('BDI');
    expect(time.getAttribute('dir')).toBe('ltr');
    fireEvent.click(screen.getByRole('button', { name: 'البدء من جديد' }));
    fireEvent.click(document.querySelector('.player-resume-continue') as HTMLButtonElement);
    expect(onStartOver).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('advances from a target timestamp and cleans the interval after unmount', () => {
    vi.useFakeTimers();
    setReducedMotion(false);
    const onAdvance = vi.fn();
    const { unmount } = render(<UpNextCard title="الدرس التالي" onAdvance={onAdvance} onCancel={vi.fn()} />);

    expect(screen.getByRole('status').textContent).toContain('يبدأ خلال 5');
    vi.advanceTimersByTime(4_999);
    expect(onAdvance).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onAdvance).toHaveBeenCalledOnce();

    unmount();
    vi.advanceTimersByTime(10_000);
    expect(onAdvance).toHaveBeenCalledOnce();
  });

  it('uses a static progress class when reduced motion is preferred and cancels cleanly', () => {
    vi.useFakeTimers();
    setReducedMotion(true);
    const onCancel = vi.fn();
    const onAdvance = vi.fn();
    render(<UpNextCard title="الدرس التالي" onAdvance={onAdvance} onCancel={onCancel} />);

    expect(document.querySelector('.player-up-next-progress-static')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء التقدم التلقائي' }));
    expect(onCancel).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(5_000);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('reports each protection state truthfully, including external sources', () => {
    const { rerender } = render(<PlayerBadges protection="encrypted" />);
    expect(screen.getByText('مشفّر')).toBeTruthy();
    rerender(<PlayerBadges protection="gated" />);
    expect(screen.getByText('محمي')).toBeTruthy();
    rerender(<PlayerBadges protection="none" />);
    expect(screen.getByText('مصدر خارجي')).toBeTruthy();
    expect(screen.queryByText(/مشفّر|محمي/)).toBeNull();
  });

  it('does not animate the watermark for reduced motion and cleans up when motion is enabled', () => {
    vi.useFakeTimers();
    let onChange: ((event: MediaQueryListEvent) => void) | undefined;
    const motionQuery = {
      matches: true,
      addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => { onChange = listener; }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', () => motionQuery);
    const drawingContext = {
      clearRect: vi.fn(),
      fillText: vi.fn(),
      font: '',
      fillStyle: '',
      textBaseline: 'middle',
    };
    const contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      drawingContext as unknown as CanvasRenderingContext2D,
    );
    const intervalSpy = vi.spyOn(window, 'setInterval');
    const { unmount } = render(<WatermarkOverlay label="learner" />);
    expect(drawingContext.clearRect).toHaveBeenCalled();
    expect(intervalSpy).not.toHaveBeenCalled();

    motionQuery.matches = false;
    onChange?.({ matches: false } as MediaQueryListEvent);
    expect(intervalSpy).toHaveBeenCalledOnce();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    contextSpy.mockRestore();
    intervalSpy.mockRestore();
  });
});
