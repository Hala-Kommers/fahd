import type { Receipt } from './commerce';

type PixelQueue = any;
const inFlight = new Set<string>();
const sent = new Set<string>();
let loadedId = '';
function loadPixel(id: string): PixelQueue {
 const w = window as any;
 w.TiktokAnalyticsObject = 'ttq';
 const ttq = w.ttq = w.ttq || [];
 if (loadedId === id) return ttq.instance(id);
 const methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
 const defer = (queue: PixelQueue, method: string) => { queue[method] = (...args: unknown[]) => queue.push([method, ...args]); };
 ttq.methods = methods;
 ttq.setAndDefer = defer;
 for (const method of methods) if (!ttq[method]) defer(ttq, method);
 if (!ttq.instance) ttq.instance = (pixelId: string) => { const queue = ttq._i[pixelId]; for (const method of methods) if (!queue[method]) defer(queue, method); return queue; };
 ttq._i = ttq._i || {};
 const queue = ttq._i[id] = ttq._i[id] || [];
 queue._u = 'https://analytics.tiktok.com/i18n/pixel/events.js';
 ttq._t = ttq._t || {}; ttq._t[id] = +new Date();
 ttq._o = ttq._o || {}; ttq._o[id] = {};
 const script = document.createElement('script');
 script.async = true;
 script.src = `${queue._u}?sdkid=${encodeURIComponent(id)}&lib=ttq`;
 document.head.appendChild(script);
 loadedId = id;
 return ttq.instance(id);
}

// Called only after a successful create-order response, never from tracking/admin pages.
export async function trackTikTokPurchase(receipt: Receipt): Promise<void> {
 if (!receipt.id || !receipt.orderNumber || !Number.isFinite(receipt.totals.grandTotal)) return;
 const eventId = `purchase_${receipt.orderNumber}`;
 if (inFlight.has(eventId)) return;
 inFlight.add(eventId);
 try {
  const response = await fetch('/api/marketing/pixel');
  if (!response.ok) return;
  const { data } = await response.json();
  if (!data?.enabled || !/^[A-Za-z0-9]{10,40}$/.test(data.pixelId)) return;
  const key = `tiktok:${data.pixelId}:${eventId}`;
  if (sent.has(key)) return;
  try { if (localStorage.getItem(key)) return; } catch { /* Storage may be disabled. */ }
  loadPixel(data.pixelId).track('Purchase', {
   value: receipt.totals.grandTotal,
   currency: receipt.totals.currency || 'SAR',
   content_type: 'product',
   contents: receipt.items.map(item => ({ content_id: String(item.productId), quantity: item.qty, price: item.unitPrice })),
  }, { event_id: eventId });
  sent.add(key);
  try { localStorage.setItem(key, 'queued'); } catch { /* In-memory deduplication remains active. */ }
 } catch { /* Advertising errors must never interrupt a successful order. */ }
 finally { inFlight.delete(eventId); }
}
