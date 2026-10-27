# Admin Console — لوحة الإدارة

The staff-only console, inside its own immersive shell: a grouped section rail,
a slim top bar, and a registry-driven page head — over the same celestial canvas
as every other page. One responsive surface, never a Desktop/Mobile split: the
tables reflow through `admin.css`, and a section twin would only duplicate them.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/admin` |
| **Shell** | Hidden (`hideShell`) — the console owns its own rail + top bar |
| **Guard** | `requiresAdmin` in `routes.json`; a learner is bounced to `/` |
| **Entry** | `pages/AdminPage.tsx` |
| **State provider** | `context/AdminProvider.tsx` |
| **Styles** | `admin.css` (concept classes `admin-*`), imported once from `src/styles/globals.css` |

## Purpose

Eight sections, selected by `?tab=` so a section is linkable. The rail groups
them into `ADMIN_NAV_GROUPS` (المنصة / المحتوى والفيديو / المتابعة), and every
section opens with its `SECTION_DETAILS` headline, so no view hand-draws a
page header:

| Tab | Answers |
| :--- | :--- |
| `overview` | headline counts (users, active sessions, logins, revocations) + the video health strip |
| `users` | every account — arrived through signup, never created here — with role filter, search, and an inspector (view/edit/promote/revoke/delete) |
| `content` | generic content manager with sub-tabs (courses, scholarships, events, competitions), schema-driven forms |
| `videos` | hosted video assets: upload (FFmpeg-aware), review statuses/errors, delete |
| `system` | the staged video diagnostics: pipeline / Telegram / Google Drive, why not, and the fix hint — with an opt-in deep run against the live provider APIs |
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
│   ├── chrome/                          AdminHeader, AdminSectionNav, AdminPageHead,
│   │                                    AdminNotice
│   ├── controls/                        AdminSearchBox, RoleSelect, ConfirmAction,
│   │                                    AdminToggle, AdminFieldInput
│   ├── layout/                          AdminShell, UsersTable, SessionsTable,
│   │                                    EventList, ContentTable
│   ├── overlays/                        ContentFormModal
│   ├── states/                          AdminEmptyState
│   ├── toolbar/                         AdminPagination
│   └── views/                           OverviewView, UsersView, SessionsView,
│                                        AnalyticsView, ActivityView,
│                                        VideoHostingView, AdminSystemView,
│                                        UserDetailPanel
├── context/
│   ├── adminContext.ts                  context + useAdmin()
│   └── AdminProvider.tsx                all section data, filters, actions
├── data/
│   ├── adminContentForm.ts              form values, grouped editor stacks, payloads
│   ├── adminFetchers.ts                 one function per /api/admin route
│   ├── adminFormatters.ts               labels, dates, counts, section icon maps
│   └── fieldIcons.ts                    one icon per field name / kind
├── types.ts                             API payloads, nav groups, section details,
│                                        filter option lists
├── admin.css                            feature concept classes
└── README.md
```

## How it works

- **The registry answers everything:** `ADMIN_NAV_GROUPS` and
  `ADMIN_SECTION_KEYS` drive the rail and the URL, `SECTION_DETAILS` supplies
  every page's h1 + mandate line (rendered by `AdminPageHead`), and
  `SECTION_ICONS` one icon per section. A new section is a new key plus map
  entries — never a new `if`.
- **The shell obeys the RTL document:** the document is already
  `dir="rtl"`, so `AdminShell` puts the rail first (far right), then the
  column of top bar — page head — pills strip — section view. `admin-container`
  centers the column (`max-w-[1280px] mx-auto`) so nothing hugs the edge.
- **Accounts arrive via signup only.** There is no create-user flow: no button,
  no modal, no fetcher. The inspector's `UserEditor` seeds inputs from the
  schema-driven `userFields`, keeps a `تغييرات غير محفوظة` dirty chip, resets
  to the saved values, and its close (backdrop or Escape) asks before discard.
- **Schema-driven editing:** `adminContentForm.ts` is the one source for
  `AdminFormValue`, `groupEditorFields` (essentials / prose / structured
  stacks with `FIELD_GROUP_LABELS`), and payload validation. Both
  `ContentFormModal` and the inline `UserEditor` render from it; inputs come
  from `AdminFieldInput` keyed by `field.kind`, with LTR handling for
  emails, urls, slugs, and numeric kinds.
- **Icons instead of prose:** `fieldIcons.ts` maps field names (kind
  fallbacks) to lucide icons, `ADMIN_*_FILTERS` lists the segmented-control
  options, and every empty/error state carries an icon via `AdminEmptyState`
  (its `OctagonAlert` tone marks a failed load with a retry button).
- **Realistic verbs, not jargon:** Google Drive's consent button reads
  «ربط حساب Google» — the platform links the academy's existing account,
  it does not grant it anything new.
- **Video hosting:** one upload path (`uploadVideoAsset` with real byte
  progress), which 202s when the file lands and then polls the server's
  `progress`/`stage` until a terminal state. The dropdown greys unready
  providers and states each blocker inline; the FFmpeg miss is a banner
  pointing at `?tab=system`.
- **One provider, eight sections:** `AdminProvider` loads section data
  through `useCachedData` and gates only the *first* load of the active tab
  with a `DataSectionSkeleton variant="list"`, so switching tabs never
  flashes. Video data loads only while `overview` / `videos` / `system` are
  open; the deep diagnostics run only after the admin presses its button.
- **Mutations report, never swallow:** `changeRole`, `revokeSession`,
  `updateUser`, `deleteUser`, and the content/video mutations surface
  failures through the console-wide `AdminNotice` banner.

## Data

| Source | Provides |
| :--- | :--- |
| `data/adminFetchers.ts` | `fetchOverview`, `fetchUsers`, `fetchUserDetail`, `updateUserRole`, `fetchSessions`, `revokeAdminSession`, `fetchLoginSeries`, `fetchDeviceBreakdown`, `fetchEvents`, `updateAdminUser`, `deleteAdminUser`, `fetchContentSchema`, `fetchContent`, `createContent`, `updateContent`, `deleteContent`, `fetchVideoProviders`, `fetchVideoAssets`, `fetchVideoDiagnostics(deep)`, `fetchVideoAsset(id)`, `uploadVideoAsset(file, onProgress)`, `createVideoAsset`, `deleteVideoAsset`, `startDriveOAuth` |
| `data/adminContentForm.ts` | `AdminFormValue`, `emptyFormValues`, `toFormValues`, `toPayloadValues`, `groupEditorFields`, `FIELD_GROUP_ORDER`, `FIELD_GROUP_LABELS` |
| `data/adminFormatters.ts` | `formatCount`, `formatDateTime`, `formatShortDateTime`, `formatDayLabel`, `formatLastSeen(Short)`, `initialsOf`, `SECTION_ICONS`, `METRIC_ICONS`, `REVOKE_REASON_LABELS`, `EVENT_KIND_LABELS` |
| `data/fieldIcons.ts` | `fieldIcon(field)` — name map with kind fallback |
| `types.ts` | `ADMIN_NAV_GROUPS`, `ADMIN_SECTION_KEYS`, `SECTION_DETAILS`, `ROLE_FILTERS`, `ACTIVE_FILTERS`, `LOGIN_RANGES`, `EVENT_KIND_FILTERS` |
| `@/shared/lib/apiClient` | every request goes through the Bearer + silent-refresh client |

## Notes

- The console is **one responsive surface**. Do not split it into
  Desktop/Mobile view pairs: the tables reflow through `admin.css`, and the
  extra files would only duplicate the sections. Below `lg` the rail becomes
  a scrolling pills strip; below `md` the top bar steps aside for the page
  head alone.
- `admin/errors` from a 403 render as a full-panel state, not a crash — a
  non-staff reader who lands here is told plainly that they cannot manage the
  platform.

## Endpoints

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/admin/overview` | The home counts + `content` sub-counts. |
| `GET` | `/admin/users` | Paged accounts; `q`, `role`, `page`. |
| `PATCH` | `/admin/users/:id` | Update subset; returns `AdminUserRow`. Self-demotion rejected. |
| `DELETE` | `/admin/users/:id` | `{deleted:true,id}`; self-delete rejected. |
| `GET` | `/admin/content/schema` | `{types, userFields}` (schema-driven forms). |
| `GET` | `/admin/content/:type` | Paged rows; `q` filters by key/title fields. |
| `POST` | `/admin/content/:type` | Create row from schema fields; returns `ContentRow`. |
| `PATCH` | `/admin/content/:type/:id` | Update subset; returns `ContentRow`. |
| `DELETE` | `/admin/content/:type/:id` | `{deleted:true,id}`. |
| `GET` | `/admin/video-providers` | Rows carry `available`/`reason` — the select gate. |
| `GET` | `/admin/video-assets` | Assets carry `error`/`qualities`/`createdAt`. |
| `POST` | `/admin/video-assets` | `{slug,title?,provider?}` registration route — the console always uploads a real file. |
| `POST` | `/admin/video-assets/upload` | Multipart `{file,slug,title?,provider?}` → `202` with the asset row; the ingest worker then drives `progress`/`stage`/`status` on the polled detail row. Needs a real server host. |
| `GET` | `/admin/video-assets/:id` | The tracker's poll target — same shape as the list row. |
| `DELETE` | `/admin/video-assets/:id` | `{deleted:true,id}`. |
| `GET` | `/admin/video-drive/oauth/start` | Returns Google's consent `authUrl`; tokens live in Django. |
| `GET` | `/admin/video-diagnostics?deep=true` | The staged validation; shallow stays offline, deep calls the providers' APIs. |

## Related

- Backend contract: [`../../../../docs/07-backend-contract.md`](../../../../docs/07-backend-contract.md)
- Backend twin: [`../../../../../backend/features/adminconsole/README.md`](../../../../../backend/features/adminconsole/README.md)
- Auth (guards, sessions, the API client): [`../auth/README.md`](../auth/README.md)
- Routing & guards: [`../../../../docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
