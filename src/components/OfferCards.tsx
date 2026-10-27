import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { offerExperiment } from "@/lib/commerce";
import { cn } from "@/lib/utils";
import { getPurchaseOffers, getTierTotal, getTierUnitPrice } from "@/lib/pricing";

type OfferCardsProps = {
  product: any;
  variantPrice?: number | null;
  stock: number;
  onChoose: (quantity: number) => void;
  disabled?: boolean;
  selectedQuantity?: number;
  mode?: "choose" | "select";
};

const money = (value: number) => `${value.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س`;
const quantityLabel = (quantity: number) => quantity === 1 ? "قطعة واحدة" : quantity === 2 ? "قطعتان" : `${quantity} قطع`;

export default function OfferCards({
  product,
  variantPrice,
  stock,
  onChoose,
  disabled = false,
  selectedQuantity,
  mode = "choose",
}: OfferCardsProps) {
  const reduceMotion = useReducedMotion();
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);
  const offers = getPurchaseOffers(product, variantPrice);
  const availableOffers = offers.filter(offer => offer.qty <= stock);
  const bestUnitPrice = Math.min(...availableOffers.map(getTierUnitPrice));
  const isControl = offerExperiment() === "offer-value-v1:control";

  return <div className="grid grid-cols-3 gap-2" dir="rtl" role="group" aria-label="اختر عرض المنتج">
    {offers.map(tier => {
      const total = getTierTotal(tier);
      const unitPrice = getTierUnitPrice(tier);
      const saving = Math.max(0, Math.round((tier.originalPrice * tier.qty - total) * 100) / 100);
      const available = tier.qty <= stock;
      const isBest = available && unitPrice === bestUnitPrice && availableOffers.some(offer => getTierUnitPrice(offer) > bestUnitPrice);
      const highlighted = isControl ? tier.qty === 2 || tier.qty === 3 : isBest;
      const selectionKey = `${product.id}:${variantPrice ?? product.price}:${tier.qty}`;
      const selected = selectedQuantity != null ? selectedQuantity === tier.qty : selectedOffer === selectionKey;
      const approximateUnit = Math.abs(unitPrice * 100 - Math.round(unitPrice * 100)) > 0.000001;
      const unitLabel = `${approximateUnit ? "نحو " : ""}${money(unitPrice)} للقطعة`;

      return <motion.button
        key={tier.qty}
        type="button"
        aria-pressed={selected}
        aria-label={`${quantityLabel(tier.qty)}، الإجمالي ${money(total)}، ${unitLabel}${isBest ? "، أفضل سعر للقطعة" : ""}${!available ? "، غير متوفر" : ""}`}
        initial={false}
        whileTap={reduceMotion || disabled || !available ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        disabled={disabled || !available}
        onClick={() => { setSelectedOffer(selectionKey); onChoose(tier.qty); }}
        className={cn(
          "group relative flex min-w-0 flex-col items-center rounded-xl border p-2 text-center transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          mode === "select" ? "min-h-[100px] justify-start" : "gap-1.5",
          highlighted
            ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-100"
            : "border-border bg-background text-foreground hover:border-emerald-500 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/60",
          selected && "border-emerald-700 bg-emerald-700 text-white ring-1 ring-emerald-700 dark:border-emerald-300 dark:bg-emerald-300 dark:text-emerald-950 dark:ring-emerald-300",
          offers.length === 1 && "col-span-3",
        )}
      >
        {selected && <Check className="absolute left-1 top-1 h-3 w-3" aria-hidden="true" />}
        <span className={cn("px-2 text-xs font-semibold leading-5", mode === "select" && "mb-0.5")}>
          {mode === "select" ? quantityLabel(tier.qty) : tier.label || quantityLabel(tier.qty)}
        </span>
        <span className={cn("block text-lg font-extrabold leading-7 tabular-nums", selected ? "text-white dark:text-emerald-950" : "text-emerald-900 dark:text-emerald-100")}>
          {money(total)}
        </span>
        <span className={cn("block text-[11px] leading-4 tabular-nums",selected ? "text-emerald-50 dark:text-emerald-900" : "text-emerald-800 dark:text-emerald-200")}>{unitLabel}</span>
        {!available ? <span className="text-[10px] font-medium leading-4 text-muted-foreground">غير متوفر</span>
          : isBest && <span className={cn("rounded px-1 text-[10px] font-bold leading-4",selected ? "bg-white text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "bg-emerald-700 text-white dark:bg-emerald-300 dark:text-emerald-950")}>الأوفر للقطعة</span>}
        {mode === "choose" && <>
          {saving > 0 && <span className={cn("text-[11px] font-semibold leading-4",selected ? "text-emerald-50 dark:text-emerald-900" : "text-emerald-800 dark:text-emerald-200")}>وفّر {money(saving)}</span>}
          <span className={cn(
            "mt-auto flex min-h-8 w-full items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-bold",
            selected ? "bg-emerald-700 text-white dark:bg-emerald-300 dark:text-emerald-950" : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100",
          )}>
            {!available ? "غير متوفر" : selected ? "تم الاختيار" : "اختيار العرض"}
            {available && (selected ? <Check className="h-3 w-3" aria-hidden="true" /> : <ArrowLeft className="h-3 w-3" aria-hidden="true" />)}
          </span>
        </>}
      </motion.button>;
    })}
  </div>;
}
