#!/usr/bin/env node
/**
 * CLI: extract variables from a contract file or dataset folder.
 * Default behaviour: save JSON to output/<input-name>.json AND print to stdout.
 *   -o/--out PATH     save to a custom path instead
 *   --stdout          print only, don't save
 */
import fs from 'node:fs';
import path from 'node:path';
import { extractVariablesFromText, extractVariablesFromContractDir } from './extractor.js';

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('-'));
const pretty = args.includes('--pretty') || args.includes('-p');
const toStdoutOnly = args.includes('--stdout');

const outFlagIdx = args.findIndex((a) => a === '--out' || a === '-o');
const outPath = outFlagIdx !== -1 ? args[outFlagIdx + 1] : null;

if (!target || (outFlagIdx !== -1 && !outPath)) {
  console.error('Usage: node src/cli.js <contractFile.txt | contractDir> [--pretty] [-o result.json] [--stdout]');
  process.exit(1);
}

try {
  const stat = fs.statSync(target);
  const out = stat.isDirectory()
    ? extractVariablesFromContractDir(target)
    : extractVariablesFromText(fs.readFileSync(target, 'utf8'));
  const json = JSON.stringify(out, null, pretty ? 2 : 0);

  // Output file name = input file name, placed in ./output/
  let defaultOut = null;
  if (!stat.isDirectory()) {
    const base = path.basename(target).replace(/\.[^.]*$/, '') || 'contract';
    defaultOut = path.join('output', base + '.json');
    fs.mkdirSync('output', { recursive: true });
  }

  const saveTo = toStdoutOnly ? null : (outPath || defaultOut);
  if (saveTo) {
    fs.writeFileSync(saveTo, json + '\n', 'utf8');
    console.error(`saved → ${saveTo}`);
  }
  console.log(json);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
