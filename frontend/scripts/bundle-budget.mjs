#!/usr/bin/env node
// Phase 13 §13.2 — frontend chunk budget.
//
// Reads the produced `dist/` and enforces the three budgets the plan names:
//   1. the initial shell (entry chunk + its eagerly-imported graph) may not grow
//      more than 3 KB gzip over the committed baseline;
//   2. every Studio/Admin route chunk stays under 90 KB gzip;
//   3. the player engines (hls.js, Vimeo, the YouTube iframe SDK) must never be
//      part of the initial graph — they are dynamic imports.
//
//   node scripts/bundle-budget.mjs               # check the budgets
//   node scripts/bundle-budget.mjs --report      # + write plan/bundle-report.md
//   node scripts/bundle-budget.mjs --write       # re-baseline after an approved change
//
// No new dependency: gzip sizes come from node:zlib, the graph from a regex over
// the emitted ESM (rolldown writes `import ... from "./chunk.js"` one per line).
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, '../dist');
const BASELINE = join(HERE, 'bundle-budget.baseline.json');
const REPORT = resolve(HERE, '../../plan/bundle-report.md');

const SHELL_SLACK_KB = 3;
const ROUTE_CHUNK_KB = 90;
const ENGINE_PATTERN = /^(hls|player\.es|vimeo|youtube)/;
const ROUTE_PATTERN = /^(Studio|Admin|CoursePlayer|Dashboard)/;

const kb = (bytes) => bytes / 1024;

function assert(condition, message) {
  if (!condition) {
    console.error(`bundle budget: ${message}`);
    process.exitCode = 1;
  }
}

function chunks() {
  const dir = join(DIST, 'assets');
  return readdirSync(dir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => {
      const code = readFileSync(join(dir, file), 'utf8');
      // Rolldown emits static imports as `from"./x.js"` (no space); dynamic
      // imports appear inside `__vite__mapDeps`/`import(...)` and must not count
      // toward the shell.
      const staticImports = [...code.matchAll(/from\s*"(\.\/[^"]+\.js)"/g)].map((match) => match[1].slice(2));
      return { file, bytes: code.length, gzip: gzipSync(code).length, staticImports };
    });
}

function initialGraph(byFile, entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const chunk = stack.pop();
    for (const dep of chunk.staticImports) {
      const next = byFile.get(dep);
      if (next && !seen.has(next.file)) {
        seen.add(next.file);
        stack.push(next);
      }
    }
  }
  return seen;
}

const all = chunks();
const byFile = new Map(all.map((chunk) => [chunk.file, chunk]));
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const entryName = /\/assets\/(index-[^"]+\.js)/.exec(html)?.[1];
const entry = byFile.get(entryName);
if (!entry) {
  console.error('bundle budget: no entry chunk found in dist/index.html — run `npm run build` first');
  process.exit(1);
}

const initialFiles = new Set([entry.file, ...initialGraph(byFile, entry)]);
const initialKb = kb(all.filter((chunk) => initialFiles.has(chunk.file)).reduce((sum, chunk) => sum + chunk.gzip, 0));
const initialEngines = [...initialFiles].filter((file) => ENGINE_PATTERN.test(file));

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;
if (process.argv.includes('--write') || !baseline) {
  writeFileSync(BASELINE, `${JSON.stringify({ initialGzipKb: Number(initialKb.toFixed(2)) }, null, 2)}\n`);
  console.log(`bundle budget: baseline ${initialKb.toFixed(2)} KB gzip written to ${BASELINE}`);
} else if (initialKb > baseline.initialGzipKb + SHELL_SLACK_KB) {
  assert(
    false,
    `shell grew to ${initialKb.toFixed(1)} KB gzip (baseline ${baseline.initialGzipKb} KB + ${SHELL_SLACK_KB} KB slack)`,
  );
}

assert(initialEngines.length === 0, `player engine(s) in the initial graph: ${initialEngines.join(', ')}`);

for (const chunk of all) {
  if (initialFiles.has(chunk.file) || !ROUTE_PATTERN.test(chunk.file)) continue;
  if (kb(chunk.gzip) > ROUTE_CHUNK_KB) {
    assert(false, `route chunk ${chunk.file} is ${kb(chunk.gzip).toFixed(1)} KB gzip (budget ${ROUTE_CHUNK_KB} KB)`);
  }
}

const rows = [...all]
  .sort((a, b) => b.gzip - a.gzip)
  .map((chunk) => {
    const loaded = initialFiles.has(chunk.file) ? 'initial' : 'lazy';
    return `| \`${chunk.file}\` | ${kb(chunk.gzip).toFixed(1)} | ${kb(chunk.bytes).toFixed(1)} | ${loaded} |`;
  });

const report = [
  '# Bundle report (generated)',
  '',
  'Regenerate with `npm run build && node scripts/bundle-budget.mjs --report`.',
  'Budgets live in `scripts/bundle-budget.mjs`; the shell baseline is',
  '`scripts/bundle-budget.baseline.json`.',
  '',
  `**Shell (initial graph): ${initialKb.toFixed(1)} KB gzip.**`,
  '',
  '| chunk | gzip KB | raw KB | loaded |',
  '| :--- | ---: | ---: | :--- |',
  ...rows,
  '',
].join('\n');

if (process.argv.includes('--report')) {
  writeFileSync(REPORT, report);
  console.log(`bundle budget: report written to ${REPORT}`);
}

console.log(
  `bundle budget: shell ${initialKb.toFixed(1)} KB gzip over ${initialFiles.size} chunk(s), ` +
    `${all.length} chunks in dist, ${process.exitCode ? 'FAIL' : 'OK'}`,
);
