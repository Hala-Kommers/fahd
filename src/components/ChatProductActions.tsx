import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { getUnitPricingForQuantity } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { useFahd } from '@/lib/fahd-store';
import { engageChat, trackCommerce } from '@/lib/commerce';
import OfferCards from './OfferCards';
import CheckoutForm from './CheckoutForm';
import { Loader2, X } from 'lucide-react';
type Panel='order'|'offers'|'policy'|null;
export default function ChatProductActions({offerRequest,orderRequest,selectedOffer}:{offerRequest?:number;orderRequest?:number;selectedOffer?:{quantity:number;requestId:number}}){
 const {chatProductContext:context}=useFahd();const [busy,setBusy]=useState(false);const [panel,setPanel]=useState<Panel>(null);const [chosenProduct,setChosenProduct]=useState('');const activeId=context?String(context.productId):chosenProduct;
 const key=`fahd_selection:${localStorage.getItem('chat_session_id')}:${activeId}`;
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(key)||'{}')}catch{return {}}};
 const [quantity,setQuantity]=useState(()=>read().quantity||1);const [variantId,setVariantId]=useState(()=>read().variantId||String(context?.variantId||''));
 const {data:products=[]}=useQuery<any[]>({queryKey:['/api/products'],enabled:!!panel&&!context});
 const {data:product,isFetching,error}=useQuery<any>({queryKey:['/api/products',activeId],enabled:!!panel&&!!activeId,staleTime:0});
 const variant=product?.variants?.find((v:any)=>String(v.id)===variantId);const stock=product?.inventoryMode==='variant'?(variant?.stock??0):(product?.stockTotal??0);
 useEffect(()=>{const saved=read();setQuantity(saved.quantity||1);setVariantId(saved.variantId||String(context?.variantId||''))},[activeId]);
 useEffect(()=>{sessionStorage.setItem(key,JSON.stringify({quantity,variantId}))},[key,quantity,variantId]);
 function open(next:Panel){if(busy)return;setPanel(next);if(next==='offers'){void engageChat(Number(activeId)||undefined).catch(()=>{});trackCommerce('offer_viewed',Number(activeId)||undefined)}}
 useEffect(()=>{if(offerRequest)open('offers')},[offerRequest]);
 useEffect(()=>{if(orderRequest)open('order')},[orderRequest]);
 useEffect(()=>{if(selectedOffer){setQuantity(selectedOffer.quantity);open('order')}},[selectedOffer]);
 function choose(qty:number){setQuantity(qty);trackCommerce('offer_selected',Number(activeId),{quantity:qty});setPanel('order')}
 const panelRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(panel)panelRef.current?.scrollIntoView({behavior:'smooth',block:'start'})},[panel,product?.id]);
 const target=document.getElementById('chat-commerce');
 return <><div className="grid grid-cols-3 gap-1.5 " dir="rtl"><Button className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 min-h-9 text-[11px] px-2" onClick={()=>open('order')}>طلب المنتج</Button><Button variant="outline" className="rounded-full h-9 min-h-9 text-[11px] px-2" onClick={()=>open('offers')}>أبي أعرف العروض</Button><Button variant="outline" className="rounded-full h-9 min-h-9 text-[11px] px-2" onClick={()=>open('policy')}>الاسترجاع والضمان</Button></div>
 {panel&&target&&createPortal(<div ref={panelRef} dir="rtl" className="rounded-2xl border bg-card p-3 space-y-3 shadow-sm scroll-mt-3" aria-label={panel==='offers'?'عروض المنتج':panel==='order'?'طلب المنتج':'الاسترجاع والضمان'}><div className="flex items-center justify-between gap-2"><h3 className="font-bold text-base">{panel==='offers'?'اختر العرض المناسب لك':panel==='order'?'طلب المنتج':'الاسترجاع والضمان'}</h3><Button type="button" variant="ghost" size="icon" disabled={busy} className="h-8 w-8" aria-label="إغلاق البطاقة" onClick={()=>setPanel(null)}><X className="h-4 w-4"/></Button></div>
 {context?<p className="text-xs text-muted-foreground">{context.product.title}</p>:<label className="grid gap-2">المنتج<select disabled={busy} className="border rounded-xl p-2 bg-background" value={activeId} onChange={e=>setChosenProduct(e.target.value)}><option value="">اختر المنتج</option>{products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
 {isFetching&&!product&&<Loader2 className="animate-spin"/>}{error&&<p role="alert">تعذر تحميل المنتج، أعد فتح النافذة.</p>}
 {product&&<>{product.hasVariants&&<label className="grid gap-1">خيارات المنتج<select disabled={busy} value={variantId} className="border rounded-xl p-3 bg-background" onChange={e=>{setVariantId(e.target.value);setQuantity(1)}}><option value="">اختر المقاس أو اللون</option>{product.variants?.filter((v:any)=>v.isActive!==false).map((v:any)=><option key={v.id} value={v.id}>{Object.values(v.attributes||{}).join(' / ')}</option>)}</select></label>}
 {panel==='offers'&&<><OfferCards product={product} stock={stock} variantPrice={variant?.priceOverride} disabled={product.hasVariants&&!variant} onChoose={choose}/><p className="text-xs text-muted-foreground">الشحن وموعد التوصيل حسب المدينة، ويظهران قبل إرسال الطلب.</p></>}
 {panel==='order'&&<><div className="grid grid-cols-3 gap-2" aria-label="اختيار عرض الطلب">{[1,...getUnitPricingForQuantity(product,1,variant?.priceOverride).tiers.map(t=>t.qty)].filter((q,i,a)=>a.indexOf(q)===i).map(q=>{const price=getUnitPricingForQuantity(product,q,variant?.priceOverride).unitPrice;return <button type="button" key={q} disabled={busy||q>stock} aria-pressed={q===quantity} onClick={()=>choose(q)} className={`rounded-xl border p-2 text-center disabled:opacity-50 ${q===quantity?'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100':'bg-background'}`}><span className="block text-xs">{q===1?'قطعة واحدة':`${q} قطع`}</span><strong className="block text-sm">{(price*q).toLocaleString('ar-SA')} ر.س</strong>{q===quantity&&<span className="text-[10px]">العرض المختار ✓</span>}</button>})}</div>{quantity>0&&quantity<=stock&&(!product.hasVariants||variant)?<CheckoutForm onPendingChange={setBusy} key={`${activeId}:${variantId}:${quantity}`} items={[{productId:Number(activeId),variantId:variant?Number(variantId):null,qty:quantity}]}/>:<p role="alert" className="text-sm">اختر الخيارات وكمية متاحة لإكمال طلبك.</p>}</>}
 {panel==='policy'&&<div className="space-y-3">{(()=>{const custom=(product.faq||[]).filter((f:any)=>/استرجاع|استبدال|ضمان|return|warranty/i.test(f.question));const policies=custom.length?custom:[{question:'الاسترجاع والاستبدال خلال ١٤ يوم',answer:'يمكنك طلب الاسترجاع أو الاستبدال خلال ١٤ يومًا من الاستلام، بشرط أن يكون المنتج بحالته الأصلية وغير مستخدم ومع التغليف.'},{question:'الضمان',answer:'يشمل المنتج ضمانًا ضد عيوب التصنيع حسب حالة المنتج. تواصل معنا مع رقم الطلب وصورة العيب لمراجعة الطلب.'}];return policies.map((f:any)=><section key={f.question}><h3 className="font-bold">{f.question}</h3><p>{f.answer}</p></section>)})()}</div>}</>}
 </div>,target)}</>
}
