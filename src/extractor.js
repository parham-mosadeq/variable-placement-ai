/**
 * Detects empty variable slots ("قرارداد خالی") in Persian contract text
 * and returns their positions as JSON.
 */

import { slotHintForPlaceholder, detectBlankGaps } from './context.js';

const BRACKET_RE = /\[([^\[\]]+)\]/g;   // [variable_name]
const BRACE_RE = /\{\{([^{}]+)\}\}/g;   // {{variable_name}} (clauses dataset style)

// Placeholder fills seen in Persian contracts:
//   dots .........  ellipsis char … (U+2026)  dashes/octothorpe ----
//   underscores ____  stars ****  tildes ~~~  (>=3 chars in a row)
const SLOT_RE = new RegExp('(?:\\.{3,}|\u2026+|[-_~*]{3,})', 'g');

import fs from 'node:fs';
import path from 'node:path';

export function extractVariablesFromText(text) {
  if (!text || typeof text !== 'string') {
    return { variables: [], count: 0 };
  }

  const variables = [];

  collectMatches(text, BRACKET_RE, 'bracket');
  collectMatches(text, BRACE_RE, 'brace');
  // inline placeholder fills: dots, ellipsis …, dashes, underscores, etc.
  let m;
  SLOT_RE.lastIndex = 0;
  while ((m = SLOT_RE.exec(text)) !== null) {
    variables.push({
      name: slotHintForPlaceholder(text, m.index),
      kind: m[0].includes('.') || m[0].includes('\u2026')
        ? 'dotted_placeholder'
        : 'dashed_placeholder',
      start: m.index,
      end: m.index + m[0].length,
      raw: m[0],
    });
    if (SLOT_RE.lastIndex === m.index) SLOT_RE.lastIndex++;
  }

  // blank gaps (whitespace-only slots with NO dots) ← dataset (before,after) pairs
  for (const g of detectBlankGaps(text)) {
    variables.push({
      name: g.name,
      kind: 'blank_gap',
      start: g.start,
      end: g.end,
      raw: text.slice(g.start, g.end),
    });
  }

  variables.sort((a, b) => a.start - b.start);
  return { variables, count: variables.length };

  function collectMatches(source, re, kind) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(source)) !== null) {
      variables.push({
        name: match[1].trim(),
        kind,
        start: match.index,
        end: match.index + match[0].length,
        raw: match[0],
      });
      if (re.lastIndex === match.index) re.lastIndex++; // safety
    }
  }
}

/**
 * Extract variables from a contract folder (base-data.txt + data.txt + variable.json).
 */
export function extractVariablesFromContractDir(dirPath) {
  const baseFile = path.join(dirPath, 'base-data.txt');
  const dataFile = path.join(dirPath, 'data.txt');
  const variableFile = path.join(dirPath, 'variable.json');

  const base = fs.existsSync(baseFile) ? fs.readFileSync(baseFile, 'utf8') : '';
  const filled = fs.existsSync(dataFile) ? fs.readFileSync(dataFile, 'utf8') : '';
  const groundTruth = fs.existsSync(variableFile)
    ? JSON.parse(fs.readFileSync(variableFile, 'utf8'))
    : null;

  return {
    dir: dirPath,
    from_base: extractVariablesFromText(base),
    from_filled: extractVariablesFromText(filled),
    ground_truth_keys: groundTruth ? Object.keys(groundTruth) : null,
  };
}
