import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Copy } from "lucide-react";
import ProductRating from "@/components/ProductRating";
import type { Product } from "@shared/schema";
import type { MouseEvent } from "react";
import { formatPrice } from "@/lib/mockData";
import { useFahd } from "@/lib/fahd-store";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, setChatProductContext } = useFahd();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const p = product as any;
  const displayImage = p.primaryImage || p.images?.find((img: any) => img?.isPrimary)?.url || p.images?.[0]?.url || p.image || "";
  const displayPrice = p.pricing?.price ?? p.price ?? 0;
  const displayOldPrice = p.pricing?.compareAt ?? p.compareAt ?? p.oldPrice ?? null;
  const hasVariants = p.hasVariants || (p.variantOptions?.length ?? 0) > 0 || (p.variants?.length ?? 0) > 0;
  const firstColor = p.variants?.colors?.[0]?.name
    || (p.variants ?? []).find((v: any) => v.attributes?.color)?.attributes?.color
    || "";
  const firstSize = p.variants?.sizes?.[0]
    || (p.variants ?? []).find((v: any) => v.attributes?.size)?.attributes?.size
    || "";

  const copyProductId = async (e: MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(String(product.id));
    toast({ title: "تم نسخ رقم المنتج" });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasVariants) {
      toast({ title: "اختر الخيارات أولاً", description: product.title, variant: "destructive" });
      navigate(`/product/${product.id}`);
      return;
    }
    addToCart(product, 1, firstColor, firstSize);
    toast({
      title: "انضاف للسلة ✅",
      description: product.title,
    });
  };

  return (
    <Card
      className="h-full flex flex-col overflow-visible rounded-2xl border-card-border p-0 group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
      data-testid={`card-product-${product.id}`}
    >
      <div
        className="w-full cursor-pointer text-right"
        onClick={() => navigate(`/product/${product.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            navigate(`/product/${product.id}`);
          }
        }}
        data-testid={`link-product-${product.id}`}
      >
        <div className="relative overflow-hidden rounded-t-2xl bg-muted/50 aspect-[4/3]">
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy" decoding="async" width={400} height={400}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground">📦</div>
          )}
          {displayOldPrice && (
            <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              خصم {Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100)}%
            </div>
          )}
          {product.category && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 right-2 text-[10px] no-default-hover-elevate"
            >
              {product.category}
            </Badge>
          )}
          <button
            type="button"
            onClick={copyProductId}
            aria-label={`نسخ رقم المنتج ${product.id}`}
            className="absolute top-0 right-0 inline-flex min-h-11 min-w-11 items-start justify-center p-2 text-[10px] font-semibold text-foreground"
            data-testid={`button-copy-product-id-${product.id}`}
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-1.5 py-0.5 shadow-sm backdrop-blur border border-border/60"><Copy className="w-3 h-3" />ID {product.id}</span>
          </button>
        </div>

        <div className="p-2.5 pb-2 space-y-1">
          <h3 className="font-semibold text-[13px] leading-5 min-h-10 line-clamp-2 text-foreground">
            {product.title}
          </h3>
          <ProductRating product={p} compact />
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-bold text-base text-foreground">{formatPrice(displayPrice)}</span>
            {displayOldPrice && (
              <span className="text-[11px] text-muted-foreground line-through">{formatPrice(displayOldPrice)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-2.5 pb-2.5 mt-auto flex gap-1.5">
          <Button
            className="min-w-0 flex-1 rounded-xl bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] font-semibold text-xs px-1 min-h-[44px]"
            onClick={(e) => {
              e.stopPropagation();
              setChatProductContext({
                product,
                productId: Number(product.id),
                image: displayImage,
              });
              navigate(`/chat/product/${product.id}`);
            }}
            data-testid={`button-order-${product.id}`}
          >
          اطلب الآن
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleAddToCart}
          className="shrink-0 rounded-xl min-h-[44px] min-w-[44px]"
          aria-label={`أضف ${product.title} للسلة`}
          data-testid={`button-addcart-${product.id}`}
        >
          <ShoppingCart className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
