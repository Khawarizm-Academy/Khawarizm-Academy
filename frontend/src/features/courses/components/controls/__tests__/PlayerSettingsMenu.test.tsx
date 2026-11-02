import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerSettingsMenu } from '@/features/courses/components/controls/PlayerSettingsMenu';
import { videoPlayerActions } from '@/features/courses/context/videoPlayerStore';

function setViewport({ desktop = true }: { desktop?: boolean } = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width: 640px') ? desktop : !desktop,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function configureStore() {
  videoPlayerActions.setCapabilities({
    speed: true,
    quality: true,
    captions: false,
    pip: false,
    fullscreen: true,
    seek: true,
    airplay: false,
  });
  videoPlayerActions.setQualities([
    { id: '360', label: '360p', height: 360 },
    { id: '720', label: '720p', height: 720 },
  ], '720');
  videoPlayerActions.setCaptionTracks([], null);
}

describe('PlayerSettingsMenu', () => {
  beforeEach(() => {
    setViewport();
    configureStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    videoPlayerActions.setCapabilities({
      speed: false,
      quality: false,
      captions: false,
      pip: false,
      fullscreen: true,
      seek: false,
      airplay: false,
    });
  });

  it('reads quality levels from the external store and hides unsupported actions', () => {
    render(<PlayerSettingsMenu onRequestPictureInPicture={vi.fn()} onRequestAirPlay={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'إعدادات التشغيل' });
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'تلقائي' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: '360p' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: '720p' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'مستوى الصوت' })).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: 'صورة داخل صورة' })).toBeNull();
    expect(screen.queryByRole('menuitem', { name: 'البث عبر AirPlay' })).toBeNull();
    expect(screen.queryByRole('menuitemcheckbox', { name: 'الترجمة العربية' })).toBeNull();
  });

  it('shows captions tracks and capability actions, and supports roving focus plus Escape restore', () => {
    videoPlayerActions.setCapabilities({
      speed: false,
      quality: false,
      captions: true,
      pip: true,
      fullscreen: true,
      seek: true,
      airplay: true,
    });
    videoPlayerActions.setCaptionTracks([
      { language: 'ar', label: 'العربية', isDefault: true },
      { language: 'en', label: 'English', isDefault: false },
    ], 'ar');
    const onPip = vi.fn();
    const onAirPlay = vi.fn();
    render(<PlayerSettingsMenu onRequestPictureInPicture={onPip} onRequestAirPlay={onAirPlay} />);
    const trigger = screen.getByRole('button', { name: 'إعدادات التشغيل' });
    fireEvent.click(trigger);

    expect(screen.getByRole('menuitemcheckbox', { name: 'الترجمة العربية' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'الترجمة العربية' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'صورة داخل صورة' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'البث عبر AirPlay' })).toBeTruthy();

    const menu = screen.getByRole('menu');
    const menuItems = Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]'));
    const firstItem = menuItems[0];
    firstItem.focus();
    fireEvent.keyDown(firstItem, { key: 'End' });
    expect(document.activeElement).toBe(menuItems.at(-1));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(menuItems[0]);
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('presents a mobile settings sheet as a modal dialog and traps Tab focus', () => {
    setViewport({ desktop: false });
    render(<PlayerSettingsMenu />);
    const trigger = screen.getByRole('button', { name: 'إعدادات التشغيل' });
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'إعدادات التشغيل' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    const menu = screen.getByRole('menu', { name: 'إعدادات التشغيل' });
    expect(menu.className).toContain('player-menu-sheet');

    const tabbable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ));
    const first = tabbable[0];
    const last = tabbable[tabbable.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
