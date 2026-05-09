import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2, Package, Truck, MapPin, Clock, ArrowRight,
  ShoppingBag, CreditCard, Loader2, AlertCircle
} from "lucide-react";

interface PublicOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentMethod: string;
  totals: { subtotal: number; shipping: number; discount: number; grandTotal: number; currency: string };
  customer: { name: string; phone: string };
  address: { raw: string; city: string; district?: string; street?: string };
  items: { title: string; qty: number; unitPrice: number; lineTotal: number; variant?: Record<string, string> }[];
}

const statusSteps = [
  { key: "new", label: "مستلم", icon: ShoppingBag },
  { key: "confirmed", label: "مؤكد", icon: CheckCircle2 },
  { key: "processing", label: "جار التجهيز", icon: Package },
  { key: "shipped", label: "في الطريق", icon: Truck },
  { key: "delivered", label: "تم التوصيل", icon: MapPin },
];

const statusOrder = ["new", "confirmed", "processing", "shipped", "delivered"];

function maskName(name: string) {
  const parts = name.trim().split(" ");
  return parts.map((p, i) => (i === 0 ? p : p[0] + "***")).join(" ");
}

function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  confirmed: "bg-lime-100 text-lime-700",
  processing: "bg-yellow-100 text-yellow-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-orange-100 text-orange-700",
};

const statusLabels: Record<string, string> = {
  new: "جديد", confirmed: "مؤكد", processing: "جار التجهيز",
  shipped: "تم الشحن", delivered: "تم التوصيل",
  cancelled: "ملغى", returned: "مرتجع",
};

export default function OrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: order, isLoading, isError } = useQuery<PublicOrder>({
    queryKey: [`/api/orders/${params.id}`],
    enabled: !!params.id,
    retry: false,
  });

  const currentStepIdx = order ? statusOrder.indexOf(order.status) : -1;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-[#CDEB63]" />
          <p>جار تحميل بيانات الطلب...</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold">الطلب غير موجود</h2>
            <p className="text-muted-foreground text-sm mt-1">
              تأكد من رقم الطلب وحاول مرة أخرى
            </p>
          </div>
          <Button
            onClick={() => navigate("/")}
            className="bg-[#CDEB63] text-[#1a2e05] hover:bg-[#b5d648] rounded-xl"
          >
            العودة للمتجر
          </Button>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled" || order.status === "returned";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-base">تتبع الطلب</h1>
            <p className="text-xs text-muted-foreground">{order.orderNumber}</p>
          </div>
          <Badge className={`mr-auto text-xs ${statusColors[order.status] || "bg-muted text-muted-foreground"}`}>
            {statusLabels[order.status] || order.status}
          </Badge>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Status Timeline */}
        {!isCancelled && (
          <Card className="rounded-[20px] border border-border">
            <CardContent className="p-5">
              <h2 className="font-semibold text-sm mb-5 text-muted-foreground">مراحل الطلب</h2>
              <div className="relative flex flex-col gap-0">
                {statusSteps.map((step, idx) => {
                  const done = idx <= currentStepIdx;
                  const active = idx === currentStepIdx;
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex items-start gap-4 relative">
                      {/* Line */}
                      {idx < statusSteps.length - 1 && (
                        <div
                          className={`absolute right-[19px] top-9 w-0.5 h-8 ${idx < currentStepIdx ? "bg-[#CDEB63]" : "bg-border"}`}
                        />
                      )}
                      {/* Icon circle */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          active
                            ? "bg-[#CDEB63] shadow-sm"
                            : done
                            ? "bg-[#CDEB63]/30"
                            : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${done ? "text-[#1a2e05]" : "text-muted-foreground"}`}
                        />
                      </div>
                      {/* Label */}
                      <div className="pb-8 pt-2">
                        <p className={`text-sm font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                        {active && (
                          <p className="text-xs text-[#8ab525] mt-0.5">الحالة الحالية</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {isCancelled && (
          <Card className="rounded-[20px] border border-destructive/30 bg-destructive/5">
            <CardContent className="p-5 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="font-semibold text-destructive">{statusLabels[order.status]}</p>
                <p className="text-sm text-muted-foreground">تم {statusLabels[order.status]} هذا الطلب</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Info */}
        <Card className="rounded-[20px] border border-border">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground">تفاصيل الطلب</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">رقم الطلب</span>
              <span className="font-mono font-semibold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">تاريخ الطلب</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">طريقة الدفع</span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                {order.paymentMethod === "COD" ? "الدفع عند الاستلام" : "دفع إلكتروني"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="rounded-[20px] border border-border">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground">المنتجات</h2>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2 py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.variant && Object.keys(item.variant).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">الكمية: {item.qty}</p>
                </div>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {item.lineTotal} ريال
                </span>
              </div>
            ))}

            {/* Totals */}
            <div className="pt-2 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>المجموع الفرعي</span>
                <span>{order.totals.subtotal} ريال</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>الشحن</span>
                <span>{order.totals.shipping > 0 ? `${order.totals.shipping} ريال` : "مجاناً"}</span>
              </div>
              {order.totals.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>الخصم</span>
                  <span>- {order.totals.discount} ريال</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
                <span>الإجمالي</span>
                <span>{order.totals.grandTotal} ريال</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer & Address */}
        <Card className="rounded-[20px] border border-border">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground">بيانات التوصيل</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الاسم</span>
              <span>{maskName(order.customer.name)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الجوال</span>
              <span className="font-mono">{maskPhone(order.customer.phone)}</span>
            </div>
            <div className="flex gap-2 text-sm pt-1">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span>{order.address.raw || [order.address.city, order.address.district, order.address.street].filter(Boolean).join("، ")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Estimated delivery */}
        {!isCancelled && order.status !== "delivered" && (
          <Card className="rounded-[20px] border border-[#CDEB63]/40 bg-[#CDEB63]/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#8ab525] flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">الوقت المتوقع للتوصيل</p>
                <p className="text-xs text-muted-foreground">1–3 أيام عمل من تاريخ التأكيد</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="w-full rounded-xl h-11"
        >
          العودة للمتجر
        </Button>
      </div>
    </div>
  );
}
