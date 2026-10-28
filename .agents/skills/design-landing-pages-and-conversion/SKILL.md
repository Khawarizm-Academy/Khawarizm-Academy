---
name: design-landing-pages-and-conversion
description: Landing page and conversion design - the page anatomy (hero, proof, benefits, how it works, offer, FAQ, final CTA), above-the-fold rules, headline and CTA writing, social proof, objection handling, pricing sections, forms on landing pages, mobile conversion, speed, A/B testing basics, and measurement. Use when designing a landing page, marketing site section, campaign page, sign-up or lead-generation flow.
---

# Landing Pages & Conversion

A landing page has **one goal** and **one primary action**. Everything else supports it or is removed.

## 1. Anatomy (top to bottom)

1. **Hero (above the fold):** a headline stating the outcome for the visitor, a one-line subhead, one primary CTA, a supporting visual (product shot, real photo, short loop), and a trust cue (rating, client logos, count).
2. **Social proof strip:** logos, numbers ("12,000 students"), press, ratings.
3. **Problem -> solution:** name the pain in the visitor's words, then the way out.
4. **Benefits/features:** 3-6 outcomes (not feature lists), each with a visual or icon, scannable.
5. **How it works:** 3 steps, numbered.
6. **Proof in depth:** testimonials with name/photo/role, case studies, before/after, demo video.
7. **Offer/pricing:** clear plans, highlighted recommended plan, what is included, guarantee/refund.
8. **FAQ:** the real objections (price, time, trust, cancellation) - and mark up for SEO where eligible ([`seo-structured-data`](../seo-structured-data/SKILL.md)).
9. **Final CTA:** repeat the primary action with a reason to act now (honestly).
10. Minimal footer; remove main navigation distractions on campaign pages.

## 2. Above-the-fold rules

- A visitor understands **what it is, who it is for, and what to do** within ~5 seconds.
- Headline: outcome + specificity ("Learn Python in 12 weeks, live with a mentor") beats vague ("The future of learning").
- Only one primary CTA style on screen; a secondary action is visually quieter.
- No carousel in the hero; the LCP element (hero image/heading) loads first and fast ([`perf-frontend-web-vitals`](../perf-frontend-web-vitals/SKILL.md)).

## 3. CTA design and copy

- Button names the value and next step: "Start free lesson", "Get my quote", "Reserve a seat" - not "Submit".
- High contrast, generous size, repeated after each major section; sticky mobile CTA bar for long pages.
- Reduce risk near the button: "No credit card", "Cancel anytime", "Reply within 1 hour" (only true statements).
- One action per page; secondary links must not compete.

## 4. Proof and trust

Specific beats generic: real names, photos, numbers, dates, links to sources, screenshots of results. Place proof **next to the claim and the CTA**. Show policies (refund, privacy), security cues, and real contact options (WhatsApp/phone for markets where that converts). Never fabricate testimonials, counts, or scarcity.

## 5. Objection handling

List the top 5 reasons someone would not act (price, time, trust, fit, difficulty); answer each in the page body, FAQ, or guarantee. Use comparison tables honestly.

## 6. Forms on landing pages

Ask for the minimum (often name + one contact method); inline validation; one column; large inputs; privacy line; instant confirmation and a clear next step; offer alternative contact (call/WhatsApp) ([`fe-forms-and-validation`](../fe-forms-and-validation/SKILL.md)).

## 7. Visual and motion

Clear hierarchy, generous whitespace, one strong visual idea ([`design-frontend-execution-playbook`](../design-frontend-execution-playbook/SKILL.md)); real imagery over stock; subtle scroll reveals that respect reduced motion and never delay content ([`design-motion-principles`](../design-motion-principles/SKILL.md)); no autoplaying sound.

## 8. Mobile conversion

Most traffic is mobile: thumb-reachable CTA, short sections, readable type, tap-to-call/WhatsApp links, minimal fields, fast load on slow networks, no hover dependence ([`design-mobile-first-and-touch`](../design-mobile-first-and-touch/SKILL.md)).

## 9. SEO and measurement

One H1 matching intent; unique title/description; structured data where relevant; fast LCP; indexable content (not hidden in tabs only) ([`seo-on-page-content`](../seo-on-page-content/SKILL.md)). Track view -> CTA click -> form start -> submit with events; respect consent.

## 10. Testing

Change one thing at a time (headline, CTA text, hero image, form length); run long enough for significance; decide on the business metric, not clicks alone; keep a log of tests and results.

## 11. Checklist

- [ ] One goal, one primary CTA, repeated; no competing navigation.
- [ ] Hero states outcome, audience, action; fast LCP.
- [ ] Specific proof near claims and CTA; honest urgency only.
- [ ] Objections answered; pricing clear; FAQ present.
- [ ] Minimal form; mobile sticky CTA; tap-to-contact options.
- [ ] Events tracked; metadata/structured data set.
