import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chatCredentials } from "@/lib/commerce";
import { apiRequest } from "@/lib/queryClient";
import { motion, useReducedMotion } from "framer-motion";
import { Clock3 } from "lucide-react";


export default function ChatOfferBanner({ productId, sessionId }: { productId: number; sessionId: string | null }) {
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { data: offer } = useQuery<{ available: boolean; endsAt?: string; originalPrice?: number; offerPrice?: number }>({
    queryKey: ["session-offer", sessionId, productId], enabled: !!sessionId,
    queryFn: async () => { const response = await apiRequest("POST", "/api/offers/session", { ...chatCredentials(), sessionId, productId }); return (await response.json()).data; },
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
  return <>
    <div dir="ltr" className="mb-1.5 h-7 overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-800 to-emerald-950 text-white text-[11px] font-semibold flex items-center shadow-sm border-y border-emerald-700/50" aria-label="معلومات الشحن والدفع">
      <div className="chat-benefits-ticker flex w-max shrink-0" >
        {[0, 1].map(copy => <div key={copy} dir="rtl" aria-hidden={copy === 1 ? true : undefined} className="flex shrink-0 items-center gap-8 px-4 whitespace-nowrap">
          <span>شحن سريع لكل مناطق المملكة 🚚</span><span className="text-lime-200/60" aria-hidden="true">│</span><span>الدفع عند الاستلام 💵</span><span className="text-lime-200/60" aria-hidden="true">│</span>
        </div>)}
      </div>
    </div>
    {(seconds > 0 || expired) && <div dir="rtl" className="mx-3 mb-1.5 rounded-2xl border border-white/70 bg-gradient-to-l from-lime-50 via-green-50 to-emerald-50 dark:from-emerald-950 dark:to-emerald-900 px-3 py-1 text-[11px] text-emerald-950 dark:text-emerald-100 shadow-[0_2px_12px_rgba(16,185,129,0.12)]" data-testid="chat-offer-banner">
    {seconds > 0 && <div className="flex items-center justify-between gap-2"><div className="flex-1 border-l border-lime-300/70 pl-2"><p className="font-bold text-xs">🔥 العرض ينتهي خلال</p><p className="mt-0 text-[9px] text-emerald-800/70 dark:text-emerald-200">اغتنم العرض قبل انتهاء الوقت!</p></div><div dir="ltr" className="flex items-center gap-1.5" aria-label={`الوقت المتبقي ${countdown}`}>
      <Clock3 className="h-5 w-5 text-emerald-700" aria-hidden="true" />
      {countdown.split(':').map((value, index) => <span key={index} className="text-center"><span className="block overflow-hidden rounded-lg bg-gradient-to-b from-emerald-700 to-emerald-900 px-1.5 py-0.5 text-white shadow-sm"><motion.strong key={value} initial={reduceMotion ? false : { y: -7, opacity: .3 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .2 }} className="block font-mono text-sm leading-4 tabular-nums">{value}</motion.strong></span><span className="block mt-0 text-[8px] text-emerald-800/70 dark:text-emerald-200">{['ساعة', 'دقيقة', 'ثانية'][index]}</span></span>)}
    </div></div>}
    {expired && <span className="block text-center">انتهى العرض</span>}
  </div>}</>;
}
