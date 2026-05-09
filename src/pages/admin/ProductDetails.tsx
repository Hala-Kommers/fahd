import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { insertProductSchema, type InsertProduct, type Product } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Default values for new product
const defaultValues: Partial<InsertProduct> = {
    title: "",
    sku: "",
    status: "active",
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

export default function ProductDetails() {
    const { toast } = useToast();
    const [location, setLocation] = useLocation();
    const [match, params] = useRoute("/admin/products/:id");
    const routeParams = (params || {}) as { id?: string };
    const productId = routeParams.id ?? "new";
    const isEditing = !!match && productId !== "new";

    const form = useForm<InsertProduct>({
        resolver: zodResolver(insertProductSchema),
        defaultValues,
    });

    const { data: product, isLoading: isLoadingProduct } = useQuery<Product>({
        queryKey: [`/api/products/${productId}`],
        enabled: !!isEditing && !!productId,
    });

    useEffect(() => {
        if (product) {
            // populate form with product data
            // We need to ensure types match perfectly.
            // InsertProduct omits id, but has same structure otherwise.
            const { id, ...rest } = product;
            form.reset(rest as InsertProduct);
        }
    }, [product, form]);

    const createMutation = useMutation({
        mutationFn: (data: InsertProduct) => apiRequest("POST", "/api/admin/products", data),
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
        mutationFn: (data: InsertProduct) =>
            apiRequest("PATCH", `/api/admin/products/${productId}`, data),
        onSuccess: () => {
            toast({ title: "تم تحديث المنتج بنجاح" });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
            queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}`] });
            setLocation("/admin/products");
        },
        onError: (error: any) => {
            toast({ title: "خطأ في تحديث المنتج", description: error.message, variant: "destructive" });
        },
    });

    const onSubmit = (data: InsertProduct) => {
        if (isEditing) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;
    const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
        control: form.control,
        name: "pricingTiers",
    });

    if (isEditing && isLoadingProduct) {
        return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10" dir="ltr">
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
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="block text-right">التصنيف</FormLabel>
                                                    <FormControl>
                                                        <Input dir="rtl" placeholder="إلكترونيات، ملابس..." {...field} />
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
                                        <div className="p-4 bg-muted/50 rounded text-center">
                                            <p className="text-muted-foreground">إدارة الخيارات متقدمة - سيتم إضافتها في النسخة القادمة.</p>
                                            {/* Here users would add options and generate variants. For simplicity, we can skip elaborate generator logic for now or stick to simple inputs */}
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
