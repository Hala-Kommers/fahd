import { Star } from "lucide-react";

export default function ProductRating({ product }: { product: { id: string | number; reviews?: { rating: number }[] } }) {
  const reviews = (product.reviews ?? []).filter((review) => Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5);
  const seed = Array.from(String(product.id)).reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) >>> 0, 137);
  const demo = reviews.length === 0;
  const count = demo ? 500 + (Math.imul(seed, 2654435761) >>> 0) % 1401 : reviews.length;
  const rating = demo ? 4.5 + (seed % 5) / 10 : reviews.reduce((sum, review) => sum + review.rating, 0) / count;

  return (
    <div className="mt-1 space-y-0.5" aria-label={`${demo ? "تقييمات تجريبية" : "مراجعات موثقة"}: ${rating.toFixed(1)} من 5، ${count} تقييم`}>
      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        <span className="flex gap-0.5" dir="ltr" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index} className="relative block h-3 w-3">
              <Star className="h-3 w-3 fill-muted text-muted-foreground/30" />
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.min(1, Math.max(0, rating - index)) * 100}%` }}>
                <Star className="h-3 w-3 fill-orange-400 text-orange-400" />
              </span>
            </span>
          ))}
        </span>
        <b dir="ltr">{rating.toFixed(1)}/5</b>
        <span className="text-muted-foreground">· {count.toLocaleString("ar-SA")} تقييم</span>
      </div>
      <span className="block text-[11px] font-medium text-muted-foreground">{demo ? "تقييمات تجريبية" : "مراجعات مشتريات موثقة"}</span>
    </div>
  );
}
