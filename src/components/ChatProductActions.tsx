import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPurchaseOffers } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { engageChat, trackCommerce, type Receipt } from '@/lib/commerce';
import OfferCards from './OfferCards';
import CheckoutForm from './CheckoutForm';
import { ChevronDown, Loader2 } from 'lucide-react';

export type CommercePanel = 'order' | 'offers' | 'policy';

export default function ChatProductActions({ onOpen }: { onOpen: (panel: CommercePanel) => void }) {
  return <div className="grid grid-cols-3 gap-1.5" dir="rtl">
    <Button className="chat-press rounded-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 min-h-9 text-[11px] px-2" onClick={() => onOpen('order')}>طلب المنتج</Button>
    <Button variant="outline" className="chat-press rounded-full h-9 min-h-9 text-[11px] px-2" onClick={() => onOpen('offers')}>أبي أعرف العروض</Button>
    <Button variant="outline" className="chat-press rounded-full h-9 min-h-9 text-[11px] px-2" onClick={() => onOpen('policy')}>الاسترجاع والضمان</Button>
  </div>;
}

type CardProps = {
  cardId: string;
  panel: CommercePanel;
  productId?: number;
  quantity?: number;
  variantId?: number;
  onChoose: (quantity: number, productId: number, variantId?: number) => void;
};

// Each card belongs to a message. Appending messages never moves or remounts it.
export function ChatCommerceCard({ cardId, panel, productId, quantity: initialQuantity, variantId: initialVariantId, onChoose }: CardProps) {
  const [busy, setBusy] = useState(false);
  const receiptKey = `chat_receipt:${localStorage.getItem('chat_session_id')}:${cardId}`;
  const [receipt, setReceipt] = useState<Receipt | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(receiptKey) || 'null'); } catch { return null; }
  });
  const completed = !!receipt;
  const [expanded, setExpanded] = useState(true);
  const productKey = `chat_product:${localStorage.getItem('chat_session_id')}:${cardId}`;
  const [chosenProduct, setChosenProduct] = useState(() => sessionStorage.getItem(productKey) || '');
  const activeId = productId ? String(productId) : chosenProduct;
  const selectionKey = `chat_selection:${localStorage.getItem('chat_session_id')}:${cardId}`;
  const [selection, setSelection] = useState(() => {
    let saved: { quantity?: number; variantId?: string } = {};
    try { saved = JSON.parse(sessionStorage.getItem(selectionKey) || '{}'); } catch {}
    return { quantity: initialQuantity ?? saved.quantity ?? 1, variantId: String(initialVariantId ?? saved.variantId ?? '') };
  });
  const { quantity, variantId } = selection;
  const { data: products = [] } = useQuery<any[]>({ queryKey: ['/api/products'], enabled: !productId });
  const { data: product, isFetching, error } = useQuery<any>({
    queryKey: ['/api/products', activeId], enabled: !!activeId, staleTime: 0,
  });
  const variant = product?.variants?.find((v: any) => String(v.id) === variantId);
  const stock = product?.inventoryMode === 'variant' ? (variant?.stock ?? 0) : (product?.stockTotal ?? 0);
  const panelTitle = panel === 'offers' ? 'عروض المنتج' : panel === 'order' ? (completed ? 'استلمنا طلبك' : 'طلب المنتج') : 'الاسترجاع والضمان';

  useEffect(() => {
    sessionStorage.setItem(selectionKey, JSON.stringify(selection));
  }, [selectionKey, selection]);

  useEffect(() => {
    sessionStorage.setItem(productKey, chosenProduct);
  }, [productKey, chosenProduct]);

  useEffect(() => {
    if (panel === 'offers') void engageChat(Number(activeId) || undefined).catch(() => {});
  }, [panel, activeId]);

  function choose(nextQuantity: number) {
    setSelection(current => ({ ...current, quantity: nextQuantity }));
    trackCommerce('offer_selected', Number(activeId), { quantity: nextQuantity });
    if (panel === 'offers') onChoose(nextQuantity, Number(activeId), variant ? Number(variantId) : undefined);
  }

  const quantities = product ? getPurchaseOffers(product, variant?.priceOverride).map(tier => tier.qty) : [];
  const orderQuantity = product?.bundleOnly && !quantities.includes(quantity) ? (quantities[0] ?? 0) : quantity;
  const productImage = product?.primaryImage || product?.images?.find((image: any) => image.isPrimary)?.url || product?.images?.[0]?.url;

  return <section dir="rtl" className="rounded-2xl border bg-card p-3 space-y-2" aria-label={panelTitle} data-commerce-card={panel}>
    <div className="flex items-center justify-between gap-2">
      {productImage && <img src={productImage} alt="" loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-lg object-cover"/>}
      <div className="min-w-0 flex-1"><h3 className="font-bold text-sm">{panelTitle}</h3>{product && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{product.title}</p>}</div>
      <Button type="button" variant="ghost" disabled={busy} className="chat-press h-11 min-h-11 w-11 shrink-0 p-0 text-xs" aria-label={expanded ? 'طي التفاصيل' : 'عرض التفاصيل'} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}><ChevronDown aria-hidden="true" className="chat-disclosure-icon h-4 w-4" /></Button>
    </div>
    <div hidden={!expanded} className="chat-card-content space-y-2">
      {!productId && <label className="grid gap-2 text-sm">المنتج<select disabled={busy || completed} className="border rounded-xl p-2 bg-background" value={activeId} onChange={e => { setChosenProduct(e.target.value); setSelection({ quantity: 1, variantId: '' }); }}><option value="">اختر المنتج</option>{products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
      {isFetching && !product && <Loader2 className="animate-spin" />}
      {error && <p role="alert">تعذر تحميل المنتج، حاول مرة أخرى.</p>}
      {product && <>
        {product.hasVariants && panel !== 'policy' && !completed && <label className="grid gap-1 text-sm">خيارات المنتج<select disabled={busy} value={variantId} className="border rounded-xl p-3 bg-background" onChange={e => setSelection({ variantId: e.target.value, quantity: 1 })}><option value="">اختر المقاس أو اللون</option>{product.variants?.filter((v: any) => v.isActive !== false).map((v: any) => <option key={v.id} value={v.id}>{Object.values(v.attributes || {}).join(' / ')}</option>)}</select></label>}
        {panel === 'offers' && <>
          <OfferCards product={product} stock={stock} variantPrice={variant?.priceOverride} disabled={product.hasVariants && !variant} onChoose={choose} />
          <p className="text-xs text-muted-foreground">{product.freeShipping ? 'الشحن مجاني. اختر مدينتك لمعرفة موعد التوصيل.' : 'الشحن وموعد التوصيل حسب المدينة، ويظهران قبل إرسال الطلب.'}</p>
        </>}
        {panel === 'order' && <>
          {!completed && <OfferCards mode="select" selectedQuantity={orderQuantity} product={product} variantPrice={variant?.priceOverride} stock={stock} disabled={busy || (product.hasVariants && !variant)} onChoose={choose}/>}
          {completed || (orderQuantity > 0 && orderQuantity <= stock && (!product.hasVariants || variant))
            ? <CheckoutForm initialReceipt={receipt} onPendingChange={setBusy} onSuccess={result => { sessionStorage.setItem(receiptKey, JSON.stringify(result)); setReceipt(result); }} key={`${activeId}:${variantId}:${orderQuantity}`} items={[{ productId: Number(activeId), variantId: variant ? Number(variantId) : null, qty: orderQuantity }]} />
            : <p role="alert" className="text-sm">اختر الخيارات وكمية متاحة لإكمال طلبك.</p>}
        </>}
        {panel === 'policy' && <div className="space-y-3 text-sm">{(() => {
          const custom = (product.faq || []).filter((f: any) => /استرجاع|استبدال|ضمان|return|warranty/i.test(f.question));
          const policies = custom.length ? custom : [
            { question: 'الاسترجاع والاستبدال خلال ١٤ يوم', answer: 'يمكنك طلب الاسترجاع أو الاستبدال خلال ١٤ يومًا من الاستلام، بشرط أن يكون المنتج بحالته الأصلية وغير مستخدم ومع التغليف.' },
            { question: 'الضمان', answer: 'يشمل المنتج ضمانًا ضد عيوب التصنيع حسب حالة المنتج. تواصل معنا مع رقم الطلب وصورة العيب لمراجعة الطلب.' },
          ];
          return policies.map((f: any) => <section key={f.question}><h4 className="font-bold">{f.question}</h4><p>{f.answer}</p></section>);
        })()}</div>}
      </>}
    </div>
  </section>;
}
