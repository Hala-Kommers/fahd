import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, FileText, HelpCircle, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Policy, GlobalFaq } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function PoliciesPage() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">السياسات والأسئلة الشائعة</h1>
                <p className="text-muted-foreground">إدارة سياسات المتجر والأسئلة العامة التي يجيب عليها فهد.</p>
            </div>

            <Tabs defaultValue="policies" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="policies" className="gap-2"><FileText className="w-4 h-4" /> سياسات المتجر</TabsTrigger>
                    <TabsTrigger value="faq" className="gap-2"><HelpCircle className="w-4 h-4" /> الأسئلة العامة (Global FAQ)</TabsTrigger>
                </TabsList>

                <TabsContent value="policies" className="space-y-4 mt-4">
                    <PoliciesTab />
                </TabsContent>

                <TabsContent value="faq" className="space-y-4 mt-4">
                    <GlobalFaqTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function PoliciesTab() {
    const { toast } = useToast();
    const { data: policies, isLoading } = useQuery<Policy[]>({ queryKey: ["/api/admin/policies"] });
    const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const createMutation = useMutation({
        mutationFn: (newPolicy: Policy) => apiRequest("POST", "/api/admin/policies", newPolicy),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
            toast({ title: "تم إضافة السياسة بنجاح" });
            setIsDialogOpen(false);
            setEditingPolicy(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: (policy: Policy) => apiRequest("PATCH", `/api/admin/policies/${policy.id}`, policy),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
            toast({ title: "تم تحديث السياسة بنجاح" });
            setIsDialogOpen(false);
            setEditingPolicy(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/policies/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/policies"] });
            toast({ title: "تم حذف السياسة" });
        }
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const policy: any = {
            id: editingPolicy?.id || "pol_" + Math.random().toString(36).substr(2, 9),
            title: formData.get("title") as string,
            appliesTo: formData.get("appliesTo") as any,
            content: (formData.get("content") as string).split('\n').filter(l => l.trim()),
            cities: (formData.get("cities") as string)?.split(',').map(c => c.trim()).filter(c => c) || [],
            lastUpdated: new Date().toISOString()
        };

        if (editingPolicy) {
            updateMutation.mutate(policy);
        } else {
            createMutation.mutate(policy);
        }
    };

    if (isLoading) return <Loader2 className="animate-spin" />;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingPolicy(null)} className="gap-2"><Plus className="w-4 h-4" /> إضافة سياسة جديدة</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingPolicy ? "تعديل السياسة" : "إضافة سياسة جديدة"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>عنوان السياسة</Label>
                                    <Input name="title" defaultValue={editingPolicy?.title} required placeholder="مثال: سياسة الشحن" />
                                </div>
                                <div className="space-y-2">
                                    <Label>تنطبق على</Label>
                                    <Select name="appliesTo" defaultValue={editingPolicy?.appliesTo || "all"}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">الكل (All)</SelectItem>
                                            <SelectItem value="category">تصنيف محدد</SelectItem>
                                            <SelectItem value="product">منتج محدد</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>محتوى السياسة (كل بند في سطر)</Label>
                                <Textarea name="content" className="min-h-[150px]" defaultValue={editingPolicy?.content.join('\n')} required />
                            </div>
                            <div className="space-y-2">
                                <Label>المدن المتاحة (اختياري - افصل بفاصلة)</Label>
                                <Input name="cities" defaultValue={editingPolicy?.cities?.join(', ')} placeholder="الرياض، جدة..." />
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="animate-spin" /> : "حفظ"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {policies?.map(policy => (
                    <Card key={policy.id} className="relative group">
                        <CardHeader>
                            <CardTitle className="text-lg">{policy.title}</CardTitle>
                            <CardDescription className="text-xs">آخر تحديث: {new Date(policy.lastUpdated).toLocaleDateString("ar-SA")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4 h-[100px] overflow-y-auto">
                                {policy.content.slice(0, 3).map((line, i) => <li key={i}>{line}</li>)}
                                {policy.content.length > 3 && <li>... وغيرها</li>}
                            </ul>
                            <div className="flex justify-end gap-2 mt-2">
                                <Button variant="ghost" size="sm" onClick={() => { setEditingPolicy(policy); setIsDialogOpen(true); }}>
                                    <Pencil className="w-4 h-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(policy.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function GlobalFaqTab() {
    const { toast } = useToast();
    const { data: faq, isLoading } = useQuery<GlobalFaq>({ queryKey: ["/api/admin/faq"] });

    // Local state for editing items before saving to server
    const [items, setItems] = useState<{ q: string, a: string }[]>([]);

    // Sync state when data loads
    if (faq && items.length === 0 && faq.items.length > 0 && !isLoading) {
        setItems(faq.items.map((i) => ({ q: i.q || "", a: i.a || "" })));
    }

    // Or just use effect to sync once
    // A better approach for simple lists:
    const updateMutation = useMutation({
        mutationFn: (newFaq: GlobalFaq) => apiRequest("PATCH", "/api/admin/faq", newFaq),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/faq"] });
            toast({ title: "تم حفظ الأسئلة الشائعة" });
        }
    });

    const handleAddItem = () => {
        setItems([...items, { q: "", a: "" }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleChange = (index: number, field: 'q' | 'a', value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleSave = () => {
        // Filter empty items
        const filtered = items.filter(i => i.q.trim() && i.a.trim());
        updateMutation.mutate({ id: "global_faq", items: filtered });
    };

    // Initialize items from data if items is empty (and data exists) 
    // This is tricky with React state. Let's just use `items` state initializes from `faq` in a useEffect if needed, 
    // BUT we want to be able to edit.
    // Let's use `defaultValue` approach or a `useEffect`
    useState(() => {
        if (faq) setItems(faq.items.map((i) => ({ q: i.q || "", a: i.a || "" })));
    });
    // The above useState only runs once. If faq comes later, it won't update.
    // Use effect:
    const [hasLoaded, setHasLoaded] = useState(false);
    if (faq && !hasLoaded) {
        setItems(faq.items.map((i) => ({ q: i.q || "", a: i.a || "" })));
        setHasLoaded(true);
    }

    if (isLoading && !hasLoaded) return <Loader2 className="animate-spin" />;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>الأسئلة الشائعة العامة</CardTitle>
                    <CardDescription>هذه الأسئلة تضاف لمعرفة فهد العامة للإجابة على العملاء.</CardDescription>
                </div>
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
                    {updateMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                    حفظ التغييرات
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="flex gap-4 items-start border p-4 rounded-lg bg-gray-50/50">
                        <div className="flex-1 space-y-3">
                            <div className="space-y-1">
                                <Label>السؤال</Label>
                                <Input value={item.q} onChange={(e) => handleChange(index, 'q', e.target.value)} placeholder="سؤال متكرر..." />
                            </div>
                            <div className="space-y-1">
                                <Label>الإجابة النموذجية</Label>
                                <Textarea value={item.a} onChange={(e) => handleChange(index, 'a', e.target.value)} placeholder="الإجابة التي سيستخدمها فهد..." />
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-destructive mt-8" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}

                <Button variant="outline" onClick={handleAddItem} className="w-full border-dashed gap-2">
                    <Plus className="w-4 h-4" /> إضافة سؤال جديد
                </Button>
            </CardContent>
        </Card>
    );
}
