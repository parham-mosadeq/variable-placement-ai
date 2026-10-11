#!/usr/bin/env node
/**
 * Extractor runner (batch):
 *   - reads dataset job folders: base-data.txt (the empty form with dotted slots)
 *     and data.txt (bracket format)
 *   - runs extractVariablesFromText on each
 *   - writes JSON output to output/<contract-name>.json  (untouched dataset)
 *   - if a name collides, appends a numeric suffix (name-2.json, ...)
 *
 * Dataset is never modified.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractVariablesFromText, extractVariablesFromContractDir } from './extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'output');

function run() {
  const jobDir = path.join(REPO_ROOT, 'dataset', 'job');
  if (!fs.existsSync(jobDir)) {
    console.error('dataset/job not found — run from project root');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const folders = fs.readdirSync(jobDir)
    .filter((f) => fs.statSync(path.join(jobDir, f)).isDirectory())
    .sort();

  const used = new Set();
  const summary = [];

  for (const folder of folders) {
    const dir = path.join(jobDir, folder);
    try {
      // Prefer the "خالی" base form; fall back to the bracket-filled data.txt.
      const baseFile = path.join(dir, 'base-data.txt');
      const dataFile = path.join(dir, 'data.txt');
      const useBase = fs.existsSync(baseFile);
      const sourceFile = useBase ? baseFile : dataFile;
      if (!sourceFile) {
        summary.push({ folder, status: 'skipped (no extractable source)' });
        continue;
      }

      const extraction = extractVariablesFromText(fs.readFileSync(sourceFile, 'utf8'));

      // Unique output filename = contract name
      let outName = folder + '.json';
      let i = 2;
      while (used.has(outName)) outName = `${folder.replace(/\.json$/, '')}-${i++}.json`;
      used.add(outName);

      const { ground_truth_keys, dir: _dir, ...rest } = extractVariablesFromContractDir(dir);
      const payload = {
        contract: folder,
        source: useBase ? 'base-data.txt' : 'data.txt',
        ...rest,
      };

      const outPath = path.join(OUT_DIR, outName);
      fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
      summary.push({ folder, out: path.relative(REPO_ROOT, outPath), count: extraction.count, nulls: extraction.variables.filter(v=>!v.name).length });
    } catch (err) {
      summary.push({ folder, status: 'error: ' + err.message });
    }
  }

  console.log(`wrote ${summary.filter(s => s.out).length} files`);
  for (const s of summary) {
    if (s.out) console.log(`  ${s.out}  (${s.count} vars${s.nulls ? `, ${s.nulls} unnamed` : ''})`);
    else console.log(`  [skip] ${s.folder} — ${s.status || 'no output'}`);
  }
}

run();
