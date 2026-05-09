import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Order, OrderStatus } from "@shared/schema";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Copy,
  Eye,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Helper to format currency
const formatCurrency = (amount: number, currency: string = "SAR") => {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

export default function OrdersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // state for filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [search, setSearch] = useState("");

  // state for selection
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
  });

  // Filter Logic
  const filteredOrders = orders.filter((order) => {
    // Search
    const searchLower = search.toLowerCase();
    const matchSearch =
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.customer.name.toLowerCase().includes(searchLower) ||
      order.customer.phone.includes(searchLower) ||
      order.items.some((item) => item.title.toLowerCase().includes(searchLower));

    if (!matchSearch) return false;

    // Filters
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    if (paymentFilter !== "all" && order.paymentMethod !== paymentFilter) return false;
    if (cityFilter !== "all" && order.address.city !== cityFilter) return false;

    // Risk
    if (riskFilter !== "all") {
      const score = order.risk.score;
      if (riskFilter === "Low" && score >= 20) return false; // Low: < 20
      if (riskFilter === "Medium" && (score < 20 || score > 50)) return false; // Medium: 20-50
      if (riskFilter === "High" && score <= 50) return false; // High: > 50
    }

    // Confidence
    if (confidenceFilter !== "all") {
      const conf = order.address.confidence;
      if (confidenceFilter === ">=80" && conf < 80) return false;
      if (confidenceFilter === "60-79" && (conf < 60 || conf >= 80)) return false;
      if (confidenceFilter === "40-59" && (conf < 40 || conf >= 60)) return false;
      if (confidenceFilter === "<40" && conf >= 40) return false;
    }

    // Date
    if (dateRange.from) {
      const orderDate = new Date(order.createdAt);
      if (orderDate < dateRange.from) return false;
      if (dateRange.to && orderDate > dateRange.to) return false;
    }

    return true;
  });

  // Checkbox handlers
  const toggleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id]
    );
  };

  // Export handlers
  const handleExport = (type: "selected" | "filtered") => {
    const ordersToExport =
      type === "selected"
        ? orders.filter((o) => selectedOrders.includes(o.id))
        : filteredOrders;

    if (ordersToExport.length === 0) {
      toast({ title: "تنبيه", description: "لا توجد طلبات للتصدير" });
      return;
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      "\uFEFF" + // BOM for Arabic support
      [
        "Order ID,Created At,Status,Payment,Customer Name,Phone,City,Total (SAR),Risk Score,Address Confidence",
        ...ordersToExport.map((o) =>
          [
            o.orderNumber,
            new Date(o.createdAt).toLocaleString("ar-SA"),
            o.status,
            o.paymentMethod,
            o.customer.name,
            o.customer.phone,
            o.address.city,
            o.totals.grandTotal,
            o.risk.score,
            o.address.confidence,
          ].join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${type}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Helper
  const getStatusBadge = (status: OrderStatus) => {
    const styles: Record<string, string> = {
      new: "bg-blue-100 text-blue-800 border-blue-200",
      confirmed: "bg-green-100 text-green-800 border-green-200",
      processing: "bg-yellow-100 text-yellow-800 border-yellow-200",
      shipped: "bg-purple-100 text-purple-800 border-purple-200",
      delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
      returned: "bg-red-100 text-red-800 border-red-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    };
    const labels: Record<string, string> = {
      new: "جديد",
      confirmed: "مؤكد",
      processing: "جار التجهيز",
      shipped: "تم الشحن",
      delivered: "تم التوصيل",
      returned: "مرتجع",
      cancelled: "ملغى",
    };
    return (
      <Badge variant="outline" className={cn("whitespace-nowrap", styles[status] || styles.new)}>
        {labels[status] || status}
      </Badge>
    );
  };

  // Actions
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: text });
  };

  return (
    <div className="flex flex-col gap-6 h-full p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">الطلبات</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={selectedOrders.length === 0}
            onClick={() => handleExport("selected")}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير المحدد ({selectedOrders.length})
          </Button>
          <Button variant="secondary" onClick={() => handleExport("filtered")}>
            <Download className="w-4 h-4 ml-2" />
            تصدير حسب الفلتر
          </Button>
          <Button>
            <Package className="w-4 h-4 ml-2" />
            إنشاء طلب يدوي
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث (رقم الطلب، اسم، جوال)..."
              className="pr-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {["new", "confirmed", "processing", "shipped", "delivered", "returned", "cancelled"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="المدينة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المدن</SelectItem>
              {["الرياض", "جدة", "الدمام", "الخبر", "مكة", "المدينة"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger>
              <SelectValue placeholder="المخاطرة (Risk)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="Low">Low (&lt; 20)</SelectItem>
              <SelectItem value="Medium">Medium (20-50)</SelectItem>
              <SelectItem value="High">High (&gt; 50)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    لا توجد طلبات مطابقة
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest(".no-click")) return;
                      setLocation(`/admin/orders/${order.id}`);
                    }}
                  >
                    <TableCell className="no-click">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(order.createdAt), "yyyy-MM-dd")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customer.name}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground no-click">
                          {order.customer.phone}
                          <Copy
                            className="w-3 h-3 cursor-pointer hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(order.customer.phone);
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{order.address.city}</TableCell>
                    <TableCell className="font-bold">
                      {formatCurrency(order.totals.grandTotal, order.totals.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {order.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            order.address.confidence >= 80 ? "bg-green-50 text-green-700 border-green-200" :
                              order.address.confidence >= 50 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {order.address.confidence}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            order.risk.score < 20 ? "bg-green-50 text-green-700 border-green-200" :
                              order.risk.score <= 50 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {order.risk.score}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="no-click">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLocation(`/admin/orders/${order.id}`)}>
                            <Eye className="w-4 h-4 ml-2" />
                            عرض التفاصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopy(JSON.stringify(order, null, 2))}>
                            <Copy className="w-4 h-4 ml-2" />
                            نسخ JSON
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
