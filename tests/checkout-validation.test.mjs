import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/checkout-validation.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { normalizeNationalAddress, validateCheckoutDetails } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const valid = {
  customerName: 'محمد',
  customerPhone: '0501234567',
  cityId: '1',
  addressRaw: 'حي النزهة، شارع الملك، مبنى ١٢',
  nationalAddress: 'ABCD1234',
};

test('valid Saudi phone formats include Arabic and Persian digits', () => {
  for (const customerPhone of ['٠٥٠١٢٣٤٥٦٧', '۰۵۰۱۲۳۴۵۶۷', '+966 (50) 123-4567', '00966501234567']) {
    assert.deepEqual(validateCheckoutDetails({ ...valid, customerPhone }), {}, customerPhone);
  }
});

test('national address normalization supports pasted lowercase and regional digits', () => {
  assert.equal(normalizeNationalAddress(' ab cd ١٢٣٤ '), 'ABCD1234');
  assert.equal(normalizeNationalAddress('abcd۱۲۳۴'), 'ABCD1234');
  assert.deepEqual(validateCheckoutDetails({ ...valid, nationalAddress: ' ab cd ١٢٣٤ ' }), {});
});

test('all required fields return actionable Arabic errors for empty or whitespace values', () => {
  const errors = validateCheckoutDetails(Object.fromEntries(Object.keys(valid).map(key => [key, '   '])));
  assert.deepEqual(Object.keys(errors).sort(), Object.keys(valid).sort());
  for (const message of Object.values(errors)) assert.match(message, /[\u0600-\u06ff]/);
});

test('malformed phones, national addresses and city selections cannot pass validation', () => {
  for (const customerPhone of ['050123456', '05012345678', '+971501234567', 'word0501234567']) {
    assert.ok(validateCheckoutDetails({ ...valid, customerPhone }).customerPhone, customerPhone);
  }
  for (const nationalAddress of ['ABC12345', 'ABCDE123', 'أبجد1234', 'ABCD123', 'ABCD12345', 'ABCD12!4']) {
    assert.ok(validateCheckoutDetails({ ...valid, nationalAddress }).nationalAddress, nationalAddress);
  }
  for (const cityId of ['0', '-1', '1.5', '1e2', 'city', '9007199254740992']) {
    assert.ok(validateCheckoutDetails({ ...valid, cityId }).cityId, cityId);
  }
});

test('names and delivery addresses only require nonempty trimmed text', () => {
  assert.deepEqual(validateCheckoutDetails({ ...valid, customerName: ' م ', addressRaw: ' أ ', cityId: ' 1 ' }), {});
});
