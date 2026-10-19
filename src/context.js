/**
 * Context helpers: infer a slot name for implicit gaps (dotted placeholders).
 */

import { readFileSync } from 'node:fs';

/**
 * GENERATED output of `npm run build-map` (dataset ground truth).
 * Accepts the object format {keywords, pairs} and the legacy plain array
 * of [keyword, slot].
 */
const GENERATED = (() => {
  try {
    const g = JSON.parse(
      readFileSync(new URL('./keyword-slots.generated.json', import.meta.url), 'utf8'),
    );
    return Array.isArray(g) ? { keywords: g, pairs: [] } : g;
  } catch {
    return { keywords: [], pairs: [] }; // generated file missing → hand map only
  }
})();

/** Hand-curated map from a preceding keyword phrase to a canonical slot name.
 *  Fallback for ambiguous labels the generator drops (see dominant-slot rule). */
const KEYWORD_SLOTS = [
  // parties / identity
  ['آقا / خانم', 'full_name'],
  ['آقا/خانم', 'full_name'],
  ['نام و نام خانوادگی', 'full_name'],
  ['نام خانوادگی', 'last_name'],
  ['نام', 'first_name'],
  ['فرزند', 'father_name'],
  ['کد ملی', 'national_id'],
  ['کدملی', 'national_id'],
  ['شماره ملی', 'national_id'],
  ['تاریخ تولد', 'birth_date'],
  ['محل تولد', 'birth_place'],
  ['جنسیت', 'gender'],
  ['شماره شناسنامه', 'certificate_id'],
  ['صادره از', 'issue_place'],
  ['تحصیلات', 'education'],
  ['رشته', 'field'],
  // employer
  ['شرکت', 'company_name'],
  ['نمایندگی', 'representative_name'],
  ['به نمایندگی', 'representative_name'],
  ['سمت', 'representative_position'],
  ['شماره ثبت', 'registration_number'],
  ['شناسه ملی', 'company_national_id'],
  ['کد اقتصادی', 'economic_code'],
  // address / contact
  ['آدرس و تلفن', 'address_phone'],
  ['نشانی', 'address'],
  ['آدرس', 'address'],
  ['کد پستی', 'postal_code'],
  ['تلفن', 'phone'],
  ['شماره تماس', 'phone'],
  // employment
  ['عنوان شغل', 'job_title'],
  ['شغل', 'job_title'],
  ['شرح وظایف', 'duties'],
  ['محل کار', 'workplace_address'],
  ['کارگاه', 'workplace_address'],
  // duration
  ['تاریخ شروع', 'start_date'],
  ['تاریخ پایان', 'end_date'],
  ['از تاریخ', 'start_date'],
  ['در تاریخ', 'contract_date'],
  ['شروع شده و در تاریخ', 'end_date'],
  ['لغایت', 'end_date'],
  ['شروع', 'start_date'],
  ['به اتمام', 'end_date'],
  ['لغایت', 'end_date'],
  ['به مدت', 'duration'],
  ['دوره آزمایشی', 'trial_period'],
  ['از ساعت', 'work_start_hour'],
  ['تا ساعت', 'work_end_hour'],
  // salary
  ['مزد روزانه', 'daily_wage'],
  ['حقوق ماهانه', 'monthly_salary'],
  ['حق مسکن', 'housing_allowance'],
  ['بن کارگری', 'grocery_allowance'],
  ['حق اولاد', 'child_allowance'],
  ['پایه سنوات', 'seniority_allowance'],
  ['سایر مزایا', 'other_benefits'],
  ['جمع کل ماهانه', 'total_monthly'],
  ['مبلغ (ریال)', 'amount_rial'],
  ['مبلغ', 'amount'],
  ['مزد', 'daily_wage'],
  ['حقوق', 'monthly_salary'],
  ['دستمزد', 'salary'],
  ['تا روز', 'payment_day'],
  // other
  ['شرح وظایف یا مسئولیت', 'duties'],
  ['وظایف زیر', 'duties'],
  ['از جمله وظایف زیر', 'duties'],
  // consecutive filler lines reusing the previous label
  ['مثلاً', 'work_examples'],
  ['شامل', 'scope_items'],
  ['کار و وظایف', 'duties'],
  ['شرح کامل وظایف', 'duties'],
  ['انجام دهد', 'duties'],
  ['امضاء و تاریخ', 'signature_date'],
  ['امضای', 'signature'],
  // table header separator lines: reuse the nearest real header above them
  ['مبلغ (ریال)', 'amount_rial'],
  ['-------------------------', 'amount_rial'],
  ['------------------------------', 'amount_rial'],
  ['حقوق و مزایا', 'salary_table'],
  ['پیش‌پرداخت', 'advance_payment'],
  ['پرداخت مرحله‌ای', 'installment_payment'],
  ['پرداخت مرحله‌ای/براساس پیشرفت پروژه', 'progress_payment'],
  ['تسویه نهایی پس از تأیید و تحویل کامل کار', 'final_settlement'],
  ['عدم رفع نقص ظرف مدت', 'fault_notice_period'],
  ['شامل موارد زیر', 'scope_items'],
  ['مثلاً تولید، بسته‌بندی، تایپ', 'work_examples'],
  ['(مثلاً', 'work_examples'],
  ['امضاي', 'signature'],
  ['امضاي کارفرما', 'employer_signature'],
  ['امضاي کارگر', 'worker_signature'],
  ['نماینده کارفرما', 'employer_representative'],
  ['آقاي / خانم / شرکت', 'company_or_name'],
  ['آقاي / خانم', 'full_name'],
  ['آقاي/خانم', 'full_name'],
  ['امضاء کارفرما', 'employer_signature'],
  ['امضاء سرایدار', 'worker_signature'],
  ['امضاء کارگر', 'worker_signature'],
  ['امضاء مشاور', 'consultant_signature'],
  ['امضاء وکیل', 'lawyer_signature'],

  // === mined from dataset (src/mine-labels.js) ===
  // duration & dates
  ['شروع آن از تاریخ', 'start_date'],
  ['و پایان آن تاریخ', 'end_date'],
  ['اتمام مدت قرارداد شماره', 'contract_number'],
  ['قرارداد کار شماره', 'contract_number'],
  ['مدت این قرارداد', 'duration'],
  ['مدت قرارداد', 'duration'],
  ['ماه معتبر', 'continuation_note'],
  ['در شهر', 'contract_city'],
  ['تعهد محرمانگی تا مدت', 'confidentiality_duration'],
  // worker identity
  ['متولد', 'birth_date'],
  ['میزان تحصیلات', 'education'],
  ['وضعیت تأهل', 'marital_status'],
  ['نوع و میزان مهارت', 'skill'],
  ['میزان مهارت', 'skill'],
  ['و کارگر آقای/خانم', 'worker_name'],
  ['ف کارگر آقای/خانم', 'worker_name'],
  ['خانم / آقای', 'full_name'],
  ['خانم/آقای', 'full_name'],
  ['مالک/مدیریت ساختمان', 'building_owner_name'],
  ['مدیر فروش', 'manager_name'],
  ['موسسه', 'institute_name'],
  // subject / job
  ['اشتغال کارمند به عنوان', 'job_title'],
  ['انجام کار به عنوان', 'job_title'],
  ['میزان تحصیلات', 'education'],
  ['متولد', 'birth_date'],
  ['اشتغال فروشنده در', 'job_title'],
  ['اشتغال راننده جهت رانندگی خودرو', 'vehicle_type'],
  ['با پلاک', 'vehicle_plate_number'],
  ['عبارت است از ترجمه', 'translation_source'],
  ['به حجم', 'translation_volume'],
  ['شامل ترجمه کتاب/متن', 'translation_target'],
  ['نوع پروژه', 'project_type'],
  ['کاربری', 'project_usage'],
  ['زیربنا تقریبی', 'approximate_area'],
  ['کشور مقصد', 'destination_country'],
  ['مرحله دوم', 'phase_two'],
  ['اخذ ویزای کار کشور مقصد', 'work_visa_process'],
  // workplace / service
  ['محل انجام کار', 'workplace'],
  ['واقع در محل', 'workplace'],
  ['محل خدمت', 'service_place'],
  ['ساعات کاری روزانه', 'daily_work_hours'],
  ['ساعات کاری به صورت', 'work_hours_type'],
  ['ساعات کار', 'work_hours'],
  ['ساعت انجام کار', 'work_start_hour'],
  ['ماده ۵۱ قانون کار', 'weekly_work_hours'],
  ['تبصره ۱ ماده', 'weekly_work_hours'],
  ['مجموع ساعات تدریس', 'total_teaching_hours'],
  ['هریک از طرفین موظفند حداقل', 'min_commitment'],
  ['اختلافات ناشی از این قرارداد در مراجع صالح', 'dispute_city'],
  ['مراجع صالح', 'dispute_city'],
  ['پرونده موکل در', 'case_subject'],
  ['دارای پروانه وکالت به شماره', 'lawyer_license_number'],
  ['امکان مطالبه وجه التزام به میزان', 'penalty_amount'],
  // payment / bank
  ['نزد بانک', 'bank_name'],
  ['شعبه', 'bank_branch'],
  ['شماره کارت', 'card_number'],
  ['به حساب', 'account_number'],
  ['شماره حساب', 'account_number'],
  ['پرداخت از طریق', 'payment_method'],
  ['از طریق واریز به شماره کارت', 'card_number'],
  ['حقوق و مزایا به صورت هفتگی / ماهانه', 'salary_period'],
  ['نوع قرارداد به صورت', 'contract_type'],
  ['این قرارداد به صورت', 'contract_type'],
  ['جل قرارداد حاضر به صورت', 'contract_type'],
  ['حق جذب ماهانه', 'recruitment_bonus'],
  ['خواربار و مسکن', 'grocery_housing_allowance'],
  ['کمک عائله مندی', 'family_assistance'],
  ['فوق العاده مأموریت', 'mission_allowance'],
  ['سایر مزایا', 'other_benefits'],
  ['حقوق ماهانه مبلغ', 'monthly_salary'],
  ['حق‌الزحمه ترجمه مبلغ', 'translation_fee'],
  ['به ازای هر', 'fee_unit'],
  ['نوع قرارداد', 'contract_type'],
  ['کارفرما', 'employer_name'],
  ['کارگر', 'worker_name'],
  ['جمع', 'total_monthly'],
  ['ریال و جمع کل', 'total_monthly'],
  ['در بخش', 'department'],
  ['ایمیل', 'email'],
  ['پست الکترونیک', 'email'],
  ['دورنگار', 'fax'],
  ['تلفن همراه', 'mobile_phone'],
  ['این قرارداد کار در', 'contract_date'],
  ['ساعت انجام کار بر اساس تبصره ۱ ماده ۵۱ قانون کار', 'work_hours_note'],
  ['تاریخ انعقاد قرارداد', 'contract_date'],
  ['تاریخ انعقاد', 'contract_date'],
  ['ساعت کار', 'work_hours'],
  ['امضاء دریافت‌کننده', 'receiver_signature'],
  ['امضاء افشاءکننده', 'discloser_signature'],
  ['عبارت است از', 'contract_subject'],
  ['شغل یا حرفه', 'job_title'],
  ['اشتغال می یابد', 'job_title'],
  ['حرفه یا حجم کار', 'job_title'],
  ['حق سنوات', 'seniority_severance'],
  ['مطابق قانون به', 'seniority_duration'],
  ['ماه', 'duration'],
  ['سال', 'duration_years'],
  ['درتاریخ', 'contract_date'],
  ['نزد بانک', 'bank_name'],
];

// ------------------------------------------------------------------
// FAST lookups: build lookup structures ONCE at module load instead of
// scanning ~730 keyword entries per placeholder.
// ------------------------------------------------------------------

/** Normalize Arabic/Persian look-alike chars so map keys and regex hits agree. */
export function normFa(s) {
  return s
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ۀة]/g, 'ه')
    .replace(/ٔ/g, '');
}

/** keyword text -> slot. Generated (dataset) entries win over hand list. */
const ALL_KEYWORDS = (() => {
  const m = new Map();
  // insert hand entries first, then generated ones overwrite → dataset wins
  for (const [kw, slot] of KEYWORD_SLOTS) m.set(normFa(kw), slot);
  for (const [kw, slot] of GENERATED.keywords) m.set(normFa(kw), slot);
  return m;
})();

/** Characters that must be escaped inside a regex pattern. */
const RE_SPECIALS = new Set(['\\', '.', '*', '+', '?', '(', ')', '[', ']', '{', '}', '^', '$', '|']);

function rePiece(s) {
  // escape specials; make Arabic/Persian look-alikes interchangeable
  let out = '';
  for (const ch of s) {
    if ('یيى'.includes(ch)) out += '[یيى]';
    else if ('کك'.includes(ch)) out += '[کك]';
    else if ('هۀة'.includes(ch)) out += '[هۀة]';
    else out += (RE_SPECIALS.has(ch) ? '\\' : '') + ch;
  }
  return out;
}

/** ONE regex that matches any known keyword; longest alternatives first. */
const KEYWORD_RE = new RegExp(
  '(?:' + [...ALL_KEYWORDS.keys()].sort((a, b) => b.length - a.length).map(rePiece).join('|') + ')',
  'gu',
);

/** Best label match inside `window`: rightmost occurrence, ties → longest. */
function keywordIn(window) {
  KEYWORD_RE.lastIndex = 0;
  let best = null;
  let bestIdx = -1;
  let bestLen = 0;
  let m;
  while ((m = KEYWORD_RE.exec(window)) !== null) {
    if (best === null || m.index > bestIdx || (m.index === bestIdx && m[0].length > bestLen)) {
      bestIdx = m.index;
      bestLen = m[0].length;
      best = ALL_KEYWORDS.get(normFa(m[0])) ?? null;
    }
    if (KEYWORD_RE.lastIndex === m.index) KEYWORD_RE.lastIndex++;
  }
  return best;
}

/**
 * Given a dotted_placeholder match inside `text`, return the Persian slot hint
 * found in the words immediately before the blank.
 *
 * Looks at up to ~60 chars / 2 lines before the gap — the label usually sits at
 * the end of the previous line (e.g. "فرزند: ..............................").
 */
const WINDOW_CHARS = 60;

export function slotHintForPlaceholder(text, start) {
  let window = text.slice(Math.max(0, start - WINDOW_CHARS), start);
  // If the window is only filler (dots/ellipsis/newlines) — a block of blank
  // filler lines — look further back for the last real label.
  if (/^[.\u2026\s]+$/.test(window)) {
    window = text.slice(Math.max(0, start - 160), start);
  }
  return keywordIn(window);
}

// ------------------------------------------------------------------
// BLANK GAPS: contracts where values were stripped with NO dots left,
// just whitespace between labels ("آقای/خانم   فرزند   به شماره...").
// Detected with dataset-mined (before, after) token pairs; bucketed by
// the LAST word of `before` so each candidate run inspects only a few
// pairs instead of scanning every pair across the whole text.
// ------------------------------------------------------------------

const GAP_WS = /[ \t\u00A0\u200c]/;
const LINE_WS = /[ \t]/;

const PAIR_BUCKETS = (() => {
  const buckets = new Map();
  for (const [before, after, slot] of GENERATED.pairs) {
    const last = normFa(before).trim().split(/\s+/).pop();
    if (!last) continue;
    let arr = buckets.get(last);
    if (!arr) { arr = []; buckets.set(last, arr); }
    arr.push({
      before,
      after: after || 'EOL',
      slot,
      endRe: new RegExp('(?:' + rePiece(before) + ')[:：]?$', ''),
      afterRe: after && after !== 'EOL'
        ? new RegExp('^(?:' + rePiece(after) + ')', '')
        : null,
    });
  }
  return buckets;
})();

function bucketFor(preClean) {
  const words = normFa(preClean).split(/[\s\u200c]+/).filter(Boolean);
  const last = words[words.length - 1];
  return last ? PAIR_BUCKETS.get(last) : null;
}

/** Collect non-overlapping blank-gap slot hints for `text`. */
export function detectBlankGaps(text) {
  if (!text || !PAIR_BUCKETS.size) return [];
  const found = [];

  // 1) mid-line runs of ≥2 spaces/tabs (runs touching '\n' are handled by 2)
  RUN_RE.lastIndex = 0;
  let m;
  while ((m = RUN_RE.exec(text)) !== null) {
    const g0 = m.index;
    const g1 = m.index + m[0].length;
    if (text[g1] === '\n' || text[g1] === '\r') continue;
    const pre = text.slice(0, g0).replace(/[ \t:：]+$/, '');
    const bucket = bucketFor(pre);
    if (!bucket) continue;
    for (const p of bucket) {
      if (!p.endRe.test(pre)) continue;
      if (p.afterRe && !p.afterRe.test(text.slice(g1, g1 + 40))) continue;
      found.push({ name: p.slot, start: g0, end: g1 });
    }
  }

  // 2) line-end gaps: any whitespace between the last label and '\n'
  LF_RE.lastIndex = 0;
  while ((m = LF_RE.exec(text)) !== null) {
    const n = m.index;
    const lineStart = text.lastIndexOf('\n', n - 1) + 1;
    const line = text.slice(lineStart, n);
    const trimmed = line.replace(/[ \t]+$/, '');
    if (trimmed.length === line.length) continue;        // no trailing ws → prose line
    const pre = trimmed.replace(/[ \t:：]+$/, '');
    const bucket = bucketFor(pre);
    if (!bucket) continue;
    for (const p of bucket) {
      if (p.after !== 'EOL' || !p.endRe.test(pre)) continue;
      found.push({ name: p.slot, start: lineStart + pre.length, end: n });
    }
  }

  // 3) keyword fallback for runs the pair map missed: a known label ending
  //    exactly at the run start (colon allowed). Lower precision → only used
  //    where no pair matched that run.
  RUN_RE.lastIndex = 0;
  while ((m = RUN_RE.exec(text)) !== null) {
    const g0 = m.index;
    const g1 = m.index + m[0].length;
    if (text[g1] === '\n' || text[g1] === '\r') continue;
    const pre = text.slice(0, g0).replace(/[ \t:：]+$/, '');
    if (!pre) continue;
    KEYWORD_END_RE.lastIndex = 0;
    const km = KEYWORD_END_RE.exec(pre);
    if (!km) continue;
    if (pre.length - km[0].length > 0 && /[\p{L}\p{N}]/u.test(pre[pre.length - km[0].length - 1])) {
      // the "label" is glued to a longer word inside it — false positive guard
      continue;
    }
    found.push({ name: ALL_KEYWORDS.get(normFa(km[0])) ?? null, start: g0, end: g1 });
  }
  LF_RE.lastIndex = 0;
  while ((m = LF_RE.exec(text)) !== null) {
    const n = m.index;
    const lineStart = text.lastIndexOf('\n', n - 1) + 1;
    const line = text.slice(lineStart, n);
    const trimmed = line.replace(/[ \t]+$/, '');
    if (trimmed.length === line.length) continue;
    const pre = trimmed.replace(/[ \t:：]+$/, '');
    if (!pre) continue;
    KEYWORD_END_RE.lastIndex = 0;
    const km = KEYWORD_END_RE.exec(pre);
    if (!km) continue;
    if (pre.length > km[0].length && /\p{L}\p{N}/u.test(pre[pre.length - km[0].length - 1])) continue;
    found.push({ name: ALL_KEYWORDS.get(normFa(km[0])) ?? null, start: lineStart + pre.length, end: n });
  }

  // 4) dedupe overlaps (leftmost wins, NULLs dropped)
  found.sort((a, b) => a.start - b.start || (a.end - a.start) - (b.end - b.start));
  const out = [];
  let lastEnd = -1;
  for (const g of found) {
    if (g.start < lastEnd) continue;
    if (g.name === null) continue;
    out.push(g);
    lastEnd = g.end;
  }
  return out;
}

const RUN_RE = /[ \t]{2,}/g;
const LF_RE = /\n/g;
/** Same alternation, but anchored at the END of the given string. */
const KEYWORD_END_RE = new RegExp(
  '(?:' + [...ALL_KEYWORDS.keys()].sort((a, b) => b.length - a.length).map(rePiece).join('|') + ')$',
  'u',
);

