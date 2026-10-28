# PROJECT_PROFILE

> Project-specific facts the generic skills read first. Keep it short and true. Mark unverified lines with `(?)`.

## 1. Identity
- Name / one-line purpose:
- Audience and languages (RTL? Arabic? multilingual?):
- Brand: logo path, primary/secondary colors, fonts, tone of voice:

## 2. Stack
- Frontend: framework + version, bundler, styling (Tailwind vN / CSS modules / ...), router, data layer:
- Backend: language/framework + version, API style, auth provider:
- Database: engine + version, hosted where, size, known limits (connections, IOPS, storage):
- Cache / queue: (none / Redis / in-memory) :
- Hosting: (Vercel / VPS / serverless limits: body size, runtime, read-only FS):

## 3. Commands (exact)
- Install:
- Dev:
- Build / typecheck:
- Lint:
- Test:
- Migrate / seed:

## 4. Layout and conventions
- Source root and alias (`@/` -> `src/`):
- Folder map (features, shared, styles, backend features):
- Naming rules (components, files, DB tables, API keys: camelCase/snake_case):
- Static data location:
- Comment/style rules beyond the defaults:

## 5. Design
- Token file(s): 
- Concept-class / component library locations:
- Breakpoints, container width, spacing scale:
- Motion rules (durations, easing, reduced motion):
- Icon set and stroke width:

## 6. Data and performance
- Write-batching approach in use (unit of work, bulk ops, queue):
- Cache layers in use and TTLs:
- Index conventions and slow-query budget:
- Core Web Vitals targets and current numbers:

## 7. SEO and deployment
- Rendering mode (SPA / SSR / SSG / prerender):
- Canonical domain, sitemap location, robots policy:
- Env profiles and where secrets live:
- CI/CD and release steps:

## 8. Known pitfalls
- (things that already burned the team once)
