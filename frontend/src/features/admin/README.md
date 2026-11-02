# Admin Console — لوحة الإدارة

The permission-gated console lives inside one responsive RTL shell. API authorization remains granular per method and video capability; the `requiresAdmin` route guard only controls navigation.

## At a glance

| | |
| :--- | :--- |
| **Route** | `/admin` |
| **Shell** | Hidden (`hideShell`) — the console owns its rail + top bar |
| **Guard** | `requiresAdmin` in `routes.json`; backend permissions remain authoritative |
| **Entry** | `pages/AdminPage.tsx` |
| **State provider** | `context/AdminProvider.tsx` |
| **Styles** | `admin.css`, imported once from `src/styles/globals.css` |

## Video sections

`overview`, `videos`, and `system` share the provider registry and asset tracker. The video view uploads a real file, receives `202`, then polls `progress`, `stage`, `status`, and `error` until a terminal state. Unavailable providers are disabled with the backend `reason`; the FFmpeg banner points to diagnostics. The system view runs shallow checks by default and calls live provider probes only after the admin requests a deep run.

The console exposes separate controls for:

- provider availability and packaging policy (`auto`, `always`, `never`);
- global `useFfmpeg` toggle;
- paged assets with quality count, view ledger, progress/stage, and bounded error text;
- Drive OAuth consent/status/disconnect;
- diagnostics for pipeline, Telegram, and Drive.

A provider policy is not a promise that all providers behave alike. Telegram has no general raw fallback and requires persistent spool/FFmpeg packaging; Drive is private raw Range playback in v1, not Drive-backed HLS. Missing Telegram packaging prerequisites reject the upload plan rather than leaving new uploads staged indefinitely.

## Data and permissions

`data/adminFetchers.ts` is the network seam. Video fetchers include `fetchVideoProviders`, `updateVideoProviderPolicy`, `fetchVideoAssets`, `fetchVideoDiagnostics(deep)`, `fetchVideoSystemConfig`, `updateVideoSystemConfig`, `createVideoAsset`, `uploadVideoAsset(file,onProgress)`, `fetchVideoAsset`, `deleteVideoAsset`, and `startDriveOAuth`.

The canonical backend permission registry is the source of truth:

| Permission | Console/feature responsibility |
| :--- | :--- |
| `videos.configure` | provider policy, system FFmpeg toggle, diagnostics, Drive OAuth |
| `videos.manage_any` | global provider asset list/create/upload/detail/delete |
| `videos.manage_own` | owned Studio video metadata/caption/delete flows |
| `videos.upload` | Studio storage upload initiation; implies `studio.access` |
| `videos.use_embed` | validated YouTube/Vimeo/external link creation |
| `videos.package` | explicit permission for FFmpeg packaging capability |
| `videos.watch_any` | entitlement override for playback |

The backend still checks ownership and method-specific permission. `administrator` implies the permission catalog; the route guard does not replace API authorization.

## Current video endpoints

All paths are relative to `/api/`.

| Method | Path | Notes |
| :--- | :--- | :--- |
| `GET` | `/admin/video-providers` | `{results}` registry rows with `available`/`reason`. |
| `POST` | `/admin/video-providers/:code/policy` | Persists `packagingPolicy`; returns provider plus policy fields. |
| `GET` · `POST` | `/admin/video-assets` | Bounded `{total,page,pageSize,results}` page or registration. |
| `POST` | `/admin/video-assets/upload` | Multipart `{file,slug,title?,provider?}` → `202`; needs a real server worker. |
| `GET` · `DELETE` | `/admin/video-assets/:id` | Poll tracker row or delete; published lesson links block deletion. |
| `GET` · `POST` | `/admin/video-system-config` | Read/update `{useFfmpeg}`. |
| `GET` | `/admin/video-diagnostics?deep=true` | Shallow by default; deep performs live Telegram/Drive probes. |
| `GET` | `/admin/video-drive/oauth/start` | `{authUrl}` only; OAuth tokens stay in Django. |
| `GET` | `/admin/video-drive/oauth/callback` | Google redirect; neutral HTML, no token response. |
| `GET` | `/admin/video-drive/oauth/status` | `{connected,accountEmail,status,error}`. |
| `POST` | `/admin/video-drive/oauth/disconnect` | Revoke/delete stored grant. |

The asset row includes `id,slug,title,status,provider,playbackMode,protection,sizeBytes,sourceSizeBytes,progress,stage,qualities,viewCount,lastViewedAt,createdAt`, plus a truncated `error` on list/detail. Diagnostics includes `checkedAt`, `deep`, `okOverall`, `summary`, `problems`, `groups`, and `providers` with severity and fix hints.

## Upload behavior

The admin multipart path streams the incoming file to a temporary server path and starts the ingest worker. It is not an ephemeral Vercel packaging path: Vercel cannot run FFmpeg or retain the required Telegram spool. Studio’s separate resumable API uses a default 4 MiB raw binary relay chunk and never exposes provider upload URIs. The frontend only renders server progress after the initial HTTP upload progress.

Playback grants are mode-aware (`hls`, `raw`, `embed`, `external`). HLS/raw grants are expiring and IP-bound; the backend stores only token hashes. Drive raw play URLs are platform-gated and bounded by Range/no-store rules. HLS manifests, keys, captions, Studio, admin, and raw responses are private/no-store as applicable.

## Related

- Backend contract: [`../../../../docs/07-backend-contract.md`](../../../../docs/07-backend-contract.md)
- Backend architecture: [`../../../../docs/08-backend-architecture.md`](../../../../docs/08-backend-architecture.md)
- Video feature: [`../../../../../backend/features/videohosting/README.md`](../../../../../backend/features/videohosting/README.md)
- Routing & guards: [`../../../../docs/03-routing-and-navigation.md`](../../../../docs/03-routing-and-navigation.md)
