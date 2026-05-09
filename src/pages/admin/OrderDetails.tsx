import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Order, OrderStatus } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    ShieldAlert,
    Archive,
    CheckCircle,
    Truck,
    RotateCcw,
    XCircle,
    FileText
} from "lucide-react";

// Formatting Helpers
const formatCurrency = (amount: number, currency: string = "SAR") => {
    return new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency: currency,
    }).format(amount);
};

const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm a");
};

// Map status to colors
const getStatusColor = (status: OrderStatus) => {
    const styles: Record<string, string> = {
        new: "bg-blue-100 text-blue-800 border-blue-200",
        confirmed: "bg-green-100 text-green-800 border-green-200",
        processing: "bg-yellow-100 text-yellow-800 border-yellow-200",
        shipped: "bg-purple-100 text-purple-800 border-purple-200",
        delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
        returned: "bg-red-100 text-red-800 border-red-200",
        cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return styles[status] || styles.new;
};

export default function OrderDetails() {
    const params = useParams<{ id: string }>();
    const id = params.id;
    const { toast } = useToast();

    const { data: order, isLoading, error } = useQuery<Order>({
        queryKey: [`/api/admin/orders/${id}`],
    });

    const updateStatusMutation = useMutation({
        mutationFn: async (newStatus: OrderStatus) => {
            const res = await apiRequest("PATCH", `/api/admin/orders/${id}`, { status: newStatus });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/admin/orders/${id}`] });
            toast({ title: "تم التحديث", description: "تم تغيير حالة الطلب بنجاح" });
        },
        onError: () => {
            toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" });
        },
    });

    if (isLoading) return <div className="p-8 text-center">جاري تحميل تفاصيل الطلب...</div>;
    if (error || !order) return <div className="p-8 text-center text-destructive">الطلب غير موجود</div>;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "تم النسخ", description: text });
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">طلب #{order.orderNumber}</h1>
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                            {order.status}
                        </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="font-mono text-xs">{order.id}</span>
                        <span>•</span>
                        <span>{formatDate(order.createdAt)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Select
                        value={order.status}
                        onValueChange={(val) => updateStatusMutation.mutate(val as OrderStatus)}
                        disabled={updateStatusMutation.isPending}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="تغيير الحالة" />
                        </SelectTrigger>
                        <SelectContent>
                            {["new", "confirmed", "processing", "shipped", "delivered", "returned", "cancelled"].map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={() => handleCopy(`Customer: ${order.customer.name}\nPhone: ${order.customer.phone}\nAddress: ${order.address.raw}`)}>
                        <Copy className="w-4 h-4 ml-2" />
                        نسخ البيانات
                    </Button>
                    <Button variant="outline">
                        <Printer className="w-4 h-4 ml-2" />
                        PDF
                    </Button>
                    <Button variant="destructive" size="icon">
                        <AlertTriangle className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Main Info) */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-primary" />
                                المنتجات ({order.items.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right w-[50%]">المنتج</TableHead>
                                        <TableHead className="text-right">الخصائص</TableHead>
                                        <TableHead className="text-center">الكمية</TableHead>
                                        <TableHead className="text-right">السعر</TableHead>
                                        <TableHead className="text-right">الإجمالي</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <div className="font-medium">{item.title}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{item.sku}</div>
                                            </TableCell>
                                            <TableCell>
                                                {item.variant ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(item.variant).map(([k, v]) => (
                                                            <Badge key={k} variant="secondary" className="text-[10px] px-1">
                                                                {k}: {v}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : "-"}
                                            </TableCell>
                                            <TableCell className="text-center">{item.qty}</TableCell>
                                            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                            <TableCell className="font-bold">{formatCurrency(item.lineTotal)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Customer & Address */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <User className="w-4 h-4 text-primary" />
                                    بيانات العميل
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">الاسم:</span>
                                    <span className="font-medium">{order.customer.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">الجوال:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono" dir="ltr">{order.customer.phone}</span>
                                        <Copy className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary" onClick={() => handleCopy(order.customer.phone)} />
                                    </div>
                                </div>
                                {order.notes && (
                                    <div className="pt-2 border-t mt-2">
                                        <span className="text-muted-foreground block mb-1 text-xs">ملاحظات العميل:</span>
                                        <p className="text-sm bg-muted p-2 rounded">{order.notes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MapPin className="w-4 h-4 text-primary" />
                                    العنوان
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-sm border p-2 rounded bg-muted/20">
                                    {order.address.raw}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-xs text-muted-foreground">المدينة</span>
                                        <div className="font-medium">{order.address.city}</div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground">الحي</span>
                                        <div className="font-medium">{order.address.district || "-"}</div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground">الشارع</span>
                                        <div className="font-medium">{order.address.street || "-"}</div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground">المبنى</span>
                                        <div className="font-medium">{order.address.buildingNo || "-"}</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t">
                                    <span className="text-xs text-muted-foreground">دقة العنوان</span>
                                    <Badge variant={order.address.confidence > 80 ? "default" : "destructive"}>
                                        {order.address.confidence}%
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Activity Log */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <History className="w-4 h-4 text-primary" />
                                سجل النشاطات (Activity Log)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {order.activityLog.slice().reverse().map((log, i) => (
                                    <div key={i} className="flex gap-4 text-sm">
                                        <div className="min-w-[140px] text-muted-foreground text-xs font-mono pt-1">
                                            {format(new Date(log.at), "yyyy-MM-dd HH:mm")}
                                        </div>
                                        <div className="flex-1 pb-4 border-b last:border-0 border-border/50">
                                            <div className="font-medium">{log.action}</div>
                                            {log.note && <div className="text-muted-foreground text-xs mt-1">{log.note}</div>}
                                            {log.from && log.to && (
                                                <div className="flex items-center gap-2 text-xs mt-1">
                                                    <Badge variant="outline" className="text-[10px]">{log.from}</Badge>
                                                    <span>→</span>
                                                    <Badge variant="outline" className="text-[10px]">{log.to}</Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column (Sidebar) */}
                <div className="flex flex-col gap-6">
                    {/* Financial Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CreditCard className="w-4 h-4 text-primary" />
                                ملخص مالي
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">المجموع الفرعي</span>
                                <span>{formatCurrency(order.totals.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">الشحن</span>
                                <span>{formatCurrency(order.totals.shipping)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600">
                                <span className="">الخصم</span>
                                <span>- {formatCurrency(order.totals.discount)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <span>الإجمالي</span>
                                <span>{formatCurrency(order.totals.grandTotal)}</span>
                            </div>
                            <div className="pt-2">
                                <div className="bg-muted p-2 rounded text-center text-sm font-medium flex items-center justify-center gap-2">
                                    {order.paymentMethod === 'COD' ? <BanknoteIcon /> : <CreditCardIcon />}
                                    {order.paymentMethod === 'COD' ? 'الدفع عند الاستلام' : 'دفع إلكتروني'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Anti-Fraud */}
                    <Card className="border-l-4 border-l-primary">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ShieldAlert className="w-4 h-4 text-primary" />
                                تحليل المخاطر (Anti-Fraud)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-center">
                                <div className={cn(
                                    "w-24 h-24 rounded-full flex items-center justify-center border-8 text-2xl font-bold",
                                    order.risk.score < 20 ? "border-green-100 text-green-600" :
                                        order.risk.score <= 50 ? "border-yellow-100 text-yellow-600" :
                                            "border-red-100 text-red-600"
                                )}>
                                    {order.risk.score}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>OTP Status</span>
                                    <Badge variant={order.risk.otpStatus === 'verified' ? 'outline' : 'destructive'} className="text-[10px]">
                                        {order.risk.otpStatus}
                                    </Badge>
                                </div>
                            </div>

                            {order.risk.flags.length > 0 && (
                                <div className="bg-red-50 p-2 rounded text-red-700 text-xs space-y-1">
                                    <div className="font-semibold flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Flags Detected:
                                    </div>
                                    <ul className="list-disc list-inside">
                                        {order.risk.flags.map(f => <li key={f}>{f}</li>)}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}

function BanknoteIcon() {
    return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
}

function CreditCardIcon() {
    return <CreditCard className="w-4 h-4" />;
}
