# Google Drive Integration — Video Hosting

## Official Documentation References
- Google Drive API: https://developers.google.com/workspace/drive/api/reference/rest/v3
- Uploads: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Search/Files: https://developers.google.com/workspace/drive/api/guides/search-files
- Folders: https://developers.google.com/workspace/drive/api/guides/folder
- Sharing/Permissions: https://developers.google.com/workspace/drive/api/guides/manage-sharing
- Changes: https://developers.google.com/workspace/drive/api/guides/manage-changes
- Quotas/Limits: https://developers.google.com/workspace/drive/api/guides/limits

## Authentication
- Use OAuth 2.0 with service account or user OAuth; credentials stay on the backend only.
- Never expose tokens/keys to the frontend.
- Scopes should be minimal; prefer application-managed area when feasible.

## Upload Strategy
- Support resumable uploads for large video files with chunking, retries, progress tracking, and idempotency.
- Validate metadata and content types; track upload sessions in DB.
- Distinguish file ID from content/playback URLs.

## File Organization
- Deterministic hierarchy under a root folder using stable IDs.
- Store external folder/file IDs in ProviderAsset/UploadSession.
- Reconcile existing folders to avoid duplicates.

## Permissions Model
- Default private. Never make files public to simplify playback.
- Manage permissions via permissions API as needed; do not rely on broad link access.

## Playback Feasibility & Limitations
- `webViewLink`/preview are not guaranteed direct stream URLs for a custom HTML5 player.
- Private Drive files may not be consumable without auth/cross-origin constraints.
- Range requests, processing, quotas, and policy restrictions apply.
- If private reliable playback cannot be achieved with supported methods, limitations must be exposed explicitly (no insecure public fallback).

## Quotas & Operational Constraints
- API quotas, download restrictions, and abuse protections apply.
- Distinguish API quotas from storage/download bandwidth.
- Use backoff/retries for transient errors.

## Error Handling & Retry Strategy
- Map auth/permission/quota/network/validation errors distinctly.
- Bounded retries with exponential backoff; no infinite retries for permanent errors.
- Idempotent upload completion.

## Security Considerations
- Credentials backend-only, no secrets in logs.
- Server-side authZ for uploads/playback.
- Avoid exposing sensitive session/upload URLs.
- No DRM guarantee implied.

## Unsupported Assumptions Rejected
- `webViewLink` as a direct stream URL.
- Private file playable by custom player without auth/cross-origin handling.
- Public sharing as acceptable for private content.
- Drive providing equivalent DRM/signing for arbitrary custom streaming.

## Remaining Limitations & Recommendations
- Playback path must be validated against actual Google constraints in a real test account.
- If unsupported, treat Google Drive as upload/storage integration with documented playback limitations until a supported mechanism is verified.
