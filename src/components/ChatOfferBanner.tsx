import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, useReducedMotion } from "framer-motion";
import { Clock3, PackageCheck } from "lucide-react";


export default function ChatOfferBanner({ productId, sessionId }: { productId: number; sessionId: string | null }) {
  const reduceMotion = useReducedMotion();
  const { data: product } = useQuery<{ stockTotal: number; lowStockThreshold?: number }>({
    queryKey: ["/api/products", String(productId)],
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const queryClient = useQueryClient();
  const { data: offer } = useQuery<{ available: boolean; endsAt?: string; originalPrice?: number; offerPrice?: number }>({
    queryKey: ["session-offer", sessionId, productId], enabled: !!sessionId,
    queryFn: async () => { const response = await apiRequest("POST", "/api/offers/session", { sessionId, productId }); return (await response.json()).data; },
    staleTime: Infinity,
  });
  const deadline = offer?.endsAt ? Date.parse(offer.endsAt) : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadline) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [deadline]);
  const seconds = deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : 0;
  const expired = !!deadline && now >= deadline;
  useEffect(() => {
    if (expired) queryClient.invalidateQueries({ queryKey: ["/api/products", String(productId)] });
  }, [expired, productId, queryClient]);
  const countdown = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, "0")).join(":");
  const stock = product?.stockTotal;
  const lowStock = typeof stock === "number" && stock > 0 && stock <= (product?.lowStockThreshold ?? 5);
  if (stock === undefined && !seconds) return null;
  return <div dir="rtl" className="mx-4 mb-2 rounded-xl border border-amber-400/50 bg-gradient-to-l from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-amber-950/50 px-3 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-amber-950 dark:text-amber-100" data-testid="chat-offer-banner">
    {seconds > 0 && <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />عرضك الخاص ينتهي خلال<motion.strong dir="ltr" key={countdown} initial={reduceMotion ? false : { opacity: .6, y: -2 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-amber-500 text-amber-950 px-2.5 py-1 font-mono text-sm tabular-nums shadow-sm">{countdown}</motion.strong></span>}
    {offer?.available && seconds > 0 && <span className="font-semibold">{offer.offerPrice} ر.س <span className="line-through opacity-60">{offer.originalPrice} ر.س</span></span>}
    {offer?.available && expired && <span>انتهى العرض · رجع السعر إلى {offer.originalPrice} ر.س</span>}
    {stock !== undefined && <span className="flex items-center gap-1.5"><PackageCheck className="h-3.5 w-3.5" />{stock === 0 ? "نفدت الكمية حاليًا" : lowStock ? `الكمية محدودة — باقي ${stock} قطع` : `متوفر الآن · ${stock} قطعة`}</span>}
  </div>;
}
