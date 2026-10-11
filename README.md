# Contract Variable Extractor

یک الگوریتم JS که از روی متن «قرارداد خالی»، متغیرهای (اسلات‌های) آن را پیدا کرده و JSON برمی‌گرداند.

از سه فرمت جای خالی پشتیبانی می‌کند: `[var]`، `{{var}}` و جای‌خالی‌های حرفی مثل `..........` / `……………` / `------`.

## ساختار پروژه

```
src/
  extractor.js   → هسته الگوریتم
  context.js     → فرهنگ کلیدواژه‌های فارسی → نام اسلات انگلیسی
  mine-labels.js → ابزار ماین لیبل‌های ناشناخته از dataset (فقط خواندنی)
  cli.js         → اجرای دستور خط فرمان (تک فایل / تک پوشه)
  batch.js       → اجرای دسته‌ای روی کل dataset
  index.js       → خروجی کتابخانه‌ای (import در کد خودت)
test/
  sample.js      → تست واحد نمونه کوچک
  verify.js      → مقایسه خروجی با variable.json در ۴۴ پوشه dataset/job
test-contracts/
  work.txt       → قرارداد واقعی برای تست end-to-end (فرم خالی کار)
output/          → خروجی‌های تولیدی (کامیت نمی‌شود)
```

## توضیح تک‌تک فایل‌ها

### `src/extractor.js` — هسته الگوریتم
- `extractVariablesFromText(text)`: متن قرارداد را می‌گیرد و **همه جای‌های خالی** را با این فرمت برمی‌گرداند:
  ```json
  { "name": "start_date", "kind": "dotted_placeholder", "start": 93, "end": 108, "raw": "..........." }
  ```
  - `name`: نام اسلات انگلیسی (برای `dotted_placeholder` از کلمات قبل حدس زده می‌شود)
  - `kind`: `bracket` (`[var]`) / `brace` (`{{var}}`) / `dotted_placeholder` (نقطه یا …) / `dashed_placeholder` (خط‌تیره/زیرخط)
  - `start` / `end`: موقعیت دقیق در متن (برای جای‌گذاری مقدار بعدی)
- رجکس‌های پشتیبانی‌شده: `\.{3,}` (نقطه)، `…+` (ellipsis یونیکد U+2026)، `[-_~*]{3,}` (خط‌تیره/زیرخط/ستاره/تیلدا)
- `extractVariablesFromContractDir(dir)`: یک پوشه dataset را می‌گیرد و `from_base` (فرم خالی) + `from_filled` (فرم `[var]`) + کلیدهای `variable.json` را برمی‌گرداند

### `src/context.js` — نگاشت کلیدواژه به اسلات
- آرایه‌ای از `[کلیدواژه فارسی, نام اسلات انگلیسی]` (~۱۳۰ مورد):
  - هویت: `فرزند→father_name`، `کد ملی→national_id`، `متولد→birth_date`، `تحصیلات→education`
  - کارفرما: `شرکت→company_name`، `شماره ثبت→registration_number`، `شناسه ملی→company_national_id`
  - آدرس/تماس: `نشانی→address`، `آدرس و تلفن→address_phone`، `ایمیل→email`
  - مدت: `از تاریخ→start_date`، `لغایت→end_date`، `به مدت→duration`
  - حقوق: `حقوق ماهانه→monthly_salary`، `حق مسکن→housing_allowance`، `بن کارگری→grocery_allowance`
  - بانکی: `نزد بانک→bank_name`، `شعبه→bank_branch`، `شماره کارت→card_number`
  - و ده‌ها مورد دیگر (شامل امضاها، پیش‌پرداخت، پروژه، وکالت و ...)
- `slotHintForPlaceholder(text, start)`: پنجره ۶۰ کاراکتری قبل از اسلات را نگاه می‌کند.
  اگر فقط نقطه/فاصله باشد (بلوک خط‌های خالی)، تا ۱۶۰ کاراکتر عقب‌تر می‌رود.
  از بین کلیدواژه‌های پیدا شده، **نزدیک‌ترین** را برمی‌دارد (تساوی → کلیدواژه طولانی‌تر).

### `src/mine-labels.js` — ابزار کشف لیبل
تک‌تک جای‌خالی‌های `dataset/job` را پیدا می‌کند، لیبل فارسیِ قبلش را استخراج می‌کند و گزارش می‌دهد:
```bash
node src/mine-labels.js           # فقط لیبل‌هایی که هنوز NULL برمی‌گردانند
node src/mine-labels.js --all     # همه لیبل‌های distinct با اسلات‌شان
```
- خروجی لیست اولویت‌دار است — هر مورد NULL یعنی فرهنگ باید گسترش یابد.
- **فقط خواندنی** است و dataset را تغییر نمی‌دهد، پس هر زمان می‌توانی اجرا کنی.

### `src/cli.js` — خط فرمان
```bash
node src/cli.js <file.txt | dir> [--pretty] [-o out.json] [--stdout]
```
- **پیش‌فرض:** خروجی را **هم در ترمینال چاپ می‌کند و هم در `output/<اسم-ورودی>.json`** ذخیره می‌کند
- `--pretty` / `-p` → JSON با indent خوانا
- `-o file.json` → مسیر سفارشی به‌جای `output/`
- `--stdout` → فقط چاپ، بدون ذخیره
- برای پوشه dataset (`extractVariablesFromContractDir`) از `from_base` + `from_filled` استفاده می‌کند و `ground_truth_keys` هم دارد

### `src/batch.js` — اجرای دسته‌ای روی کل dataset
```bash
node src/batch.js
```
- برای هر پوشه در `dataset/job/*` یک فایل `output/<اسم قرارداد>.json` می‌نویسد
- فرمت خروجی:
  ```json
  {
    "contract": "قرارداد ترجمه",
    "source": "base-data.txt",
    "from_base":   { "variables": [...], "count": 26 },
    "from_filled": { "variables": [...], "count": 14 },
    "ground_truth_keys": [...]
  }
  ```
- **dataset را هرگز تغییر نمی‌دهد**؛ در پایان‌اجرا log می‌دهد که `saved → ...`
- اسم فایل تکراری به‌طور خودکار به‌صورت `name-2.json` suffix می‌گیرد

### `src/index.js` — خروجی به‌عنوان کتابخانه
```js
import { extractVariablesFromText, extractVariablesFromContractDir } from './src/index.js';
import { slotHintForPlaceholder } from './src/context.js';
```
برای استفاده در کدهای JS خودت، بدون عبور از CLI.

### `test/sample.js` — تست واحد کوچک
- یک قرارداد نمونه (ساده) را می‌سازد و چند اظهار (assert) می‌کند:
  - تعداد درست اسلات‌ها، ترتیب، نام چند اسلات، حدس درست از لیبل‌های نقطه‌ای
```bash
node test/sample.js
```

### `test/verify.js` — صحت‌سنجی روی dataset
- روی ۴۴ پوشه `dataset/job` می‌رود، خروجی را با `variable.json` مقایسه می‌کند
- گزارش `Matched: N` / `Mismatches: M` با details (پوشه، لیست missing و extra)
- **۶ پوشه ناسازگار داخلی‌اند** (variable.json قدیمی با data.txt جدید) — این اشکال دیتاست است، نه الگوریتم
```bash
node test/verify.js
```

### `test-contracts/work.txt` — قرارداد واقعی برای تست
- یک قرارداد کار واقعی (۱۰۱ جای خالی نقطه‌ای/ellipsis)
- با این خروجی باید ۱۰۱/۱۰۱ اسلات نام‌دار و ۰ null برسد:
```bash
node src/cli.js test-contracts/work.txt --pretty
```

## استفاده سریع

```bash
node src/cli.js path/to/contract.txt --pretty          # یک قرارداد خالی
node src/batch.js                                      # کل dataset → پوشه output/
node test/sample.js                                    # تست واحد
node test/verify.js                                    # صحت‌سنجی
node src/mine-labels.js                                # لیبل‌های ناشناخته
```

## نکته‌ها

- **اسلات‌های نقطه‌ای نام‌دار نمی‌شوند اگر لیبل فارسی‌شان در `context.js` نباشد** →
  طبق الگوریتم `mine-labels.js` فهرست لیبل‌های بی‌نام را ببینید و کمبودها را اضافه کنید.
- خروجی‌های `output/` تولیدی‌اند و `dataset/` باید تغییر نکند (چک با `git status`).
- پوشه‌های ناسازگار دیتاست: `verify.js` گزارش می‌دهد ولی اجرا ادامه پیدا می‌کند (در پایان با exit code 1 خارج می‌شود).
- `output/` هنوز کامیت نمی‌شود؛ می‌توانی آن را به `.gitignore` اضافه کنی.
