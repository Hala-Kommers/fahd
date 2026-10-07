import { trackTikTokPurchase } from '@/lib/tiktok';
import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { getAnalyticsIdentity } from '@/lib/analytics';
import { chatCredentials, engageChat, money, normalizePhone, trackCommerce, trackingURL, validPhone, type CheckoutItem, type Quote, type Receipt } from '@/lib/commerce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'wouter';

type Details={customerName:string;customerPhone:string;cityId:string;addressRaw:string;nationalAddress:string};
const empty:Details={customerName:'',customerPhone:'',cityId:'',addressRaw:'',nationalAddress:''};
function readDraft(){try{return {...empty,...JSON.parse(sessionStorage.getItem('checkout_details')||'{}')}}catch{return empty}}
export default function CheckoutForm({items,source='chat',onSuccess,onPendingChange,initialReceipt=null}:{items:CheckoutItem[];source?:'chat'|'cart';onSuccess?:(r:Receipt)=>void;onPendingChange?:(pending:boolean)=>void;initialReceipt?:Receipt|null}){
 const phoneErrorId=useId();
 const [,navigate]=useLocation();const reduced=useReducedMotion();const qc=useQueryClient();
 const [form,setForm]=useState<Details>(readDraft);const [receipt,setReceipt]=useState<Receipt|null>(initialReceipt);const [notice,setNotice]=useState('');const [phoneTouched,setPhoneTouched]=useState(false);const [ready,setReady]=useState(source==='cart');
 const productId=items[0]?.productId;const oldPrice=useRef<number|null>(null);
 const basketKey=JSON.stringify(items);const idemStorage=`checkout_key:${source}:${basketKey}`;
 const [idempotencyKey]=useState(()=>{const old=sessionStorage.getItem(idemStorage);if(old)return old;const key=crypto.randomUUID();sessionStorage.setItem(idemStorage,key);return key});
 useEffect(()=>{sessionStorage.setItem('checkout_details',JSON.stringify(form))},[form]);
 useEffect(()=>{if(source==='chat'&&!initialReceipt){void engageChat(productId).then(()=>{setReady(true);trackCommerce('checkout_started',productId)}).catch(()=>setNotice('تعذر تجهيز المحادثة. حاول فتح الطلب مرة أخرى.'))}},[source,productId,initialReceipt]);
 const credentials=chatCredentials();
 const {data:cities=[]}=useQuery<{id:number;name:string;isActive?:boolean;shippingFee?:number;deliveryEstimate?:string}[]>({queryKey:['/api/cities']});
 const payload={items,cityId:Number(form.cityId),...credentials};
 const quoteKey=['checkout-quote',source,basketKey,form.cityId,credentials.sessionId];
 const {data:quote,isFetching,error:quoteError,refetch}=useQuery<Quote>({queryKey:quoteKey,enabled:ready&&items.length>0&&!receipt,staleTime:0,refetchInterval:30000,queryFn:async()=>{const r=await apiRequest('POST','/api/orders/quote',payload);return (await r.json()).data}});
 useEffect(()=>{if(!quote)return;if(oldPrice.current!==null&&oldPrice.current!==quote.grandTotal)setNotice('تم تحديث الإجمالي. راجع السعر والشحن قبل إرسال الطلب.');oldPrice.current=quote.grandTotal},[quote]);
 const order=useMutation({mutationFn:async()=>{
 if(!quote||!validPhone(form.customerPhone))throw new Error('راجع بيانات الطلب');
 const r=await apiRequest('POST','/api/orders',{...payload,...form,cityId:Number(form.cityId),customerPhone:normalizePhone(form.customerPhone),addressRaw:`${form.addressRaw.trim()}\nالعنوان الوطني المختصر: ${form.nationalAddress}`,paymentMethod:'cod',visitorId:getAnalyticsIdentity().visitorId,quoteId:quote.quoteId,idempotencyKey});return (await r.json()).data as Receipt;
 },onSuccess:r=>{setReceipt(r);void trackTikTokPurchase(r);trackingURL(r);sessionStorage.removeItem(idemStorage);sessionStorage.removeItem('checkout_details');void qc.invalidateQueries({queryKey:['/api/products']});onSuccess?.(r)},onError:e=>{if(source==='chat')trackCommerce('checkout_error',productId,{reason:e.message.includes('PRICE_CHANGED')?'price_changed':'validation_or_server'});if(e.message.includes('PRICE_CHANGED')){setNotice('انتهى العرض أو تغير السعر. راجع الإجمالي الجديد، ثم اضغط إرسال الطلب للموافقة عليه.');void refetch()}}});
 useEffect(()=>{onPendingChange?.(order.isPending)},[order.isPending,onPendingChange]);
 const fields=(key:keyof Details,value:string)=>setForm(f=>({...f,[key]:value}));
 if(receipt)return <motion.div initial={reduced?false:{opacity:0,scale:.94}} animate={{opacity:1,scale:1}} className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center space-y-4" role="status"><CheckCircle2 className="h-16 w-16 mx-auto text-emerald-600"/><h3 className="text-xl font-bold">استلمنا طلبك بنجاح</h3><p>طلبك قيد المراجعة، والدفع عند الاستلام.</p><p className="font-bold">{receipt.orderNumber}</p>{receipt.items.map((it,i)=><p key={i}>{it.title} · {it.qty} قطعة</p>)}<p className="text-2xl font-bold">{money(receipt.totals.grandTotal)}</p><Button className="w-full rounded-full" onClick={()=>navigate(trackingURL(receipt))}>تتبع الطلب وتفاصيله</Button><ComplementProducts productId={productId}/></motion.div>;
 return <form className="space-y-2" onSubmit={e=>{e.preventDefault();setPhoneTouched(true);if(validPhone(form.customerPhone)&&quote&&!isFetching)order.mutate()}} dir="rtl"><fieldset className="space-y-3" disabled={order.isPending}><div className="grid grid-cols-2 gap-3">
 <label className="grid gap-1 text-sm">الاسم الكامل<Input required autoComplete="name" maxLength={120} value={form.customerName} onChange={e=>fields('customerName',e.target.value)}/></label>
 <label className="grid gap-1 text-sm">رقم الجوال<Input required type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="05xxxxxxxx" value={form.customerPhone} onBlur={()=>setPhoneTouched(true)} aria-invalid={phoneTouched&&!validPhone(form.customerPhone)} aria-describedby={phoneErrorId} onChange={e=>fields('customerPhone',e.target.value)}/>{phoneTouched&&!validPhone(form.customerPhone)&&<span id={phoneErrorId} role="alert" className="text-destructive">اكتب رقم جوال سعودي: 05 ثم ٨ أرقام، أو +9665 ثم ٨ أرقام.</span>}</label>
 <label className="grid gap-1 text-sm">المدينة<select className="border rounded-md px-2 h-10 w-full min-w-0 bg-background" required value={form.cityId} onChange={e=>fields('cityId',e.target.value)}><option value="">اختر المدينة</option>{cities.filter(c=>c.isActive!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label className="grid gap-1 text-sm">العنوان الوطني<Input required dir="ltr" placeholder="ABCD1234" pattern="[A-Za-z]{4}[0-9]{4}" maxLength={8} title="٤ أحرف إنجليزية ثم ٤ أرقام، من تطبيق سبل" value={form.nationalAddress} onChange={e=>fields('nationalAddress',e.target.value.toUpperCase().replace(/\s/g,''))}/></label>
 <label className="col-span-2 grid gap-1 text-sm">الحي والشارع ورقم المبنى<Input required autoComplete="street-address" value={form.addressRaw} onChange={e=>fields('addressRaw',e.target.value)}/></label></div>
 {notice&&<p role="status" className="rounded-xl bg-amber-50 text-amber-900 p-3 text-sm">{notice}</p>}
 {quote&&<div className="rounded-xl bg-muted/40 p-3 space-y-1" aria-live="polite">{quote.items.map((it,i)=><div className="flex justify-between gap-2 text-xs" key={i}><span>{it.qty} × {it.title}</span><span className="shrink-0">{money(it.lineTotal)}</span></div>)}<div className="flex justify-between items-center gap-2"><span className="text-xs">الشحن: {quote.shippingKnown?(quote.shipping===0?'مجاني':money(quote.shipping)):'حسب المدينة'}</span><strong className="text-lg">{money(quote.grandTotal)}</strong></div><p className="text-[11px] text-muted-foreground">التوصيل: {quote.deliveryEstimate||'يُؤكد الموعد مع المتجر'} · الدفع عند الاستلام</p></div>}
 <CheckoutPolicies items={items}/>
 {(quoteError||order.error)&&<p role="alert" className="text-sm text-destructive">{(quoteError||order.error)?.message.replace('PRICE_CHANGED:','')}</p>}
 <Button type="submit" disabled={!quote||!ready||isFetching||order.isPending||!form.cityId} className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-12">{isFetching||order.isPending?<><Loader2 className="h-4 w-4 animate-spin ml-2"/>جار المراجعة…</>:'إرسال الطلب — الدفع عند الاستلام'}</Button>
 </fieldset></form>
}
function CheckoutPolicies({items}:{items:CheckoutItem[]}){
 const {data=[]}=useQuery<{title:string;faq?:{question:string;answer:string}[]}[]>({queryKey:['checkout-policies',items.map(i=>i.productId).join(',')],queryFn:()=>Promise.all([...new Set(items.map(i=>i.productId))].map(async id=>{const r=await apiRequest('GET',`/api/products/${id}`);return (await r.json()).data}))});
 return <details className="rounded-xl border p-3 text-sm"><summary className="cursor-pointer font-semibold">سياسة الاسترجاع والضمان قبل الطلب</summary>{data.map(p=>{const policies=p.faq?.filter(f=>/استرجاع|استبدال|ضمان|return|warranty/i.test(f.question))||[];return <div className="mt-2" key={p.title}><b>{p.title}</b>{policies.length?policies.map(f=><p key={f.question}>{f.answer}</p>):<><p>الاسترجاع والاستبدال خلال ١٤ يومًا من الاستلام، بشرط بقاء المنتج بحالته الأصلية وغير مستخدم ومع التغليف.</p><p>ضمان المنتج يشمل عيوب التصنيع حسب حالة المنتج. تواصل معنا برقم الطلب وصورة العيب للمراجعة.</p></>}</div>})}</details>
}
function ComplementProducts({productId}:{productId?:number}){
 const {data:products=[]}=useQuery<any[]>({queryKey:['complements',productId],enabled:!!productId,queryFn:async()=>{const r=await apiRequest('GET',`/api/products/${productId}`);const p=(await r.json()).data;return Promise.all((p.relatedProductIds||[]).slice(0,3).map(async(id:number)=>{const r=await apiRequest('GET',`/api/products/${id}`);return (await r.json()).data}))}});
 return products.length>0?<div className="border-t pt-4"><p className="font-semibold">قد يناسبك أيضًا</p>{products.filter(p=>p.status==='active'&&p.stockTotal>0).map(p=><a className="block underline mt-2" key={p.id} href={`/product/${p.id}`} onClick={()=>trackCommerce('complement_clicked',productId,{relatedProductId:p.id})}>{p.title} · {money(p.price)}</a>)}</div>:null
}
