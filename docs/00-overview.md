# خوارزم أكاديمي (Khawarizm Academy) — Project Overview & Information Architecture

> **How to use this file set:** Start here, then read `01-design-system.md` before anything else — every other file assumes its tokens and components. Files 02–05 are UX specs (flows, screens, states, logic) written for you and your dev team. File 06 turns those specs into ready-to-paste Google Stitch prompts. File 07 lists the backend entities/endpoints implied by the flows.

---

## 1. What we're building

Khawarizm Academy is an Arabic-first (RTL) EdTech platform with **two pillars of equal weight**:

1. **Courses** — recorded video lessons → practice problems → weekly live review on Google Meet → comprehensive exam.
2. **Scholarships & Opportunities** — curated third-party scholarship/opportunity postings (Khawarizm does not grant these — it aggregates and announces them).

Secondary but visible content: **Events & seminars** (self-hosted), **competitions** (including coding competitions with live judging), **Instagram content downloads**.

## 2. Design mandate (from the brief)

- **No "AI-generated-looking" design.** No generic purple/violet SaaS gradients, no default Inter-on-white-card templates, no stock "AI startup" look.
- **Color direction:** navy/space-blue + gold/orange, matching the supplied brand palette (dark space + ancient knowledge + technology). This *is* the differentiator — lean into it, don't dilute it toward safe pastel-SaaS blue.
- **Reference inspiration**, not imitation:
  - **Codecademy** → card-based course catalog, clear skill-path structure, confident use of a single accent color for CTAs.
  - **Scrimba** → warm, human, slightly playful tone; the sense that learning is active, not passive video-watching.
  - **for9a.com** → Arabic-native scholarship/opportunity aggregation patterns, tag-based filtering (country, level, field), urgency cues (deadlines).
  - **Mawhiba** → institutional trust, editorial/magazine-like presentation of opportunities and events, strong typographic hierarchy in Arabic.
- **Platform language:** Arabic, RTL layout throughout. All UX specs below assume RTL mirroring (see design system §8).

## 3. The "2–3 click rule"

**Hard constraint:** any student must reach the specific thing they want (a specific course lesson, a specific scholarship, exam results, live session link) in **2–3 taps/clicks**, 5 as an absolute outer bound for edge cases (e.g., deep settings).

This is enforced structurally, not just by hoping the menu is short:

- **Click 1:** Homepage → smart search bar OR a homepage card OR a nav item.
- **Click 2:** Filtered results / category page / specific course-or-scholarship landing page.
- **Click 3:** The actual content (lesson player, scholarship application page, quiz).

Every flow spec in files 02–05 includes a **"click count" annotation** to police this constraint.

## 4. Top-level Information Architecture

```
خوارزم أكاديمي (Root)
│
├── الرئيسية (Home)                         — smart search, equal-weight Courses/Scholarships rails, events strip, competitions banner
│
├── /catalog (Unified Catalog)              — ONE catalog engine behind two nav labels + an "الكل" mixed view.
│   │                                          See 02b-unified-catalog.md for the full spec.
│   ├── "الدورات" nav entry  → /catalog?type=course
│   ├── "المنح والفرص" nav entry → /catalog?type=scholarship
│   └── "الكل" segment → mixed feed, interleaved by relevance/urgency
│       │
│       ├── [Course Landing Page]  (own template — see 03-course-system-ux.md)
│       │     └── [Course Player] — lessons, problems, live session tab, exam tab
│       │
│       └── [Scholarship Detail Page]  (own template — see 05-scholarships-events-ux.md)
│             — external link out, save/follow, deadline countdown
│
├── الفعاليات (Events & Seminars)            — self-hosted, own page + homepage teaser; NOT part of the unified catalog
│   └── [Event Detail Page]
│
├── المسابقات (Competitions)                 — includes coding competitions
│   └── [Competition Detail Page] → [Registration] → [Live Arena / Submission]
│
├── الاختبارات (Quizzes & Exams) — mostly accessed *from within* a course, but has
│   its own hub for "open" quizzes/competitions not tied to a course
│
├── تنزيلات إنستغرام (Instagram Downloads)    — lightweight utility page, referenced on home
│
├── لوحتي (My Dashboard) — enrolled courses, saved scholarships, upcoming live sessions,
│   competitions, certificates, notifications. Full spec → 08-dashboard-ux.md
│
└── حسابي (Account/Profile) — settings, notifications, language/level preferences
```

### Navigation shell

- **Top nav (desktop):** logo (right, since RTL) · الرئيسية · الدورات · المنح والفرص · الفعاليات · المسابقات · [smart search icon] · [notifications] · [avatar/دخول]
- **Bottom nav (mobile, 5 max):** الرئيسية · الدورات · المنح · لوحتي · حسابي — smart search is a floating action or a persistent bar under the header, not buried in a tab.
- Events, competitions, and Instagram downloads are **not** primary nav items on mobile — they live inside "الرئيسية" teasers and inside "الدورات"/"المنح" cross-links, keeping the tab bar to 5. Desktop has room to show them in the top nav directly.

## 5. The two pillars, presented as equals

This is a repeated design constraint across every file: **Courses and Scholarships must never visually imply one is more important than the other.**

Concretely:
- Same card size, same shadow/elevation, same CTA button style — enforced structurally now, not just by convention: both pillars render through **one shared adaptive card component** and **one unified catalog engine** (see `02b-unified-catalog.md`), so identical geometry isn't a design guideline someone can drift from, it's the same code path.
- On the homepage they appear as **side-by-side twin rails** (or stacked with identical visual weight on mobile), never one above the fold and one below it as an afterthought.
- Both have their own nav-level entry (which internally route into the same catalog, pre-filtered by type — see `02b-unified-catalog.md` §2), and their own detail-page template family, since detail-page content genuinely differs between the two.
- A third, neutral **"الكل" (All)** view exists in the catalog for users who haven't committed to one pillar yet, surfacing both types interleaved — this wasn't possible before unification and is itself a parity signal: neither pillar is the "default" view.
- The smart search box treats both as first-class targets (see `02-homepage-ux.md` §2, and `02b-unified-catalog.md` §5 for how it now defaults to a neutral state).

## 6. File index

| File | Contents |
|---|---|
| `00-overview.md` | This file — mandate, IA, click-rule, pillar parity |
| `01-design-system.md` | Colors, type, spacing, elevation, components, RTL rules, motion, voice/tone |
| `02-homepage-ux.md` | Homepage layout, smart search box logic, hero, rails, events/competitions strip |
| `02b-unified-catalog.md` | **The one catalog engine behind both pillars** — type-switch, adaptive card component, contextual filters, mixed "الكل" feed logic |
| `03-course-system-ux.md` | Course landing → player → lessons → problems → live sessions (catalog browsing now lives in `02b`) |
| `04-quiz-exam-system-ux.md` | Quiz engine, comprehensive exams, coding competitions, anti-cheat/integrity notes |
| `05-scholarships-events-ux.md` | Scholarship detail page, trust/disclaimer pattern, events/seminars, Instagram downloads (catalog browsing now lives in `02b`) |
| `06-stitch-prompts.md` | Per-screen Google Stitch prompts, ready to paste |
| `07-backend-notes.md` | Entities, relationships, and endpoint list implied by the above |
| `08-dashboard-ux.md` | **"لوحتي" — the logged-in home base**: continue-now priority slot, my courses, saved scholarships, live sessions, competitions, certificates, notifications |
