import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Pencil, Plus, Ticket, Trash2 } from "lucide-react";

type CouponType = "percentage" | "fixed";

type AdminCoupon = {
  id: number;
  code: string;
  type: CouponType;
  value: number;
  minOrder?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usageCount?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type CouponForm = {
  code: string;
  type: CouponType;
  value: number;
  minOrder?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
};

type CouponsResponse = {
  data: AdminCoupon[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const emptyCoupon: CouponForm = {
  code: "",
  type: "percentage",
  value: 0,
  minOrder: 0,
  isActive: true,
};

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function optionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

function cleanPayload(form: CouponForm, includeCode: boolean) {
  const payload: Partial<CouponForm> = {
    type: form.type,
    value: form.value,
    minOrder: form.minOrder,
    maxDiscountAmount: form.maxDiscountAmount,
    usageLimit: form.usageLimit,
    startsAt: form.startsAt,
    expiresAt: form.expiresAt,
    isActive: form.isActive,
  };

  if (includeCode) payload.code = form.code.trim().toUpperCase();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === "") delete payload[key as keyof CouponForm];
  });

  return payload;
}

async function fetchCoupons(params: URLSearchParams): Promise<CouponsResponse> {
  const res = await apiRequest("GET", `/api/admin/coupons?${params.toString()}`);
  const payload = await res.json();
  return {
    data: Array.isArray(payload?.data) ? payload.data : [],
    meta: payload?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export default function CouponsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyCoupon);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [codeFilter, setCodeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const limit = 20;

  const queryParams = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (codeFilter.trim()) queryParams.set("code", codeFilter.trim());
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  if (activeFilter !== "all") queryParams.set("isActive", activeFilter);

  const { data, isLoading } = useQuery<CouponsResponse>({
    queryKey: ["/api/admin/coupons", page, limit, codeFilter, typeFilter, activeFilter],
    queryFn: () => fetchCoupons(queryParams),
  });

  const couponsList = data?.data ?? [];
  const meta = data?.meta ?? { page, limit, total: 0, totalPages: 0 };

  const createMutation = useMutation({
    mutationFn: (data: CouponForm) => apiRequest("POST", "/api/admin/coupons", cleanPayload(data, true)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "تم إضافة الكوبون بنجاح" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "فشل إضافة الكوبون", description: error?.message || "قد يكون الكود موجود مسبقاً", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: CouponForm }) =>
      apiRequest("PATCH", `/api/admin/coupons/${encodeURIComponent(code)}`, cleanPayload(data, false)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "تم تحديث الكوبون بنجاح" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ title: "فشل تحديث الكوبون", description: error?.message || "حدث خطأ غير متوقع", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => apiRequest("DELETE", `/api/admin/coupons/${encodeURIComponent(code)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "تم حذف الكوبون" });
      setDeleteConfirmCode(null);
    },
    onError: (error: any) => {
      toast({ title: "فشل حذف الكوبون", description: error?.message || "حدث خطأ غير متوقع", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCoupon(null);
    setForm(emptyCoupon);
  };

  const openCreateDialog = () => {
    setEditingCoupon(null);
    setForm(emptyCoupon);
    setDialogOpen(true);
  };

  const openEditDialog = (coupon: AdminCoupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.minOrder ?? undefined,
      maxDiscountAmount: coupon.maxDiscountAmount ?? undefined,
      usageLimit: coupon.usageLimit ?? undefined,
      startsAt: coupon.startsAt ?? undefined,
      expiresAt: coupon.expiresAt ?? undefined,
      isActive: coupon.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!editingCoupon && !form.code.trim()) {
      toast({ title: "كود الكوبون مطلوب", variant: "destructive" });
      return;
    }
    if (form.value <= 0 || (form.type === "percentage" && form.value > 100)) {
      toast({ title: "قيمة الخصم غير صحيحة", description: "النسبة يجب أن تكون بين 1 و 100", variant: "destructive" });
      return;
    }
    if ([form.minOrder, form.maxDiscountAmount, form.usageLimit].some((value) => value !== undefined && value < 0)) {
      toast({ title: "القيم الاختيارية يجب ألا تكون سالبة", variant: "destructive" });
      return;
    }
    if (form.startsAt && form.expiresAt && new Date(form.expiresAt) <= new Date(form.startsAt)) {
      toast({ title: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية", variant: "destructive" });
      return;
    }

    if (editingCoupon) {
      updateMutation.mutate({ code: editingCoupon.code, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground" data-testid="text-coupons-count">
          {meta.total} كوبون
        </p>
        <Button onClick={openCreateDialog} className="gap-1" data-testid="button-add-coupon">
          <Plus className="w-4 h-4" />
          إضافة كوبون
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            value={codeFilter}
            onChange={(e) => { setCodeFilter(e.target.value.toUpperCase()); setPage(1); }}
            placeholder="بحث بالكود"
            className="font-mono"
          />
          <Select value={typeFilter} onValueChange={(value) => { setTypeFilter(value); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="نوع الخصم" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="percentage">نسبة مئوية</SelectItem>
              <SelectItem value="fixed">مبلغ ثابت</SelectItem>
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={(value) => { setActiveFilter(value); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="true">مفعّل</SelectItem>
              <SelectItem value="false">معطّل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 rounded-xl"><div className="h-20 bg-muted rounded" /></Card>
          ))}
        </div>
      ) : couponsList.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">لا توجد كوبونات مطابقة</Card>
      ) : (
        <div className="space-y-3">
          {couponsList.map((coupon) => (
            <Card key={coupon.code} className="rounded-xl border-card-border p-4">
              <div className="flex gap-4 items-start flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-[#CDEB63]/15 flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5 text-[#8ab525]" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm font-mono" data-testid={`coupon-code-${coupon.code}`}>{coupon.code}</span>
                    <Badge variant="secondary" className="text-xs">
                      {coupon.type === "percentage" ? `${coupon.value}%` : `${coupon.value} ر.س`}
                    </Badge>
                    <Badge variant={coupon.isActive ? "default" : "outline"} className="text-xs">
                      {coupon.isActive ? "مفعّل" : "معطّل"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <span>{coupon.type === "percentage" ? "خصم نسبة مئوية" : "خصم مبلغ ثابت"}</span>
                    <span>الحد الأدنى: {coupon.minOrder ?? 0} ر.س</span>
                    <span>حد الخصم: {coupon.maxDiscountAmount ?? "-"}</span>
                    <span>الاستخدام: {coupon.usageCount ?? 0}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</span>
                    <span>يبدأ: {coupon.startsAt ? new Date(coupon.startsAt).toLocaleDateString("ar-SA") : "فوري"}</span>
                    <span>ينتهي: {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString("ar-SA") : "بدون انتهاء"}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(coupon)} data-testid={`button-edit-coupon-${coupon.code}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteConfirmCode(coupon.code)} data-testid={`button-delete-coupon-${coupon.code}`}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
          <ChevronRight className="w-4 h-4" /> السابق
        </Button>
        <span className="text-sm text-muted-foreground">صفحة {meta.page} من {meta.totalPages || 1}</span>
        <Button variant="outline" disabled={page >= meta.totalPages || isLoading} onClick={() => setPage((current) => current + 1)}>
          التالي <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "تعديل الكوبون" : "إضافة كوبون جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">كود الكوبون *</label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="مثال: SUMMER20" disabled={!!editingCoupon} className="font-mono" data-testid="input-coupon-code" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">الحالة</label>
                <Select value={String(form.isActive)} onValueChange={(value) => setForm({ ...form, isActive: value === "true" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">مفعّل</SelectItem>
                    <SelectItem value="false">معطّل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">نوع الخصم *</label>
                <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val as CouponType })}>
                  <SelectTrigger data-testid="select-coupon-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ر.س)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">القيمة * {form.type === "percentage" ? "(%)" : "(ر.س)"}</label>
                <Input type="number" min="0" value={form.value || ""} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} placeholder="0" data-testid="input-coupon-value" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">الحد الأدنى (ر.س)</label>
                <Input type="number" min="0" value={form.minOrder ?? ""} onChange={(e) => setForm({ ...form, minOrder: optionalNumber(e.target.value) })} placeholder="0" data-testid="input-coupon-min-order" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">أقصى خصم</label>
                <Input type="number" min="0" value={form.maxDiscountAmount ?? ""} onChange={(e) => setForm({ ...form, maxDiscountAmount: optionalNumber(e.target.value) })} placeholder="اختياري" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">حد الاستخدام</label>
                <Input type="number" min="0" value={form.usageLimit ?? ""} onChange={(e) => setForm({ ...form, usageLimit: optionalNumber(e.target.value) })} placeholder="اختياري" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">يبدأ في</label>
                <Input type="datetime-local" value={toDateTimeLocal(form.startsAt)} onChange={(e) => setForm({ ...form, startsAt: fromDateTimeLocal(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">ينتهي في</label>
                <Input type="datetime-local" value={toDateTimeLocal(form.expiresAt)} onChange={(e) => setForm({ ...form, expiresAt: fromDateTimeLocal(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-coupon">إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-coupon">
              {createMutation.isPending || updateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmCode !== null} onOpenChange={() => setDeleteConfirmCode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف الكوبون</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذا الكوبون؟</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmCode(null)} data-testid="button-cancel-delete-coupon">إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirmCode && deleteMutation.mutate(deleteConfirmCode)} disabled={deleteMutation.isPending} data-testid="button-confirm-delete-coupon">
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
