/** Everything the five console sections share — loaded once by AdminProvider. */

import { createContext, useContext } from 'react';
import type { AuthRole } from '@/features/auth/types';
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
  AdminContentSchema,
  AdminContentTypeKey,
  AdminContentPage,
  DeviceBreakdown,
  LoginSeries,
  Paged,
} from '@/features/admin/types';

export interface AdminContextValue {
  /** Drives the rail, the pills, and which view renders — read from `?tab=`. */
  currentSection: AdminSectionKey;
  selectSection: (section: AdminSectionKey) => void;

  overview: AdminOverview | null;
  users: Paged<AdminUserRow> | null;
  userSearch: string;
  userRole: AdminRoleFilter;
  userPage: number;
  setUserSearch: (value: string) => void;
  setUserRole: (value: AdminRoleFilter) => void;
  setUserPage: (page: number) => void;

  sessions: Paged<AdminSessionWithUser> | null;
  sessionSearch: string;
  sessionActive: AdminActiveFilter;
  sessionPage: number;
  setSessionSearch: (value: string) => void;
  setSessionActive: (value: AdminActiveFilter) => void;
  setSessionPage: (page: number) => void;

  loginSeries: LoginSeries | null;
  loginRange: AdminLoginRange;
  setLoginRange: (range: AdminLoginRange) => void;
  devices: DeviceBreakdown | null;

  events: AdminEvent[];
  eventKind: AdminEventKind | 'all';
  setEventKind: (kind: AdminEventKind | 'all') => void;

  /** Content management state, rendered from the generic schema. */
  contentSchema: AdminContentSchema | null;
  contentType: AdminContentTypeKey | null;
  setContentType: (type: AdminContentTypeKey) => void;
  content: AdminContentPage | null;
  contentSearch: string;
  contentPage: number;
  setContentSearch: (value: string) => void;
  setContentPage: (page: number) => void;

  /** Per-row busy state for destructive or per-row actions. */
  deletingUserId: string | null;
  deletingContentId: string | null;

  /** The open user detail panel, or null when it is closed. */
  selectedUserId: string | null;
  selectedUser: AdminUserDetail | null;
  isLoadingSelectedUser: boolean;
  selectedUserError: boolean;
  selectUser: (userId: string | null) => void;

  /** Per-row busy state so only the affected row spins. */
  changingRoleId: string | null;
  revokingSessionId: string | null;
  /** A failed action, surfaced as a console-wide banner. */
  error: string | null;
  clearError: () => void;
  /** A failed section load, so the view can render an error state instead of a skeleton. */
  loadErrors: Record<AdminSectionKey, boolean>;

  // -- Video hosting: providers, assets, and the staged diagnostics report --
  videoProviders: AdminVideoProvider[];
  videoAssets: AdminVideoAsset[];
  /** Per-row busy state so only the affected asset spins while deleting. */
  deletingVideoId: string | null;
  creatingVideo: boolean;
  createVideo: (input: AdminVideoInput) => Promise<boolean>;
  deleteVideo: (id: string) => Promise<void>;

  /** The shallow diagnostics report (offline checks). */
  videoDiagnostics: AdminVideoDiagnostics | null;
  /** The deep run — provider APIs — loads only after the admin asks for it. */
  deepDiagnostics: AdminVideoDiagnostics | null;
  deepDiagnosticsLoading: boolean;
  deepDiagnosticsRequested: boolean;
  runDeepDiagnostics: () => Promise<void>;
  refreshVideoData: () => Promise<void>;

  isRefreshing: boolean;
  refresh: () => Promise<void>;
  changeRole: (userId: string, role: AuthRole) => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  createUser: (input: AdminUserInput) => Promise<boolean>;
  updateUser: (userId: string, input: Partial<AdminUserInput>) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  createContent: (values: Record<string, unknown>) => Promise<boolean>;
  updateContent: (id: string, values: Record<string, unknown>) => Promise<boolean>;
  deleteContent: (id: string) => Promise<boolean>;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

/** Console-wide data plus the actions that mutate it. */
export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error('[admin] useAdmin must be used inside AdminProvider.');
  return value;
}
