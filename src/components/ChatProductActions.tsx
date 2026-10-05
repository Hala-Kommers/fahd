import { useState, useEffect, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useFahd } from "@/lib/fahd-store";
import { getUnitPricingForQuantity } from "@/lib/pricing";
import { Package, ShieldCheck, Tag, Loader2, CheckCircle2 } from "lucide-react";

import OfferCards from "@/components/OfferCards";
import { motion, useReducedMotion } from "framer-motion";

type Product = { id: number; title: string; price: number; stockTotal: number; hasVariants?: boolean; variants?: { id: number; attributes: Record<string, string>; priceOverride?: number | null; stock?: number; isActive?: boolean }[]; pricingTiers?: { qty: number; label?: string; originalPrice: number; finalPrice: number }[]; faq?: { question: string; answer: string }[] };
type Panel = "order" | "offers" | "policy" | null;
const money = (value: number) => `${value.toLocaleString("ar-SA")} ر.س`;

export default function ChatProductActions({ offerRequest, selectedOffer }: { offerRequest?: number; selectedOffer?: { quantity: number; requestId: number } }) {
  const reduceMotion = useReducedMotion();
  const { chatProductContext } = useFahd();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", addressRaw: "", cityId: "", nationalAddress: "", region: "الرياض" });
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: number; title: string; quantity: number; total: number } | null>(null);
  const regions: Record<string, string[]> = {
    "الرياض": ["الرياض", "الخرج", "الدوادمي"], "مكة المكرمة": ["مكة المكرمة", "جدة", "الطائف"],
    "المدينة المنورة": ["المدينة المنورة", "ينبع"], "القصيم": ["بريدة", "عنيزة"],
    "المنطقة الشرقية": ["الدمام", "الخبر", "الأحساء", "الجبيل"], "عسير": ["أبها", "خميس مشيط", "بيشة"],
    "تبوك": ["تبوك"], "حائل": ["حائل"], "الحدود الشمالية": ["عرعر", "رفحاء"],
    "جازان": ["جازان", "صبيا"], "نجران": ["نجران"], "الباحة": ["الباحة"], "الجوف": ["سكاكا", "القريات"],
  };
  const { data: products = [], isLoading: loadingProducts, isError: productsError } = useQuery<Product[]>({ queryKey: ["/api/products"], enabled: panel !== null && !chatProductContext });
  const activeId = chatProductContext ? String(chatProductContext.productId) : productId;
  const { data: product, isLoading: loadingProduct, isError: productError } = useQuery<Product>({ queryKey: ["/api/products", activeId], enabled: panel !== null && !!activeId });
  const { data: cities = [] } = useQuery<{ id: number; name: string; isActive?: boolean }[]>({ queryKey: ["/api/cities"], enabled: panel === "order" });
  const variants = product?.variants?.filter(v => v.isActive !== false) || [];
  const variant = variants.find(v => String(v.id) === variantId);
  const stock = variant?.stock ?? product?.stockTotal ?? 0;
  const { unitPrice, tiers } = getUnitPricingForQuantity(product, quantity, variant?.priceOverride);
  const order = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/orders", {
        ...form, sessionId: localStorage.getItem("chat_session_id"), customerName: form.customerName.trim(), customerPhone: form.customerPhone.trim(), addressRaw: `${form.addressRaw.trim()}\nالمنطقة: ${form.region}\nالعنوان الوطني المختصر: ${form.nationalAddress.trim()}`, cityId: Number(form.cityId), paymentMethod: "COD",
        items: [{ productId: Number(activeId), variantId: variantId ? Number(variantId) : null, qty: quantity }],
      });
      return response.json();
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setConfirmedOrder({ id: result.data.id, title: product?.title || "", quantity, total: Number(result.data.total ?? unitPrice * quantity) });
    },
  });
  function open(next: Panel) {
    if (!panel) { setProductId(String(chatProductContext?.productId || "")); setVariantId(String(chatProductContext?.variantId || "")); setQuantity(1); }
    setConfirmedOrder(null); order.reset(); setPanel(next);
  }
  useEffect(() => {
    if (offerRequest) open("offers");
  }, [offerRequest]);
  useEffect(() => {
    if (!selectedOffer) return;
    setProductId(String(chatProductContext?.productId || ""));
    setVariantId(String(chatProductContext?.variantId || ""));
    setQuantity(selectedOffer.quantity);
    order.reset();
    setPanel("order");
  }, [selectedOffer]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!product || quantity < 1 || quantity > stock || (product.hasVariants && !variant) || !form.customerName.trim() || !form.customerPhone.trim() || !form.addressRaw.trim()) return;
    order.mutate();
  }
  const policies = [
    { title: "الاستبدال والاسترجاع", match: /استبدال|استرجاع|إرجاع|return|exchange/i },
    { title: "ضمان المنتج", match: /ضمان|warranty|guarantee/i },
  ];
  return <>
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2" dir="rtl" data-testid="chat-product-actions">
      <Button className="rounded-full bg-[#159947] hover:bg-[#117d39] text-white min-h-11 h-auto px-2 py-2 text-[11px] sm:text-sm gap-1 sm:gap-2" onClick={() => open("order")}><Package className="hidden sm:block h-4 w-4 shrink-0" />طلب المنتج</Button>
      <Button variant="outline" className="rounded-full min-h-11 h-auto px-2 py-2 text-[11px] sm:text-sm gap-1 sm:gap-2" onClick={() => open("offers")}><Tag className="hidden sm:block h-4 w-4 shrink-0" />أبي أعرف العروض</Button>
      <Button variant="outline" className="rounded-full min-h-11 h-auto px-2 py-2 text-[11px] sm:text-sm gap-1 sm:gap-2" onClick={() => open("policy")}><ShieldCheck className="hidden sm:block h-4 w-4 shrink-0" />الاسترجاع والضمان</Button>
    </div>
    <Dialog open={panel !== null} onOpenChange={isOpen => { if (!isOpen && !order.isPending) setPanel(null); }}>
      <DialogContent className={`${panel === "offers" ? "sm:max-w-3xl" : "sm:max-w-lg"} max-h-[85dvh] overflow-y-auto rounded-3xl p-5 sm:p-7}`} dir="rtl">
        <DialogTitle>{panel === "order" ? "طلب المنتج" : panel === "offers" ? "اختر العرض المناسب لك" : "الاستبدال والاسترجاع والضمان"}</DialogTitle>
        <DialogDescription>{panel === "order" ? "عبّي بياناتك لتأكيد الطلب مباشرة، والدفع عند الاستلام." : panel === "offers" ? "العروض المتاحة حسب المنتج والكمية." : "التفاصيل المسجلة لهذا المنتج."}</DialogDescription>
        {!confirmedOrder && (chatProductContext ? <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-center gap-3">{chatProductContext.image && <img src={chatProductContext.image} alt="" className="h-12 w-12 rounded-xl object-cover" />}<div><p className="text-[11px] text-emerald-700 dark:text-emerald-300">العروض الخاصة بهذا المنتج</p><p className="font-bold">{chatProductContext.product.title}</p></div></div> : <label className="grid gap-2 text-sm font-medium">المنتج
          <select className="w-full border rounded-xl p-3 bg-background" value={activeId} onChange={e => { setProductId(e.target.value); setVariantId(""); setQuantity(1); order.reset(); }} disabled={loadingProducts || order.isPending}>
            <option value="">اختر المنتج</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>)}
        {(loadingProducts || loadingProduct) && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />جاري تحميل المنتج...</p>}
        {(productsError || productError) && <p role="alert" className="text-sm text-destructive">تعذّر تحميل المنتجات. حاول مرة أخرى.</p>}
        {!chatProductContext && !loadingProducts && !productsError && products.length === 0 && <p className="text-sm">لا توجد منتجات متاحة حاليًا.</p>}
        {confirmedOrder && <motion.div initial={reduceMotion ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center space-y-4" role="status">
          <motion.div initial={reduceMotion ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 12 }}><CheckCircle2 className="h-16 w-16 mx-auto text-emerald-600" /></motion.div>
          <h3 className="text-xl font-bold">تم تأكيد طلبك بنجاح 🎉</h3><p className="font-semibold">{confirmedOrder.title}</p>
          <p>العرض المختار: {confirmedOrder.quantity} قطعة · {money(confirmedOrder.total)}</p><p className="text-sm">رقم الطلب: #{confirmedOrder.id}</p>
          <Button className="w-full rounded-full" onClick={() => { setPanel(null); navigate(`/order/${confirmedOrder.id}`); }}>تتبع الطلب</Button>
        </motion.div>}
        {product && !confirmedOrder && <>
          {product.hasVariants && <label className="grid gap-2 text-sm font-medium">خيارات المنتج
            <select className="w-full border rounded-xl p-3 bg-background" value={variantId} onChange={e => { setVariantId(e.target.value); setQuantity(1); }} disabled={order.isPending}>
              <option value="">اختر المقاس أو اللون</option>
              {variants.map(v => <option key={v.id} value={v.id}>{Object.values(v.attributes).join(" / ")}</option>)}
            </select>
          </label>}
          {panel === "offers" && <div className="space-y-3">
            {tiers.length === 0 && <p className="text-sm text-muted-foreground">لا توجد عروض كميات إضافية لهذا المنتج. السعر الحالي {money(variant?.priceOverride ?? product.price)}.</p>}
            <OfferCards product={product} variantPrice={variant?.priceOverride} stock={stock} disabled={!!product.hasVariants && !variant} onChoose={qty => { setQuantity(qty); setPanel("order"); }} />
          </div>}
          {panel === "policy" && policies.map(policy => {
            const entries = product.faq?.filter(entry => policy.match.test(entry.question)) || [];
            return <section key={policy.title} className="rounded-2xl border p-4 space-y-2"><h3 className="font-bold">{policy.title}</h3>{entries.length ? entries.map(entry => <div key={entry.question}><p className="text-sm font-medium">{entry.question}</p><p className="text-sm whitespace-pre-line text-muted-foreground">{entry.answer}</p></div>) : <p className="text-sm text-muted-foreground">لم تُضف تفاصيل {policy.title} لهذا المنتج بعد. تواصل مع المتجر للتأكد قبل الطلب.</p>}</section>;
          })}
          {panel === "order" && <motion.form key={activeId} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="space-y-3">
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4"><p className="text-xs text-amber-800 dark:text-amber-200">اختيارك الحالي ✨</p><p className="font-bold">{product.title} · {quantity} قطعة</p><p className="font-bold text-xl mt-1">{money(unitPrice * quantity)}</p></motion.div>
            <label className="grid gap-1 text-sm">الكمية<Input type="number" min={1} max={stock} required value={quantity} onChange={e => setQuantity(Number(e.target.value))} disabled={order.isPending} /></label>
            <p className="text-sm font-bold">الإجمالي: {money(unitPrice * quantity)} <span className="font-normal text-muted-foreground">· متوفر {stock} قطعة</span></p>
            <label className="grid gap-1 text-sm">الاسم الكامل<Input autoComplete="name" required value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} disabled={order.isPending} /></label>
            <label className="grid gap-1 text-sm">رقم الجوال<Input type="tel" autoComplete="tel" required value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} disabled={order.isPending} /></label>
            <label className="grid gap-1 text-sm">المنطقة<select className="w-full border rounded-xl p-3 bg-background" value={form.region} onChange={e => setForm({ ...form, region: e.target.value, cityId: "" })} disabled={order.isPending}>{Object.keys(regions).map(region => <option key={region}>{region}</option>)}</select></label>
            <label className="grid gap-1 text-sm">المدينة<select required className="w-full border rounded-xl p-3 bg-background" value={form.cityId} onChange={e => setForm({ ...form, cityId: e.target.value })} disabled={order.isPending}><option value="">اختر المدينة</option>{cities.filter(c => c.isActive !== false && regions[form.region]?.includes(c.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="grid gap-1 text-sm">العنوان بالتفصيل<Input autoComplete="street-address" required value={form.addressRaw} onChange={e => setForm({ ...form, addressRaw: e.target.value })} disabled={order.isPending} /></label>
            <label className="grid gap-1 text-sm">العنوان الوطني المختصر<Input dir="ltr" placeholder="ABCD1234" pattern="[A-Za-z]{4}[0-9]{4}" title="4 أحرف إنجليزية ثم 4 أرقام" maxLength={8} required value={form.nationalAddress} onChange={e => setForm({ ...form, nationalAddress: e.target.value.toUpperCase().replace(/\s/g, "") })} disabled={order.isPending} /><span className="text-xs text-muted-foreground">أربعة أحرف وأربعة أرقام من عنوانك الوطني.</span></label>
            {order.isError && <p role="alert" className="text-sm text-destructive">تعذّر تأكيد الطلب: {order.error.message}</p>}
            <Button type="submit" className="w-full rounded-full bg-[#159947] hover:bg-[#117d39] text-white min-h-11" disabled={order.isPending || stock < 1 || quantity < 1 || quantity > stock || (product.hasVariants && !variant)}>{order.isPending ? "جاري تأكيد الطلب..." : "تأكيد الطلب — الدفع عند الاستلام"}</Button>
          </motion.form>}
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
