import { useMemo, useState } from "react";
import { useParams } from "wouter";
import { format } from "date-fns";
import { mockOrders, type Order, type OrderStatus } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Printer,
  AlertTriangle,
  User,
  MapPin,
  ShoppingBag,
  CreditCard,
  History,
  CheckCircle,
  Truck,
  RotateCcw,
  XCircle,
  FileText,
  ArrowRight,
} from "lucide-react";

const formatCurrency = (amount: number, currency: string = "SAR") =>
  new Intl.NumberFormat("ar-SA", { style: "currency", currency }).format(
    amount,
  );
const formatDate = (dateStr: string) =>
  format(new Date(dateStr), "yyyy-MM-dd HH:mm a");

const statusStyles: Record<OrderStatus, string> = {
  New: "bg-blue-100 text-blue-800 border-blue-200",
  Confirmed: "bg-green-100 text-green-800 border-green-200",
  Shipped: "bg-purple-100 text-purple-800 border-purple-200",
  Delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Returned: "bg-red-100 text-red-800 border-red-200",
  Cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusLabels: Record<OrderStatus, string> = {
  New: "جديد",
  Confirmed: "مؤكد",
  Shipped: "تم الشحن",
  Delivered: "تم التوصيل",
  Returned: "مرتجع",
  Cancelled: "ملغى",
};

export default function OrderDetails() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [status, setStatus] = useState<OrderStatus>("New");

  const order = useMemo(() => {
    const found = mockOrders.find((o) => o.id === params.id);
    if (!found) return null;
    return found;
  }, [params.id]);

  if (!order) {
    return (
      <div className="p-8 text-center text-destructive">الطلب غير موجود</div>
    );
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: text });
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              طلب #{order.id}
            </h1>
            <Badge
              variant="outline"
              className={cn("whitespace-nowrap", statusStyles[status])}
            >
              {statusLabels[status]}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="font-mono text-xs">{order.id}</span>
            <span>•</span>
            <span>{formatDate(order.date)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={status}
            onValueChange={(val) => setStatus(val as OrderStatus)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="تغيير الحالة" />
            </SelectTrigger>
            <SelectContent>
              {(
                [
                  "New",
                  "Confirmed",
                  "Shipped",
                  "Delivered",
                  "Returned",
                  "Cancelled",
                ] as const
              ).map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() =>
              handleCopy(
                `Customer: ${order.customerName}\nPhone: ${order.customerPhone}\nCity: ${order.city}`,
              )
            }
          >
            <Copy className="w-4 h-4 ml-2" />
            نسخ البيانات
          </Button>
          <Button variant="outline">
            <Printer className="w-4 h-4 ml-2" /> PDF
          </Button>
          <Button variant="destructive" size="icon">
            <AlertTriangle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" /> المنتجات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <div className="font-medium">عدد القطع</div>
                  <div className="text-sm text-muted-foreground">
                    {order.items} منتج
                  </div>
                </div>
                <div className="font-bold">{formatCurrency(order.total)}</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4 text-primary" /> بيانات العميل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الاسم:</span>
                  <span className="font-medium">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الجوال:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono" dir="ltr">
                      {order.customerPhone}
                    </span>
                    <Copy
                      className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary"
                      onClick={() => handleCopy(order.customerPhone)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4 text-primary" /> العنوان
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm border p-2 rounded bg-muted/20">
                  عنوان من بيانات الموك
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      المدينة
                    </span>
                    <div className="font-medium">{order.city}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">الدقة</span>
                    <div className="font-medium">
                      {order.addressConfidence}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-4 h-4 text-primary" /> ملخص مالي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الإجمالي</span>
                <span className="font-bold">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الدفع</span>
                <span>{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المخاطرة</span>
                <span>{order.riskLevel}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4 text-primary" /> سجل الحالة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" /> تم إنشاء
                الطلب
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-600" /> قيد التجهيز
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-muted-foreground" /> بانتظار
                التحديث
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" /> لا يوجد ملاحظات
                إرجاع
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-primary" /> ملاحظات
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              هذا عرض موك مؤقت لتفاصيل الطلب لحين ربطه بالباكند.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
