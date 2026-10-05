import ProductContentEditor from "@/components/ProductContentEditor";
import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type CategoryOption = {
    id: number | string;
    name: string;
};

type VariantOptionGroup = {
    id: string;
    name: string;
    values: string[];
};

type VariantRow = {
    key: string;
    sku: string;
    attributes: Record<string, string>;
    priceOverride: number;
    stock: number;
    isActive: boolean;
};

// Default values for new product
const defaultValues: any = {
    title: "",
    slug: "",
    sku: "",
    status: "active",
    isFeatured: false,
    descriptionShort: "",
    descriptionLong: "",
    category: "",
    pricing: {
        price: 0,
        cost: 0,
        compareAt: 0,
        currency: "SAR",
    },
    images: [],
    inventory: {
        mode: "global",
        stockTotal: 0,
        lowStockThreshold: 5,
    },
    hasVariants: false,
    variantOptions: [],
    variants: [],
    specs: [],
    faq: [],
    usageInstructions: "",
    pricingTiers: [],
    salesCount: 0,
    rating: 0,
};

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function variantKeyFromAttributes(attributes: Record<string, string>, optionNames: string[]) {
    return optionNames.map((name) => `${name}:${attributes[name] || ""}`).join("|");
}

function cartesianProduct(groups: VariantOptionGroup[]) {
    if (!groups.length || groups.some((group) => group.values.length === 0)) return [] as Record<string, string>[];

    return groups.reduce<Record<string, string>[]>((acc, group) => {
        const next: Record<string, string>[] = [];
        acc.forEach((base) => {
            group.values.forEach((value) => {
              next.push({ ...base, [group.name]: value });
            });
        });
        return next;
    }, [{}]);
}

function buildVariantGroupsFromProduct(product: any): VariantOptionGroup[] {
    const optionNames = Array.isArray(product?.variantOptions)
        ? product.variantOptions.filter(Boolean)
        : [];
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const inferredNames = optionNames.length > 0
        ? optionNames
        : Array.from(
            new Set(
                variants.flatMap((variant: any) => Object.keys(variant?.attributes || {}))
            )
        );

    if (inferredNames.length === 0) return [];

    return inferredNames.map((name: string) => createVariantGroup(
        name,
        Array.from(
            new Set(
                variants
                    .map((variant: any) => variant?.attributes?.[name])
                    .filter(Boolean)
            )
        )
    ));
}

function normalizeVariantRows(groups: VariantOptionGroup[], existingRows: VariantRow[]) {
    const optionNames = groups.map((group) => group.name);
    const combos = cartesianProduct(groups);
    const existingMap = new Map(
        existingRows.map((row) => [row.key, row])
    );

    return combos.map((attributes) => {
        const key = variantKeyFromAttributes(attributes, optionNames);
        const existing = existingMap.get(key);
        return {
            key,
            sku: existing?.sku || "",
            attributes,
            priceOverride: existing?.priceOverride ?? 0,
            stock: existing?.stock ?? 0,
            isActive: existing?.isActive ?? true,
        };
    });
}

function createVariantGroup(name = "", values: string[] = []): VariantOptionGroup {
    return {
        id: Math.random().toString(36).slice(2),
        name,
        values,
    };
}

export default function ProductDetails() {
    const { toast } = useToast();
    const [location, setLocation] = useLocation();
    const [match, params] = useRoute("/admin/products/:id");
    const routeParams = (params || {}) as { id?: string };
    const productId = routeParams.id ?? "new";
    const isEditing = !!match && productId !== "new";

    const form = useForm<any>({
        defaultValues,
    });
    const [variantGroups, setVariantGroups] = useState<VariantOptionGroup[]>([]);
    const [generatedVariants, setGeneratedVariants] = useState<VariantRow[]>([]);
    const [variantValueDrafts, setVariantValueDrafts] = useState<Record<string, string>>({});
    const [deletedVariantKeys, setDeletedVariantKeys] = useState<string[]>([]);

    const { data: product, isLoading: isLoadingProduct } = useQuery<any>({
        queryKey: [`/api/admin/products/${productId}`],
        enabled: !!isEditing && !!productId,
    });

    const { data: categoriesRaw = [] } = useQuery<any[]>({
        queryKey: ["/api/categories"],
    });

    const categories: CategoryOption[] = (Array.isArray(categoriesRaw) ? categoriesRaw : [])
        .map((item: any) => {
            const source = item?.data ?? item;
            if (!source?.id || !source?.name) return null;
            return { id: source.id, name: source.name };
        })
        .filter((item): item is CategoryOption => !!item);

    useEffect(() => {
        if (product) {
            const source = product?.data ?? product;
            const { id, category, ...rest } = source;
            form.reset({
                ...rest,
                slug: source?.slug || "",
                isFeatured: !!source?.isFeatured,
                status: source?.status || (source?.isActive ? "active" : "draft"),
                category: String(category?.id ?? category ?? ""),
            });

            const groups = buildVariantGroupsFromProduct(source);
            setVariantGroups(groups);

            const existingRows: VariantRow[] = Array.isArray(source?.variants)
                ? source.variants.map((variant: any) => ({
                    key: variantKeyFromAttributes(variant?.attributes || {}, groups.map((group) => group.name)),
                    sku: variant?.sku || "",
                    attributes: variant?.attributes || {},
                    priceOverride: Number(variant?.priceOverride ?? 0),
                    stock: Number(variant?.stock ?? 0),
                    isActive: variant?.isActive !== false,
                }))
                : [];
            setGeneratedVariants(normalizeVariantRows(groups, existingRows));
        }
    }, [product, form]);

    const createMutation = useMutation({
        mutationFn: (data: any) => apiRequest("POST", "/api/admin/products", data),
        onSuccess: () => {
            toast({ title: "تم إنشاء المنتج بنجاح" });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
            setLocation("/admin/products");
        },
        onError: (error: any) => {
            toast({ title: "خطأ في إنشاء المنتج", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) =>
            apiRequest("PATCH", `/api/admin/products/${productId}`, data),
        onSuccess: () => {
            toast({ title: "تم تحديث المنتج بنجاح" });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
            queryClient.invalidateQueries({ queryKey: [`/api/admin/products/${productId}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}`] });
            setLocation("/admin/products");
        },
        onError: (error: any) => {
            toast({ title: "خطأ في تحديث المنتج", description: error.message, variant: "destructive" });
        },
    });

    const onSubmit = (data: any) => {
        form.clearErrors();
        const images = Array.isArray(data.images) ? data.images : [];
        const normalizedGroups = variantGroups
            .map((group) => ({
                ...group,
                name: group.name.trim(),
                values: group.values.map((value) => value.trim()).filter(Boolean),
            }))
            .filter((group) => group.name.length > 0);
        const variantOptionNames = normalizedGroups.map((group) => group.name);
        const nextGeneratedVariants = normalizeVariantRows(normalizedGroups, generatedVariants)
            .filter((variant) => !deletedVariantKeys.includes(variant.key));

        if (!data.title?.trim()) {
            form.setError("title", { type: "manual", message: "اسم المنتج مطلوب" });
            toast({ title: "الرجاء إدخال اسم المنتج", variant: "destructive" });
            return;
        }

        if (!data.sku?.trim()) {
            form.setError("sku", { type: "manual", message: "SKU مطلوب" });
            toast({ title: "الرجاء إدخال SKU", variant: "destructive" });
            return;
        }

        if (!data.category) {
            form.setError("category", { type: "manual", message: "التصنيف مطلوب" });
            toast({ title: "الرجاء اختيار التصنيف", variant: "destructive" });
            return;
        }

        if (images.length === 0) {
            form.setError("images", { type: "manual", message: "أضف صورة واحدة على الأقل" });
            toast({ title: "يجب إضافة صورة واحدة على الأقل", variant: "destructive" });
            return;
        }

        const primaryImagesCount = images.filter((img: any) => !!img?.isPrimary).length;
        if (primaryImagesCount !== 1) {
            form.setError("images", { type: "manual", message: "يجب اختيار صورة رئيسية واحدة فقط" });
            toast({ title: "يجب اختيار صورة رئيسية واحدة فقط", variant: "destructive" });
            return;
        }

        if (data.hasVariants && normalizedGroups.length === 0) {
            form.setError("variantOptions", { type: "manual", message: "أضف خيار متغير واحد على الأقل" });
            toast({ title: "أضف خيار متغير واحد على الأقل", description: "مثل size أو color", variant: "destructive" });
            return;
        }

        if (data.hasVariants) {
            if (normalizedGroups.some((group) => group.values.length === 0)) {
                form.setError("variantOptions", { type: "manual", message: "أضف قيمة واحدة على الأقل لكل خيار" });
                toast({ title: "أضف قيمة واحدة على الأقل لكل خيار", variant: "destructive" });
                return;
            }

            if (nextGeneratedVariants.length === 0) {
                form.setError("variants", { type: "manual", message: "أضف متغير واحد على الأقل" });
                toast({ title: "يجب إضافة متغير واحد على الأقل", variant: "destructive" });
                return;
            }
        }

        const categoryIdNum = Number(data.category);
        const variants = nextGeneratedVariants.map((variant: VariantRow, index: number) => {
            return {
                sku: variant.sku,
                attributes: variant.attributes,
                priceOverride: Number(variant.priceOverride || 0),
                stock: Number(variant.stock || 0),
                isActive: variant.isActive !== false,
                sortOrder: index,
            };
        });

        const payload: any = {
            ...data,
            slug: data.slug || slugify(data.title || ""),
            isFeatured: !!data.isFeatured,
            category: Number.isNaN(categoryIdNum)
                ? { id: data.category }
                : { id: categoryIdNum },
            images: (data.images || []).map((img: any, index: number) => ({
                url: img.url,
                isPrimary: !!img.isPrimary,
                sortOrder: Number(img.sortOrder ?? index),
            })),
            variantOptions: variantOptionNames,
            variants,
        };

        if (data.hasVariants) {
            syncGeneratedRows(nextGeneratedVariants, variantOptionNames);
        }

        if (isEditing) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;
    const hasVariants = form.watch("hasVariants");
    const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
        control: form.control,
        name: "pricingTiers",
    });

    const syncGeneratedRows = (rows: VariantRow[], optionNames: string[]) => {
        setGeneratedVariants(rows);
        form.setValue("variantOptions", optionNames, { shouldDirty: true, shouldValidate: true });
        form.setValue("variants", rows, { shouldDirty: true, shouldValidate: true });
    };

    const handleGenerateVariants = () => {
        const normalizedGroups = variantGroups
            .map((group) => ({
                ...group,
                name: group.name.trim(),
                values: group.values.map((value) => value.trim()).filter(Boolean),
            }))
            .filter((group) => group.name.length > 0);

        if (normalizedGroups.length === 0) {
            form.setError("variantOptions", { type: "manual", message: "أضف خيار متغير واحد على الأقل" });
            toast({ title: "أضف خيار متغير واحد على الأقل", variant: "destructive" });
            return;
        }

        if (normalizedGroups.some((group) => group.values.length === 0)) {
            form.setError("variantOptions", { type: "manual", message: "أضف قيمة واحدة على الأقل لكل خيار" });
            toast({ title: "أضف قيمة واحدة على الأقل لكل خيار", variant: "destructive" });
            return;
        }

        const rows = normalizeVariantRows(normalizedGroups, generatedVariants)
            .filter((variant) => !deletedVariantKeys.includes(variant.key));
        syncGeneratedRows(rows, normalizedGroups.map((group) => group.name));
    };

    const handleUpdateVariantRow = (key: string, patch: Partial<VariantRow>) => {
        const rows = generatedVariants.map((row) => (row.key === key ? { ...row, ...patch } : row));
        syncGeneratedRows(rows, variantGroups.map((group) => group.name));
    };

    const handleAddVariantGroup = () => {
        setVariantGroups((prev) => [...prev, createVariantGroup()]);
    };

    const handleRemoveVariantGroup = (groupId: string) => {
        setVariantGroups((prev) => prev.filter((group) => group.id !== groupId));
        setVariantValueDrafts((prev) => {
            const next = { ...prev };
            delete next[groupId];
            return next;
        });
    };

    const handleAddVariantValue = (groupId: string) => {
        const draft = (variantValueDrafts[groupId] || "").trim();
        if (!draft) return;

        setVariantGroups((prev) => prev.map((group) =>
            group.id === groupId && !group.values.includes(draft)
                ? { ...group, values: [...group.values, draft] }
                : group
        ));
        setVariantValueDrafts((prev) => ({ ...prev, [groupId]: "" }));
    };

    const handleRemoveVariantValue = (groupId: string, value: string) => {
        setVariantGroups((prev) => prev.map((group) =>
            group.id === groupId
                ? { ...group, values: group.values.filter((item) => item !== value) }
                : group
        ));
    };

    const handleUpdateVariantGroup = (groupId: string, patch: Partial<VariantOptionGroup>) => {
        setVariantGroups((prev) => prev.map((group) => (group.id === groupId ? { ...group, ...patch } : group)));
    };

    if (isEditing && isLoadingProduct) {
        return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10" dir="rtl">
            {isEditing && <ProductContentEditor productId={productId}/>}
 {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/products")}>
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {isEditing ? "تعديل المنتج" : "منتج جديد"}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isEditing ? `ID: ${productId}` : "إضافة منتج جديد للمتجر"}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setLocation("/admin/products")}>
                        إلغاء
                    </Button>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
                        {isSaving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                        <Save className="w-4 h-4 ml-2" />
                        {isEditing ? "حفظ التغييرات" : "حفظ المنتج"}
                    </Button>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="w-full justify-start overflow-x-auto">
                            <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
                            <TabsTrigger value="pricing">التسعير</TabsTrigger>
                            <TabsTrigger value="images">الصور</TabsTrigger>
                            <TabsTrigger value="inventory">المخزون</TabsTrigger>
                            <TabsTrigger value="variants">الخيارات (Variants)</TabsTrigger>
                            <TabsTrigger value="specs">المواصفات</TabsTrigger>
                            <TabsTrigger value="faq">الأسئلة الشائعة</TabsTrigger>
                            <TabsTrigger value="usage">طريقة الاستعمال</TabsTrigger>
                        </TabsList>

                        {/* Tab 1: Basic Info */}
                        <TabsContent value="basic" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>معلومات المنتج</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="block text-right">اسم المنتج</FormLabel>
                                                <FormControl>
                                                    <Input dir="rtl" placeholder="مثال: سماعات رأس بلوتوث" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="sku"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="block text-right">رمز المنتج (SKU)</FormLabel>
                                                    <FormControl>
                                                        <Input dir="ltr" placeholder="SKU-12345" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="slug"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="block text-right">Slug</FormLabel>
                                                    <FormControl>
                                                        <Input dir="ltr" placeholder="saffron-musk" {...field} value={field.value ?? ""} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="block text-right">التصنيف</FormLabel>
                                                    <FormControl>
                                                        <select
                                                            value={field.value || ""}
                                                            onChange={(e) => field.onChange(e.target.value)}
                                                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                                        >
                                                            <option value="" disabled>اختر التصنيف</option>
                                                            {categories.map((cat) => (
                                                                <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                                                            ))}
                                                        </select>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">حالة المنتج</FormLabel>
                                                    <FormDescription>
                                                        تفعيل المنتج ليظهر في المتجر
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value === "active"}
                                                        onCheckedChange={(checked) => field.onChange(checked ? "active" : "draft")}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="isFeatured"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">منتج مميز</FormLabel>
                                                    <FormDescription>إظهار المنتج ضمن العروض/المنتجات المميزة</FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="descriptionShort"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="block text-right">وصف قصير</FormLabel>
                                                <FormControl>
                                                    <Textarea dir="rtl" placeholder="وصف يظهر في القائمة المختصرة" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="descriptionLong"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="block text-right">وصف كامل</FormLabel>
                                                <FormControl>
                                                    <Textarea dir="rtl" className="min-h-[150px]" placeholder="تفاصيل المنتج الكاملة..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 2: Pricing */}
                        <TabsContent value="pricing" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>بيانات التسعير</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 md:grid-cols-2">
                                    <FormField
                                        control={form.control}
                                        name="pricing.price"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>سعر البيع</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                </FormControl>
                                                <FormDescription>السعر النهائي للعميل</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="pricing.compareAt"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>السعر قبل الخصم (اختياري)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                </FormControl>
                                                <FormDescription>يظهر مشطوباً عليه</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="pricing.cost"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>سعر التكلفة (داخلي)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                </FormControl>
                                                <FormDescription>لحساب الأرباح فقط</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="pricing.currency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>العملة</FormLabel>
                                                <FormControl>
                                                    <Input readOnly {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                            {/* Pricing Tiers */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>تسعير الكميات (اختياري)</CardTitle>
                                    <p className="text-sm text-muted-foreground">أضف أسعاراً مختلفة لكل كمية (١ قطعة، ٢ قطعة، ٣ قطع...)</p>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {tierFields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-[80px_1fr_1fr_1fr_40px] gap-2 items-end border rounded p-3">
                                            <FormField
                                                control={form.control}
                                                name={`pricingTiers.${index}.qty`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">الكمية</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" min={1} {...field} onChange={e => field.onChange(parseInt(e.target.value) || 1)} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`pricingTiers.${index}.label`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">التسمية (اختياري)</FormLabel>
                                                        <FormControl>
                                                            <Input dir="rtl" placeholder="مثال: قطعتان" {...field} value={field.value ?? ""} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`pricingTiers.${index}.originalPrice`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">سعر البيع (مشطوب)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`pricingTiers.${index}.finalPrice`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">السعر النهائي</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTier(index)} className="self-end">
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => appendTier({ qty: tierFields.length + 1, label: "", originalPrice: 0, finalPrice: 0 })}
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> إضافة كمية
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 3: Images */}
                        <TabsContent value="images" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>صور المنتج</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="images"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="space-y-2">
                                                        {field.value?.map((img, index) => (
                                                            <div key={index} className="flex gap-2 items-center border p-2 rounded">
                                                                <div className="w-16 h-16 bg-muted rounded overflow-hidden">
                                                                    <img src={img.url} alt="Product" className="w-full h-full object-cover" />
                                                                </div>
                                                                <Input
                                                                    value={img.url}
                                                                    onChange={(e) => {
                                                                        const newImages = [...field.value];
                                                                        newImages[index].url = e.target.value;
                                                                        field.onChange(newImages);
                                                                    }}
                                                                />
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => {
                                                                    const newImages = field.value.filter((_, i) => i !== index);
                                                                    field.onChange(newImages);
                                                                }}>
                                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                                </Button>
                                                                <div className="flex items-center gap-2">
                                                                    <Switch
                                                                        checked={img.isPrimary}
                                                                        onCheckedChange={(checked) => {
                                                                            const newImages = field.value.map((im, i) => ({
                                                                                ...im,
                                                                                isPrimary: i === index ? checked : false // Ensure only one primary
                                                                            }));
                                                                            field.onChange(newImages);
                                                                        }}
                                                                    />
                                                                    <span className="text-xs">رئيسية</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <Button type="button" variant="outline" className="w-full" onClick={() => {
                                                            field.onChange([...(field.value || []), { id: Math.random().toString(), url: "/images/placeholder.png", isPrimary: field.value?.length === 0 }]);
                                                        }}>
                                                            <Plus className="w-4 h-4 mr-2" /> إضافة صورة
                                                        </Button>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 4: Inventory */}
                        <TabsContent value="inventory" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>إدارة المخزون</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="inventory.mode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>نظام التتبع</FormLabel>
                                                <FormControl>
                                                    <select
                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={field.value}
                                                        onChange={e => field.onChange(e.target.value)}
                                                    >
                                                        <option value="global">مستوى المنتج (Global)</option>
                                                        <option value="variant">مستوى الخيارات (Variant)</option>
                                                    </select>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {form.watch("inventory.mode") === "global" && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="inventory.stockTotal"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>الكمية المتوفرة</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="inventory.lowStockThreshold"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>تنبيه انخفاض المخزون</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 5: Variants */}
                        <TabsContent value="variants" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>خيارات المنتج</CardTitle>
                                    <p className="text-sm text-muted-foreground">أضف أسماء الخيارات وقيمها أولاً، ثم ستتولد التركيبات تلقائياً.</p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="hasVariants"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">تفعيل الخيارات</FormLabel>
                                                    <FormDescription>
                                                        مثل الألوان، المقاسات، إلخ.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    {form.watch("hasVariants") && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <div>
                                                    <h4 className="text-sm font-semibold">بنية المتغيرات</h4>
                                                    <p className="text-xs text-muted-foreground">أضف اسم كل خيار وقيمه، ثم ستتولد التركيبات تلقائياً.</p>
                                                </div>
                                                <Button type="button" variant="outline" onClick={handleAddVariantGroup}>
                                                    <Plus className="w-4 h-4 ml-2" /> إضافة خيار
                                                </Button>
                                            </div>

                                            <div className="space-y-3">
                                                {variantGroups.map((group) => (
                                                    <div key={group.id} className="rounded-2xl border p-4 space-y-4 bg-background">
                                                        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-start">
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Variation Name</FormLabel>
                                                                <FormControl>
                                                                <Input
                                                                        placeholder="اللون"
                                                                        value={group.name}
                                                                        onChange={(e) => handleUpdateVariantGroup(group.id, { name: e.target.value })}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveVariantGroup(group.id)} className="mt-6">
                                                                <Trash2 className="w-4 h-4 text-destructive" />
                                                            </Button>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <FormLabel className="text-xs">القيم</FormLabel>
                                                            <div className="flex flex-wrap gap-2">
                                                                {group.values.map((value) => (
                                                                    <span key={value} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
                                                                        {value}
                                                                        <button
                                                                            type="button"
                                                                            className="text-muted-foreground hover:text-foreground"
                                                                            onClick={() => handleRemoveVariantValue(group.id, value)}
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                                <Input
                                                                    value={variantValueDrafts[group.id] || ""}
                                                                    onChange={(e) => setVariantValueDrafts((prev) => ({ ...prev, [group.id]: e.target.value }))}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault();
                                                                            handleAddVariantValue(group.id);
                                                                        }
                                                                    }}
                                                                    placeholder="أضف قيمة..."
                                                                    className="min-w-[180px] flex-1"
                                                                />
                                                                <Button type="button" variant="outline" onClick={() => handleAddVariantValue(group.id)}>
                                                                    إضافة قيمة
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {form.formState.errors.variantOptions?.message && (
                                                <p className="text-sm font-medium text-destructive">
                                                    {String(form.formState.errors.variantOptions.message)}
                                                </p>
                                            )}

                                            <div className="rounded-2xl border p-4 space-y-4">
                                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                                    <div>
                                                        <h4 className="text-sm font-semibold">SKU المولدة</h4>
                                                        <p className="text-xs text-muted-foreground">عدّل تفاصيل كل تركيبة بعد توليدها.</p>
                                                    </div>
                                                    <Button type="button" onClick={handleGenerateVariants}>
                                                        <Plus className="w-4 h-4 ml-2" /> توليد التركيبات
                                                    </Button>
                                                </div>

                                                <div className="space-y-3">
                                                    {generatedVariants.map((variant) => (
                                                        <div key={variant.key} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_220px_120px_120px_120px_56px] md:items-center">
                                                            <div className="space-y-2">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {Object.entries(variant.attributes).map(([key, value]) => (
                                                                        <Badge key={`${variant.key}-${key}`} variant="secondary" className="text-[10px] uppercase">
                                                                            {value}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground break-all">{variant.key}</div>
                                                            </div>
                                                            <FormItem>
                                                                <FormLabel className="text-xs">SKU</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        value={variant.sku}
                                                                        onChange={(e) => handleUpdateVariantRow(variant.key, { sku: e.target.value })}
                                                                        placeholder="ISB-GRY-MAT"
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                            <FormItem>
                                                                <FormLabel className="text-xs">سعر مخصص</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        value={variant.priceOverride}
                                                                        onChange={(e) => handleUpdateVariantRow(variant.key, { priceOverride: parseFloat(e.target.value) || 0 })}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                            <FormItem>
                                                                <FormLabel className="text-xs">المخزون</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        value={variant.stock}
                                                                        onChange={(e) => handleUpdateVariantRow(variant.key, { stock: parseInt(e.target.value) || 0 })}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                            <div className="flex items-center gap-2">
                                                                <Switch
                                                                    checked={variant.isActive}
                                                                    onCheckedChange={(checked) => handleUpdateVariantRow(variant.key, { isActive: checked })}
                                                                />
                                                                <span className="text-sm">نشط</span>
                                                            </div>
                                                            <div className="flex items-center justify-end gap-3">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setDeletedVariantKeys((prev) => prev.includes(variant.key) ? prev : [...prev, variant.key]);
                                                                        setGeneratedVariants((prev) => {
                                                                            const next = prev.filter((row) => row.key !== variant.key);
                                                                            form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    title="حذف التركيبة"
                                                                >
                                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {form.formState.errors.variants?.message && (
                                                    <p className="text-sm font-medium text-destructive">
                                                        {String(form.formState.errors.variants.message)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 6: Specs */}
                        <TabsContent value="specs" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>المواصفات التقنية</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="specs"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="space-y-2">
                                                    {field.value?.map((spec, index) => (
                                                        <div key={index} className="flex gap-2 items-center">
                                                            <Input
                                                                placeholder="الخاصية (مثلاً: اللون)"
                                                                value={spec.key}
                                                                onChange={(e) => {
                                                                    const newSpecs = [...field.value];
                                                                    newSpecs[index].key = e.target.value;
                                                                    field.onChange(newSpecs);
                                                                }}
                                                            />
                                                            <Input
                                                                placeholder="القيمة (مثلاً: أحمر)"
                                                                value={spec.value}
                                                                onChange={(e) => {
                                                                    const newSpecs = [...field.value];
                                                                    newSpecs[index].value = e.target.value;
                                                                    field.onChange(newSpecs);
                                                                }}
                                                            />
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => {
                                                                const newSpecs = field.value.filter((_, i) => i !== index);
                                                                field.onChange(newSpecs);
                                                            }}>
                                                                <Trash2 className="w-4 h-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button type="button" variant="outline" className="w-full" onClick={() => {
                                                        field.onChange([...(field.value || []), { key: "", value: "" }]);
                                                    }}>
                                                        <Plus className="w-4 h-4 mr-2" /> إضافة خاصية
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 7: FAQ */}
                        <TabsContent value="faq" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>الأسئلة الشائعة حول المنتج</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="faq"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="space-y-2">
                                                    {field.value?.map((item, index) => (
                                                        <div key={index} className="space-y-2 p-3 border rounded">
                                                            <Input
                                                                placeholder="السؤال"
                                                                value={item.question}
                                                                onChange={(e) => {
                                                                    const newFaq = [...field.value];
                                                                    newFaq[index].question = e.target.value;
                                                                    field.onChange(newFaq);
                                                                }}
                                                            />
                                                            <Textarea
                                                                placeholder="الإجابة"
                                                                value={item.answer}
                                                                onChange={(e) => {
                                                                    const newFaq = [...field.value];
                                                                    newFaq[index].answer = e.target.value;
                                                                    field.onChange(newFaq);
                                                                }}
                                                            />
                                                            <Button type="button" variant="ghost" size="sm" className="text-destructive w-full" onClick={() => {
                                                                const newFaq = field.value.filter((_, i) => i !== index);
                                                                field.onChange(newFaq);
                                                            }}>
                                                                <Trash2 className="w-4 h-4 mr-2" /> حذف السؤال
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button type="button" variant="outline" className="w-full" onClick={() => {
                                                        field.onChange([...(field.value || []), { question: "", answer: "" }]);
                                                    }}>
                                                        <Plus className="w-4 h-4 mr-2" /> إضافة سؤال
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Tab 8: Usage Instructions */}
                        <TabsContent value="usage" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>طريقة الاستعمال</CardTitle>
                                    <p className="text-sm text-muted-foreground">تظهر في صفحة المنتج للعميل</p>
                                </CardHeader>
                                <CardContent>
                                    <FormField
                                        control={form.control}
                                        name="usageInstructions"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="block text-right">تعليمات الاستخدام</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        dir="rtl"
                                                        className="min-h-[200px]"
                                                        placeholder="اكتب خطوات الاستخدام، النصائح، التحذيرات..."
                                                        {...field}
                                                        value={field.value ?? ""}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </form>
            </Form>
        </div>
    );
}
