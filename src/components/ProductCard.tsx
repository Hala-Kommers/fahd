import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart, Copy } from "lucide-react";
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
  const hasVariants = (p.variantOptions?.length ?? 0) > 0 || (p.variants?.length ?? 0) > 0;
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
      className="overflow-visible rounded-[20px] border-card-border p-0 group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
      data-testid={`card-product-${product.id}`}
    >
      <div
        className="w-full cursor-pointer text-right"
        onClick={() => navigate(`/product/${product.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") navigate(`/product/${product.id}`);
        }}
        data-testid={`link-product-${product.id}`}
      >
        <div className="relative overflow-hidden rounded-t-[20px] bg-muted/50 aspect-square">
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground">📦</div>
          )}
          {displayOldPrice && (
            <div className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[11px] font-semibold px-2 py-0.5 rounded-full">
              خصم {Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100)}%
            </div>
          )}
          {product.category && (
            <Badge
              variant="secondary"
              className="absolute bottom-3 right-3 text-[10px] no-default-hover-elevate"
            >
              {product.category}
            </Badge>
          )}
          <button
            type="button"
            onClick={copyProductId}
            className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur border border-border/60"
            data-testid={`button-copy-product-id-${product.id}`}
          >
            <Copy className="w-3 h-3" />
            ID {product.id}
          </button>
        </div>

        <div className="p-3 pb-2">
          <h3 className="font-semibold text-sm leading-relaxed line-clamp-2 text-foreground mb-1">
            {product.title}
          </h3>
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3.5 h-3.5 fill-[#CDEB63] text-[#CDEB63]" />
            <span className="text-xs text-muted-foreground">{product.rating}</span>
            {product.salesCount && product.salesCount > 100 && (
              <span className="text-[10px] text-muted-foreground">| {product.salesCount}+ مبيع</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base text-foreground">{formatPrice(displayPrice)}</span>
            {displayOldPrice && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(displayOldPrice)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 flex gap-2">
          <Button
            className="flex-1 rounded-xl bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] font-semibold min-h-[44px]"
            onClick={(e) => {
              e.stopPropagation();
              setChatProductContext({
                product,
                productId: Number(product.id),
                image: displayImage,
              });
              navigate("/chat");
            }}
            data-testid={`button-order-${product.id}`}
          >
          اطلبه الحين
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleAddToCart}
          className="min-h-[44px] min-w-[44px]"
          data-testid={`button-addcart-${product.id}`}
        >
          <ShoppingCart className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
