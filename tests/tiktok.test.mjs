import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const pixelId = 'TESTPIXELID1234567890';
const storage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
};
const scripts = [];
globalThis.window = { location: { pathname: '/chat/product/5' } };
globalThis.document = {
  createElement: () => ({}),
  head: { appendChild: script => scripts.push(script) },
};
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.__pixelSettings = { pixelId, enabled: true };
globalThis.__pixelApiCalls = [];

const bundle = await build({
  entryPoints: ['src/lib/tiktok.ts'],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'esm',
  plugins: [{
    name: 'mock-pixel-settings-api',
    setup(plugin) {
      plugin.onResolve({ filter: /^\.\/queryClient$/ }, () => ({ path: 'queryClient', namespace: 'test' }));
      plugin.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
        contents: `export async function apiRequest(method, path) { globalThis.__pixelApiCalls.push([method, path]); return { ok: true, json: async () => ({ data: globalThis.__pixelSettings }) }; }`,
        loader: 'js',
      }));
    },
  }],
});
const pixel = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const events = () => window.ttq._i[pixelId].filter(entry => entry[0] === 'track');

test('loads the configured pixel and fires PageView on the real chat route', async () => {
  await pixel.trackTikTokPage('/chat/product/5');
  assert.equal(scripts.length, 1);
  assert.deepEqual(globalThis.__pixelApiCalls[0], ['GET', '/api/marketing/pixel']);
  assert.match(scripts[0].src, /analytics\.tiktok\.com\/i18n\/pixel\/events\.js\?sdkid=TESTPIXELID1234567890/);
  assert.deepEqual(window.ttq._i[pixelId][0], ['page']);
  assert.equal(events()[0][1], 'ViewContent');
  assert.deepEqual(events()[0][2].content_ids, ['5']);
});

test('tracks contact once, checkout start, and valid form submission without customer data', async () => {
  await pixel.trackTikTokChatMessage('chat-123');
  await pixel.trackTikTokChatMessage('chat-123');
  await pixel.trackTikTokEvent('InitiateCheckout');
  await pixel.trackTikTokEvent('PlaceAnOrder', { value: 178, currency: 'SAR', content_type: 'product', contents: [{ content_id: '5', quantity: 2, price: 89 }] }, 'place:order-key');
  await pixel.trackTikTokEvent('PlaceAnOrder', { value: 178 }, 'place:order-key');
  assert.deepEqual(events().map(entry => entry[1]), ['ViewContent', 'Contact', 'InitiateCheckout', 'PlaceAnOrder']);
  assert.equal(events()[3][2].value, 178);
  assert.doesNotMatch(JSON.stringify(events()), /customerName|customerPhone|addressRaw/);
});

test('fires Purchase only once for a saved receipt and stops when disabled', async () => {
  const receipt = {
    id: 42,
    orderNumber: 'FHD-42',
    totals: { grandTotal: 178, currency: 'SAR' },
    items: [{ productId: 5, qty: 2, unitPrice: 89 }],
  };
  await Promise.all([pixel.trackTikTokPurchase(receipt), pixel.trackTikTokPurchase(receipt)]);
  await pixel.trackTikTokPurchase(receipt);
  assert.equal(events().filter(entry => entry[1] === 'Purchase').length, 1);
  assert.equal(events().find(entry => entry[1] === 'Purchase')[3].event_id, 'purchase_FHD-42');
  globalThis.__pixelSettings = { pixelId, enabled: false };
  pixel.invalidateTikTokPixelSettings();
  await pixel.trackTikTokEvent('Contact');
  assert.equal(events().length, 5);
});
