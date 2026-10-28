---
name: core-project-profile
description: Read this FIRST on any project. Explains how to discover or create a PROJECT_PROFILE.md (stack, commands, aliases, folder map, design tokens, languages/RTL, database limits, hosting constraints, env profiles) so the generic skills adapt to the project instead of hard-coding one. Use at the start of every task, when onboarding to a repo, or when a skill says "check the project profile".
---

# Project Profile - make generic skills fit the project

The skills in this library are **project-agnostic**. Everything that is specific to one project (names, paths, brand, stack versions, commands, limits) lives in a single file in that project's repo: `PROJECT_PROFILE.md` (or the section of `AGENTS.md` / `CLAUDE.md` that plays the same role).

## Protocol

1. **Look for the profile** at the repo root (`PROJECT_PROFILE.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`). Read it before applying any other skill.
2. **If it exists:** its values override the defaults in the skills. If a skill and the profile disagree, the profile wins; mention the disagreement only when it matters.
3. **If it does not exist:** inspect the repo (`package.json`, lockfiles, `tsconfig`, `vite/next/astro config`, `manage.py`, `pyproject.toml`, `Dockerfile`, CI files, `.env*` examples), then **create a draft profile** from [`references/PROJECT_PROFILE.template.md`](references/PROJECT_PROFILE.template.md), mark guesses with `(?)`, and tell the user what you inferred.
4. **Never invent facts** (versions, endpoints, limits). Unknown stays `unknown` until verified.
5. When you learn a durable project fact during the task (a new command, a constraint, a naming rule), propose adding it to the profile.

## What belongs in the profile (and not in a skill)

| Belongs in the profile | Belongs in a skill |
| --- | --- |
| Brand name, colors, fonts, logo path | How to build a token system |
| Folder names, alias, route table location | The placement *rules* |
| Exact build/lint/test commands | What a verification gate must prove |
| DB engine, size, hosting limits, pooling | How to batch writes and index |
| Languages, RTL, copy-source files | How to do i18n/RTL correctly |
| Provider names, env var names | How to wire config and secrets |

## Using it with the other skills

- Design work: read tokens, fonts, and brand rules from the profile; if none exist, run [`design-system-and-tokens`](../design-system-and-tokens/SKILL.md) to create them.
- Database work: read the engine, size, and limits; start with [`db-weak-database-playbook`](../db-weak-database-playbook/SKILL.md) when the database is small or slow.
- Verification: use the profile's commands in [`core-verification-and-quality-gates`](../core-verification-and-quality-gates/SKILL.md).

Template: [`references/PROJECT_PROFILE.template.md`](references/PROJECT_PROFILE.template.md).
