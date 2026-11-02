import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoHostingView } from '@/features/admin/components/views/VideoHostingView';
import type { AdminVideoProvider } from '@/features/admin/types';

const mocks = vi.hoisted(() => ({
  useAdmin: vi.fn(),
  startDriveOAuth: vi.fn(),
  updateVideoProviderPolicy: vi.fn(),
}));

vi.mock('@/features/admin/context/adminContext', () => ({ useAdmin: mocks.useAdmin }));
vi.mock('@/features/admin/data/adminFetchers', () => ({
  startDriveOAuth: mocks.startDriveOAuth,
  updateVideoProviderPolicy: mocks.updateVideoProviderPolicy,
}));
vi.mock('@/shared/lib/apiClient', () => ({ vercelUploadTooLarge: () => false }));

const storageProvider: AdminVideoProvider = {
  code: 'google_drive',
  name: 'Google Drive',
  kind: 'storage',
  needs: [],
  packagingPolicy: 'auto',
  enabled: true,
  available: true,
};

const linkProvider: AdminVideoProvider = {
  code: 'youtube',
  name: 'YouTube',
  kind: 'link',
  needs: [],
  packagingPolicy: 'auto',
  enabled: true,
  available: true,
};

const renderView = () => {
  const refreshVideoData = vi.fn().mockResolvedValue(undefined);
  mocks.useAdmin.mockReturnValue({
    videoProviders: [storageProvider, linkProvider],
    videoAssets: [],
    videoDiagnostics: null,
    videoSystemConfig: { useFfmpeg: true },
    updateVideoSystemConfig: vi.fn().mockResolvedValue(true),
    deletingVideoId: null,
    videoUpload: null,
    uploadVideo: vi.fn().mockResolvedValue(true),
    clearVideoUpload: vi.fn(),
    deleteVideo: vi.fn().mockResolvedValue(undefined),
    loadErrors: { videos: false },
    refreshVideoData,
  });
  render(<VideoHostingView />);
  return { refreshVideoData };
};

describe('VideoHostingView provider packaging policy', () => {
  beforeEach(() => {
    mocks.updateVideoProviderPolicy.mockReset();
    mocks.startDriveOAuth.mockReset();
    mocks.useAdmin.mockReset();
  });

  it('labels a storage selector accessibly and does not render policy for link providers', () => {
    renderView();

    expect(screen.getByRole('combobox', { name: 'سياسة تغليف Google Drive' })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'سياسة تغليف YouTube' })).toBeNull();
  });

  it('shows saving state and refreshes after a successful policy save', async () => {
    let resolveSave!: (value: AdminVideoProvider) => void;
    const pendingSave = new Promise<AdminVideoProvider>((resolve) => {
      resolveSave = resolve;
    });
    mocks.updateVideoProviderPolicy.mockReturnValueOnce(pendingSave);
    const { refreshVideoData } = renderView();
    const selector = screen.getByRole('combobox', { name: 'سياسة تغليف Google Drive' }) as HTMLSelectElement;

    fireEvent.change(selector, { target: { value: 'always' } });
    await waitFor(() => expect(selector.disabled).toBe(true));
    expect(screen.getByText('جارٍ حفظ السياسة…')).toBeTruthy();

    resolveSave({ ...storageProvider, packagingPolicy: 'always' });
    await waitFor(() => expect(refreshVideoData).toHaveBeenCalledTimes(1));
    expect(screen.getByText('تم حفظ سياسة التغليف بنجاح.')).toBeTruthy();
    expect(selector.disabled).toBe(false);
  });

  it('announces a policy save error and does not refresh', async () => {
    mocks.updateVideoProviderPolicy.mockRejectedValueOnce(new Error('تعذّر الحفظ'));
    const { refreshVideoData } = renderView();
    const selector = screen.getByRole('combobox', { name: 'سياسة تغليف Google Drive' });

    fireEvent.change(selector, { target: { value: 'never' } });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('تعذّر الحفظ');
    expect(refreshVideoData).not.toHaveBeenCalled();
    expect((selector as HTMLSelectElement).disabled).toBe(false);
  });
});
