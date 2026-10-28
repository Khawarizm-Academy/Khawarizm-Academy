---
name: be-auth-and-security
description: Web application security for backends and frontends - authentication (sessions vs JWT, refresh rotation, third-party identity providers), authorization and object-level checks, password handling, CSRF, CORS, XSS, SQL injection, SSRF, file upload risks, secure headers, rate limiting, secrets, dependency hygiene, and an OWASP-aligned checklist. Use when adding login, roles, tokens, uploads, public endpoints, or before launch.
---

# Auth & Security

Security is a set of boring defaults applied everywhere. Assume every input is hostile and every secret will leak if it can.

## 1. Authentication

- **Do not roll your own crypto or password storage.** Use the framework's auth or a managed identity provider (Firebase, Auth0, Clerk, Supabase, Cognito, Keycloak).
- Passwords (if you store them): a slow adaptive hash (argon2id, scrypt, or bcrypt) via the framework; never MD5/SHA alone; enforce length over arbitrary complexity; check against breached-password lists where possible.
- **Sessions vs tokens:**
  - Server sessions + `HttpOnly; Secure; SameSite` cookies are the simplest safe default for same-site web apps.
  - Token-based (JWT) fits mobile/third-party clients: short-lived access token (minutes), **rotating refresh token** stored hashed server-side and revocable, bound to device/IP context where sensible. Verify signature, `exp`, `aud`, `iss`; pin the algorithm.
  - Never put tokens in `localStorage` if XSS is a concern; prefer `HttpOnly` cookies or in-memory + refresh cookie.
- When an external provider verifies the user (e.g. an ID token), verify it **server-side** with the provider's keys; allow dev-token shortcuts only behind an explicit, off-by-default setting that is refused in production.
- Add MFA for admin/staff accounts.
- Login endpoints: rate-limit, uniform error messages (no user enumeration), lockout/backoff.

## 2. Authorization

- Authenticate **and** authorize every request. Default deny.
- **Object-level checks** (the #1 API flaw): `GET /orders/42` must verify order 42 belongs to the caller. Scope queries by owner (`Order.objects.filter(user=request.user, id=42)`), do not fetch then forget to compare.
- Role/permission checks live in one place (policy/decorator/permission class), not scattered `if user.is_admin`.
- Admin/back-office is a separate surface with stronger auth and an audit log.

## 3. Input and output

- Validate type, length, range, and format at the edge ([`core-error-handling`](../core-error-handling/SKILL.md)). Reject unknown fields on writes.
- **SQL injection:** parameterized queries/ORM only; never string-concatenate SQL. Whitelist column names for dynamic sort/filter.
- **XSS:** escape on output (frameworks do by default); never `dangerouslySetInnerHTML`/`innerHTML` untrusted content; sanitize rich text with a vetted library; set a Content-Security-Policy.
- **CSRF:** cookie-based auth needs CSRF tokens or `SameSite` + origin checks; token-in-header APIs are not CSRF-prone but must not accept cookies.
- **SSRF:** never fetch a user-supplied URL without an allow-list, scheme check, and blocking private/link-local ranges.
- **Open redirects:** validate redirect targets against an allow-list.
- **Mass assignment:** whitelist writable fields per serializer; never bind a request body straight to a model.
- Do not return secrets, internal ids you do not need, stack traces, or other users' data.

## 4. File uploads

Validate size and real content type (magic bytes), randomize stored names, store outside the web root or in object storage, serve with the right `Content-Type` and `Content-Disposition`, scan if risk warrants, and never execute uploads. See [`be-file-uploads-and-media-pipeline`](../be-file-uploads-and-media-pipeline/SKILL.md).

## 5. Transport and headers

- HTTPS everywhere; HSTS; secure cookies.
- `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, frame protection (`frame-ancestors`).
- CORS: explicit allow-list of origins; no wildcard with credentials ([`be-api-design`](../be-api-design/SKILL.md) §8).
- Disable debug mode and verbose errors in production.

## 6. Rate limiting and abuse

Per-IP and per-account limits on login, signup, password reset, OTP, search, and expensive endpoints; CAPTCHA/proof-of-work only where abuse is real; `429` + `Retry-After`. Use a shared store for counters (not per-instance memory).

## 7. Secrets

Secrets live in the host environment or a secret manager, never in git, never in the frontend bundle (anything in client code is public). `VITE_*`/`NEXT_PUBLIC_*` variables are **public**. Rotate on leak. See [`be-config-and-secrets`](../be-config-and-secrets/SKILL.md).

## 8. Tokens for media and signed URLs

Gate private media with short-lived, scope-limited tokens (store only a hash, bind to context, expire, delete on first expired use). Never expose a raw storage URL that works forever. See [`be-file-uploads-and-media-pipeline`](../be-file-uploads-and-media-pipeline/SKILL.md).

## 9. Dependencies and supply chain

Pin and lock versions, run `npm audit`/`pip-audit` in CI, update regularly, prefer well-maintained packages, review install scripts for new dependencies, and avoid brand-new releases of critical packages for a short soak period.

## 10. Logging and incident readiness

Log auth events (login, failure, role change, token refresh) without logging passwords/tokens; alert on spikes; have a revoke-all-sessions switch and a key-rotation runbook ([`be-observability-and-logging`](../be-observability-and-logging/SKILL.md)).

## 11. Pre-launch checklist

- [ ] Auth uses a vetted library/provider; admin has MFA.
- [ ] Every endpoint authenticated where required, authorized per object, default deny.
- [ ] Inputs validated; ORM/parameterized SQL; output escaped; CSP set.
- [ ] CORS allow-list; secure cookies; HTTPS + HSTS; debug off.
- [ ] Rate limits on auth/search/expensive routes.
- [ ] No secrets in git or client bundle; env documented.
- [ ] Uploads validated; private media behind expiring tokens.
- [ ] Dependency audit clean; logs free of secrets.
