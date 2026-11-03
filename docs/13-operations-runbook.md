# 09 · Operations Runbook

Three failures the platform actually produces, and the shortest path to a
diagnosis. Every command and endpoint below exists in the code today — copy the
lines, don't improvise. Names in `code` are exact.

Log lines are one JSON object per line (see `config/logging.py`). The correlation
key is `request_id`, and the SPA shows it to the learner as **رمز الخطأ: …** — ask
for that string first, then:

```bash
grep '"request_id": "PASTE-IT"' api.log | less    # the whole request, in order
```

Operational events carry an `event` object: `video grant minted`,
`upload session opened|completed|cancelled`, `raw proxy busy`,
`raw proxy upstream failure`, `attempt graded`, `cleanup run finished`,
`access change`, `permission denials`. Tokens, provider URIs and upload URIs are
never logged (Phase 13 §13.1.5, §13.4).

---

## 1. "A video won't play"

Work the chain in order — entitlement, then status, then mode, then provider,
then token. Each step has an exact answer, so stop at the first mismatch.

```
Learner pressed play
        │
        ▼
[1] Are they entitled? ────────────── no ──► 403 not_entitled → §3 "lost access"
        │  (enrolled / course staff / owner / admin / preview)
        ▼ yes
[2] Is the asset ready? ───────────── no ──► 409 with a status-specific message
        │  status ∈ uploading | processing | staged | ready | error
        ▼ yes
[3] Which playback mode? ──────────────────► hls | raw | embed | external
        │
        ▼
[4] Is the provider healthy? ──────── no ──► re-enable or switch the default
        │
        ▼ yes
[5] Is the grant still valid? ──────── no ──► client re-mints; a loop here is a clock problem
```

**[1] Entitlement.** `playback_access()` in `backend/features/videohosting/services.py`
evaluates the rules in this order: `admin` (`videos.watch_any` or
`administrator`) → `owner` (the asset's `created_by`) → `staff` (course staff or
`courses.edit_any`/`curriculum.edit_any`) → `preview` → `enrolled`
(`lessons.watch` **and** a real enrollment row). A learner who can see the lesson
but gets `not_entitled` almost always has no `Enrollment` row — check
`GET /api/dashboard/enrolled` as them.

**[2] Status.** `GET /api/videos/<asset-slug>` (meta) returns `status`. Meanings
and the operator action:

| status | meaning | action |
| :--- | :--- | :--- |
| `uploading` | bytes still arriving | wait; see §2 if it is stuck |
| `processing` | FFmpeg packaging running | wait for `package_pending` to finish |
| `staged` | source stored, no packager on this host | set `useFfmpeg` or switch provider |
| `ready` | playable | continue to [3] |
| `error` | ingest failed | read `error_message` on the asset row |

**[3] Mode.** `hls` and `raw` are served by the platform; `embed`/`external` are
the provider's own player. Raw grants are short-lived by design
(`VIDEO_RAW_GRANT_TTL_MINUTES`, default 120) because the token rides the query
string.

**[4] Provider health.** As an admin:

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/admin/video-diagnostics"          # shallow, offline
curl -H "Authorization: Bearer $TOKEN" "$API/admin/video-diagnostics?deep=1"   # live Telegram/Drive probes
curl -H "Authorization: Bearer $TOKEN" "$API/admin/video-providers"            # registry + `available`/`reason`
curl -H "Authorization: Bearer $TOKEN" "$API/admin/video-system-config"        # useFfmpeg and defaults
```

`raw proxy busy` (a 503 `raw_busy`) is not a provider failure — it means
`VIDEO_RAW_MAX_CONCURRENT` byte streams are already open. The player retries on
the `Retry-After: 2` header. Raise the cap only if the host has the bandwidth.

**[5] Token.** `token_invalid` (403) means the grant expired or the request came
from a different IP than it was minted for (the grant is bound to the client IP).
hls.js mints a fresh grant and resumes; a *loop* of re-mints usually means server
clock drift — run `python manage.py clock_drift` and fix the host clock before
anything else.

---

## 2. "An upload is stuck"

```
Progress bar not moving
        │
        ▼
[1] GET /api/studio/uploads/<sessionId> ──► {offset, total, status, progress}
        │
        ├── status=pending, offset climbing        normal, keep polling
        ├── status=pending, offset frozen > 24h    stale session → `cleanup_expired` deletes it
        ├── DELETE the same path                   cancels the session (asset → `error`)
        └── offset == total but not `ready`        packaging is the slow part → [2]
```

**[1] One call, one answer.** `GET /api/studio/uploads/<session_id>` reports the
server-side byte offset (`offset`/`total`); the client resends from that offset
(`409 offset_mismatch` means the client's offset drifted — it re-reads this
endpoint and continues).

**[2] Packaging.** After the bytes land, the asset goes `processing` → `ready` in
the background worker:

```bash
python manage.py package_pending          # re-drive stale processing/staged assets
python manage.py ingest_video FILE --slug <asset-slug>   # ingest a local file as that asset
```

If `staged` never leaves, FFmpeg is missing or disabled: check
`/api/admin/video-system-config` (`useFfmpeg`) and the packager binary on the host.

**Quotas and caps** (all env, read only in `config/settings.py`):
`VIDEO_MAX_OPEN_UPLOADS` (default 3 concurrent pending sessions per user — the
error tells them to cancel one), `VIDEO_UPLOAD_CHUNK_BYTES`,
`VIDEO_SPOOL_MAX_BYTES`, `VIDEO_UPLOAD_STALE_HOURS` (default 24; `cleanup_expired`
sweeps stale sessions and their spool parts).

---

## 3. "A user lost access"

```
Can't reach a section
        │
        ▼
[1] What does the user actually have?  GET /api/admin/users/<id>/effective-permissions
        │                              → each key + `grantedBy` + `via` + administrator flag
        ▼
[2] Did it change recently?            GET /api/admin/audit?target_type=...
        │
        ▼
[3] Fix it                             POST /api/admin/users/<id>/roles  (or bulk-roles)
```

**[1] Provenance, not guesses.** `GET /api/admin/users/<user_id>/effective-permissions`
returns every effective key with the role that granted it. `administrator`
implies everything, so an admin looks like they "have" a key they were never
granted directly — the inspector shows `via` for exactly that case.

**[2] The audit trail.** `GET /api/admin/audit` covers role create/update/delete,
membership adds/removes, and session revocations, each with actor, target and the
before/after diff (secrets and tokens are stripped before the row is written).

**[3] Common root causes**

| symptom | cause | fix |
| :--- | :--- | :--- |
| every endpoint 401 | session revoked — single-device rule | sign in again; the old device was `signed_in_elsewhere` |
| Studio sections 403 | lost `studio.access` | re-add the role; check they are not below the actor in the hierarchy |
| admin console 403 | lost `admin.access` | grant it or restore the `admin` role |
| one course 403 | removed from that course's staff | `POST /api/studio/courses/<slug>/staff` |
| 403 with no audit row | a *new* endpoint that was never classified | `config/route_access.py` — the manifest test tells you which |

Role hierarchy rules: an actor can only manage roles **below** them and can never
remove the last administrator (`plan/` Access Control phases; enforced in
`features/access/services.py`).

---

## 4. Background jobs and health

| job | command | schedule | notes |
| :--- | :--- | :--- | :--- |
| cleanup | `python manage.py cleanup_expired` | every 6 h | tokens, stale uploads, spent Drive states, auth + audit retention, hidden content after 30 days; overlap-guarded (`skipped, still running`) |
| reminders | `python manage.py send_reminders` | daily | dashboard nudge queue |
| progress | `python manage.py recompute_progress` | on demand | rebuilds server-derived progress (G12) |
| packaging | `python manage.py package_pending` | every 5 min | HLS packaging queue |

On Vercel, `GET /api/admin/maintenance/cleanup` (scheduled daily in
`backend/vercel.json`) authenticates with `Authorization: Bearer $CRON_SECRET`
matched against `MAINTENANCE_CRON_SECRET` and returns `202` with the per-family
counts.

Health: `GET /healthz` is process liveness. `GET /readyz` additionally checks the
database, the presence of the default `student`/`admin` roles (a missing role is a
boot-blocking misconfiguration) and the video spool directory when Telegram
ingest is enabled. A `503` body names the failing check.

---

## 5. Security events worth reading about

| line | meaning | first response |
| :--- | :--- | :--- |
| `"msg":"permission denials"` with `event.count` | one line per view per minute, not per request | a spike from one user is a probe; check the audit trail |
| `"code":"too_many_open_uploads"` | a user tripped `VIDEO_MAX_OPEN_UPLOADS` | usually honest — a stalled client retrying |
| `raw proxy busy` | the raw byte-stream cap is saturated | raise the cap or move that asset to HLS |
| CSP `Content-Security-Policy-Report-Only` reports | a host is missing from the policy | add the host to `frontend/vercel.json` before enforcing |
