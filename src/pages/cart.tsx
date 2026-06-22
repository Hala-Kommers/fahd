import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useFahd } from "@/lib/fahd-store";
import { formatPrice } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getUnitPricingForQuantity } from "@/lib/pricing";
import {
  ArrowRight,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Tag,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";

type CheckoutStep = "cart" | "info" | "payment" | "success";

type CityOption = { id: number; name: string; isActive?: boolean; sortOrder?: number };

function normalizeCoupon(
  payload: any,
): { code: string; type: "percentage" | "fixed"; value: number } | null {
  const source = payload?.coupon ?? payload?.data ?? payload;
  const code = source?.code;
  const rawType = String(
    source?.type || source?.discountType || "",
  ).toLowerCase();
  const value = Number(
    source?.value ?? source?.discount ?? source?.discountValue,
  );
  if (!code || Number.isNaN(value)) return null;

  const type: "percentage" | "fixed" = rawType.includes("percent")
    ? "percentage"
    : "fixed";
  return { code: String(code), type, value };
}

function normalizeCreatedOrder(payload: any): { orderNumber: string } | null {
  const source = payload?.data ?? payload;
  const orderNumber = source?.orderNumber;
  if (!orderNumber) return null;
  return { orderNumber: String(orderNumber) };
}

export default function CartPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const {
    cartItems,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    appliedCoupon,
    setAppliedCoupon,
    getCartTotal,
    getCartDiscount,
  } = useFahd();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [step, setStep] = useState<CheckoutStep>("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [cityId, setCityId] = useState<number | null>(null);
  const [addressZone, setAddressZone] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderResult, setOrderResult] = useState<{
    orderNumber: string;
  } | null>(null);

  const subtotal = getCartTotal();
  const discount = getCartDiscount();
  const total = subtotal - discount;

  const { data: cities = [], isLoading: citiesLoading } = useQuery<CityOption[]>({
    queryKey: ["/api/cities"],
  });

  const activeCities = cities.filter((city) => city.isActive !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const couponMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/coupons/validate", {
        code,
        subtotal,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      const normalizedCoupon = normalizeCoupon(data);
      if (!normalizedCoupon) {
        setCouponError("صيغة استجابة الكوبون غير متوقعة");
        return;
      }
      setAppliedCoupon(normalizedCoupon);
      setCouponError("");
      setCouponInput("");
    },
    onError: () => {
      setCouponError("الكوبون مو شغّال أو خلصت صلاحيته 😕");
    },
  });

  const orderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      const normalizedOrder = normalizeCreatedOrder(data);
      if (!normalizedOrder) {
        toast({
          title: "تم إنشاء الطلب",
          description: "لكن رقم الطلب غير متوفر في الاستجابة",
        });
        return;
      }
      setOrderResult(normalizedOrder);
      setStep("success");
      clearCart();
    },
    onError: (error: any) => {
      toast({
        title: "فشل إنشاء الطلب",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setStep("info");
  };

  const handleSubmitInfo = () => {
    if (
      !customerName.trim() ||
      !customerPhone.trim() ||
      !customerAddress.trim() ||
      !cityId
    )
      return;
    setStep("payment");
  };

  const handleConfirmOrder = () => {
    if (!paymentMethod) return;
    const firstItem = cartItems[0];
    const normalizedPaymentMethod = paymentMethod === "paymob" ? "Paymob" : "COD";
    orderMutation.mutate({
      productId: firstItem.product.id,
      variantId: firstItem.variantId ?? undefined,
      variant: `${firstItem.color}${firstItem.size ? " - " + firstItem.size : ""}`,
      quantity: firstItem.quantity,
      customerName,
      customerPhone,
      customerAddress,
      addressRaw: customerAddress,
      cityId,
      addressZone: addressZone.trim() || undefined,
      addressDistrict: addressDistrict.trim() || undefined,
      customerEmail: "",
      paymentMethod: normalizedPaymentMethod,
      couponCode: appliedCoupon?.code,
      totalAmount: total,
      items: cartItems.map((item) => ({
        productId: item.product.id,
        variantId: item.variantId ?? undefined,
        qty: item.quantity,
        quantity: item.quantity,
        color: item.color || undefined,
        size: item.size || undefined,
      })),
    });
  };

  if (step === "success" && orderResult) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center text-center gap-6 animate-scale-in">
          <div className="w-24 h-24 rounded-full bg-[#CDEB63]/20 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-[#8ab525]" />
          </div>
          <h1
            className="text-2xl font-bold text-foreground"
            data-testid="text-order-success"
          >
            تم الطلب يا بطل! 🎉
          </h1>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              رقم الطلب:{" "}
              <span
                className="font-bold text-foreground"
                data-testid="text-order-number"
              >
                {orderResult.orderNumber}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              يوصلك خلال 1-3 أيام عمل داخل السعودية إن شاء الله 🚚
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              className="rounded-xl bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] font-semibold min-h-[44px]"
              onClick={() => navigate("/")}
              data-testid="button-continue-shopping"
            >
              يالله نكمّل تسوق
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-48">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => {
              if (step !== "cart") {
                setStep(step === "payment" ? "info" : "cart");
              } else {
                navigate("/");
              }
            }}
            className="text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
            data-testid="button-cart-back"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">
            {step === "cart"
              ? "سلّتك 🛒"
              : step === "info"
                ? "وين نوصّلك؟"
                : "كيف تبي تدفع؟"}
          </h1>
          {step === "cart" && cartItems.length > 0 && (
            <Badge variant="secondary" className="mr-auto">
              {cartItems.length}
            </Badge>
          )}
        </div>

        {step === "cart" && (
          <>
            {cartItems.length === 0 ? (
              <div className="text-center py-16 space-y-4 animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  سلّتك فاضية يا صاحبي 😅
                </h2>
                <p className="text-sm text-muted-foreground">
                  تصفّح المنتجات وأضف اللي يعجبك!
                </p>
                <Button
                  className="rounded-xl bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] font-semibold min-h-[44px]"
                  onClick={() => navigate("/")}
                  data-testid="button-browse-products"
                >
                  يالله نتصفّح
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  (() => {
                    const pricing = getUnitPricingForQuantity(item.product, item.quantity, item.variantPrice);
                    const itemTotal = pricing.unitPrice * item.quantity;

                    return (
                  <Card
                    key={`${item.product.id}-${item.variantId ?? item.color}-${item.size}`}
                    className="rounded-xl p-3 border-card-border animate-slide-in-right"
                    style={{ animationDelay: `${idx * 0.08}s` }}
                    data-testid={`cart-item-${item.product.id}`}
                  >
                    <div className="flex gap-3">
                      <img
                        src={
                          (item.product as any).primaryImage ||
                          (item.product as any).images?.find(
                            (img: any) => img?.isPrimary,
                          )?.url ||
                          (item.product as any).images?.[0]?.url ||
                          (item.product as any).image ||
                          ""
                        }
                        alt={item.product.title}
                        className="w-20 h-20 rounded-xl object-cover bg-muted shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold line-clamp-2">
                            {item.product.title}
                          </h3>
                          <button
                            onClick={() => removeFromCart(item.product.id, item.variantId)}
                            className="text-muted-foreground shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            data-testid={`button-remove-${item.product.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {item.color && (
                            <Badge
                              variant="outline"
                              className="text-[10px] no-default-hover-elevate"
                            >
                              {item.color}
                            </Badge>
                          )}
                          {item.size && (
                            <Badge
                              variant="outline"
                              className="text-[10px] no-default-hover-elevate"
                            >
                              {item.size}
                            </Badge>
                          )}
                          {item.variantLabel && (
                            <Badge
                              variant="outline"
                              className="text-[10px] no-default-hover-elevate"
                            >
                              {item.variantLabel}
                            </Badge>
                          )}
                          {pricing.activeTier && (
                            <Badge
                              className="text-[10px] bg-[#CDEB63]/15 text-[#5f7f13] border-0 no-default-hover-elevate"
                            >
                              سعر {pricing.activeTier.label || `${pricing.activeTier.qty}+`}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                          <span className="font-bold text-sm">
                            {formatPrice(itemTotal)}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 min-h-[44px] min-w-[44px]"
                              onClick={() =>
                                updateCartQuantity(
                                  item.product.id,
                                  item.quantity - 1,
                                  item.variantId,
                                )
                              }
                              data-testid={`button-qty-minus-${item.product.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span
                              className="text-sm font-bold min-w-[1.5rem] text-center"
                              data-testid={`text-qty-${item.product.id}`}
                            >
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 min-h-[44px] min-w-[44px]"
                              onClick={() =>
                                updateCartQuantity(
                                  item.product.id,
                                  Math.min(
                                    (item.product as any).inventory
                                      ?.stockTotal ??
                                      (item.product as any).stock ??
                                      999,
                                    item.quantity + 1,
                                  ),
                                  item.variantId,
                                )
                              }
                              data-testid={`button-qty-plus-${item.product.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                    );
                  })()
                ))}

                <Card
                  className="rounded-xl p-4 border-card-border animate-fade-in-up"
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-[#8ab525]" />
                    <span className="text-sm font-semibold">عندك كوبون؟</span>
                  </div>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-[#CDEB63]/10 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#8ab525]" />
                        <span className="text-sm font-medium">
                          {appliedCoupon.code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          (
                          {appliedCoupon.type === "percentage"
                            ? `${appliedCoupon.value}%`
                            : formatPrice(appliedCoupon.value)}{" "}
                          خصم)
                        </span>
                      </div>
                      <button
                        onClick={() => setAppliedCoupon(null)}
                        className="text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
                        data-testid="button-remove-coupon"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value);
                          setCouponError("");
                        }}
                        placeholder="حط كود الخصم هنا..."
                        className="flex-1 rounded-lg min-h-[44px]"
                        data-testid="input-coupon"
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          couponInput && couponMutation.mutate(couponInput)
                        }
                        disabled={couponMutation.isPending || !couponInput}
                        className="min-h-[44px]"
                        data-testid="button-apply-coupon"
                      >
                        {couponMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "طبّق"
                        )}
                      </Button>
                    </div>
                  )}
                  {couponError && (
                    <p
                      className="text-xs text-destructive mt-2"
                      data-testid="text-coupon-error"
                    >
                      {couponError}
                    </p>
                  )}
                </Card>
              </div>
            )}
          </>
        )}

        {step === "info" && (
          <div className="space-y-4 animate-fade-in-up">
            <Card className="rounded-xl p-4 border-card-border space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  اسمك الكامل
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="محمد عبدالله"
                  className="rounded-lg min-h-[44px]"
                  data-testid="input-checkout-name"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  رقم الجوال
                </label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="rounded-lg min-h-[44px]"
                  data-testid="input-checkout-phone"
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  المنطقة
                </label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 min-h-[44px]"
                  value={cityId ?? ""}
                  onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
                  data-testid="select-checkout-city"
                  disabled={citiesLoading}
                >
                  <option value="">اختر المنطقة</option>
                  {activeCities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">
                    المدينة
                  </label>
                  <Input
                    value={addressZone}
                    onChange={(e) => setAddressZone(e.target.value)}
                    placeholder="مثال: حاسي مسعود"
                    className="rounded-lg min-h-[44px]"
                    data-testid="input-checkout-zone"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">
                    الحي
                  </label>
                  <Input
                    value={addressDistrict}
                    onChange={(e) => setAddressDistrict(e.target.value)}
                    placeholder="مثال: حي النصر"
                    className="rounded-lg min-h-[44px]"
                    data-testid="input-checkout-district"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">
                  عنوان التوصيل
                </label>
                <Input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="الرياض، حي النرجس، شارع الأمير محمد"
                  className="rounded-lg min-h-[44px]"
                  data-testid="input-checkout-address"
                />
              </div>
            </Card>
          </div>
        )}

        {step === "payment" && (
          <div className="space-y-3 animate-fade-in-up">
            {[
              {
                id: "cod",
                label: "الدفع عند الاستلام",
                desc: "ادفع كاش لما يوصل طلبك",
              },
              {
                id: "paymob",
                label: "دفع أونلاين",
                desc: "بطاقة ائتمانية / مدى / Apple Pay",
              },
            ].map((method) => (
              <Card
                key={method.id}
                className={`rounded-xl p-4 border-2 cursor-pointer transition-all active:scale-[0.98] ${
                  paymentMethod === method.id
                    ? "border-[#CDEB63] bg-[#CDEB63]/5"
                    : "border-card-border"
                }`}
                onClick={() => setPaymentMethod(method.id)}
                data-testid={`payment-${method.id}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === method.id
                        ? "border-[#CDEB63]"
                        : "border-border"
                    }`}
                  >
                    {paymentMethod === method.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#CDEB63]" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{method.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {method.desc}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {cartItems.length > 0 && step !== "success" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 p-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between gap-2 text-[#8ab525]">
                  <span>الخصم</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
                <span className="font-bold">الإجمالي</span>
                <span className="font-bold text-lg">{formatPrice(total)}</span>
              </div>
            </div>
            <Button
              className="w-full rounded-xl bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] font-bold text-base min-h-[48px]"
              onClick={
                step === "cart"
                  ? handleCheckout
                  : step === "info"
                    ? handleSubmitInfo
                    : handleConfirmOrder
              }
                disabled={
                  (step === "info" &&
                    (!customerName.trim() ||
                      !customerPhone.trim() ||
                      !customerAddress.trim() ||
                      !cityId)) ||
                  (step === "payment" && !paymentMethod) ||
                  orderMutation.isPending
                }
              data-testid="button-checkout"
            >
              {orderMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : step === "cart" ? (
                `يالله نكمّل - ${formatPrice(total)}`
              ) : step === "info" ? (
                "التالي: طريقة الدفع"
              ) : (
                `أبشر! أكّد الطلب - ${formatPrice(total)}`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
