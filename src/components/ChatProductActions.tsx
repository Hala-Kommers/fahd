import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUnitPricingForQuantity } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { engageChat, trackCommerce, type Receipt } from '@/lib/commerce';
import OfferCards from './OfferCards';
import CheckoutForm from './CheckoutForm';
import { Loader2 } from 'lucide-react';

export type CommercePanel = 'order' | 'offers' | 'policy';

export default function ChatProductActions({ onOpen }: { onOpen: (panel: CommercePanel) => void }) {
  return <div className="grid grid-cols-3 gap-1.5" dir="rtl">
    <Button className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 min-h-9 text-[11px] px-2" onClick={() => onOpen('order')}>طلب المنتج</Button>
    <Button variant="outline" className="rounded-full h-9 min-h-9 text-[11px] px-2" onClick={() => onOpen('offers')}>أبي أعرف العروض</Button>
    <Button variant="outline" className="rounded-full h-9 min-h-9 text-[11px] px-2" onClick={() => onOpen('policy')}>الاسترجاع والضمان</Button>
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

  const quantities = product
    ? [1, ...getUnitPricingForQuantity(product, 1, variant?.priceOverride).tiers.map(tier => tier.qty)].filter((q, i, all) => all.indexOf(q) === i)
    : [];

  return <section dir="rtl" className="rounded-2xl border bg-card p-3 space-y-3 shadow-sm" aria-label={panelTitle} data-commerce-card={panel}>
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-bold text-base">{panelTitle}</h3>
      <Button type="button" variant="ghost" disabled={busy} className="h-8 px-2 text-xs" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'طي التفاصيل' : 'عرض التفاصيل'}</Button>
    </div>
    {product && <p className="text-xs text-muted-foreground">{product.title}</p>}
    <div hidden={!expanded} className="space-y-3">
      {!productId && <label className="grid gap-2 text-sm">المنتج<select disabled={busy || completed} className="border rounded-xl p-2 bg-background" value={activeId} onChange={e => { setChosenProduct(e.target.value); setSelection({ quantity: 1, variantId: '' }); }}><option value="">اختر المنتج</option>{products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
      {isFetching && !product && <Loader2 className="animate-spin" />}
      {error && <p role="alert">تعذر تحميل المنتج، حاول مرة أخرى.</p>}
      {product && <>
        {product.hasVariants && panel !== 'policy' && !completed && <label className="grid gap-1 text-sm">خيارات المنتج<select disabled={busy} value={variantId} className="border rounded-xl p-3 bg-background" onChange={e => setSelection({ variantId: e.target.value, quantity: 1 })}><option value="">اختر المقاس أو اللون</option>{product.variants?.filter((v: any) => v.isActive !== false).map((v: any) => <option key={v.id} value={v.id}>{Object.values(v.attributes || {}).join(' / ')}</option>)}</select></label>}
        {panel === 'offers' && <>
          <OfferCards product={product} stock={stock} variantPrice={variant?.priceOverride} disabled={product.hasVariants && !variant} onChoose={choose} />
          <p className="text-xs text-muted-foreground">الشحن وموعد التوصيل حسب المدينة، ويظهران قبل إرسال الطلب.</p>
        </>}
        {panel === 'order' && <>
          {!completed && <div className="grid grid-cols-3 gap-2" aria-label="اختيار عرض الطلب">{quantities.map(q => {
            const price = getUnitPricingForQuantity(product, q, variant?.priceOverride).unitPrice;
            return <button type="button" key={q} disabled={busy || q > stock} aria-pressed={q === quantity} onClick={() => choose(q)} className={`rounded-xl border p-2 text-center disabled:opacity-50 ${q === quantity ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100' : 'bg-background'}`}>
              <span className="block text-xs">{q === 1 ? 'قطعة واحدة' : `${q} قطع`}</span>
              <strong className="block text-sm">{(price * q).toLocaleString('ar-SA')} ر.س</strong>
              {q === quantity && <span className="text-[10px]">العرض المختار ✓</span>}
            </button>;
          })}</div>}
          {completed || (quantity > 0 && quantity <= stock && (!product.hasVariants || variant))
            ? <CheckoutForm initialReceipt={receipt} onPendingChange={setBusy} onSuccess={result => { sessionStorage.setItem(receiptKey, JSON.stringify(result)); setReceipt(result); }} key={`${activeId}:${variantId}:${quantity}`} items={[{ productId: Number(activeId), variantId: variant ? Number(variantId) : null, qty: quantity }]} />
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
