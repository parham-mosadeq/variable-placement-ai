# Contract Variable Extractor

یک الگوریتم JS که از روی متن «قرارداد خالی»، متغیرهای آن را پیدا کرده و JSON برمی‌گرداند.

## ساختار

```
src/
  extractor.js   → هسته الگوریتم؛ جست‌وجوی [var], {{var}} و جای‌خالی‌های نقطه‌ای
  context.js     → حدس نام اسلات از روی کلمات اطراف (مثل «شرکت»، «در تاریخ»)
  cli.js         → اجرای دستور خط فرمان
  batch.js       → اجرای دسته‌ای روی dataset؛ خروجی در output/<نام قرارداد>.json
test/
  verify.js      → مقایسه خروجی با variable.json در ۴۴ پوشه dataset/job
```

## استفاده

```bash
node src/cli.js path/to/contract.txt --pretty
node src/cli.js path/to/contract.txt --pretty -o result.json   # ذخیره در فایل
node src/batch.js          # کل dataset → پوشه output/ (بدون دست‌زدن dataset)
node test/verify.js        # تایید روی کل dataset
```

## خروجی دسته‌ای

```bash
node src/batch.js
```
هر قرارداد یک فایل: `output/<نام قرارداد>.json` — اولویت با `base-data.txt` (فرم خالی) و در نبودش `data.txt`. پوشه `dataset/` هرگز تغییر نمی‌کند.

## خروجی

```json
{
  "variables": [
    { "name": "contract_date", "kind": "bracket", "start": 93, "end": 108, "raw": "[contract_date]" }
  ],
  "count": 21
}
```

- `kind: "bracket"`  → `[name]` (فرمت data.txt)
- `kind: "brace"`    → `{{name}}` (فرمت dataset/clauses)
- `kind: "dotted_placeholder"` → `.......` (فرمت base-data.txt)؛ نام اسلات از کلمات دقیقاً قبلش حدس زده می‌شود (فرهنگ ~۵۰ کلمه کلیدی: «فرزند»، «کد ملی»، «آدرس و تلفن»، «تاریخ شروع»، «حق مسکن» و...)
- `--out f.json` یا `-o f.json` → ذخیره خروجی در فایل به‌جای چاپ در ترمینال
