import DeliverySettings from "@/components/DeliverySettings";
import ConversionDashboard from "@/components/ConversionDashboard";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { DollarSign, MessageSquare, ShoppingCart, TrendingUp, Users, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type AnalyticsOverview = {
  visits: number;
  chatSessions: number;
  orders: number;
  ordersWithChat: number;
  sales: number;
  visitToChatRate: number;
  chatToPurchaseRate: number;
  visitToPurchaseRate: number;
};

type AnalyticsOrders = {
  sales: number;
  grossSales: number;
  netSales: number;
  totalOrders: number;
  averageOrderValue: number;
  byStatus: Array<{ status: string; count: number }>;
};

type SalesChartPoint = { date: string; sales: number; orders: number };

type RecentOrder = {
  id: number;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  addressCity?: string | null;
  total: number;
  currency: string;
  status: string;
  visitorId?: string | null;
  sessionId?: string | null;
};

type RecentOrdersResponse = {
  data: RecentOrder[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  confirmed: "مؤكد",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  returned: "مرتجع",
  cancelled: "ملغى",
};

function formatCurrency(amount: number) {
  return `${(amount || 0).toLocaleString("ar-SA")} ر.س`;
}

function formatPercent(amount: number) {
  return `${(amount || 0).toLocaleString("ar-SA", { maximumFractionDigits: 2 })}%`;
}

async function readData<T>(url: string): Promise<T> {
  const res = await apiRequest("GET", url);
  const payload = await res.json();
  return payload?.data ?? payload;
}

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/admin/analytics/overview"],
    queryFn: () => readData("/api/admin/analytics/overview"),
  });

  const { data: orderAnalytics } = useQuery<AnalyticsOrders>({
    queryKey: ["/api/admin/analytics/orders"],
    queryFn: () => readData("/api/admin/analytics/orders"),
  });

  const { data: salesChart = [] } = useQuery<SalesChartPoint[]>({
    queryKey: ["/api/admin/analytics/sales-chart", "day"],
    queryFn: () => readData("/api/admin/analytics/sales-chart?interval=day"),
  });

  const { data: recentOrdersData } = useQuery<RecentOrdersResponse>({
    queryKey: ["/api/admin/orders", 1, 10, "dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/orders?page=1&limit=10");
      const payload = await res.json();
      return { data: Array.isArray(payload?.data) ? payload.data : [], meta: payload?.meta ?? { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },
  });

  const recentOrders = recentOrdersData?.data ?? [];
  const safeByStatus = Array.isArray(orderAnalytics?.byStatus) ? orderAnalytics.byStatus : [];
  const safeSalesChart = Array.isArray(salesChart) ? salesChart : [];
  const statusCounts = Object.fromEntries(safeByStatus.map((row) => [row.status, row.count]));
  const chartData = safeSalesChart.map((point) => ({
    ...point,
    label: format(new Date(point.date), "MM-dd"),
  }));

  const stats = [
    { label: "صافي المبيعات", value: formatCurrency(orderAnalytics?.netSales ?? overview?.sales ?? 0), icon: DollarSign, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
    { label: "الطلبات", value: String(orderAnalytics?.totalOrders ?? overview?.orders ?? 0), icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { label: "الزيارات", value: String(overview?.visits ?? 0), icon: Users, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
    { label: "جلسات الشات", value: String(overview?.chatSessions ?? 0), icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
    { label: "زيارة إلى شراء", value: formatPercent(overview?.visitToPurchaseRate ?? 0), icon: TrendingUp, color: "text-[#8ab525]", bg: "bg-[#CDEB63]/20" },
    { label: "متوسط الطلب", value: formatCurrency(orderAnalytics?.averageOrderValue ?? 0), icon: Clock, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-900/30" },
  ];

  return (
    <div className="space-y-6">
 <ConversionDashboard/>
 <DeliverySettings/>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 rounded-xl border-card-border overflow-hidden">
            <div className="flex flex-col gap-2">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{overviewLoading ? "..." : stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 rounded-xl border-card-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">تحليل المبيعات</h3>
            <Badge variant="secondary">يومي</Badge>
          </div>
          <div className="h-[300px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CDEB63" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#CDEB63" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#888" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#CDEB63" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-xl border-card-border bg-gradient-to-br from-white to-gray-50/50">
          <h3 className="font-bold text-lg mb-4">مؤشرات التحويل</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between rounded-lg border p-3"><span>زيارة إلى شات</span><strong>{formatPercent(overview?.visitToChatRate ?? 0)}</strong></div>
            <div className="flex justify-between rounded-lg border p-3"><span>شات إلى شراء</span><strong>{formatPercent(overview?.chatToPurchaseRate ?? 0)}</strong></div>
            <div className="flex justify-between rounded-lg border p-3"><span>طلبات من الشات</span><strong>{overview?.ordersWithChat ?? 0}</strong></div>
            <div className="flex justify-between rounded-lg border p-3"><span>طلبات جديدة</span><strong>{statusCounts.new ?? 0}</strong></div>
          </div>
        </Card>
      </div>

      <Card className="rounded-xl border-card-border overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-bold text-foreground">آخر الطلبات</h2>
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground"><a href="/admin/orders">عرض الكل</a></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-right p-3 font-medium text-muted-foreground">#</th>
                <th className="text-right p-3 font-medium text-muted-foreground">العميل</th>
                <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
                <th className="text-right p-3 font-medium text-muted-foreground">المجموع</th>
                <th className="text-right p-3 font-medium text-muted-foreground">المصدر</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">لا توجد طلبات حديثة</td></tr>
              ) : recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="p-3 text-muted-foreground font-mono text-xs">{order.orderNumber}</td>
                  <td className="p-3"><div className="font-medium">{order.customerName}</div><div className="text-xs text-muted-foreground">{order.addressCity || order.customerPhone}</div></td>
                  <td className="p-3"><Badge variant="secondary" className="text-xs font-normal">{statusLabels[order.status] || order.status}</Badge></td>
                  <td className="p-3 font-semibold">{formatCurrency(order.total)}</td>
                  <td className="p-3"><Badge variant="outline" className="text-xs">{order.sessionId ? "Analytics" : "غير مرتبط"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
