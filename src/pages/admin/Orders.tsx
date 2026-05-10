import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Eye, Copy, Search, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { mockOrders, type Order } from "@/lib/mock-data";

const formatCurrency = (amount: number) => new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(amount);

const statusBadge = (status: Order["status"]) => {
  const styles: Record<Order["status"], string> = {
    New: "bg-blue-100 text-blue-800 border-blue-200",
    Confirmed: "bg-green-100 text-green-800 border-green-200",
    Shipped: "bg-purple-100 text-purple-800 border-purple-200",
    Delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Returned: "bg-red-100 text-red-800 border-red-200",
    Cancelled: "bg-gray-100 text-gray-800 border-gray-200",
  };
  const labels: Record<Order["status"], string> = {
    New: "جديد",
    Confirmed: "مؤكد",
    Shipped: "تم الشحن",
    Delivered: "تم التوصيل",
    Returned: "مرتجع",
    Cancelled: "ملغى",
  };
  return <Badge variant="outline" className={cn("whitespace-nowrap", styles[status])}>{labels[status]}</Badge>;
};

export default function OrdersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const orders = mockOrders;

  const filteredOrders = useMemo(() => {
    const s = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !s ||
        order.id.toLowerCase().includes(s) ||
        order.customerName.toLowerCase().includes(s) ||
        order.customerPhone.includes(s) ||
        order.city.toLowerCase().includes(s);

      if (!matchesSearch) return false;
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (cityFilter !== "all" && order.city !== cityFilter) return false;
      return true;
    });
  }, [orders, search, statusFilter, cityFilter]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: text });
  };

  const exportCsv = (rows: Order[]) => {
    if (rows.length === 0) {
      toast({ title: "تنبيه", description: "لا توجد طلبات للتصدير" });
      return;
    }

    const csv = [
      "Order ID,Created At,Status,Payment,Customer Name,Phone,City,Total,Risk,Confidence",
      ...rows.map((o) => [
        o.id,
        new Date(o.date).toLocaleString("ar-SA"),
        o.status,
        o.paymentMethod,
        o.customerName,
        o.customerPhone,
        o.city,
        o.total,
        o.riskLevel,
        o.addressConfidence,
      ].join(",")),
    ].join("\n");

    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + "\uFEFF" + csv);
    link.download = `orders_export_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allSelected = filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length;

  return (
    <div className="flex flex-col gap-6 h-full p-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">الطلبات</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" disabled={selectedOrders.length === 0} onClick={() => exportCsv(orders.filter((o) => selectedOrders.includes(o.id)))}>
            <Download className="w-4 h-4 ml-2" />
            تصدير المحدد ({selectedOrders.length})
          </Button>
          <Button variant="secondary" onClick={() => exportCsv(filteredOrders)}>
            <Download className="w-4 h-4 ml-2" />
            تصدير حسب الفلتر
          </Button>
          <Button onClick={() => setLocation("/admin/products/new")}>
            <Package className="w-4 h-4 ml-2" />
            إنشاء طلب يدوي
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث (رقم الطلب، اسم، جوال)..." className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {(["New", "Confirmed", "Shipped", "Delivered", "Returned", "Cancelled"] as const).map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger><SelectValue placeholder="المدينة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المدن</SelectItem>
              {[...new Set(orders.map((o) => o.city))].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"><Checkbox checked={allSelected} onCheckedChange={() => setSelectedOrders(allSelected ? [] : filteredOrders.map((o) => o.id))} /></TableHead>
                <TableHead className="text-right">رقم الطلب</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">المدينة</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">الدفع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="text-right">Risk</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">لا توجد طلبات مطابقة</TableCell>
                </TableRow>
              ) : filteredOrders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={(e) => {
                  if ((e.target as HTMLElement).closest(".no-click")) return;
                  setLocation(`/admin/orders/${order.id}`);
                }}>
                  <TableCell className="no-click"><Checkbox checked={selectedOrders.includes(order.id)} onCheckedChange={() => setSelectedOrders((prev) => prev.includes(order.id) ? prev.filter((id) => id !== order.id) : [...prev, order.id])} onClick={(e) => e.stopPropagation()} /></TableCell>
                  <TableCell className="font-mono font-medium">{order.id}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(order.date), "yyyy-MM-dd")}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{order.customerName}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground no-click">{order.customerPhone}<Copy className="w-3 h-3 cursor-pointer hover:text-primary" onClick={(e) => { e.stopPropagation(); handleCopy(order.customerPhone); }} /></div>
                    </div>
                  </TableCell>
                  <TableCell>{order.city}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(order.total)}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{order.paymentMethod}</Badge></TableCell>
                  <TableCell>{statusBadge(order.status)}</TableCell>
                  <TableCell><Badge variant="outline">{order.addressConfidence}%</Badge></TableCell>
                  <TableCell><Badge variant="outline">{order.riskLevel}</Badge></TableCell>
                  <TableCell className="no-click"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setLocation(`/admin/orders/${order.id}`); }}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
