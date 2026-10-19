import React, { useCallback, useMemo, useState } from 'react';
import { useLocation } from '@/app/routerContext';
import { useCachedData } from '@/shared/hooks/useCachedData';
import { DataSectionSkeleton } from '@/shared/components/Loading/DataSectionSkeleton';
import { ApiError } from '@/shared/lib/apiClient';
import { ADMIN_SECTION_KEYS } from '@/features/admin/types';
import { AdminContext, type AdminContextValue } from '@/features/admin/context/adminContext';
import {
  fetchDeviceBreakdown,
  fetchEvents,
  fetchLoginSeries,
  fetchOverview,
  fetchSessions,
  fetchUserDetail,
  fetchUsers,
  revokeAdminSession,
  updateUserRole,
  createAdminUser,
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingContentId, setDeletingContentId] = useState<string | null>(null);
  const [contentType, setContentTypeState] = useState<AdminContentTypeKey | null>(null);
  const [contentSearch, setContentSearchState] = useState('');
  const [contentPage, setContentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const selectUser = useCallback((userId: string | null) => setSelectedUserId(userId), []);
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

  const createUser = async (input: AdminUserInput): Promise<boolean> => {
    setError(null);
    try {
      await createAdminUser(input);
      await Promise.all([users.refetch(), overview.refetch()]);
      return true;
    } catch (thrown) {
      setError(toMessage(thrown));
      return false;
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
      await Promise.all(refreshers);
    } finally {
      setIsRefreshing(false);
    }
  };

  const sectionLoading: Record<AdminSectionKey, boolean> = {
    overview: overview.isLoading,
    users: users.isLoading,
    content: contentSchema.isLoading || content.isLoading,
    sessions: sessions.isLoading,
    analytics: loginSeries.isLoading || devices.isLoading,
    activity: events.isLoading,
  };

  const loadErrors: Record<AdminSectionKey, boolean> = {
    overview: overview.isError,
    users: users.isError,
    content: contentSchema.isError || content.isError,
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
    createUser,
    updateUser,
    deleteUser,
    createContent,
    updateContent,
    deleteContent,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};
