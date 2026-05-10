import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useFahd } from "@/lib/fahd-store";
import { formatPrice } from "@/lib/mockData";
import { Send, CheckCircle2, MapPin, Package, Truck, ClipboardCheck, Loader2, Copy, MessageCircle } from "lucide-react";
import type { ChatMessage } from "@/lib/fahd-store";
import { useLocation } from "wouter";

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function OrderSheet() {
  const store = useFahd();
  const {
    orderSheetOpen,
    closeOrderSheet,
    orderProduct,
    selectedColor,
    selectedSize,
    quantity,
    orderStep,
    orderMessages,
    addOrderMessage,
    advanceStep,
    setSelectedColor,
    setSelectedSize,
    setQuantity,
    setCustomerName,
    setCustomerPhone,
    setCustomerAddress,
    setPaymentMethod,
    customerName,
    customerPhone,
  } = store;

  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [infoStep, setInfoStep] = useState<"name" | "phone">("name");

  const orderMutation = useMutation({
    mutationFn: async (data: {
      productId: string | number;
      variant: string;
      variantId?: string | number | null;
      quantity: number;
      items: { productId: string | number; variantId?: string | number | null; qty: number }[];
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      addressRaw: string;
      addressCity: string;
      paymentMethod: string;
    }) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return res.json();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [orderMessages]);

  if (!orderProduct) return null;

  // Normalize both old and new product schemas
  const p = orderProduct as any;
  const productImage = p.images?.find((img: any) => img?.isPrimary)?.url || p.images?.[0]?.url || p.image || "";
  const productPrice = p.selectedVariantPrice ?? p.pricing?.price ?? p.price ?? 0;
  const productStock = p.selectedVariantStock ?? p.inventory?.stockTotal ?? p.stock ?? 0;
  const productColors: { name: string }[] = p.variants?.colors
    ?? (p.variants ?? []).filter((v: any) => v.attributes?.color).map((v: any) => ({ name: v.attributes.color }));
  const productSizes: string[] = p.variants?.sizes
    ?? [...new Set((p.variants ?? []).filter((v: any) => v.attributes?.size).map((v: any) => v.attributes.size as string))];
  const productFaq: { question: string; answer: string }[] = p.faq ?? [];

  const handleChipClick = (chip: string) => {
    addOrderMessage({
      id: generateId(),
      sender: "user",
      text: chip,
    });

    if (orderStep === "variant") {
      const isColor = productColors.some((c) => c.name === chip);
      const isSize = productSizes.includes(chip);

      if (isColor) {
        setSelectedColor(chip);
        if (productSizes.length > 0 && !selectedSize) {
          setTimeout(() => {
            addOrderMessage({
              id: generateId(),
              sender: "fahd",
              text: "تمام! وش المقاس اللي يناسبك؟ 📏",
              type: "chips",
              chips: productSizes,
            });
          }, 500);
          return;
        }
      } else if (isSize) {
        setSelectedSize(chip);
      }

      setTimeout(() => {
        addOrderMessage({
          id: generateId(),
          sender: "fahd",
          text: "اختيار موفّق! 🔥 الحين أحتاج اسمك الكامل عشان أكمّل الطلب.",
        });
        advanceStep("info");
        setInfoStep("name");
      }, 500);
    } else if (orderStep === "payment") {
      setPaymentMethod(chip);
      setTimeout(() => {
        addOrderMessage({
          id: generateId(),
          sender: "fahd",
          text: "أبشر! هذا ملخص طلبك 📋:",
          type: "summary",
          summaryData: {
            product: orderProduct.title,
            variant: `${selectedColor}${selectedSize ? " - " + selectedSize : ""}`,
            quantity,
            price: productPrice * quantity,
            name: customerName,
            phone: customerPhone,
            address: store.customerAddress,
            payment: chip,
          },
        });
        advanceStep("summary");
      }, 500);
    }
  };

  const handleFaqChip = (question: string) => {
    addOrderMessage({ id: generateId(), sender: "user", text: question });
    const faqEntry = productFaq.find((f) => f.question === question);
    setTimeout(() => {
      addOrderMessage({
        id: generateId(),
        sender: "fahd",
        text: faqEntry?.answer || "للأسف ما عندي تفاصيل عن هذا السؤال حالياً 😅",
      });
    }, 500);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");

    addOrderMessage({ id: generateId(), sender: "user", text });

    if (orderStep === "info") {
      if (infoStep === "name") {
        setCustomerName(text);
        setInfoStep("phone");
        setTimeout(() => {
          addOrderMessage({
            id: generateId(),
            sender: "fahd",
            text: `هلا ${text}! 👋 الحين أعطني رقم جوالك.`,
          });
        }, 500);
      } else if (infoStep === "phone") {
        setCustomerPhone(text);
        setTimeout(() => {
          addOrderMessage({
            id: generateId(),
            sender: "fahd",
            text: "تمام! 📍 الحين أرسل لي عنوان التوصيل (مثال: الرياض، حي النرجس، شارع الأمير محمد بن سلمان، مبنى 5)",
          });
          advanceStep("address");
        }, 500);
      }
    } else if (orderStep === "address") {
      setCustomerAddress(text);
      setTimeout(() => {
        const parsed = parseAddress(text);
        addOrderMessage({
          id: generateId(),
          sender: "fahd",
          text: "تم تنظيم عنوانك ✅:",
          type: "address-card",
          addressData: parsed,
        });

        setTimeout(() => {
          addOrderMessage({
            id: generateId(),
            sender: "fahd",
            text: "وش طريقة الدفع اللي تفضّلها؟ 💳",
            type: "chips",
            chips: ["الدفع عند الاستلام", "دفع أونلاين"],
          });
          advanceStep("payment");
        }, 800);
      }, 500);
    } else {
      setTimeout(() => {
        const faq = productFaq.find(
          (f) => text.includes("يميز") || text.includes("يوصل") || text.includes("ضمان")
        );
        addOrderMessage({
          id: generateId(),
          sender: "fahd",
          text: faq?.answer || "شكراً على سؤالك! بقدر أساعدك بأي شي عن المنتج 😊",
        });
      }, 500);
    }
  };

  const handleConfirmOrder = () => {
      orderMutation.mutate(
      {
        productId: orderProduct.id,
        variantId: p.selectedVariantId ?? null,
        variant: `${selectedColor}${selectedSize ? " - " + selectedSize : ""}`,
        quantity,
        items: [{ productId: orderProduct.id, variantId: p.selectedVariantId ?? null, qty: quantity }],
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: store.customerAddress,
        addressRaw: store.customerAddress,
        addressCity: store.customerAddress.split(",")[0]?.trim() || "",
        paymentMethod: store.paymentMethod,
      },
      {
        onSuccess: (data: any) => {
          addOrderMessage({
            id: generateId(),
            sender: "fahd",
            text: data?.orderNumber || `FHD-${Math.floor(Math.random() * 900000 + 100000)}`,
            type: "success",
          });
          advanceStep("success");
        },
        onError: () => {
          addOrderMessage({
            id: generateId(),
            sender: "fahd",
            text: "عذراً حصل خطأ 😕 جرّب مرة ثانية.",
          });
        },
      }
    );
  };

  const steps = [
    { label: "اختيار", icon: Package, done: orderStep !== "variant" },
    { label: "التوصيل", icon: Truck, done: ["payment", "summary", "success"].includes(orderStep) },
    { label: "تأكيد", icon: ClipboardCheck, done: orderStep === "success" },
  ];

  return (
    <Sheet open={orderSheetOpen} onOpenChange={(open) => !open && closeOrderSheet()}>
      <SheetContent
        side="bottom"
        className="h-[90vh] max-h-[90vh] rounded-t-[24px] p-0 flex flex-col border-0 bg-background animate-slide-up-spring"
      >
        <SheetTitle className="sr-only">طلب المنتج</SheetTitle>
        <SheetDescription className="sr-only">نافذة طلب المنتج مع شات فهد</SheetDescription>
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-2" />

        <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50">
          <img
            src={productImage}
            alt={orderProduct.title}
            className="w-12 h-12 rounded-xl object-cover bg-muted"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{orderProduct.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">{formatPrice(productPrice)}</span>
              {selectedColor && (
                <Badge variant="outline" className="text-[10px]">{selectedColor}</Badge>
              )}
              {selectedSize && (
                <Badge variant="outline" className="text-[10px]">{selectedSize}</Badge>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            متوفر ({productStock})
          </Badge>
        </div>

        <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-border/30">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step.done
                    ? "bg-[#CDEB63] text-[#1a2e05]"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[11px] ${step.done ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 rounded ${step.done ? "bg-[#CDEB63]" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {orderMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onChipClick={handleChipClick} onFaqClick={handleFaqChip} product={orderProduct} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {orderStep !== "success" && (
          <div className="border-t border-border/50 p-3 space-y-2">
            {orderStep === "variant" && productFaq.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {productFaq.map((faq) => (
                  <button
                    key={faq.question}
                    onClick={() => handleFaqChip(faq.question)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground border border-border/50 hover-elevate min-h-[44px] active:scale-95 transition-transform"
                    data-testid={`chip-faq-${faq.question}`}
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  orderStep === "info" && infoStep === "name"
                    ? "اكتب اسمك الكامل هنا..."
                    : orderStep === "info" && infoStep === "phone"
                      ? "05XXXXXXXX"
                      : orderStep === "address"
                        ? "الرياض، حي النرجس..."
                        : "اكتب سؤالك لفهد..."
                }
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 rounded-full bg-card border-card-border"
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                className="rounded-full bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] shrink-0"
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {orderStep === "summary" && (
              <Button
                className="w-full rounded-xl bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] font-bold text-base min-h-[48px]"
                onClick={handleConfirmOrder}
                disabled={orderMutation.isPending}
                data-testid="button-confirm-order"
              >
                {orderMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "أبشر! أكّد الطلب ✅"
                )}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MessageBubble({
  message,
  onChipClick,
  onFaqClick,
  product,
}: {
  message: ChatMessage;
  onChipClick: (chip: string) => void;
  onFaqClick: (q: string) => void;
  product: any;
}) {
  const isFahd = message.sender === "fahd";
  const [, navigate] = useLocation();

  if (message.type === "success") {
    return (
      <div className="flex flex-col items-center py-6 gap-4">
        <div className="w-20 h-20 rounded-full bg-[#CDEB63]/20 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-[#8ab525]" />
        </div>
        <h3 className="text-xl font-bold text-foreground" data-testid="text-order-success">تم الطلب يا بطل! 🎉</h3>
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2">
          <span className="text-sm text-muted-foreground">رقم الطلب:</span>
          <span className="font-bold text-foreground" data-testid="text-order-number">{message.text}</span>
          <button
            onClick={() => navigator.clipboard.writeText(message.text)}
            className="text-muted-foreground"
            data-testid="button-copy-order"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-full bg-card rounded-xl p-4 border border-card-border space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Truck className="w-4 h-4 text-[#8ab525]" />
            <span className="font-semibold" data-testid="text-order-status-label">حالة الطلب</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-1/4 bg-[#CDEB63] rounded-full" />
            </div>
            <span className="text-xs text-muted-foreground">تم الاستلام</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="space-y-1">
              <div className="w-8 h-8 rounded-full bg-[#CDEB63]/20 flex items-center justify-center mx-auto">
                <ClipboardCheck className="w-4 h-4 text-[#8ab525]" />
              </div>
              <p className="font-medium">تم التأكيد</p>
            </div>
            <div className="space-y-1">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">قيد التجهيز</p>
            </div>
            <div className="space-y-1">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Truck className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">في الطريق</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          يوصلك خلال <span className="font-semibold text-foreground">1-3 أيام عمل</span> داخل السعودية إن شاء الله 🚚
        </p>

        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1 rounded-xl text-sm gap-1 min-h-[44px]"
            onClick={() => { navigate("/"); }}
            data-testid="button-continue-shopping-sheet"
          >
            يالله نكمّل تسوق
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-xl text-sm gap-1 min-h-[44px]"
            onClick={() => { navigate("/chat"); }}
            data-testid="button-contact-support"
          >
            <MessageCircle className="w-4 h-4" />
            كلّم فهد
          </Button>
        </div>
      </div>
    );
  }

  if (message.type === "address-card" && message.addressData) {
    const addr = message.addressData;
    return (
      <div className="flex gap-2">
        <FahdAvatar />
        <div className="max-w-[85%] space-y-2">
          <div className="bg-card rounded-2xl rounded-tr-md p-3 border border-card-border shadow-sm">
            <p className="text-sm mb-2">{message.text}</p>
            <div className="bg-muted/50 rounded-xl p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#8ab525] shrink-0" />
                <span className="font-semibold">العنوان المنظّم</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">المدينة:</span>
                  <span className="font-medium mr-1">{addr.city}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الحي:</span>
                  <span className="font-medium mr-1">{addr.district}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">الشارع:</span>
                  <span className="font-medium mr-1">{addr.street}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">رقم المبنى:</span>
                  <span className="font-medium mr-1">{addr.building}</span>
                </div>
              </div>
              {addr.notes && (
                <div className="text-xs">
                  <span className="text-muted-foreground">ملاحظات:</span>
                  <span className="font-medium mr-1">{addr.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "summary" && message.summaryData) {
    const data = message.summaryData;
    return (
      <div className="flex gap-2">
        <FahdAvatar />
        <div className="max-w-[85%] space-y-2">
          <div className="bg-card rounded-2xl rounded-tr-md p-3 border border-card-border shadow-sm">
            <p className="text-sm mb-3">{message.text}</p>
            <div className="bg-muted/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Package className="w-4 h-4 text-[#8ab525]" />
                <span className="font-semibold text-sm">ملخص الطلب</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">المنتج:</span>
                  <span className="font-medium text-left">{data.product}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">الخيار:</span>
                  <span className="font-medium">{data.variant}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">الكمية:</span>
                  <span className="font-medium">{data.quantity}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">الاسم:</span>
                  <span className="font-medium">{data.name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">الجوال:</span>
                  <span className="font-medium">{data.phone}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">العنوان:</span>
                  <span className="font-medium text-left">{data.address}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">الدفع:</span>
                  <span className="font-medium">{data.payment}</span>
                </div>
                <div className="flex justify-between gap-2 pt-2 border-t border-border/50">
                  <span className="font-bold text-sm">الإجمالي:</span>
                  <span className="font-bold text-sm text-[#8ab525]">{formatPrice(data.price)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${!isFahd ? "flex-row-reverse" : ""}`}>
      {isFahd && <FahdAvatar />}
      <div className={`max-w-[80%] space-y-2`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isFahd
              ? "bg-card border border-card-border shadow-sm rounded-tr-md"
              : "bg-[#CDEB63]/20 text-foreground rounded-tl-md"
            }`}
        >
          {message.text}
        </div>
        {message.type === "chips" && message.chips && (
          <div className="flex flex-wrap gap-2">
            {message.chips.map((chip) => (
              <button
                key={chip}
                onClick={() => onChipClick(chip)}
                className="text-xs px-3 py-1.5 rounded-full bg-[#CDEB63]/15 text-foreground border border-[#CDEB63]/40 hover-elevate font-medium min-h-[44px] active:scale-95 transition-transform"
                data-testid={`chip-${chip}`}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FahdAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#CDEB63] to-[#a8d94a] flex items-center justify-center shrink-0 mt-1">
      <span className="text-[10px] font-bold text-[#1a2e05]">ف</span>
    </div>
  );
}

function parseAddress(text: string): {
  city: string;
  district: string;
  street: string;
  building: string;
  notes: string;
} {
  const parts = text.split(/[،,]/);
  return {
    city: parts[0]?.trim() || "الرياض",
    district: parts[1]?.trim() || "حي النرجس",
    street: parts[2]?.trim() || "غير محدد",
    building: parts[3]?.trim() || "غير محدد",
    notes: parts[4]?.trim() || "",
  };
}
