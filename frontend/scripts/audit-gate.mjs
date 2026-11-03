#!/usr/bin/env node
// Phase 13 §13.1.8 — the dependency-audit gate with a dated allow-list.
//
// `npm audit --omit=dev --audit-level=high` is the rule; this wrapper is only
// the escape hatch the plan allows: an advisory can be silenced by name, with a
// written reason and an expiry date. An expired entry fails the build, and so
// does any new high/critical advisory that is not listed.
//
//   node scripts/audit-gate.mjs
//
// A waiver names the vulnerable package as npm reports it, carries a reason, and
// expires on a date — see scripts/npm-audit.allowlist.json.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(HERE, '..');
const ALLOWLIST_FILE = join(HERE, 'npm-audit.allowlist.json');
const BLOCKING = new Set(['high', 'critical']);

const allowlist = JSON.parse(readFileSync(ALLOWLIST_FILE, 'utf8'));
const today = new Date().toISOString().slice(0, 10);

let report;
try {
  report = JSON.parse(execFileSync('npm', ['audit', '--omit=dev', '--json'], { cwd: FRONTEND, encoding: 'utf8' }));
} catch (error) {
  // npm audit exits 1 when vulnerabilities exist; the JSON is still on stdout.
  report = JSON.parse(error.stdout.toString());
}

const findings = Object.entries(report.vulnerabilities ?? {}).filter(([, info]) => BLOCKING.has(info.severity));
const blocked = [];
const expired = [];
const waived = [];

for (const [name, info] of findings) {
  const advisories = info.via
    ?.filter((entry) => typeof entry === 'object')
    .map((entry) => ({ url: entry.url, title: entry.title, cve: entry.name }));
  const match = (allowlist.entries ?? []).find(
    (entry) => entry.package === name || (advisories ?? []).some((a) => a.cve === entry.package),
  );
  if (!match) {
    blocked.push({ name, severity: info.severity, advisories });
    continue;
  }
  if (match.expires < today) {
    expired.push({ name, ...match });
    continue;
  }
  waived.push({ name, until: match.expires, notes: match.notes });
}

for (const entry of expired) {
  console.error(`audit gate: ${entry.package} waiver EXPIRED on ${entry.expires} — bump versions or re-date with a reason`);
}

if (blocked.length || expired.length) {
  if (blocked.length) {
    console.error(`audit gate: ${blocked.length} blocking advisory/advisories are not allow-listed:`);
    for (const finding of blocked) {
      console.error(`  ${finding.name} (${finding.severity})`);
      for (const advisory of finding.advisories ?? []) {
        if (typeof advisory === 'object') console.error(`    ${advisory.title} — ${advisory.url}`);
      }
    }
    console.error(`Add a dated entry with a reason to ${ALLOWLIST_FILE} only when the fix really is not available.`);
  }
  process.exit(1);
}

console.log(
  `audit gate: production dependencies clean at high-and-above` +
    (waived.length ? ` (${waived.length} waiver(s): ${waived.map((w) => `${w.name} → ${w.until}`).join(', ')})` : ''),
);
for (const entry of waived) {
  if (entry.notes) console.log(`  waived ${entry.name} until ${entry.until}: ${entry.notes}`);
}
