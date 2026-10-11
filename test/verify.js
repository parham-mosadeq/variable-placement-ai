import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractVariablesFromText } from '../src/extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jobDir = path.join(__dirname, '..', 'dataset', 'job');

const folders = fs.readdirSync(jobDir)
  .filter((f) => fs.statSync(path.join(jobDir, f)).isDirectory());

let pass = 0, fail = 0;
const failures = [];

for (const folder of folders) {
  const dir = path.join(jobDir, folder);
  const varFile = path.join(dir, 'variable.json');
  const dataFile = path.join(dir, 'data.txt');
  if (!fs.existsSync(varFile) || !fs.existsSync(dataFile)) continue;

  const truth = JSON.parse(fs.readFileSync(varFile, 'utf8'));
  const text = fs.readFileSync(dataFile, 'utf8');
  const found = extractVariablesFromText(text)
    .variables
    .filter((v) => v.kind === 'bracket')
    .map((v) => v.name);

  const truthKeys = Object.keys(truth);
  const foundSet = new Set(found);
  const truthSet = new Set(truthKeys);
  const missing = truthKeys.filter((k) => !foundSet.has(k));
  const extra = [...new Set(found.filter((k) => !truthSet.has(k)))];

  if (missing.length === 0 && extra.length === 0) {
    pass++;
  } else {
    fail++;
    failures.push({ folder: folder, missing, extra });
  }
}

console.log(`Folders checked: ${pass + fail}`);
console.log(`Matched: ${pass}`);
console.log(`Mismatches: ${fail}`);
for (const f of failures) {
  console.log(`\n[X] ${f.folder}`);
  if (f.missing.length) console.log(`    missing: ${f.missing.join(', ')}`);
  if (f.extra.length) console.log(`    extra:   ${f.extra.join(', ')}`);
}
process.exit(fail === 0 ? 0 : 1);
