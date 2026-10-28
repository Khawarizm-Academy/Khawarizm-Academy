---
name: fe-forms-and-validation
description: Forms and validation for the web - semantic markup and labels, input types and autocomplete, schema validation (Zod/Yup/Valibot) shared with the server, when to validate, accessible error messages, preserving input, submit states and double-submit protection, debounce, file inputs, multi-step forms, RTL inputs, and conversion-friendly checkout/signup patterns. Use when building or reviewing any form, login, signup, search, checkout, or settings screen.
---

# Forms & Validation

A form is a conversation. Make it short, clear, forgiving, and fast.

## 1. Markup that works without JavaScript

- A real `<form>` with a `<button type="submit">`; Enter submits.
- Every input has a visible `<label for>` (placeholder is **not** a label).
- Correct `type` (`email`, `tel`, `url`, `number`, `date`, `password`) and `inputmode` for the right mobile keyboard; `autocomplete` tokens (`given-name`, `email`, `new-password`, `current-password`, `one-time-code`, `street-address`, `postal-code`, `cc-number`) so browsers and password managers help.
- `name` attributes set; `required`, `minlength`, `pattern` as a first line of defense; `autocapitalize`/`spellcheck` off where inappropriate (emails, codes).
- Text size at least 16px on mobile to avoid iOS zoom.

## 2. Validation strategy

- **Schema-first:** one schema (Zod/Valibot/Yup/JSON Schema) describes each form; reuse it on the **server** (or generate both from the API contract). Client validation is UX; **server validation is truth** ([`be-auth-and-security`](../be-auth-and-security/SKILL.md) §3).
- **When to show errors:** on blur (or submit) the first time, then live while fixing. Do not shout "invalid email" on the first keystroke.
- Validate the form on submit and focus the **first invalid field**.
- Show a summary for long forms (links to each field) and a message next to each field.
- Server errors map back to fields (`fields: { email: [...] }`) and a general message.

## 3. Accessible errors

- Tie messages to inputs with `aria-describedby`, set `aria-invalid="true"`, put the message in text (not color alone), and announce with `role="alert"`/`aria-live` ([`fe-accessibility`](../fe-accessibility/SKILL.md)).
- Error text says **what happened and how to fix it** ("Use at least 8 characters"), not "Invalid input".
- Mark required vs optional consistently; prefer marking the optional ones when most are required.

## 4. Submit behavior

- Disable the submit button and show progress while pending; protect against double submit (also with an **idempotency key** for payments/orders - [`be-api-design`](../be-api-design/SKILL.md) §7).
- **Never lose the user's input** on error or navigation; keep values after a failed submit; warn on unsaved changes for long forms.
- Autosave long forms with a **debounce**, one request at a time ([`fe-data-fetching-and-client-cache`](../fe-data-fetching-and-client-cache/SKILL.md) §5).
- Success: confirm clearly, and move focus/scroll to the confirmation or the next step.

## 5. Field patterns

| Field | Guidance |
| --- | --- |
| Password | show/hide toggle, no forced composition rules beyond length, paste allowed, `autocomplete` set |
| Phone | country selector + formatting helper, store normalized E.164 |
| Address | autocomplete tokens; collapse optional lines; validate postal code per country loosely |
| Date | native `type="date"` on mobile; clear format hint elsewhere |
| Select vs radios | radios/segmented for up to ~5 options; searchable select for long lists |
| Search | `type="search"`, debounce 250-400 ms, cancel stale requests, keep URL in sync |
| File | restrict `accept`, show name/size/preview, validate size client-side AND server-side, direct upload for big files ([`be-file-uploads-and-media-pipeline`](../be-file-uploads-and-media-pipeline/SKILL.md)) |
| OTP | one field with `autocomplete="one-time-code"`, numeric inputmode, auto-advance only if accessible |

## 6. Multi-step forms

Show progress ("Step 2 of 4"), keep each step small, allow going back without losing data, validate per step, persist progress, and put the primary action in a consistent place.

## 7. Conversion-friendly rules (signup/checkout)

Ask only for what you need; guest checkout; social/one-tap sign-in when relevant; inline validation; visible total and fees early; trust cues near payment ([`design-ecommerce`](../design-ecommerce/SKILL.md)); mobile-friendly numeric keyboards; save progress.

## 8. RTL and i18n

Inputs in RTL: icon on the start edge, text aligned to the start, `dir="auto"` on free-text and `dir="ltr"` for email/URL/phone/code fields (so the cursor and punctuation behave); localized messages from a dictionary ([`fe-rtl-and-i18n`](../fe-rtl-and-i18n/SKILL.md)).

## 9. Checklist

- [ ] Real form, labels, correct types and `autocomplete`.
- [ ] One schema, validated on client and server; first invalid field focused.
- [ ] Errors are textual, specific, associated with the field, and announced.
- [ ] Pending state, double-submit guard, preserved input.
- [ ] Mobile keyboards, 16px text, RTL handling verified.
