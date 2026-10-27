import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/pricing.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { getPurchaseOffers, getUnitPricingForQuantity, getTierTotal } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const shemg = { price: 130, bundleOnly: true, pricingTiers: [
  { qty: 2, originalPrice: 130, finalPrice: 89, bundlePrice: 178 },
  { qty: 3, originalPrice: 130, finalPrice: 69.67, bundlePrice: 209 },
  { qty: 5, originalPrice: 130, finalPrice: 55.4, bundlePrice: 277 },
] };

test('fixed bundles show only the source quantities and exact totals', () => {
  const offers = getPurchaseOffers(shemg);
  assert.deepEqual(offers.map(tier => tier.qty), [2, 3, 5]);
  assert.deepEqual(offers.map(getTierTotal), [178, 209, 277]);
});

test('the three-piece line remains 209 rather than 209.01', () => {
  const price = getUnitPricingForQuantity(shemg, 3);
  assert.equal(price.lineTotal, 209);
  assert.equal(price.unitPrice, 209 / 3);
});

test('exact bundles do not grant an implicit unit discount to other quantities', () => {
  const product = { price: 100, pricingTiers: [
    { qty: 2, originalPrice: 150, finalPrice: 80 },
    { qty: 3, originalPrice: 150, finalPrice: 69.67, bundlePrice: 209 },
  ] };
  assert.equal(getUnitPricingForQuantity(product, 3).lineTotal, 209);
  assert.equal(getUnitPricingForQuantity(product, 4).lineTotal, 320);
  assert.deepEqual(getPurchaseOffers(product).map(tier => tier.qty), [1, 2, 3]);
});

test('variant overrides retain their existing per-piece pricing', () => {
  assert.equal(getUnitPricingForQuantity({ price: 100 }, 3, 75).lineTotal, 225);
});
