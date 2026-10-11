#!/usr/bin/env node
/**
 * Mine labels that precede dotted placeholders across dataset/job and report
 * which ones don't resolve to a slot name yet (candidates for the keyword map).
 * Read-only: never touches the dataset.
 *
 * Usage: node src/mine-labels.js [--all]
 *   default: only labels whose slot resolves to null
 *   --all:   print every distinct label with its resolved slot
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractVariablesFromText } from './extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const jobDir = path.join(REPO_ROOT, 'dataset', 'job');

const showAll = process.argv.includes('--all');

/** label -> {count, sampleContexts:[]} */
const labels = new Map();

for (const folder of fs.readdirSync(jobDir)) {
  const dir = path.join(jobDir, folder);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of ['base-data.txt', 'data.txt']) {
    const f = path.join(dir, file);
    if (!fs.existsSync(f)) continue;
    const t = fs.readFileSync(f, 'utf8');
    for (const v of extractVariablesFromText(t).variables) {
      if (v.kind !== 'dotted_placeholder') continue;
      const before = t.slice(0, v.start);
      const lineStart = Math.max(before.lastIndexOf('\n'), before.lastIndexOf('\r')) + 1;
      // Keep at most the last 60 chars of the line as the "label phrase"
      let label = t.slice(lineStart, v.start).replace(/[:：]+$/u, '').trim().slice(-60);
      if (!label) label = '(line start)';
      const rec = labels.get(label) || { count: 0, slot: v.name };
      rec.count++;
      if (rec.slot === null) rec.slot = v.name;
      labels.set(label, rec);
    }
  }
}

let totalMissing = 0;
const rows = [...labels.entries()].sort((a, b) => b[1].count - a[1].count);
for (const [label, rec] of rows) {
  if (showAll) console.log(`${rec.count}× [${rec.slot || 'NULL'}] ${label}`);
  else if (rec.slot === null) {
    totalMissing += rec.count;
    console.log(`${rec.count}× NULL  ${label}`);
  }
}

console.error(showAll
  ? `distinct labels: ${rows.length}`
  : `unnamed slots across dataset: ${totalMissing}`);
