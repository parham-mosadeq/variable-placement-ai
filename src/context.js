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

/**
 * Given a dotted_placeholder match inside `text`, return the Persian slot hint
 * found in the words immediately before the blank.
 *
 * Looks at up to ~40 chars / 2 lines before the gap — the label usually sits at
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
  // Pick the keyword occurring closest to the blank (largest lastIndexOf in the window).  // Ties broken by LONGER keyword first so "عبارت است از ترجمه" beats "عبارت است از".
  let best = null, bestIdx = -1, bestLen = 0;
  for (const [keyword, slot] of KEYWORD_SLOTS) {
    const idx = window.lastIndexOf(keyword);
    if (idx === -1) continue;
    if (idx > bestIdx || (idx === bestIdx && keyword.length > bestLen)) {
      bestIdx = idx;
      bestLen = keyword.length;
      best = slot;
    }
  }
  return best;
}
