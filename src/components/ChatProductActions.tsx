import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFahd } from '@/lib/fahd-store';
import { engageChat, trackCommerce } from '@/lib/commerce';
import OfferCards from './OfferCards';
import CheckoutForm from './CheckoutForm';
import { Loader2 } from 'lucide-react';
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
 function open(next:Panel){setPanel(next);if(next==='offers'){void engageChat(Number(activeId)||undefined).catch(()=>{});trackCommerce('offer_viewed',Number(activeId)||undefined)}}
 useEffect(()=>{const pending=sessionStorage.getItem(`fahd_pending_order:${activeId}`);if(pending){try{const p=JSON.parse(pending);setQuantity(p.quantity||1);setVariantId(p.variantId||'');setPanel('order')}catch{} sessionStorage.removeItem(`fahd_pending_order:${activeId}`)}},[activeId]);
 useEffect(()=>{if(offerRequest)open('offers')},[offerRequest]);
 useEffect(()=>{if(orderRequest)open('order')},[orderRequest]);
 useEffect(()=>{if(selectedOffer){setQuantity(selectedOffer.quantity);open('order')}},[selectedOffer]);
 function choose(qty:number){setQuantity(qty);trackCommerce('offer_selected',Number(activeId),{quantity:qty});setPanel('order')}
 return <><div className="grid grid-cols-3 gap-1.5 sm:gap-2" dir="rtl"><Button className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-11 text-[11px] sm:text-sm px-2" onClick={()=>open('order')}>طلب المنتج</Button><Button variant="outline" className="rounded-full min-h-11 text-[11px] sm:text-sm px-2" onClick={()=>open('offers')}>أبي أعرف العروض</Button><Button variant="outline" className="rounded-full min-h-11 text-[11px] sm:text-sm px-2" onClick={()=>open('policy')}>الاسترجاع والضمان</Button></div>
 <Dialog open={!!panel} onOpenChange={o=>{if(!o&&!busy)setPanel(null)}}><DialogContent dir="rtl" className={`${panel==='offers'?'sm:max-w-3xl':'sm:max-w-lg'} max-h-[85dvh] overflow-y-auto rounded-3xl p-5 sm:p-7`}><DialogTitle>{panel==='offers'?'اختر العرض المناسب لك':panel==='order'?'طلب المنتج':'الاسترجاع والضمان'}</DialogTitle><DialogDescription>{panel==='order'?'راجع اختيارك وبيانات التوصيل، والدفع عند الاستلام.':'المعلومات والعروض الخاصة بالمنتج المختار.'}</DialogDescription>
 {context?<p className="rounded-xl bg-emerald-50 dark:bg-emerald-950 p-3 font-bold">{context.product.title}</p>:<label className="grid gap-2">المنتج<select className="border rounded-xl p-3 bg-background" value={activeId} onChange={e=>setChosenProduct(e.target.value)}><option value="">اختر المنتج</option>{products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
 {isFetching&&!product&&<Loader2 className="animate-spin"/>}{error&&<p role="alert">تعذر تحميل المنتج، أعد فتح النافذة.</p>}
 {product&&<>{product.hasVariants&&<label className="grid gap-1">خيارات المنتج<select disabled={busy} value={variantId} className="border rounded-xl p-3 bg-background" onChange={e=>{setVariantId(e.target.value);setQuantity(1)}}><option value="">اختر المقاس أو اللون</option>{product.variants?.filter((v:any)=>v.isActive!==false).map((v:any)=><option key={v.id} value={v.id}>{Object.values(v.attributes||{}).join(' / ')}</option>)}</select></label>}
 {panel==='offers'&&<><OfferCards product={product} stock={stock} variantPrice={variant?.priceOverride} disabled={product.hasVariants&&!variant} onChoose={choose}/><p className="text-xs text-muted-foreground">الشحن وموعد التوصيل حسب المدينة، ويظهران قبل إرسال الطلب.</p></>}
 {panel==='order'&&<><label className="grid gap-1 text-sm">الكمية<Input disabled={busy} type="number" min={1} max={stock} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>{quantity>0&&quantity<=stock&&(!product.hasVariants||variant)?<CheckoutForm onPendingChange={setBusy} key={`${activeId}:${variantId}:${quantity}`} items={[{productId:Number(activeId),variantId:variant?Number(variantId):null,qty:quantity}]}/>:<p role="alert" className="text-sm">اختر الخيارات وكمية متاحة لإكمال طلبك.</p>}</>}
 {panel==='policy'&&<div className="space-y-3">{(()=>{const custom=(product.faq||[]).filter((f:any)=>/استرجاع|استبدال|ضمان|return|warranty/i.test(f.question));const policies=custom.length?custom:[{question:'الاسترجاع والاستبدال خلال ١٤ يوم',answer:'يمكنك طلب الاسترجاع أو الاستبدال خلال ١٤ يومًا من الاستلام، بشرط أن يكون المنتج بحالته الأصلية وغير مستخدم ومع التغليف.'},{question:'الضمان',answer:'يشمل المنتج ضمانًا ضد عيوب التصنيع حسب حالة المنتج. تواصل معنا مع رقم الطلب وصورة العيب لمراجعة الطلب.'}];return policies.map((f:any)=><section key={f.question}><h3 className="font-bold">{f.question}</h3><p>{f.answer}</p></section>)})()}</div>}</>}
 </DialogContent></Dialog></>
}
