import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatPrice } from "@/lib/mockData";
import { useFahd } from "@/lib/fahd-store";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Star, Minus, Plus, Truck, CreditCard, ShieldCheck, ArrowRight, ShoppingCart } from "lucide-react";
import { useState } from "react";

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { openOrderSheet, addToCart, setChatProductContext } = useFahd();
  const { toast } = useToast();
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);

  const { data: rawProduct, isLoading } = useQuery<any>({
    queryKey: ["/api/products", params.id],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="w-full aspect-square rounded-[24px]" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-8 w-1/3" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!rawProduct) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
          <p className="text-xl font-bold text-foreground">أوه! المنتج مو موجود 😕</p>
          <Button variant="outline" onClick={() => navigate("/")} data-testid="button-back-home" className="min-h-[44px]">
            <ArrowRight className="w-4 h-4 ml-1" />
            رجعني للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  const product = rawProduct as any;
  const displayImage = product.images?.find((img: any) => img?.isPrimary)?.url
    || product.images?.[0]?.url
    || product.image
    || "";
  const pricingTiers: { qty: number; label?: string; originalPrice: number; finalPrice: number }[] = product.pricingTiers ?? [];
  const hasTiers = pricingTiers.length > 0;
  const activeTier = hasTiers ? pricingTiers[selectedTierIdx] : null;
  const displayPrice = activeTier ? activeTier.finalPrice : (product.pricing?.price ?? product.price ?? 0);
  const displayOldPrice = activeTier ? activeTier.originalPrice : (product.pricing?.compareAt ?? product.oldPrice ?? null);
  const displayStock = product.inventory?.stockTotal ?? product.stock ?? 0;
  const displayRating = product.rating ?? 0;
  const displayFaq: { question: string; answer: string }[] = product.faq ?? [];
  const displayBadges: string[] = product.badges ?? [];
  const displaySpecs: { key: string; value: string }[] = product.specs ?? [];

  const colors: { name: string; value: string }[] =
    product.variants?.colors ??
    (product.variants ?? [])
      .filter((v: any) => v.attributes?.color)
      .map((v: any) => ({ name: v.attributes.color, value: "#888" })) ?? [];

  const sizes: string[] =
    product.variants?.sizes ??
    [...new Set(
      (product.variants ?? [])
        .filter((v: any) => v.attributes?.size)
        .map((v: any) => v.attributes.size as string)
    )];

  const featuresContent = displaySpecs.length > 0
    ? displaySpecs.map(s => `${s.key}: ${s.value}`).join("\n")
    : product.descriptionLong || product.descriptionShort || "منتج عالي الجودة بمواصفات ممتازة.";

  const shippingContent = "التوصيل خلال 1-3 أيام عمل داخل المملكة العربية السعودية.\nالشحن مجاني للطلبات فوق 200 ر.س.\nيمكنك تتبع طلبك عبر رقم الشحنة.";

  const warrantyContent = "ضمان سنة كاملة على المنتج.\nإمكانية الاستبدال خلال 7 أيام من الاستلام.\nالمنتج يجب أن يكون بحالته الأصلية عند الاستبدال.";

  const handleQuickChat = (message: string) => {
    setChatProductContext({
      product: product,
      autoMessage: message,
      image: displayImage,
    });
    navigate("/chat");
  };

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      <Header />

      <main className="max-w-3xl mx-auto">
        <div className="px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-sm text-muted-foreground mb-4 min-h-[44px]"
            data-testid="button-back"
          >
            <ArrowRight className="w-4 h-4" />
            <span>رجوع</span>
          </button>
        </div>

        <div className="bg-muted/30 rounded-[24px] mx-4 overflow-hidden mb-4 animate-fade-in">
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              className="w-full aspect-square object-cover"
              data-testid="img-product-main"
            />
          ) : (
            <div className="w-full aspect-square flex items-center justify-center text-muted-foreground text-6xl">
              📦
            </div>
          )}
        </div>

        <div className="px-4 space-y-4 animate-slide-up-spring">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-[#CDEB63] text-[#CDEB63]" />
                <span className="text-sm font-medium">{displayRating}</span>
              </div>
              <span className="text-xs text-muted-foreground">({displayStock} متوفر)</span>
            </div>
            <h1 className="text-xl font-bold text-foreground leading-relaxed" data-testid="text-product-title">
              {product.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-2xl font-bold text-foreground" data-testid="text-product-price">
                {formatPrice(displayPrice)}
              </span>
              {displayOldPrice && (
                <span className="text-base text-muted-foreground line-through">
                  {formatPrice(displayOldPrice)}
                </span>
              )}
              {displayOldPrice && (
                <Badge className="bg-destructive/10 text-destructive border-0 text-xs no-default-hover-elevate">
                  وفّر {formatPrice(displayOldPrice - displayPrice)}
                </Badge>
              )}
            </div>
          </div>

          {displayBadges.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
              {displayBadges.map((badge: string) => {
                const icon =
                  badge.includes("شحن") ? <Truck className="w-3 h-3" /> :
                    badge.includes("دفع") ? <CreditCard className="w-3 h-3" /> :
                      <ShieldCheck className="w-3 h-3" />;
                return (
                  <Badge
                    key={badge}
                    variant="outline"
                    className="shrink-0 text-xs gap-1 no-default-hover-elevate"
                  >
                    {icon}
                    {badge}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="shrink-0 text-xs gap-1 no-default-hover-elevate">
                <Truck className="w-3 h-3" />
                شحن سريع 1-3 أيام
              </Badge>
              <Badge variant="outline" className="shrink-0 text-xs gap-1 no-default-hover-elevate">
                <CreditCard className="w-3 h-3" />
                الدفع عند الاستلام
              </Badge>
              <Badge variant="outline" className="shrink-0 text-xs gap-1 no-default-hover-elevate">
                <ShieldCheck className="w-3 h-3" />
                ضمان سنة
              </Badge>
            </div>
          )}

          {colors.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">اللون</h3>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color: { name: string; value: string }, i: number) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(i)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all min-h-[44px] active:scale-95 ${i === selectedColor
                        ? "border-[#CDEB63] bg-[#CDEB63]/10"
                        : "border-border bg-card"
                      }`}
                    data-testid={`chip-color-${color.name}`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-border/50"
                      style={{ backgroundColor: color.value }}
                    />
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">المقاس</h3>
              <div className="flex gap-2 flex-wrap">
                {sizes.map((size: string, i: number) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(i)}
                    className={`px-4 py-2 rounded-xl border text-sm transition-all min-h-[44px] active:scale-95 ${i === selectedSize
                        ? "border-[#CDEB63] bg-[#CDEB63]/10 font-semibold"
                        : "border-border bg-card"
                      }`}
                    data-testid={`chip-size-${size}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasTiers ? (
            <div>
              <h3 className="text-sm font-semibold mb-2">اختر الكمية</h3>
              <div className="flex gap-2 flex-wrap">
                {pricingTiers.map((tier, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTierIdx(i)}
                    className={`px-4 py-3 rounded-xl border text-sm transition-all text-right min-w-[100px] min-h-[44px] active:scale-95 ${
                      i === selectedTierIdx
                        ? "border-[#CDEB63] bg-[#CDEB63]/10"
                        : "border-border bg-card"
                    }`}
                    data-testid={`chip-tier-${tier.qty}`}
                  >
                    <div className="font-semibold">{tier.label || `${tier.qty} قطعة`}</div>
                    {tier.originalPrice > tier.finalPrice && (
                      <div className="text-xs text-muted-foreground line-through">{formatPrice(tier.originalPrice)}</div>
                    )}
                    <div className="text-base font-bold text-foreground">{formatPrice(tier.finalPrice)}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold mb-2">الكمية</h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="min-h-[44px] min-w-[44px]"
                  data-testid="button-qty-minus"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-lg font-bold min-w-[2rem] text-center" data-testid="text-quantity">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(displayStock || 99, quantity + 1))}
                  disabled={quantity >= (displayStock || 99)}
                  className="min-h-[44px] min-w-[44px]"
                  data-testid="button-qty-plus"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="features">
              <AccordionTrigger className="text-sm font-semibold" data-testid="accordion-features">
                وش يميزه؟
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {featuresContent}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger className="text-sm font-semibold" data-testid="accordion-shipping">
                متى يوصل؟
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {shippingContent}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="warranty">
              <AccordionTrigger className="text-sm font-semibold" data-testid="accordion-warranty">
                الضمان والاستبدال؟
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {warrantyContent}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {displayFaq.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              {displayFaq.map((item: { question: string; answer: string }, i: number) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm" data-testid={`accordion-faq-${i}`}>
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}

        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/50 p-3">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl min-h-[48px] min-w-[48px]"
            onClick={() => {
              const color = colors[selectedColor]?.name || "";
              const size = sizes[selectedSize] || "";
              addToCart(product, quantity, color, size);
              toast({
                title: "انضاف للسلة ✅",
                description: `${product.title} (${quantity})`,
              });
            }}
            data-testid="button-add-cart"
          >
            <ShoppingCart className="w-5 h-5" />
          </Button>
          <Button
            className="flex-1 rounded-xl bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] font-bold text-base gap-2 min-h-[48px]"
            onClick={() => openOrderSheet(hasTiers ? { ...product, pricing: { ...product.pricing, price: activeTier!.finalPrice, compareAt: activeTier!.originalPrice } } : product)}
            data-testid="button-order-now"
          >
            اطلب الآن - {formatPrice(hasTiers ? activeTier!.finalPrice : displayPrice * quantity)}
          </Button>
        </div>
      </div>
    </div>
  );
}
