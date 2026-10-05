import { motion, useReducedMotion } from "framer-motion";
import { Package, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUnitPricingForQuantity } from "@/lib/pricing";

export default function OfferCards({ product, variantPrice, stock, onChoose, disabled = false }: { product: any; variantPrice?: number | null; stock: number; onChoose: (quantity: number) => void; disabled?: boolean }) {
  const reduceMotion = useReducedMotion();
  const { tiers } = getUnitPricingForQuantity(product, 1, variantPrice);
  const offers = tiers.length ? tiers : [{ qty: 1, label: "قطعة واحدة", originalPrice: product.price, finalPrice: variantPrice ?? product.price }];
  const money = (value: number) => `${value.toLocaleString("ar-SA")} ر.س`;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" dir="rtl">
    {offers.map((tier, index) => {
      const saving = Math.max(0, (tier.originalPrice - tier.finalPrice) * tier.qty);
      const highlighted = tier.qty === 2 || tier.qty === 3;
      const available = tier.qty <= stock;
      return <motion.button key={tier.qty} type="button" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : index * .07 }} whileHover={reduceMotion ? undefined : { y: -3 }} whileTap={reduceMotion ? undefined : { scale: .97 }} disabled={disabled || !available} onClick={() => onChoose(tier.qty)} className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-bl p-5 sm:p-6 text-right shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600", highlighted ? "border-amber-400 border-2 from-amber-50 to-orange-50 dark:from-amber-950 dark:to-card shadow-amber-500/15 shadow-lg" : "border-emerald-600/25 from-emerald-50 to-white dark:from-emerald-950 dark:to-card", offers.length === 1 && "sm:col-span-2 lg:col-span-3")}>
        {highlighted && <span className="block mb-3 text-xs font-bold text-amber-800 dark:text-amber-200">{tier.qty === 2 ? "باقة القطعتين ✨" : "باقة الثلاث قطع 🎁"}</span>}
        {saving > 0 && <span className="inline-flex rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white mb-3">وفّر {money(saving)}</span>}
        <span className="flex items-center gap-2 text-base font-bold"><Package className="h-4 w-4 text-emerald-600" />{tier.label || `${tier.qty} قطع`}</span>
        <span className="block text-xs text-muted-foreground mt-1">عدد القطع: {tier.qty}</span>
        <span className="block text-3xl sm:text-4xl font-extrabold mt-3 text-emerald-800 dark:text-emerald-200">{money(tier.finalPrice * tier.qty)}</span>
        {saving > 0 && <span className="block text-xs text-muted-foreground line-through">{money(tier.originalPrice * tier.qty)}</span>}
        <span className="block text-[11px] text-muted-foreground mt-1">{money(tier.finalPrice)} للقطعة</span>
        <span className="mt-4 flex items-center justify-between rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white">{available ? "اختار العرض واطلب الآن" : "غير متوفر بهذه الكمية"}{available ? <ArrowLeft className="h-4 w-4" /> : <Check className="h-4 w-4" />}</span>
      </motion.button>;
    })}
  </div>;
}
