import { apiRequest } from './queryClient';
import { getAnalyticsIdentity } from './analytics';
export type CheckoutItem = { productId: number; variantId?: number | null; qty: number };
export type PricedItem = CheckoutItem & { title: string; unitPrice: number; lineTotal: number };
export type Quote = { quoteId: string; items: PricedItem[]; subtotal: number; shipping: number; discount: number; grandTotal: number; currency: string; shippingKnown: boolean; deliveryEstimate: string; expiresAt: string };
export type Receipt = { id: number; orderNumber: string; status: string; trackingToken: string; items: PricedItem[]; totals: { grandTotal: number; shipping: number; subtotal: number; discount: number; currency: string } };
let starting: Promise<void> | null = null;
export async function ensureChatSession() {
 if (localStorage.getItem('chat_session_id') && localStorage.getItem('chat_token')) return;
 if (!starting) starting = apiRequest('POST', '/api/chat/session', {}).then(r => r.json()).then(({data}) => {
 localStorage.setItem('chat_session_id', data.sessionId); localStorage.setItem('chat_token', data.token);
 }).finally(() => { starting = null; });
 await starting;
}
export function chatCredentials() { return { sessionId: localStorage.getItem('chat_session_id') || '', sessionToken: localStorage.getItem('chat_token') || '' }; }
export function attribution(productId?: number) {
 const params = new URLSearchParams(location.search);
 const source = params.get('utm_source') || (() => { try { return new URL(document.referrer).hostname; } catch { return 'direct'; } })();
 if (!sessionStorage.getItem('fahd_source')) sessionStorage.setItem('fahd_source',source);
 if (!sessionStorage.getItem('fahd_returning')) {sessionStorage.setItem('fahd_returning', localStorage.getItem('fahd_seen') ? 'true' : 'false');localStorage.setItem('fahd_seen','1');}
 return { productId, source: sessionStorage.getItem('fahd_source'), device: matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop', returning: sessionStorage.getItem('fahd_returning')==='true', experiment: offerExperiment() };
}
export function offerExperiment() {
 // Baseline until a single experiment is deliberately enabled for the deployment.
 if (import.meta.env.VITE_OFFER_EXPERIMENT !== 'offer-value-v1') return 'baseline';
 let arm=localStorage.getItem('fahd_offer_experiment');if(!arm){arm=Math.random()<.5?'control':'variant';localStorage.setItem('fahd_offer_experiment',arm)}
 return `offer-value-v1:${arm}`;
}
export async function engageChat(productId?:number) {
 await ensureChatSession();const {visitorId}=getAnalyticsIdentity();
 const r=await apiRequest('POST','/api/chat/engage',{...chatCredentials(),visitorId,metadata:attribution(productId)});
 return (await r.json()).data.conversationId as number;
}
export function trackCommerce(eventType:string, productId?:number, extra: Record<string,unknown>={}) {
 const {visitorId}=getAnalyticsIdentity();
 void ensureChatSession().then(()=>apiRequest('POST','/api/analytics/events',{...chatCredentials(),visitorId,eventType,path:location.pathname,metadata:{...attribution(productId),...extra}})).catch(()=>{});
}
export function normalizePhone(value:string) {let s=value.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[\s()-]/g,'').replace(/^\+/,'').replace(/^00/,'');if(s.startsWith('05'))s='966'+s.slice(1);return s;}
export const validPhone=(s:string)=>/^9665\d{8}$/.test(normalizePhone(s));
export const money=(v:number)=>`${v.toLocaleString('ar-SA')} ر.س`;
export function trackingURL(r:Receipt){sessionStorage.setItem(`order_token:${r.id}`,r.trackingToken);return `/order/${r.id}#${encodeURIComponent(r.trackingToken)}`}
