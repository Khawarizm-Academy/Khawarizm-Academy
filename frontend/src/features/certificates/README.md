# Certificates — الشهادات

The public half of the certificate surface: a learner's printed certificate and
the unauthenticated verification page anyone can open.

## What lives here

| Path | Role |
| :--- | :--- |
| `pages/CertificateVerifyPage.tsx` | `/verify/:serial` — the public verification screen |
| `components/CertificatePrintCard.tsx` | The certificate itself, laid out for screen and print |
| `data/certificateFetchers.ts` | One call: `GET /certificates/verify/<serial>` |
| `data/certificateCopy.ts` | Arabic strings, kept out of JSX (the i18n gate enforces this) |
| `utils/qrCode.ts` | Serial QR, generated client-side |
| `pages/certificates.css`, `components/certificates.css` | Concept classes for both screens |

The learner's *own* certificate page (`/courses/:slug/certificate`) lives in
`features/courses` because it is a course-scoped screen; this feature owns the
serial-addressed public page and the card they share.

## Contract

`GET /api/certificates/verify/<serial>` is **unauthenticated but not
origin-exempt** — an employer opens the link without an account, while the
browser's own `Origin` still has to be a configured frontend. The response is
deliberately minimal (`certificate_services::verification_payload`):

```json
{ "valid": true, "learnerName": "…", "courseTitle": "…", "issuedAt": "…", "revoked": false }
```

- `valid` is `not revoked AND is_official`, so a manually inserted, unofficial row
  never verifies even with a serial that exists.
- `learnerName` / `courseTitle` are the **snapshots** taken at issue time, falling
  back to live values only when a row predates the snapshot columns. Renaming a
  user or a course later must not change what an already-issued certificate says.
- No email, no user id, no course id, no hours, no reason. `verify_certificate()`
  resolves by serial and returns nothing that identifies a person beyond the name
  printed on the document.
- A revoked certificate answers 200 with `revoked: true` and renders as revoked —
  the serial stays resolvable forever, which is what makes it worth checking.
- An unknown serial is a 404 in the shared error envelope; the page renders
  `StatePanel` with `certificateCopy.notFound` rather than an error boundary,
  because mistyping a serial is normal.
- Revocation is an **admin** action (`certificate-revoke`), never reachable from
  this feature.

## Notes for work here

- The card must survive both directions: it is RTL, and `@media print` sets
  `@page { size: A4 landscape; margin: 12mm }`, swaps the dark surfaces for white,
  and hides the page chrome (`[data-print-hidden="true"]`) so one sheet prints.
- Anything new on the card must stay inside that print block, or the printed
  certificate and the screen certificate disagree.
- The QR is generated in the browser from the serial (`utils/qrCode.ts`) — no
  third-party image host, because the URL encodes nothing secret and an external
  request from a verification page would be a privacy leak.
- Printing is a browser print of a styled DOM node; server-side PDF is
  deliberately out of scope (backlog **B4** in `plan/PLAN.md`).
- SEO: `/verify/:serial` is a real route in the SPA. Its shareable preview comes
  from Open Graph tags set per route; the verification payload itself is fetched
  client-side (`docs/03-routing-and-navigation.md`).

Backend: `backend/features/courses/certificate_services.py` (issuance, serials,
revocation) and `backend/features/dashboard/models.py::Certificate`.
Operations: `docs/13-operations-runbook.md` ("a certificate is wrong or revoked").
