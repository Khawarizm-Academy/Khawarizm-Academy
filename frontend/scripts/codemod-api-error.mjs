#!/usr/bin/env node
/**
 * One-off codemod: replace hand-rolled
 *   `x instanceof ApiError ? x.message : '<fallback>'`
 * with the shared `apiErrorMessage(x, '<fallback>')` helper in apiClient.
 *
 * Usage: node scripts/codemod-api-error.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'src/features/studio/pages/StudioCourseEditorPage.tsx',
  'src/features/studio/pages/StudioVideosPage.tsx',
  'src/features/studio/students/StudioStudentsPage.tsx',
  'src/features/studio/components/views/CoursesView.tsx',
  'src/features/studio/liveSessions/LiveSessionsManager.tsx',
  'src/features/studio/announcements/components/StudioAnnouncementList.tsx',
  'src/features/studio/quizzes/components/QuizListView.tsx',
  'src/features/studio/quizzes/components/QuizResultsView.tsx',
  'src/features/studio/quizzes/components/QuizEditorView.tsx',
];

// allow for a back-tick fallback too; var name captured so the same var is used twice
const PATTERN = /\b(\w+)\s+instanceof\s+ApiError\s+\?\s+\1\.message\s+:\s*(`[^`]*`|"[^"\n]*"|'[^'\n]*'\n?)/g;
const IMPORT_RE = /^import\s+\{\s*ApiError\s*\}\s+from\s+'@\/shared\/lib\/apiClient';$/m;

let touches = 0;
for (const file of FILES) {
  const before = readFileSync(file, 'utf8');
  const matches = [...before.matchAll(PATTERN)];
  if (matches.length === 0) continue;
  let after = before.replace(PATTERN, 'apiErrorMessage($1, $2)');
  const stillUses = /\bApiError\b/.test(after.replace(/^import[^;]+;/m, ''));
  if (IMPORT_RE.test(after)) {
    after = stillUses
      ? after.replace(IMPORT_RE, "import { apiErrorMessage, ApiError } from '@/shared/lib/apiClient';")
      : after.replace(IMPORT_RE, "import { apiErrorMessage } from '@/shared/lib/apiClient';");
  } else {
    console.error(`!! ${file} has no single ApiError import line; fix imports manually`);
  }
  writeFileSync(file, after);
  touches += matches.length;
  console.log(`${file}: ${matches.length} replacement(s)`);
}
console.log(`total: ${touches}`);
