import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import type { Product } from "@shared/schema";
import { useLocation } from "wouter";

export default function ProductsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "تم حذف المنتج" });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({ title: "خطأ في حذف المنتج", description: error.message, variant: "destructive" });
    }
  });

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
        <p className="text-sm text-muted-foreground" data-testid="text-products-count">
          {products.length} منتج
        </p>
        <Button onClick={() => setLocation("/admin/products/new")} className="gap-1" data-testid="button-add-product">
          <Plus className="w-4 h-4" />
          إضافة منتج
        </Button>
      </div>

      <div className="space-y-3">
        {products.map((product: any) => {
          // Support both old schema (image, price) and new schema (images[], pricing.price)
          const primaryImage =
            product.images?.find((img: any) => img?.isPrimary)?.url ||
            product.images?.[0]?.url ||
            product.image ||
            null;

          const displayPrice = product.pricing?.price ?? product.price ?? 0;
          const displayCurrency = product.pricing?.currency ?? "SAR";
          const displayCategory = product.category ?? "";
          const displaySku = product.sku ?? "";

          const stockDisplay = (() => {
            if (product.inventory) {
              if (product.inventory.mode === "global") {
                const low = product.inventory.stockTotal <= product.inventory.lowStockThreshold;
                return <span className={low ? "text-destructive font-medium" : ""}>المخزون: {product.inventory.stockTotal}</span>;
              } else {
                const total = (product.variants ?? []).reduce((acc: number, v: any) => acc + (v.stock ?? 0), 0);
                return <span>{total} قطعة (متغيرات)</span>;
              }
            }
            return <span>المخزون: {product.stock ?? "—"}</span>;
          })();

          return (
            <Card key={product.id} className="rounded-xl border-card-border p-4 hover:bg-accent/5 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                  {primaryImage ? (
                    <img src={primaryImage} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setLocation(`/admin/products/${product.id}`)}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm line-clamp-1 hover:text-primary transition-colors" data-testid={`product-title-${product.id}`}>
                      {product.title}
                    </h3>
                    <Badge variant={product.status === "active" ? "default" : "secondary"} className="text-[10px] h-5 px-1.5">
                      {product.status === "active" ? "نشط" : product.status === "draft" ? "مسودة" : "نشط"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {displayCategory && <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{displayCategory}</span>}
                    {displaySku && <span>SKU: {displaySku}</span>}
                    <span className="hidden sm:inline">|</span>
                    <span className="font-medium text-foreground">{displayPrice} {displayCurrency}</span>
                    {stockDisplay}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setLocation(`/admin/products/${product.id}`)}
                    data-testid={`button-edit-product-${product.id}`}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteConfirmId(String(product.id))}
                    data-testid={`button-delete-product-${product.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {products.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>لا يوجد منتجات حالياً</p>
            <Button variant="ghost" onClick={() => setLocation("/admin/products/new")}>إضافة أول منتج</Button>
          </div>
        )}
      </div>

      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف المنتج</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete">
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
