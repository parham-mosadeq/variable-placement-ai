#!/usr/bin/env node
/**
 * Build the keyword→slot map from the dataset itself (ground truth), so the
 * map refreshes with one command whenever the dataset changes.
 *
 * Ground truth sources (read-only — dataset is never modified):
 *   - data.json   : clauses with text containing "[slot]" markers plus
 *                   entities: {slot, before_token, after_token}
 *   - variable.json: canonical slot keys per folder
 *
 * For every "[slot]" marker in every clause text we take the text that
 * immediately precedes it (the choice-free "window"), produce tail n-gram
 * candidates (last 1..6 words), and count phrase→slot co-occurrences.
 * Ambiguous phrases are dropped (dominant-slot rule below); what remains is
 * written to src/keyword-slots.generated.json which src/context.js imports
 * with priority over the hand-curated list.
 *
 * Usage: node src/build-keyword-map.js   (npm run build-map)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const jobDir = path.join(REPO_ROOT, 'dataset', 'job');
const outFile = path.join(__dirname, 'keyword-slots.generated.json');

const MARKER_RE = /\[([a-zA-Z_][a-zA-Z0-9_]*)\]/g;
const WINDOW_CHARS = 80;      // how far back to look for the label
const MAX_WORDS = 6;          // longest tail n-gram candidate
// If a phrase ENDS with one of these it can't be a label ("در [x]", "و [x]")
const TAIL_STOPWORDS = new Set(['در', 'از', 'و', 'به', 'این', 'که', 'می', 'را', 'با', 'یا']);

/** phrase -> Map(slot -> count) */
const counts = new Map();

function bump(phrase, slot) {
  phrase = phrase.trim();
  if (!phrase || phrase.length < 2) return;
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.some((w) => !w || /^[.\u2026_\-*,()«»"`']+$/.test(w))) return;
  const last = words[words.length - 1];
  if (TAIL_STOPWORDS.has(last)) return;
  if (phrase.length > 50) return;
  let slots = counts.get(phrase);
  if (!slots) { slots = new Map(); counts.set(phrase, slots); }
  slots.set(slot, (slots.get(slot) || 0) + 1);
}

function harvestEntities(entities, allowedSlots) {
  if (!Array.isArray(entities)) return;
  for (const e of entities) {
    if (e && e.slot && typeof e.before_token === 'string' && allowedSlots.has(e.slot)) {
      bump(e.before_token, e.slot);          // strongest signal: token directly before the slot
      // also try 2-word tails when before_token is part of a longer label
      bump(e.before_token, e.slot);
    }
  }
}

let foldersSkipped = 0;
for (const folder of fs.readdirSync(jobDir)) {
  const dir = path.join(jobDir, folder);
  if (!fs.statSync(dir).isDirectory()) continue;
  const dataJsonFile = path.join(dir, 'data.json');
  const varFile = path.join(dir, 'variable.json');
  if (!fs.existsSync(dataJsonFile)) { foldersSkipped++; continue; }

  const allowedSlots = new Set(fs.existsSync(varFile) ? Object.keys(JSON.parse(fs.readFileSync(varFile, 'utf8'))) : []);

  let clauses;
  try { clauses = JSON.parse(fs.readFileSync(dataJsonFile, 'utf8')); }
  catch (err) { console.error(`skip ${folder}: bad data.json (${err.message})`); continue; }
  if (!Array.isArray(clauses)) { foldersSkipped++; continue; }

  for (const clause of clauses) {
    if (!clause || typeof clause.text !== 'string') continue;
    for (const e of clause.entities || []) {
      if (e && e.slot) allowedSlots.add(e.slot);   // entities supervise slot names too
    }
    let m;
    while ((m = MARKER_RE.exec(clause.text)) !== null) {
      const slot = m[1];
      const prevEnd = clause.text.lastIndexOf(']', m.index - 1) + 1;
      const seg = clause.text.slice(prevEnd, m.index).trim().slice(-WINDOW_CHARS);
      const words = seg.split(/\s+/).filter(Boolean).slice(-MAX_WORDS);
      for (let k = 1; k <= words.length; k++) bump(words.slice(-k).join(' '), slot);
    }
    harvestEntities(clause.entities, allowedSlots);
  }
}

/** Dominant-slot filter: keep a phrase only when one slot clearly wins. */
function dominant(slots) {
  let total = 0, topSlot = null, top = 0;
  for (const [slot, c] of slots) { total += c; if (c > top) { top = c; topSlot = slot; } }
  const ratio = top / total;
  if (total === 1) return ratio >= 1 ? topSlot : null;        // rare-but-consistent
  if (total <= 3) return ratio >= 0.5 ? topSlot : null;
  return ratio >= 0.6 ? topSlot : null;
}

/** Build final ordered list: longer keywords first (runtime prefers longest match). */
const entries = [];
for (const [phrase, slots] of counts) {
  const slot = dominant(slots);
  if (!slot) continue;
  entries.push([phrase, slot]);
}

// longest keyword first, then alphabetical for stable diffs
entries.sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0], 'fa'));

fs.writeFileSync(outFile, JSON.stringify(entries, null, 1) + '\n', 'utf8');

console.log(`wrote ${outFile}`);
console.log(`  keywords: ${entries.length}`);
console.log(`  folder skipped (no data.json): ${foldersSkipped}`);

// quick sanity report: top slots covered
const slotUsage = new Map();
for (const [, slot] of entries) slotUsage.set(slot, (slotUsage.get(slot) || 0) + 1);
const slots = [...slotUsage.entries()].sort((a, b) => b[1] - a[1]);
console.log(`  distinct slots: ${slots.length}  top: ${slots.slice(0, 10).map(([s, c]) => `${s}(${c})`).join(', ')}`);
