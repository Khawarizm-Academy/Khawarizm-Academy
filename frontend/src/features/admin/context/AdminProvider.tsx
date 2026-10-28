import React, { useCallback, useMemo, useState } from 'react';
import { useLocation } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { dataCacheManager } from '@/shared/lib/cacheManager';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { ApiError } from '@/shared/lib/apiClient';
import { ADMIN_SECTION_KEYS } from '@/features/admin/types';
import { AdminContext, type AdminContextValue, type VideoUploadState } from '@/features/admin/context/adminContext';
import {
  fetchDeviceBreakdown,
  fetchEvents,
  fetchLoginSeries,
  fetchOverview,
  fetchSessions,
  fetchUserDetail,
  fetchUsers,
  fetchVideoAsset as fetchVideoAssetRequest,
  fetchVideoAssets,
  fetchVideoProviders,
  fetchVideoDiagnostics,
  fetchVideoSystemConfig as fetchVideoSystemConfigRequest,
  updateVideoSystemConfig as updateVideoSystemConfigRequest,
  deleteVideoAsset as deleteVideoRequest,
  uploadVideoAsset as uploadVideoRequest,
  revokeAdminSession,
  updateUserRole,
  updateAdminUser,
  deleteAdminUser,
  fetchContentSchema,
  fetchContent,
  createContent as createContentRequest,
  updateContent as updateContentRequest,
  deleteContent as deleteContentRequest,
} from '@/features/admin/data/adminFetchers';
import type {
  AdminActiveFilter,
  AdminEvent,
  AdminEventKind,
  AdminLoginRange,
  AdminOverview,
  AdminRoleFilter,
  AdminSectionKey,
  AdminSessionWithUser,
  AdminUserDetail,
  AdminUserRow,
  AdminUserInput,
  AdminVideoAsset,
  AdminVideoDiagnostics,
  AdminVideoInput,
  AdminVideoProvider,
  AdminVideoSystemConfig,
  AdminContentSchema,
  AdminContentTypeKey,
  AdminContentPage,
  DeviceBreakdown,
  LoginSeries,
  Paged,
} from '@/features/admin/types';
import type { AuthRole } from '@/features/auth/types';

/** A `?tab=` value that names a real section; anything else lands on the home section. */
const asSection = (raw: string | null): AdminSectionKey =>
  (ADMIN_SECTION_KEYS as string[]).includes(raw ?? '') ? (raw as AdminSectionKey) : 'overview';

/** One banner message for anything the API threw. */
const toMessage = (error: unknown): string =>
  error instanceof ApiError || error instanceof Error ? error.message : 'حدث خطأ غير متوقع.';

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { search, navigate } = useLocation();

  // The section lives in the URL so a refresh, a bookmark, and the back button all work.
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const currentSection = asSection(queryParams.get('tab'));

  const [userSearch, setUserSearchState] = useState('');
  const [userRole, setUserRoleState] = useState<AdminRoleFilter>('all');
  const [userPage, setUserPage] = useState(1);
  const [sessionSearch, setSessionSearchState] = useState('');
  const [sessionActive, setSessionActiveState] = useState<AdminActiveFilter>('all');
  const [sessionPage, setSessionPage] = useState(1);
  const [loginRange, setLoginRange] = useState<AdminLoginRange>('14');
  const [eventKind, setEventKind] = useState<AdminEventKind | 'all'>('all');
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingContentId, setDeletingContentId] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [deepDiagnosticsRequested, setDeepDiagnosticsRequested] = useState(false);
  const [videoUpload, setVideoUpload] = useState<VideoUploadState | null>(null);
  const [contentType, setContentTypeState] = useState<AdminContentTypeKey | null>(null);
  const [contentSearch, setContentSearchState] = useState('');
  const [contentPage, setContentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // The open account lives in the URL: /admin?tab=users&user=<id> — bookmarks,
  // refresh, and browser-back all keep the same account page.
  const selectedUserId = queryParams.get('user');

  const overview = useCachedData<AdminOverview>(['admin', 'overview'], fetchOverview);
  const users = useCachedData<Paged<AdminUserRow>>(
    ['admin', 'users', userSearch, userRole, userPage],
    () => fetchUsers({ q: userSearch, role: userRole, page: userPage }),
    { keepPreviousData: true }
  );
  const sessions = useCachedData<Paged<AdminSessionWithUser>>(
    ['admin', 'sessions', sessionSearch, sessionActive, sessionPage],
    () => fetchSessions({ q: sessionSearch, active: sessionActive, page: sessionPage }),
    { keepPreviousData: true }
  );
  const loginSeries = useCachedData<LoginSeries>(
    ['admin', 'logins', loginRange],
    () => fetchLoginSeries(loginRange),
    { keepPreviousData: true }
  );
  const devices = useCachedData<DeviceBreakdown>(['admin', 'devices'], fetchDeviceBreakdown);
  const events = useCachedData<AdminEvent[]>(
    ['admin', 'events', eventKind],
    () => fetchEvents(eventKind),
    { initialData: [], keepPreviousData: true }
  );
  // No keepPreviousData here: a detail panel must never flash another account.
  const selectedUser = useCachedData<AdminUserDetail | null>(
    ['admin', 'user', selectedUserId],
    () => (selectedUserId ? fetchUserDetail(selectedUserId) : Promise.resolve(null)),
    { enabled: selectedUserId !== null }
  );

  // Video-hosting data loads with the section that shows it — plus the shallow
  // diagnostics on the overview strip. Deep (live-API) runs wait for consent.
  const videoReloadNeeded = ['overview', 'videos', 'system'].includes(currentSection);
  const videoProviders = useCachedData<AdminVideoProvider[]>(
    ['admin', 'video-providers'],
    fetchVideoProviders,
    { enabled: videoReloadNeeded, initialData: [] }
  );
  const videoAssets = useCachedData<AdminVideoAsset[]>(['admin', 'video-assets'], fetchVideoAssets, {
    enabled: videoReloadNeeded,
    initialData: [],
  });
  const videoDiagnostics = useCachedData<AdminVideoDiagnostics>(
    ['admin', 'video-diagnostics', 'shallow'],
    () => fetchVideoDiagnostics(false),
    { enabled: videoReloadNeeded }
  );
  const deepDiagnostics = useCachedData<AdminVideoDiagnostics>(
    ['admin', 'video-diagnostics', 'deep'],
    () => fetchVideoDiagnostics(true),
    { enabled: deepDiagnosticsRequested, keepPreviousData: true }
  );
  // The global toggles own the packaging decision — always loaded with the
  // video sections so the upload form can reason about FFmpeg.
  const videoSystemConfig = useCachedData<AdminVideoSystemConfig>(
    ['admin', 'video-system-config'],
    fetchVideoSystemConfigRequest,
    { enabled: videoReloadNeeded }
  );

  // Content schema is the single source of truth for forms; load it once.
  const contentSchema = useCachedData<AdminContentSchema>(['admin', 'content', 'schema'], fetchContentSchema);

  const contentTypeList = contentSchema.data?.types ?? [];
  const activeContentType = contentType ?? contentTypeList[0]?.key ?? null;

  // Load content rows only while the content section is open.
  const content = useCachedData<AdminContentPage>(
    ['admin', 'content', activeContentType, contentSearch, contentPage],
    () =>
      fetchContent(activeContentType as AdminContentTypeKey, {
        q: contentSearch,
        page: contentPage,
      }),
    { enabled: currentSection === 'content' && activeContentType !== null, keepPreviousData: true }
  );

  // Every page reset travels with its own filter, so results never sit on a stale page.
  const setUserSearch = useCallback((value: string) => {
    setUserSearchState(value);
    setUserPage(1);
  }, []);
  const setUserRole = useCallback((value: AdminRoleFilter) => {
    setUserRoleState(value);
    setUserPage(1);
  }, []);
  const setSessionSearch = useCallback((value: string) => {
    setSessionSearchState(value);
    setSessionPage(1);
  }, []);
  const setSessionActive = useCallback((value: AdminActiveFilter) => {
    setSessionActiveState(value);
    setSessionPage(1);
  }, []);

  const setContentType = useCallback((type: AdminContentTypeKey) => {
    setContentTypeState(type);
    setContentSearchState('');
    setContentPage(1);
  }, []);

  const setContentSearch = useCallback((value: string) => {
    setContentSearchState(value);
    setContentPage(1);
  }, []);

  const setContentPageCallback = useCallback((page: number) => {
    setContentPage(page);
  }, []);

  const selectSection = useCallback(
    (section: AdminSectionKey) => navigate(`/admin?tab=${section}`),
    [navigate]
  );
  const selectUser = useCallback(
    (userId: string | null) =>
      navigate(userId ? `/admin?tab=users&user=${userId}` : `/admin?tab=${currentSection}`),
    [navigate, currentSection]
  );
  const clearError = useCallback(() => setError(null), []);

  const changeRole = async (userId: string, role: AuthRole) => {
    setError(null);
    setChangingRoleId(userId);
    try {
      await updateUserRole(userId, role);
      await Promise.all([users.refetch(), overview.refetch(), selectedUser.refetch()]);
    } catch (thrown) {
      setError(toMessage(thrown));
    } finally {
      setChangingRoleId(null);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setError(null);
    setRevokingSessionId(sessionId);
    try {
      await revokeAdminSession(sessionId);
      await Promise.all([sessions.refetch(), overview.refetch(), selectedUser.refetch()]);
    } catch (thrown) {
      setError(toMessage(thrown));
    } finally {
      setRevokingSessionId(null);
    }
  };

  const updateUser = async (userId: string, input: Partial<AdminUserInput>): Promise<boolean> => {
    setError(null);
    try {
      await updateAdminUser(userId, input);
      await Promise.all([users.refetch(), overview.refetch(), selectedUser.refetch()]);
      return true;
    } catch (thrown) {
      setError(toMessage(thrown));
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    setError(null);
    setDeletingUserId(userId);
    try {
      await deleteAdminUser(userId);
      await Promise.all([users.refetch(), overview.refetch()]);
      return true;
    } catch (thrown) {
      setError(toMessage(thrown));
      return false;
    } finally {
      setDeletingUserId(null);
    }
  };

  const createContent = async (values: Record<string, unknown>): Promise<boolean> => {
    if (!activeContentType) return false;
    setError(null);
    try {
      await createContentRequest(activeContentType, values);
      await Promise.all([content.refetch(), overview.refetch()]);
      return true;
    } catch (thrown) {
      setError(toMessage(thrown));
      return false;
    }
  };

  const updateContent = async (id: string, values: Record<string, unknown>): Promise<boolean> => {
    if (!activeContentType) return false;
    setError(null);
    try {
      await updateContentRequest(activeContentType, id, values);
      await Promise.all([content.refetch(), overview.refetch()]);
      return true;
    } catch (thrown) {
      setError(toMessage(thrown));
      return false;
    }
  };

  const deleteContent = async (id: string): Promise<boolean> => {
    if (!activeContentType) return false;
    setError(null);
    setDeletingContentId(id);
    try {
      await deleteContentRequest(activeContentType, id);
      await Promise.all([content.refetch(), overview.refetch()]);
      return true;
    } catch (thrown) {
      setError(toMessage(thrown));
      return false;
    } finally {
      setDeletingContentId(null);
    }
  };

  // Every video create/delete ends with fresh provider verdicts, assets, and
  // diagnostics so the health cards tell the truth immediately after acting.
  const refreshVideoData = async () => {
    await Promise.all([
      videoProviders.refetch(),
      videoAssets.refetch(),
      videoDiagnostics.refetch(),
      videoSystemConfig.refetch(),
    ]);
  };

  /** Persist the FFmpeg packaging toggle; diagnostics re-run against the new mode. */
  const updateVideoSystemConfig = async (useFfmpeg: boolean): Promise<boolean> => {
    setError(null);
    try {
      await updateVideoSystemConfigRequest(useFfmpeg);
      dataCacheManager.set(['admin', 'video-system-config'], { useFfmpeg });
      await videoDiagnostics.refetch();
      return true;
    } catch (thrown) {
      setError(toMessage(thrown));
      return false;
    }
  };

  // The backend 202s as soon as the file lands on disk and ingests on a worker
  // thread — so the tracker follows the server-side progress/stage/status from
  // here until the row reaches a terminal state.
  const pollTrackedIngest = async (assetId: string, current: VideoUploadState): Promise<boolean> => {
    const MILLISECONDS_BETWEEN_POLLS = 2000;
    const TRACKING_TIMEOUT_MS = 30 * 60 * 1000; // multi-hour pre-split uploads are fine
    const deadline = Date.now() + TRACKING_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const asset: AdminVideoAsset = await fetchVideoAssetRequest(assetId);
      setVideoUpload({ ...current, percent: asset.progress ?? 0, stage: asset.stage ?? '' });
      if (asset.status === 'error') {
        setVideoUpload({ ...current, phase: 'error', error: asset.error ?? 'فشل الرفع على الخادم.' });
        await refreshVideoData();
        return false;
      }
      if (asset.status === 'ready' || asset.status === 'staged') {
        setVideoUpload({ ...current, phase: 'done', percent: 100, stage: '' });
        await refreshVideoData();
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, MILLISECONDS_BETWEEN_POLLS));
    }
    setVideoUpload({
      ...current,
      phase: 'error',
      error: 'انتهت مهلة المتابعة — راجع حالة العنصر في جدول الفيديوهات.',
    });
    await refreshVideoData();
    return false;
  };

  /** The file leg (XHR progress) then the ingest leg (polling) in one tracker. */
  const uploadVideo = async (input: AdminVideoInput & { file: File }): Promise<boolean> => {
    setError(null);
    const started: VideoUploadState = {
      phase: 'sending',
      percent: 0,
      stage: '',
      slug: input.slug,
      fileName: input.file.name,
    };
    setVideoUpload(started);
    try {
      const asset = await uploadVideoRequest(input, (percent) =>
        setVideoUpload((state) => (state?.phase === 'sending' ? { ...started, percent } : state))
      );
      return await pollTrackedIngest(asset.id, { ...started, phase: 'tracking' });
    } catch (thrown) {
      setVideoUpload({ ...started, phase: 'error', error: toMessage(thrown) });
      return false;
    }
  };

  const clearVideoUpload = useCallback(() => setVideoUpload(null), []);

  const deleteVideo = async (id: string) => {
    setError(null);
    setDeletingVideoId(id);
    try {
      await deleteVideoRequest(id);
      await Promise.all([videoAssets.refetch(), videoDiagnostics.refetch()]);
    } catch (thrown) {
      setError(toMessage(thrown));
    } finally {
      setDeletingVideoId(null);
    }
  };

  /** First press arms the deep run (live provider APIs); later presses re-run it. */
  const runDeepDiagnostics = async () => {
    setError(null);
    if (!deepDiagnosticsRequested) {
      setDeepDiagnosticsRequested(true);
      return;
    }
    try {
      await deepDiagnostics.refetch();
    } catch (thrown) {
      setError(toMessage(thrown));
    }
  };

  const refresh = async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      const refreshers: Promise<unknown>[] = [
        overview.refetch(),
        users.refetch(),
        sessions.refetch(),
        loginSeries.refetch(),
        devices.refetch(),
        events.refetch(),
        selectedUser.refetch(),
        contentSchema.refetch(),
      ];
      if (activeContentType) refreshers.push(content.refetch());
      if (videoReloadNeeded) {
        refreshers.push(
          videoProviders.refetch(),
          videoAssets.refetch(),
          videoDiagnostics.refetch(),
          videoSystemConfig.refetch()
        );
      }
      await Promise.all(refreshers);
    } finally {
      setIsRefreshing(false);
    }
  };

  const sectionLoading: Record<AdminSectionKey, boolean> = {
    overview: overview.isLoading,
    users: users.isLoading,
    content: contentSchema.isLoading || content.isLoading,
    videos: videoProviders.isLoading || videoAssets.isLoading,
    system: videoDiagnostics.isLoading && !videoDiagnostics.isError,
    sessions: sessions.isLoading,
    analytics: loginSeries.isLoading || devices.isLoading,
    activity: events.isLoading,
  };

  const loadErrors: Record<AdminSectionKey, boolean> = {
    overview: overview.isError,
    users: users.isError,
    content: contentSchema.isError || content.isError,
    videos: videoProviders.isError || videoAssets.isError,
    system: videoDiagnostics.isError,
    sessions: sessions.isError,
    analytics: loginSeries.isError || devices.isError,
    activity: events.isError,
  };

  // First load of the section being opened: hold the page with a Tier 2 skeleton.
  if (sectionLoading[currentSection] && !loadErrors[currentSection]) {
    return <DataSectionSkeleton variant="list" count={5} />;
  }

  const value: AdminContextValue = {
    currentSection,
    selectSection,
    overview: overview.data ?? null,
    users: users.data ?? null,
    userSearch,
    userRole,
    userPage,
    setUserSearch,
    setUserRole,
    setUserPage,
    sessions: sessions.data ?? null,
    sessionSearch,
    sessionActive,
    sessionPage,
    setSessionSearch,
    setSessionActive,
    setSessionPage,
    loginSeries: loginSeries.data ?? null,
    loginRange,
    setLoginRange,
    devices: devices.data ?? null,
    events: events.data ?? [],
    eventKind,
    setEventKind,
    contentSchema: contentSchema.data ?? null,
    contentType: activeContentType,
    setContentType,
    content: content.data ?? null,
    contentSearch,
    contentPage,
    setContentSearch,
    setContentPage: setContentPageCallback,
    deletingUserId,
    deletingContentId,
    selectedUserId,
    selectedUser: selectedUser.data ?? null,
    isLoadingSelectedUser: selectedUser.isLoading,
    selectedUserError: selectedUser.isError,
    selectUser,
    changingRoleId,
    revokingSessionId,
    error,
    clearError,
    loadErrors,
    isRefreshing,
    refresh,
    changeRole,
    revokeSession,
    updateUser,
    deleteUser,
    createContent,
    updateContent,
    deleteContent,
    videoProviders: videoProviders.data ?? [],
    videoAssets: videoAssets.data ?? [],
    deletingVideoId,
    deleteVideo,
    videoSystemConfig: videoSystemConfig.data ?? null,
    updateVideoSystemConfig,
    videoUpload,
    uploadVideo,
    clearVideoUpload,
    videoDiagnostics: videoDiagnostics.data ?? null,
    deepDiagnostics: deepDiagnosticsRequested ? deepDiagnostics.data ?? null : null,
    deepDiagnosticsLoading: deepDiagnostics.isFetching && deepDiagnosticsRequested,
    deepDiagnosticsRequested,
    runDeepDiagnostics,
    refreshVideoData,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};
