import assert from 'node:assert';
import { extractVariablesFromText } from '../src/extractor.js';

// Sample "خالی" contract
const sample = `بسمه تعالی
قرارداد استخدام کارمند
در تاریخ [contract_date] بین شرکت [company_name] و آقای/خانم [worker_name] منعقد گردید.
نشانی: [company_address] تلفن [company_phone]
مدت قرارداد از تاریخ [start_date] لغایت [end_date] به مدت [duration] ماه.
`;

const out = extractVariablesFromText(sample);
assert.strictEqual(out.count, 8, 'should find 8 variables');
assert.deepStrictEqual(
  out.variables.map((v) => v.name),
  [
    'contract_date', 'company_name', 'worker_name',
    'company_address', 'company_phone', 'start_date', 'end_date', 'duration',
  ],
);

// dotted blank test
const dotted = 'در تاریخ .......... بین شرکت ..........';
const out2 = extractVariablesFromText(dotted);
assert.ok(out2.variables.some((v) => v.name === 'contract_date'));
assert.ok(out2.variables.some((v) => v.name === 'company_name'));

console.log('✅ sample tests pass');
