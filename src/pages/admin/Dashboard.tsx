
import { useAdminStore } from "@/lib/admin-store";
import { mockStats, salesData } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign, ShoppingCart, Package, TrendingUp, AlertTriangle, MapPin, Clock
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

function formatCurrency(amount: number) {
  return `${amount.toLocaleString("ar-SA")} ر.س`;
}

export default function Dashboard() {
  const { orders } = useAdminStore();
  const recentOrders = orders.slice(0, 10);

  const stats = [
    {
      label: "إجمالي الإيرادات",
      value: formatCurrency(mockStats.revenueToday),
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "إجمالي الطلبات",
      value: mockStats.totalOrdersToday.toString(),
      icon: ShoppingCart,
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "نسبة التحويل",
      value: `${mockStats.conversionRate}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      label: "طلبات قيد المعالجة",
      value: mockStats.ordersProcessing.toString(),
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      label: "عناوين ضعيفة",
      value: `${mockStats.weakAddressPercentage}%`,
      icon: MapPin,
      color: "text-red-500",
      bg: "bg-red-100 dark:bg-red-900/30",
    },
    {
      label: "عالي المخاطر",
      value: `${mockStats.highRiskPercentage}%`,
      icon: AlertTriangle,
      color: "text-yellow-500",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 rounded-xl border-card-border overflow-hidden">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                {/* Micro chart placeholder or percentage change could go here */}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 p-6 rounded-xl border-card-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">تحليل المبيعات</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs">7 أيام</Button>
              <Button variant="default" size="sm" className="h-8 text-xs bg-[#CDEB63] text-black hover:bg-[#b5d648]">30 يوم</Button>
            </div>
          </div>
          <div className="h-[300px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CDEB63" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#CDEB63" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#888' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelStyle={{ color: '#666' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#CDEB63"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPv)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6 rounded-xl border-card-border bg-gradient-to-br from-white to-gray-50/50">
          <h3 className="font-bold text-lg mb-4">إجراءات سريعة</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2 h-10 border-red-200 hover:bg-red-50 hover:text-red-600">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="flex-1 text-right">طلبات عالية المخاطرة</span>
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">3</Badge>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 h-10 border-orange-200 hover:bg-orange-50 hover:text-orange-600">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span className="flex-1 text-right">عناوين ضعيفة</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-orange-500 hover:bg-orange-600">5</Badge>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 h-10 border-blue-200 hover:bg-blue-50 hover:text-blue-600">
              <Package className="w-4 h-4 text-blue-500" />
              <span className="flex-1 text-right">مخزون منخفض</span>
              <Badge className="h-5 px-1.5 text-[10px] bg-blue-500 hover:bg-blue-600">2</Badge>
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="rounded-xl border-card-border overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="font-bold text-foreground">آخر الطلبات</h2>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">عرض الكل</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-right p-3 font-medium text-muted-foreground">#</th>
                <th className="text-right p-3 font-medium text-muted-foreground">العميل</th>
                <th className="text-right p-3 font-medium text-muted-foreground">الحالة</th>
                <th className="text-right p-3 font-medium text-muted-foreground">المجموع</th>
                <th className="text-right p-3 font-medium text-muted-foreground">المخاطرة</th>
                <th className="text-right p-3 font-medium text-muted-foreground">العنوان</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, idx) => (
                <tr key={order.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors cursor-pointer">
                  <td className="p-3 text-muted-foreground font-mono text-xs">{order.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.city}</div>
                  </td>
                  <td className="p-3">
                    <Badge variant={
                      order.status === 'New' ? 'default' :
                        order.status === 'Confirmed' ? 'outline' :
                          order.status === 'Cancelled' ? 'destructive' : 'secondary'
                    } className="text-xs font-normal">
                      {order.status}
                    </Badge>
                  </td>
                  <td className="p-3 font-semibold">{formatCurrency(order.total)}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={`text-xs border-0 ${order.riskLevel === 'High' ? 'bg-red-100 text-red-700' :
                        order.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                      }`}>
                      {order.riskLevel}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${order.addressConfidence > 80 ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                      <span className="text-xs text-muted-foreground">{order.addressConfidence}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

