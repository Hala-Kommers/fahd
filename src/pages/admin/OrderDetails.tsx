import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, User, MapPin, ShoppingBag, CreditCard, History, MessageSquare } from "lucide-react";

type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "returned" | "cancelled";

type OrderItem = {
  id: number;
  productId: number;
  variantId: number | null;
  sku: string;
  title: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  product?: { id: number; title: string; slug?: string; sku?: string; primaryImage?: string };
};

type ConversationMessage = {
  id: number;
  role: string;
  content: string;
  provider?: string;
  model?: string;
  createdAt: string;
};

type OrderDetailsData = {
  id: number;
  orderNumber: string;
  conversationId?: number | null;
  createdAt: string;
  updatedAt?: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shipping: number;
  discount: number;
  grandTotal: number;
  currency: string;
  couponCode?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  addressRaw?: string | null;
  cityId?: number | null;
  addressCity?: string | null;
  addressZone?: string | null;
  addressDistrict?: string | null;
  items: OrderItem[];
  conversation?: { id: number; title?: string; status: string; messages?: ConversationMessage[] } | null;
};

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: "new", label: "جديد" },
  { value: "confirmed", label: "مؤكد" },
  { value: "shipped", label: "تم الشحن" },
  { value: "delivered", label: "تم التوصيل" },
  { value: "returned", label: "مرتجع" },
  { value: "cancelled", label: "ملغى" },
];

const statusStyles: Record<OrderStatus, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  returned: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

function formatCurrency(amount: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency }).format(amount || 0);
}

function formatDate(dateStr: string) {
  return format(new Date(dateStr), "yyyy-MM-dd HH:mm");
}

function isCustomerMessage(role: string) {
  const normalizedRole = role.toLowerCase();
  return ["user", "customer", "client"].includes(normalizedRole);
}

async function fetchOrder(id: string): Promise<OrderDetailsData> {
  const res = await apiRequest("GET", `/api/admin/orders/${id}`);
  const payload = await res.json();
  return payload?.data ?? payload;
}

export default function OrderDetails() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [status, setStatus] = useState<OrderStatus>("new");

  const { data: order, isLoading } = useQuery<OrderDetailsData>({
    queryKey: ["/api/admin/orders", params.id],
    queryFn: () => fetchOrder(params.id),
    enabled: !!params.id,
  });

  useEffect(() => {
    if (order?.status) setStatus(order.status);
  }, [order?.status]);

  const updateStatusMutation = useMutation({
    mutationFn: async (nextStatus: OrderStatus) => apiRequest("PATCH", `/api/admin/orders/${params.id}`, { status: nextStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", params.id] });
      toast({ title: "تم تحديث حالة الطلب" });
    },
    onError: (error: any) => {
      toast({ title: "فشل تحديث الحالة", description: error?.message || "حدث خطأ غير متوقع", variant: "destructive" });
      if (order?.status) setStatus(order.status);
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: text });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">جاري تحميل الطلب...</div>;
  if (!order) return <div className="p-8 text-center text-destructive">الطلب غير موجود</div>;

  const statusLabel = statusOptions.find((option) => option.value === status)?.label || status;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">طلب #{order.orderNumber}</h1>
            <Badge variant="outline" className={cn("whitespace-nowrap", statusStyles[status])}>{statusLabel}</Badge>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="font-mono text-xs">{order.orderNumber}</span>
            <span>•</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={status}
            onValueChange={(value) => {
              const nextStatus = value as OrderStatus;
              setStatus(nextStatus);
              updateStatusMutation.mutate(nextStatus);
            }}
          >
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="تغيير الحالة" /></SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => handleCopy(`Customer: ${order.customerName}\nPhone: ${order.customerPhone}\nCity: ${order.addressCity || ""}`)}>
            <Copy className="w-4 h-4 ml-2" /> نسخ البيانات
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-primary" /> المنتجات</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border p-3">
                  {item.product?.primaryImage && <img src={item.product.primaryImage} alt={item.title} className="w-16 h-16 rounded-xl object-cover bg-muted" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">SKU: {item.sku} · الكمية: {item.qty}</div>
                  </div>
                  <div className="font-bold">{formatCurrency(item.lineTotal, order.currency)}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="w-4 h-4 text-primary" /> بيانات العميل</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between"><span className="text-muted-foreground">الاسم:</span><span className="font-medium">{order.customerName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الجوال:</span><span className="font-mono" dir="ltr">{order.customerPhone}</span></div>
                {order.customerEmail && <div className="flex justify-between"><span className="text-muted-foreground">البريد:</span><span>{order.customerEmail}</span></div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="w-4 h-4 text-primary" /> العنوان</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm border p-2 rounded bg-muted/20">{order.addressRaw || "لا يوجد عنوان خام"}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-xs text-muted-foreground">المدينة</span><div className="font-medium">{order.addressCity || "-"}</div></div>
                  <div><span className="text-xs text-muted-foreground">المنطقة</span><div className="font-medium">{order.addressZone || "-"}</div></div>
                  <div><span className="text-xs text-muted-foreground">الحي</span><div className="font-medium">{order.addressDistrict || "-"}</div></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="w-4 h-4 text-primary" /> ملخص مالي</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span>{formatCurrency(order.subtotal, order.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الشحن</span><span>{formatCurrency(order.shipping, order.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الخصم</span><span>{formatCurrency(order.discount, order.currency)}</span></div>
              <div className="flex justify-between border-t pt-3"><span className="font-bold">الإجمالي</span><span className="font-bold">{formatCurrency(order.grandTotal, order.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الدفع</span><span>{order.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">حالة الدفع</span><span>{order.paymentStatus}</span></div>
              {order.couponCode && <div className="flex justify-between"><span className="text-muted-foreground">الكوبون</span><span>{order.couponCode}</span></div>}
            </CardContent>
          </Card>

          {order.conversation && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="w-4 h-4 text-primary" /> محادثة الطلب</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm max-h-80 overflow-y-auto">
                {(order.conversation.messages || []).map((message) => {
                  const isCustomer = isCustomerMessage(message.role);
                  return (
                    <div key={message.id} className={cn("flex", isCustomer ? "justify-start" : "justify-end")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl border px-3 py-2 shadow-sm",
                          isCustomer
                            ? "rounded-tr-sm bg-muted/20 text-foreground"
                            : "rounded-tl-sm border-primary/20 bg-primary text-primary-foreground",
                        )}
                      >
                        <div className={cn("mb-1 text-xs", isCustomer ? "text-muted-foreground" : "text-primary-foreground/70")}>{message.role} · {formatDate(message.createdAt)}</div>
                        <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="w-4 h-4 text-primary" /> التحديثات</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>أنشئ: {formatDate(order.createdAt)}</div>
              {order.updatedAt && <div>آخر تحديث: {formatDate(order.updatedAt)}</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
