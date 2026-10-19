#!/usr/bin/env node
/**
 * Build the keyword→slot map AND before/after gap pairs from the dataset
 * itself (ground truth), so both refresh with one command when the dataset
 * changes. Read-only over the dataset.
 *
 * Sources:
 *   - data.json: clauses whose text contains "[slot]" markers
 *   - variable.json: canonical slot keys per folder
 *
 * Outputs src/keyword-slots.generated.json:
 *   { keywords: [[keyword, slot], ...],          ← label right before "...."
 *     pairs:    [[before, after, slot], ...] }   ← blank gaps between tokens
 *
 *   keywords: from the text immediately before each marker (tail n-grams)
 *   pairs:    (last 1-2 words before the marker, next 1-2 words after it)
 *             used at runtime to detect EMPTY gaps (no dots at all) and give
 *             them a slot name. "EOL" as `after` means the gap ends the line.
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
const GAP_WORDS = 2;          // words (1..2) captured on each side of a gap
// If a phrase ENDS with one of these it can't be a label ("در [x]", "و [x]")
const TAIL_STOPWORDS = new Set(['در', 'از', 'و', 'به', 'این', 'که', 'می', 'را', 'با', 'یا']);

/** keyword -> Map(slot -> count) */
const counts = new Map();
/** pair "before\u0000after" -> Map(slot -> count) */
const pairCounts = new Map();

function bump(phrase, slot) {
  phrase = phrase.trim();
  if (!phrase || phrase.length < 2) return;
  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.some((w) => !w || /^[.\u2026_\-*,()«»"`'[]]+$/.test(w))) return;
  const last = words[words.length - 1];
  if (TAIL_STOPWORDS.has(last)) return;
  if (phrase.length > 50) return;
  let slots = counts.get(phrase);
  if (!slots) { slots = new Map(); counts.set(phrase, slots); }
  slots.set(slot, (slots.get(slot) || 0) + 1);
}

function bumpPair(before, after, slot) {
  before = (before || '').trim();
  after = (after || '').trim();
  if (!before || before.length > 30) return;
  if (after && after.length > 30) after = after.slice(0, 30);
  const key = before + '\u0000' + (after || 'EOL');
  let slots = pairCounts.get(key);
  if (!slots) { slots = new Map(); pairCounts.set(key, slots); }
  slots.set(slot, (slots.get(slot) || 0) + 1);
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
      if (e && e.slot) allowedSlots.add(e.slot);
      // entities supervise slot names too; their before/after tokens are
      // direct pair evidence
      if (e && e.slot && typeof e.before_token === 'string') {
        const evtAfter = typeof e.after_token === 'string' && e.after_token.trim()
          ? e.after_token.trim().split(/\s+/)[0]
          : 'EOL';
        bumpPair(e.before_token, evtAfter, e.slot);
      }
    }
    MARKER_RE.lastIndex = 0;
    let m;
    while ((m = MARKER_RE.exec(clause.text)) !== null) {
      const slot = m[1];
      if (!allowedSlots.has(slot)) continue;
      const prevEnd = clause.text.lastIndexOf(']', m.index - 1) + 1;

      // --- keyword candidates: tail n-grams of the label segment ------------
      const seg = clause.text.slice(prevEnd, m.index).trim().slice(-WINDOW_CHARS);
      const words = seg.split(/\s+/).filter(Boolean).slice(-MAX_WORDS);
      for (let k = 1; k <= words.length; k++) bump(words.slice(-k).join(' '), slot);

      // --- gap pair: (last GAP_WORDS words before, next words after) --------
      const tail = words.slice(-GAP_WORDS).map((w) => w.replace(/^[«"']+|[»"':]+$/g, '')).filter(Boolean);
      if (tail.length) bumpPair(tail.join(' '), null, slot);            // no after info yet
      const rest = clause.text.slice(m.index + m[0].length);
      const afterWords = rest.slice(0, 40).split(/\s+/).filter(Boolean);
      const after1 = (afterWords[0] || '').replace(/^[«"']+|[»"':]+$/g, '');
      const after2 = afterWords.slice(0, 2).map((w) => w.replace(/^[«"']+|[»"':]+$/g, '')).join(' ');
      if (tail.length) {
        if (after1) {
          bumpPair(tail.join(' '), after1, slot);
          if (after2 && after2 !== after1) bumpPair(tail.join(' '), after2, slot);
        } else {
          bumpPair(tail.slice(-1).join(' '), 'EOL', slot);
        }
        if (tail.length === 2) bumpPair(tail.slice(-1).join(' '), after1 || 'EOL', slot);
      }
    }
  }
}

/** Dominant-slot filter: keep an entry only when one slot clearly wins. */
function dominant(slots) {
  let total = 0, topSlot = null, top = 0;
  for (const [slot, c] of slots) { total += c; if (c > top) { top = c; topSlot = slot; } }
  const ratio = top / total;
  if (total === 1) return ratio >= 1 ? topSlot : null;
  if (total <= 3) return ratio >= 0.5 ? topSlot : null;
  return ratio >= 0.6 ? topSlot : null;
}

const keywords = [];
for (const [phrase, slots] of counts) {
  const slot = dominant(slots);
  if (!slot) continue;
  keywords.push([phrase, slot]);
}
keywords.sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0], 'fa'));

const pairs = [];
for (const [key, slots] of pairCounts) {
  const [before, after] = key.split('\u0000');
  const slot = dominant(slots);
  if (!slot || !before) continue;
  pairs.push([before, after || 'EOL', slot]);
}
// longer `before` first so runtime prefers specific matches
pairs.sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0], 'fa'));

fs.writeFileSync(outFile, JSON.stringify({ keywords, pairs }, null, 1) + '\n', 'utf8');

console.log(`wrote ${outFile}`);
console.log(`  keywords: ${keywords.length}`);
console.log(`  pairs: ${pairs.length}  (EOL pairs: ${pairs.filter((p) => p[1] === 'EOL').length})`);
console.log(`  folder skipped (no data.json): ${foldersSkipped}`);
