import { trackTikTokPurchase } from '@/lib/tiktok';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { getAnalyticsIdentity } from '@/lib/analytics';
import { chatCredentials, engageChat, money, normalizePhone, trackCommerce, trackingURL, validPhone, type CheckoutItem, type Quote, type Receipt } from '@/lib/commerce';
import { normalizeNationalAddress, validateCheckoutDetails, type CheckoutDetails } from '@/lib/checkout-validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ChevronDown, CircleHelp, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'wouter';

type Field = keyof CheckoutDetails;
const empty:CheckoutDetails={customerName:'',customerPhone:'',cityId:'',addressRaw:'',nationalAddress:''};
const fieldOrder:Field[]=['customerName','customerPhone','cityId','nationalAddress','addressRaw'];
function readDraft():CheckoutDetails {
 try {
  const saved=JSON.parse(sessionStorage.getItem('checkout_details')||'{}');
  return Object.fromEntries(fieldOrder.map(key=>[key,typeof saved?.[key]==='string'?saved[key]:empty[key]])) as CheckoutDetails;
 } catch { return {...empty}; }
}
function checkoutError(message:string) {
 if(message.includes('PRICE_CHANGED')) return 'تغيّر السعر أو انتهى العرض. راجع الإجمالي الجديد قبل إرسال الطلب مرة أخرى.';
 // Product and city validation already arrive in Arabic. Hide internal/network errors.
 if(/^[\u0600-\u06ff]/.test(message)) return message;
 return 'تعذر الاتصال بالمتجر. بياناتك محفوظة؛ حاول مرة ثانية.';
}
export default function CheckoutForm({items,source='chat',onSuccess,onPendingChange,initialReceipt=null}:{items:CheckoutItem[];source?:'chat'|'cart';onSuccess?:(r:Receipt)=>void;onPendingChange?:(pending:boolean)=>void;initialReceipt?:Receipt|null}){
 const formId=useId();
 const [,navigate]=useLocation();const reduced=useReducedMotion();const qc=useQueryClient();
 const [form,setForm]=useState<CheckoutDetails>(readDraft);const [receipt,setReceipt]=useState<Receipt|null>(initialReceipt);const [notice,setNotice]=useState('');
 const [touched,setTouched]=useState<Partial<Record<Field,boolean>>>({});
 const [ready,setReady]=useState(source==='cart');const [setupError,setSetupError]=useState(false);const [setupAttempt,setSetupAttempt]=useState(0);
 const formRef=useRef<HTMLFormElement>(null);const [visible,setVisible]=useState(false);
 const fieldRefs=useRef<Partial<Record<Field,HTMLInputElement|HTMLSelectElement|null>>>({});
 const sending=useRef(false);
 const productId=items[0]?.productId;const oldPrice=useRef<number|null>(null);const oldSubtotal=useRef<number|null>(null);
 const basketKey=JSON.stringify(items);const idemStorage=`checkout_key:${source}:${basketKey}`;
 const [idempotencyKey]=useState(()=>{const old=sessionStorage.getItem(idemStorage);if(old)return old;const key=crypto.randomUUID();sessionStorage.setItem(idemStorage,key);return key});
 useEffect(()=>{sessionStorage.setItem('checkout_details',JSON.stringify(form))},[form]);
 useEffect(()=>{
  if(!formRef.current||receipt)return;
  if(typeof IntersectionObserver==='undefined'){setVisible(true);return}
  // Old chat messages keep their state without polling quotes outside the viewport.
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'100px'});
  observer.observe(formRef.current);return ()=>observer.disconnect();
 },[receipt]);
 useEffect(()=>{
  if(source!=='chat'||initialReceipt)return;
  let cancelled=false;setSetupError(false);
  void engageChat(productId).then(()=>{if(!cancelled){setReady(true);trackCommerce('checkout_started',productId)}}).catch(()=>{if(!cancelled)setSetupError(true)});
  return ()=>{cancelled=true};
 },[source,productId,initialReceipt,setupAttempt]);
 const credentials=chatCredentials();
 const {data:cities=[],isLoading:citiesLoading,error:citiesError,refetch:retryCities}=useQuery<{id:number;name:string;isActive?:boolean;shippingFee?:number;deliveryEstimate?:string}[]>({queryKey:['/api/cities']});
 const payload={items,cityId:Number(form.cityId),...credentials};
 const quoteKey=['checkout-quote',source,basketKey,form.cityId,credentials.sessionId];
 const {data:quote,isFetching,error:quoteError,refetch}=useQuery<Quote>({queryKey:quoteKey,enabled:visible&&ready&&items.length>0&&!receipt,staleTime:0,refetchInterval:visible?30000:false,queryFn:async()=>{const r=await apiRequest('POST','/api/orders/quote',payload);return (await r.json()).data}});
 useEffect(()=>{if(!quote)return;if(oldPrice.current!==null&&oldPrice.current!==quote.grandTotal)setNotice('تم تحديث الإجمالي. راجع السعر والشحن قبل إرسال الطلب.');if(oldSubtotal.current!==null&&oldSubtotal.current!==quote.subtotal)void qc.invalidateQueries({queryKey:['/api/products']});oldPrice.current=quote.grandTotal;oldSubtotal.current=quote.subtotal},[quote,qc]);
 const order=useMutation({mutationFn:async()=>{
 if(!quote||!validPhone(form.customerPhone))throw new Error('راجع بيانات الطلب');
 const r=await apiRequest('POST','/api/orders',{...payload,...form,customerName:form.customerName.trim(),nationalAddress:normalizeNationalAddress(form.nationalAddress),cityId:Number(form.cityId),customerPhone:normalizePhone(form.customerPhone),addressRaw:`${form.addressRaw.trim()}\nالعنوان الوطني المختصر: ${normalizeNationalAddress(form.nationalAddress)}`,paymentMethod:'cod',visitorId:getAnalyticsIdentity().visitorId,quoteId:quote.quoteId,idempotencyKey});return (await r.json()).data as Receipt;
 },onSuccess:r=>{setReceipt(r);void trackTikTokPurchase(r);trackingURL(r);sessionStorage.removeItem(idemStorage);sessionStorage.removeItem('checkout_details');void qc.invalidateQueries({queryKey:['/api/products']});onSuccess?.(r)},onError:e=>{if(source==='chat')trackCommerce('checkout_error',productId,{reason:e.message.includes('PRICE_CHANGED')?'price_changed':'validation_or_server'});if(e.message.includes('PRICE_CHANGED')){setNotice('انتهى العرض أو تغير السعر. راجع الإجمالي الجديد، ثم اضغط إرسال الطلب للموافقة عليه.');void qc.invalidateQueries({queryKey:['/api/products']});void refetch()}},onSettled:()=>{sending.current=false}});
 useEffect(()=>{onPendingChange?.(order.isPending)},[order.isPending,onPendingChange]);
 const errors=validateCheckoutDetails(form);
 if(form.cityId&&!citiesLoading&&!citiesError&&!cities.some(c=>String(c.id)===form.cityId&&c.isActive!==false))errors.cityId='اختر مدينة من القائمة المتاحة للتوصيل.';
 const fields=(key:Field,value:string)=>{setForm(f=>({...f,[key]:value}));if(order.error)order.reset()};
 const touch=(key:Field)=>setTouched(current=>({...current,[key]:true}));
 const fieldProps=(key:Field)=>({
  id:`${formId}-${key}`,name:key,required:true,
  ref:(element:HTMLInputElement|HTMLSelectElement|null)=>{fieldRefs.current[key]=element},
  onBlur:()=>touch(key),
  'aria-invalid':!!(touched[key]&&errors[key]),
  'aria-describedby':touched[key]&&errors[key]?`${formId}-${key}-error`:undefined,
 });
 const fieldError=(key:Field)=>touched[key]&&errors[key]?<span id={`${formId}-${key}-error`} role="alert" className="text-xs leading-relaxed text-destructive">{errors[key]}</span>:null;
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(sending.current||order.isPending)return;
  const firstInvalid=fieldOrder.find(key=>errors[key]);
  if(firstInvalid){
   setTouched(Object.fromEntries(fieldOrder.map(key=>[key,true])));
   fieldRefs.current[firstInvalid]?.focus({preventScroll:true});
   fieldRefs.current[firstInvalid]?.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});
   if(source==='chat')trackCommerce('checkout_error',productId,{reason:'field_validation',fields:fieldOrder.filter(key=>errors[key])});
   return;
  }
  if(quote&&ready&&!isFetching&&!quoteError&&!citiesError){sending.current=true;order.mutate()}
 }
 if(receipt)return <motion.div initial={reduced||initialReceipt?false:{opacity:0,scale:.96,y:8}} animate={{opacity:1,scale:1,y:0}} transition={{type:'spring',stiffness:320,damping:25}} className="overflow-hidden rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center space-y-4" role="status"><div className="checkout-success-mark" data-celebrate={!initialReceipt} aria-hidden="true"><span className="checkout-success-ring"/><div className="checkout-success-seal"><svg viewBox="0 0 40 40" fill="none"><path d="m10 21 7 7 14-16" pathLength="1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>{[0,1,2,3,4,5].map(i=><span key={i} className="checkout-spark" style={{rotate:`${i*60}deg`}}><i/></span>)}</div><h3 className="text-xl font-bold">استلمنا طلبك بنجاح</h3><p>طلبك قيد المراجعة، والدفع عند الاستلام.</p><p className="font-bold">{receipt.orderNumber}</p>{receipt.items.map((it,i)=><p key={i}>{it.title} · {it.qty} قطعة</p>)}<p className="text-2xl font-bold">{money(receipt.totals.grandTotal)}</p><Button className="chat-press w-full rounded-full" onClick={()=>navigate(trackingURL(receipt))}>تتبع الطلب وتفاصيله</Button><ComplementProducts productId={productId}/></motion.div>;
 return <form ref={formRef} className="checkout-form" noValidate onSubmit={submit} dir="rtl" aria-label="بيانات الطلب">
  <fieldset disabled={order.isPending} className="space-y-2">
   <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
    <div className="grid content-start gap-1">
     <label htmlFor={`${formId}-customerName`} className="checkout-label">الاسم الكامل</label>
     <Input {...fieldProps('customerName')} className="checkout-input" autoComplete="name" maxLength={120} placeholder="اسم المستلم" value={form.customerName} onChange={e=>fields('customerName',e.target.value)}/>
     {fieldError('customerName')}
    </div>
    <div className="grid content-start gap-1">
     <label htmlFor={`${formId}-customerPhone`} className="checkout-label">رقم الجوال</label>
     <Input {...fieldProps('customerPhone')} className="checkout-input text-left" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="05xxxxxxxx" value={form.customerPhone} onChange={e=>fields('customerPhone',e.target.value)}/>
     {fieldError('customerPhone')}
    </div>
    <div className="grid content-start gap-1">
     <label htmlFor={`${formId}-cityId`} className="checkout-label">مدينة التوصيل</label>
     <select {...fieldProps('cityId')} className="checkout-input w-full border border-input bg-background px-2" disabled={order.isPending||citiesLoading||!!citiesError} autoComplete="address-level2" value={form.cityId} onChange={e=>{fields('cityId',e.target.value);touch('cityId')}}>
      <option value="">{citiesLoading?'جار تحميل المدن…':'اختر المدينة'}</option>
      {cities.filter(c=>c.isActive!==false).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
     </select>
     {fieldError('cityId')}
    </div>
    <div className="grid content-start gap-1">
     <label htmlFor={`${formId}-nationalAddress`} className="checkout-label">العنوان الوطني المختصر</label>
     <Input {...fieldProps('nationalAddress')} className="checkout-input text-left" dir="ltr" autoCapitalize="characters" spellCheck={false} placeholder="ABCD1234" value={form.nationalAddress} onChange={e=>fields('nationalAddress',normalizeNationalAddress(e.target.value))}/>
     {fieldError('nationalAddress')}
    </div>
    <div className="col-span-2 grid gap-1">
     <label htmlFor={`${formId}-addressRaw`} className="checkout-label">الحي والشارع ورقم المبنى</label>
     <Input {...fieldProps('addressRaw')} className="checkout-input" autoComplete="street-address" placeholder="مثال: حي النرجس، شارع عثمان، مبنى ١٢" value={form.addressRaw} onChange={e=>fields('addressRaw',e.target.value)}/>
     {fieldError('addressRaw')}
    </div>
   </div>
   {notice&&<p role="status" className="rounded-lg bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900 dark:bg-amber-950 dark:text-amber-100">{notice}</p>}
   {quote&&<div className="border-y py-2" aria-live="polite" aria-busy={isFetching}>
    {(source==='cart'||quote.items.length>1)&&<div className="mb-2 space-y-1">{quote.items.map((it,i)=><div className="flex justify-between gap-2 text-xs" key={i}><span>{it.qty} × {it.title}</span><span className="shrink-0">{money(it.lineTotal)}</span></div>)}</div>}
    <div className="flex items-center justify-between gap-2">
     <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"><span className="text-xs font-medium">{quote.shippingKnown?'الإجمالي':'قيمة المنتجات'}</span><span className="text-xs text-muted-foreground">الشحن: {quote.shippingKnown?(quote.shipping===0?<span className="font-semibold text-emerald-700 dark:text-emerald-300">مجاني</span>:money(quote.shipping)):'بعد اختيار المدينة'}</span></div>
     <strong className="text-xl tabular-nums" data-testid="checkout-total">{money(quote.grandTotal)}</strong>
    </div>
    {quote.discount>0&&<p className="text-xs text-emerald-700 dark:text-emerald-300">الخصم المطبق: {money(quote.discount)}</p>}
    {quote.deliveryEstimate&&<p className="mt-1 text-xs text-muted-foreground">التوصيل: {quote.deliveryEstimate}</p>}
   </div>}
   <CheckoutHelp items={items}/>
   {(setupError||citiesError||quoteError)&&<div role="alert" className="space-y-1 text-xs text-destructive">
    <p>{setupError?'تعذر تجهيز الطلب. بياناتك محفوظة؛ حاول مرة ثانية.':citiesError?'تعذر تحميل المدن. حاول مرة ثانية لاختيار مدينة التوصيل.':checkoutError(quoteError?.message||'')}</p>
    <Button type="button" variant="outline" className="min-h-11 text-xs" disabled={isFetching||citiesLoading} onClick={()=>{if(setupError)setSetupAttempt(value=>value+1);else if(citiesError)void retryCities();else void refetch()}}><RefreshCw aria-hidden="true"/>إعادة المحاولة</Button>
   </div>}
   {order.error&&!order.error.message.includes('PRICE_CHANGED')&&<p role="alert" className="text-xs leading-relaxed text-destructive">{checkoutError(order.error.message)}</p>}
   <div className="space-y-1.5">
    <Button type="submit" disabled={!quote||!ready||isFetching||order.isPending||!!quoteError||!!citiesError} aria-busy={order.isPending||isFetching} className="checkout-submit chat-press min-h-12 w-full justify-between rounded-xl border-emerald-700 bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800">
     {order.isPending?<span className="flex w-full items-center justify-center gap-2"><Loader2 aria-hidden="true" className="animate-spin"/>جار إرسال طلبك…</span>:isFetching||!ready?<span className="flex w-full items-center justify-center gap-2"><Loader2 aria-hidden="true" className="animate-spin"/>جار مراجعة الإجمالي…</span>:<><span>إرسال الطلب{quote?.shippingKnown&&` · ${money(quote.grandTotal)}`}</span><ArrowLeft aria-hidden="true"/></>}
    </Button>
    <p className="text-center text-xs text-muted-foreground">الدفع عند الاستلام · بدون دفع الآن</p>
   </div>
  </fieldset>
 </form>
}
function CheckoutHelp({items}:{items:CheckoutItem[]}){
 const [open,setOpen]=useState<'address'|'policy'|null>(null);const helpId=useId();
 const {data=[],error,refetch}=useQuery<{title:string;faq?:{question:string;answer:string}[]}[]>({queryKey:['checkout-policies',items.map(i=>i.productId).join(',')],enabled:open==='policy',queryFn:()=>Promise.all([...new Set(items.map(i=>i.productId))].map(async id=>{const r=await apiRequest('GET',`/api/products/${id}`);return (await r.json()).data}))});
 return <div className="text-xs">
  <div className="flex items-center justify-between gap-2">
   <Button type="button" variant="ghost" className="checkout-help min-h-11 gap-1 px-0 text-xs text-muted-foreground" aria-expanded={open==='address'} aria-controls={`${helpId}-address`} onClick={()=>setOpen(open==='address'?null:'address')}><CircleHelp aria-hidden="true"/>العنوان الوطني؟</Button>
   <Button type="button" variant="ghost" className="checkout-help min-h-11 gap-1 px-0 text-xs" aria-expanded={open==='policy'} aria-controls={`${helpId}-policy`} onClick={()=>setOpen(open==='policy'?null:'policy')}><ShieldCheck aria-hidden="true" className="text-emerald-700 dark:text-emerald-300"/>الاسترجاع والضمان<ChevronDown aria-hidden="true" className="chat-disclosure-icon h-3 w-3"/></Button>
  </div>
  <div id={`${helpId}-address`} hidden={open!=='address'} className="pb-2 leading-relaxed text-muted-foreground">تلقى العنوان الوطني المختصر في تطبيق سبل ضمن عنوانك: ٤ أحرف إنجليزية و٤ أرقام، مثل <bdi dir="ltr">ABCD1234</bdi>.</div>
  <div id={`${helpId}-policy`} hidden={open!=='policy'} className="pb-2 leading-relaxed">{error?<div role="alert"><p>تعذر تحميل سياسة المنتج.</p><Button type="button" variant="outline" onClick={()=>void refetch()}>إعادة المحاولة</Button></div>:data.length===0?<p role="status">جار تحميل سياسة المنتج…</p>:data.map(p=>{const policies=p.faq?.filter(f=>/استرجاع|استبدال|ضمان|return|warranty/i.test(f.question))||[];return <div className="mt-2 space-y-1" key={p.title}><b>{p.title}</b>{policies.length?policies.map(f=><p key={f.question}>{f.answer}</p>):<><p>الاسترجاع والاستبدال خلال ١٤ يومًا من الاستلام، بشرط بقاء المنتج بحالته الأصلية وغير مستخدم ومع التغليف.</p><p>ضمان المنتج يشمل عيوب التصنيع حسب حالة المنتج. تواصل معنا برقم الطلب وصورة العيب للمراجعة.</p></>}</div>})}</div>
 </div>
}
function ComplementProducts({productId}:{productId?:number}){
 const {data:products=[]}=useQuery<any[]>({queryKey:['complements',productId],enabled:!!productId,queryFn:async()=>{const r=await apiRequest('GET',`/api/products/${productId}`);const p=(await r.json()).data;return Promise.all((p.relatedProductIds||[]).slice(0,3).map(async(id:number)=>{const r=await apiRequest('GET',`/api/products/${id}`);return (await r.json()).data}))}});
 return products.length>0?<div className="border-t pt-4"><p className="font-semibold">قد يناسبك أيضًا</p>{products.filter(p=>p.status==='active'&&p.stockTotal>0).map(p=><a className="block underline mt-2" key={p.id} href={`/product/${p.id}`} onClick={()=>trackCommerce('complement_clicked',productId,{relatedProductId:p.id})}>{p.title} · {money(p.price)}</a>)}</div>:null
}
