import type { Receipt } from './commerce';
import { apiRequest } from './queryClient';

type PixelEvent = 'Contact' | 'InitiateCheckout' | 'PlaceAnOrder' | 'Purchase' | 'ViewContent';
type PixelSettings = { pixelId: string; enabled: boolean };
type PixelQueue = Array<unknown> & {
  page: () => void;
  track: (event: PixelEvent, properties?: Record<string, unknown>, options?: { event_id: string }) => void;
  instance: (id: string) => PixelQueue;
  load: (id: string, options?: Record<string, unknown>) => void;
  _i: Record<string, PixelQueue>;
  _t: Record<string, number>;
  _o: Record<string, Record<string, unknown>>;
  _u?: string;
  methods: string[];
  setAndDefer: (queue: PixelQueue, method: string) => void;
};

const pixelIdPattern = /^[A-Za-z0-9]{10,40}$/;
const inFlight = new Set<string>();
const queued = new Set<string>();
const loadedPixels = new Set<string>();
let cachedSettings: PixelSettings | null = null;
let settingsExpiresAt = 0;
let settingsRequest: Promise<PixelSettings | null> | null = null;
let settingsVersion = 0;

export function invalidateTikTokPixelSettings() {
  settingsVersion += 1;
  cachedSettings = null;
  settingsExpiresAt = 0;
  settingsRequest = null;
}

async function getPixelSettings(): Promise<PixelSettings | null> {
  if (cachedSettings && Date.now() < settingsExpiresAt) return cachedSettings;
  if (!settingsRequest) {
    const version = settingsVersion;
    settingsRequest = apiRequest('GET', '/api/marketing/pixel')
      .then(async response => {
        if (!response.ok) throw new Error('Pixel settings unavailable');
        const { data } = await response.json();
        return { pixelId: String(data?.pixelId || ''), enabled: data?.enabled === true };
      })
      .then(settings => {
        if (version !== settingsVersion) return null;
        cachedSettings = settings;
        settingsExpiresAt = Date.now() + 30_000;
        return settings;
      })
      .catch(() => null)
      .finally(() => { if (version === settingsVersion) settingsRequest = null; });
  }
  return settingsRequest;
}

// Queue the official Pixel SDK methods only after public settings enable a valid ID.
function loadPixel(id: string): PixelQueue {
  const pixelWindow = window as Window & { ttq?: PixelQueue; TiktokAnalyticsObject?: string };
  pixelWindow.TiktokAnalyticsObject = 'ttq';
  const ttq = pixelWindow.ttq = pixelWindow.ttq || ([] as unknown as PixelQueue);
  if (!ttq.methods) {
    const methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    ttq.methods = methods;
    ttq.setAndDefer = (queue, method) => {
      (queue as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => queue.push([method, ...args]);
    };
    for (const method of methods) ttq.setAndDefer(ttq, method);
    ttq.instance = pixelId => {
      const queue = ttq._i[pixelId];
      for (const method of methods) {
        if (!(queue as unknown as Record<string, unknown>)[method]) ttq.setAndDefer(queue, method);
      }
      return queue;
    };
  }
  ttq._i = ttq._i || {};
  ttq._t = ttq._t || {};
  ttq._o = ttq._o || {};
  if (!ttq.load) ttq.load = (pixelId, options = {}) => {
      if (loadedPixels.has(pixelId)) return;
      const queue = ttq._i[pixelId] = ttq._i[pixelId] || ([] as unknown as PixelQueue);
      queue._u = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._t[pixelId] = Date.now();
      ttq._o[pixelId] = options;
      const script = document.createElement('script');
      script.async = true;
      script.src = `${queue._u}?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`;
      document.head.appendChild(script);
      loadedPixels.add(pixelId);
    };
  if (!loadedPixels.has(id)) {
    ttq.load(id);
    loadedPixels.add(id);
  }
  return ttq.instance(id);
}

async function withPixel(callback: (pixel: PixelQueue, id: string) => void): Promise<void> {
  try {
    const settings = await getPixelSettings();
    if (!settings?.enabled || !pixelIdPattern.test(settings.pixelId)) return;
    callback(loadPixel(settings.pixelId), settings.pixelId);
  } catch {
    // Marketing scripts must never block chat or checkout.
  }
}

export function trackTikTokPage(path: string): Promise<void> {
  if (path.startsWith('/admin')) return Promise.resolve();
  return withPixel(pixel => {
    if (window.location.pathname !== path) return;
    pixel.page();
    if (path === '/chat' || path.startsWith('/chat/product/')) {
      const productId = path.match(/^\/chat\/product\/(\d+)$/)?.[1];
      pixel.track('ViewContent', productId ? { content_type: 'product', content_id: productId, content_ids: [productId] } : {});
    }
  });
}

export function trackTikTokChatMessage(sessionId: string | null): Promise<void> {
  if (!sessionId) return Promise.resolve();
  return trackTikTokEvent('Contact', {}, `contact:${sessionId}`);
}

export function trackTikTokEvent(event: PixelEvent, properties: Record<string, unknown> = {}, onceKey?: string): Promise<void> {
  return withPixel((pixel, id) => {
    const key = onceKey ? `tiktok:${id}:${onceKey}` : '';
    if (key && queued.has(key)) return;
    if (key) {
      try { if (sessionStorage.getItem(key)) return; } catch { /* Continue without persistent deduplication. */ }
    }
    pixel.track(event, properties);
    if (key) {
      queued.add(key);
      try { sessionStorage.setItem(key, 'queued'); } catch { /* In-memory deduplication remains active. */ }
    }
  });
}

// Called only after the order API returns a saved order with a receipt.
export async function trackTikTokPurchase(receipt: Receipt): Promise<void> {
  if (!receipt.id || !receipt.orderNumber || !Number.isFinite(receipt.totals.grandTotal)) return;
  const eventId = `purchase_${receipt.orderNumber}`;
  if (inFlight.has(eventId)) return;
  inFlight.add(eventId);
  try {
    await withPixel((pixel, id) => {
      const key = `tiktok:${id}:${eventId}`;
      if (queued.has(key)) return;
      try { if (localStorage.getItem(key)) return; } catch { /* Continue without persistent deduplication. */ }
      pixel.track('Purchase', {
        value: receipt.totals.grandTotal,
        currency: receipt.totals.currency || 'SAR',
        content_type: 'product',
        contents: receipt.items.map(item => ({ content_id: String(item.productId), quantity: item.qty, price: item.unitPrice })),
      }, { event_id: eventId });
      queued.add(key);
      try { localStorage.setItem(key, 'queued'); } catch { /* In-memory deduplication remains active. */ }
    });
  } finally {
    inFlight.delete(eventId);
  }
}
