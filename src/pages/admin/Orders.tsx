import { useState } from "react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Copy, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "returned" | "cancelled";

type AdminOrder = {
  id: number;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  cityId?: number | null;
  addressCity?: string | null;
  addressZone?: string | null;
  addressDistrict?: string | null;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  status: OrderStatus;
};

type OrdersResponse = {
  data: AdminOrder[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

type CityOption = { id: number; name: string; isActive?: boolean; sortOrder?: number };

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

function statusBadge(status: OrderStatus) {
  const label = statusOptions.find((option) => option.value === status)?.label || status;
  return <Badge variant="outline" className={cn("whitespace-nowrap", statusStyles[status])}>{label}</Badge>;
}

async function fetchOrders(params: URLSearchParams): Promise<OrdersResponse> {
  const res = await apiRequest("GET", `/api/admin/orders?${params.toString()}`);
  const payload = await res.json();
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: payload?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

async function fetchCities(): Promise<CityOption[]> {
  const res = await apiRequest("GET", "/api/cities");
  const payload = await res.json();
  return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
}

export default function OrdersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryParams = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search.trim()) queryParams.set("search", search.trim());
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (cityFilter.trim()) queryParams.set("city", cityFilter.trim());

  const { data, isLoading } = useQuery<OrdersResponse>({
    queryKey: ["/api/admin/orders", page, limit, search, statusFilter, cityFilter],
    queryFn: () => fetchOrders(queryParams),
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery<CityOption[]>({
    queryKey: ["/api/cities"],
    queryFn: fetchCities,
  });

  const orders = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 0 };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: text });
  };

  return (
    <div className="flex flex-col gap-6 h-full p-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الطلبات</h1>
          <p className="text-sm text-muted-foreground">{meta.total} طلب</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث (رقم الطلب، اسم، جوال)..." className="pr-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {statusOptions.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cityFilter || "all"} onValueChange={(value) => { setCityFilter(value === "all" ? "" : value); setPage(1); }} disabled={citiesLoading}>
            <SelectTrigger><SelectValue placeholder="المدينة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المدن</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
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
                <TableHead className="text-right">رقم الطلب</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">المدينة</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">الدفع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center">جاري تحميل الطلبات...</TableCell></TableRow>
              ) : orders.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center">لا توجد طلبات مطابقة</TableCell></TableRow>
              ) : orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={(e) => {
                  if ((e.target as HTMLElement).closest(".no-click")) return;
                  setLocation(`/admin/orders/${order.id}`);
                }}>
                  <TableCell className="font-mono font-medium">{order.orderNumber}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{format(new Date(order.createdAt), "yyyy-MM-dd")}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{order.customerName}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground no-click">{order.customerPhone}<Copy className="w-3 h-3 cursor-pointer hover:text-primary" onClick={(e) => { e.stopPropagation(); handleCopy(order.customerPhone); }} /></div>
                    </div>
                  </TableCell>
                  <TableCell>{order.addressCity || "-"}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(order.total, order.currency)}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{order.paymentMethod}</Badge></TableCell>
                  <TableCell>{statusBadge(order.status)}</TableCell>
                  <TableCell className="no-click"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setLocation(`/admin/orders/${order.id}`); }}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
          <ChevronRight className="w-4 h-4" /> السابق
        </Button>
        <span className="text-sm text-muted-foreground">صفحة {meta.page} من {meta.totalPages || 1}</span>
        <Button variant="outline" disabled={page >= meta.totalPages || isLoading} onClick={() => setPage((current) => current + 1)}>
          التالي <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
