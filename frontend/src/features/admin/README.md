# Admin Console — لوحة الإدارة

The staff-only console: who is on the platform, from which device, what happened
recently, and the ability to force-logout any device. One responsive page with
section tabs — **not** a desktop/mobile split, because an administrator works
from wherever they are and the tables are the same either way.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/admin` |
| **Shell** | Hidden (`hideShell`) — no navbar, no footer, no bottom bar |
| **Guard** | `requiresAdmin` in `routes.json`; a learner is bounced to `/` |
| **Entry** | `pages/AdminPage.tsx` |
| **State provider** | `context/AdminProvider.tsx` |
| **Styles** | `admin.css` (concept classes `admin-*`), imported once from `src/styles/globals.css` |

## Purpose

Six sections, selected by `?tab=` so a section is linkable:

| Tab | Answers |
| :--- | :--- |
| `overview` | headline counts (users, active sessions, logins, revocations) + the video health strip |
| `users` | every account, with role filter, search, and a detail panel (view/edit/delete) |
| `content` | generic content manager with sub-tabs (courses, scholarships, events, competitions), schema-driven forms |
| `videos` | hosted video assets: stage (no-FFmpeg aware) new assets, review statuses/errors, delete |
| `system` | the staged video diagnostics: what works (pipeline / FFmpeg, Telegram, Google Drive), why not, and the fix hint — with an opt-in deep run against the live provider APIs |
| `sessions` | every device session, active/closed filter, search by mail or IP |
| `analytics` | the login series chart and the OS / browser / device breakdown |
| `activity` | the most recent audit rows, filterable by kind |

## Structure

```text
admin/
├── pages/
│   └── AdminPage.tsx                    mounts the provider + shell
├── components/
│   ├── cards/                           Badges, StatCard, LoginSeriesChart,
│   │                                    DeviceBreakdownLists, UserProfileCard
│   ├── chrome/                          AdminHeader, AdminSectionNav, AdminNotice
│   ├── controls/                        AdminSearchBox, RoleSelect, ConfirmAction
│   ├── layout/                          AdminShell, UsersTable, SessionsTable,
│   │                                    EventList, ContentTable
│   ├── states/                          AdminEmptyState
│   ├── toolbar/                         AdminPagination
│   └── views/                           OverviewView, UsersView, SessionsView,
│                                        AnalyticsView, ActivityView,
│                                        VideoHostingView, AdminSystemView,
│                                        UserDetailPanel
├── context/
│   ├── adminContext.ts                  context + useAdmin() + section registry
│   └── AdminProvider.tsx                all section data, filters, actions
├── data/
│   ├── adminFetchers.ts                 one function per /api/admin route
│   └── adminFormatters.ts               labels, dates, counts, icon maps
├── types.ts                             the API payloads
├── admin.css                            feature concept classes
└── README.md
```

## How it works

- **One provider, eight sections:** `AdminProvider` loads section data through
  `useCachedData` and gates only the *first* load of the active tab with a
  `DataSectionSkeleton variant="list"`, so switching tabs never flashes.
  Video-hosting data loads only while `overview` / `videos` / `system` are
  open, and the deep diagnostics run only after the admin presses its button.
- **The section registry is the single source of truth:** `ADMIN_SECTION_KEYS`,
  `SECTION_LABELS`, `SECTION_ICONS`, `EVENT_KIND_LABELS`, and
  `REVOKE_REASON_LABELS` are label/icon maps in `adminContext.ts` /
  `adminFormatters.ts`. A new section is a new key plus a map entry — never a
  new `if`.
- **Two actions, both optimistic-free and explicit:** `changeRole(userId, role)`
  and `revokeSession(id)` re-run `refresh()` so the tables never drift from the
  server. Both report failures through the console's `AdminNotice` instead of
  swallowing them.
- **The current device is marked, not guessed:** the backend passes the
  caller's session id into `session_payload`, so `isCurrent` is true only for
  the device the admin is signed in on.
- **RTL, no `dir` override:** the document is already `dir="rtl"`, so the
  console needs no direction handling — just logical properties in `admin.css`.

## Data

| Source | Provides |
| :--- | :--- |
| `data/adminFetchers.ts` | `fetchOverview`, `fetchUsers`, `fetchUserDetail`, `updateUserRole`, `fetchSessions`, `revokeAdminSession`, `fetchLoginSeries`, `fetchDeviceBreakdown`, `fetchEvents`, `createAdminUser`, `updateAdminUser`, `deleteAdminUser`, `fetchContentSchema`, `fetchContent`, `createContent`, `updateContent`, `deleteContent`, `fetchVideoProviders`, `fetchVideoAssets`, `fetchVideoDiagnostics(deep)`, `createVideoAsset`, `deleteVideoAsset` |
| `data/adminFormatters.ts` | `formatCount`, `formatDateTime`, `formatShortDateTime`, `formatDayLabel`, `initialsOf`, `SECTION_ICONS`, `METRIC_ICONS`, `REVOKE_REASON_LABELS`, `EVENT_KIND_LABELS` |
| `@/shared/lib/apiClient` | every request goes through the Bearer + silent-refresh client |

## Notes

- The console is **one responsive surface**. Do not split it into
  Desktop/Mobile view pairs: the tables reflow through `admin.css`, and the
  extra files would only duplicate the sections.
- `admin/errors` from a 403 render as a full-panel state, not a crash — a
  non-staff reader who lands here is told plainly that they cannot manage the
  platform.

## Endpoints

| Method | Path | Notes |
| :--- | :--- | :--- |
| `POST` | `/admin/users` | Create account; returns `AdminUserRow`. |
| `PATCH` | `/admin/users/:id` | Update subset; returns `AdminUserRow`. Self-demotion rejected. |
| `DELETE` | `/admin/users/:id` | `{deleted:true,id}`; self-delete rejected. |
| `GET` | `/admin/content/schema` | `{types, userFields}` (schema-driven forms). |
| `GET` | `/admin/content/:type` | Paged rows; `q` filters by key/title fields. |
| `POST` | `/admin/content/:type` | Create row from schema fields; returns `ContentRow`. |
| `PATCH` | `/admin/content/:type/:id` | Update subset; returns `ContentRow`. |
| `DELETE` | `/admin/content/:type/:id` | `{deleted:true,id}`. |
| `GET` | `/admin/video-providers` | Rows carry `available`/`reason` — the select gate. |
| `GET` | `/admin/video-assets` | Assets carry `error`/`qualities`/`createdAt`. |
| `POST` | `/admin/video-assets` | `{slug,title?,provider?}`; refused with an Arabic reason when the provider's env checks fail. |
| `DELETE` | `/admin/video-assets/:id` | `{deleted:true,id}`. |
| `GET` | `/admin/video-diagnostics?deep=true` | The staged validation; shallow stays offline, deep calls the providers' APIs. |

## Related

- Backend contract: [`../../../../docs/07-backend-contract.md`](../../../../docs/07-backend-contract.md)
- Backend twin: [`../../../../../backend/features/adminconsole/README.md`](../../../../../backend/features/adminconsole/README.md)
- Auth (guards, sessions, the API client): [`../auth/README.md`](../auth/README.md)
- Routing & guards: [`../../../../docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
