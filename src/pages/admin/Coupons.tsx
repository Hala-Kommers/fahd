import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";
import type { Coupon, InsertCoupon } from "@shared/schema";

const emptyCoupon: InsertCoupon = {
  code: "",
  type: "percentage",
  value: 0,
  minOrder: 0,
};

export default function CouponsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<InsertCoupon>(emptyCoupon);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null);

  const { data: couponsList = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertCoupon) => apiRequest("POST", "/api/admin/coupons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "تم إضافة الكوبون بنجاح" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "فشل إضافة الكوبون - قد يكون الكود موجود مسبقاً", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<InsertCoupon> }) =>
      apiRequest("PATCH", `/api/admin/coupons/${code}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "تم تحديث الكوبون بنجاح" });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (code: string) => apiRequest("DELETE", `/api/admin/coupons/${code}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "تم حذف الكوبون" });
      setDeleteConfirmCode(null);
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

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minOrder: coupon.minOrder,
      expiresAt: coupon.expiresAt,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.code || !form.value) {
      toast({ title: "يرجى تعبئة الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (editingCoupon) {
      updateMutation.mutate({ code: editingCoupon.code, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 rounded-xl"><div className="h-16 bg-muted rounded" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground" data-testid="text-coupons-count">
          {couponsList.length} كوبون
        </p>
        <Button onClick={openCreateDialog} className="gap-1" data-testid="button-add-coupon">
          <Plus className="w-4 h-4" />
          إضافة كوبون
        </Button>
      </div>

      <div className="space-y-3">
        {couponsList.map((coupon) => (
          <Card key={coupon.code} className="rounded-xl border-card-border p-4">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-[#CDEB63]/15 flex items-center justify-center shrink-0">
                <Ticket className="w-5 h-5 text-[#8ab525]" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm font-mono" data-testid={`coupon-code-${coupon.code}`}>
                    {coupon.code}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {coupon.type === "percentage" ? `${coupon.value}%` : `${coupon.value} ر.س`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {coupon.type === "percentage" ? "خصم نسبة مئوية" : "خصم مبلغ ثابت"}
                  {coupon.minOrder ? ` - الحد الأدنى: ${coupon.minOrder} ر.س` : ""}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEditDialog(coupon)}
                  data-testid={`button-edit-coupon-${coupon.code}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteConfirmCode(coupon.code)}
                  data-testid={`button-delete-coupon-${coupon.code}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "تعديل الكوبون" : "إضافة كوبون جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">كود الكوبون *</label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="مثال: SUMMER20"
                disabled={!!editingCoupon}
                className="font-mono"
                data-testid="input-coupon-code"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">نوع الخصم *</label>
              <Select
                value={form.type}
                onValueChange={(val) => setForm({ ...form, type: val as "percentage" | "fixed" })}
              >
                <SelectTrigger data-testid="select-coupon-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                  <SelectItem value="fixed">مبلغ ثابت (ر.س)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  القيمة * {form.type === "percentage" ? "(%)" : "(ر.س)"}
                </label>
                <Input
                  type="number"
                  value={form.value || ""}
                  onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                  placeholder="0"
                  data-testid="input-coupon-value"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">الحد الأدنى (ر.س)</label>
                <Input
                  type="number"
                  value={form.minOrder || ""}
                  onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) || undefined })}
                  placeholder="0"
                  data-testid="input-coupon-min-order"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-coupon">
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-coupon"
            >
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
            <Button variant="outline" onClick={() => setDeleteConfirmCode(null)} data-testid="button-cancel-delete-coupon">
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmCode && deleteMutation.mutate(deleteConfirmCode)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-coupon"
            >
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
