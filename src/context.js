/**
 * Context helpers: infer a slot name for implicit gaps (dotted placeholders).
 */

/** Map from a preceding keyword phrase to a canonical slot name. */
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
  ['انجام دهد', 'duties'],
  ['امضاء و تاریخ', 'signature_date'],
  ['امضای', 'signature'],
];

/**
 * Given a dotted_placeholder match inside `text`, return the Persian slot hint
 * found in the words immediately before the blank.
 *
 * Looks at up to ~40 chars / 2 lines before the gap — the label usually sits at
 * the end of the previous line (e.g. "فرزند: ..............................").
 */
export function slotHintForPlaceholder(text, start) {
  const window = text.slice(Math.max(0, start - 40), start);
  // Pick the keyword occurring closest to the blank (largest lastIndexOf in the window).
  let best = null, bestIdx = -1;
  for (const [keyword, slot] of KEYWORD_SLOTS) {
    const idx = window.lastIndexOf(keyword);
    if (idx !== -1 && idx > bestIdx) {
      bestIdx = idx;
      best = slot;
    }
  }
  return best;
}
