
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAIStore } from "@/lib/ai-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch as SwitchUI } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Save, Play, RotateCcw, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AIConfigPage = () => {
    return (
        <div className="space-y-6 pb-20" dir="rtl">
            <h1 className="text-3xl font-bold tracking-tight">إعدادات فهد (AI Agent)</h1>
            <p className="text-muted-foreground">تحكم في دماغ فهد، برمجته، واختباره قبل النشر.</p>

            <Tabs defaultValue="settings" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="settings">الاتصال والإعدادات</TabsTrigger>
                    <TabsTrigger value="prompt">التعليمات (System Prompt)</TabsTrigger>
                    <TabsTrigger value="playground">المختبر (Playground)</TabsTrigger>
                    <TabsTrigger value="guardrails">الحماية (Guardrails)</TabsTrigger>
                    <TabsTrigger value="versions">النشر والإصدارات</TabsTrigger>
                    <TabsTrigger value="usage">الاستهلاك (Usage)</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="mt-6">
                    <ConnectionSettings />
                </TabsContent>

                <TabsContent value="prompt" className="mt-6">
                    <PromptEditor />
                </TabsContent>

                <TabsContent value="playground" className="mt-6">
                    <Playground />
                </TabsContent>

                <TabsContent value="guardrails" className="mt-6">
                    <GuardrailsEditor />
                </TabsContent>

                <TabsContent value="versions" className="mt-6">
                    <VersionsManager />
                </TabsContent>

                <TabsContent value="usage" className="mt-6">
                    <UsageStats />
                </TabsContent>
            </Tabs>
        </div>
    );
};

// --- Components ---

interface AIStatsResponse {
    window: string;
    totalMessages: number;
    userMessages: number;
    fahdMessages: number;
    conversations: number;
    chatOrders: number;
    conversionRate: number;
    topTools: Array<{ name: string; count: number }>;
}

const TOOL_LABELS: Record<string, string> = {
    search_products: "بحث منتج",
    get_product_details: "تفاصيل منتج",
    start_order: "بدء طلب",
    set_order_item: "اختيار منتج",
    set_customer_info: "بيانات عميل",
    set_payment: "طريقة دفع",
    apply_coupon: "كوبون",
    create_order: "إنشاء طلب",
    track_order: "تتبع طلب",
    cancel_order_request: "طلب إلغاء",
};

const UsageStats = () => {
    const { data: stats, isLoading } = useQuery<AIStatsResponse>({
        queryKey: ["/api/admin/ai/stats"],
    });

    if (isLoading || !stats) {
        return <div className="text-muted-foreground" data-testid="text-stats-loading">جاري تحميل الإحصائيات…</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">المحادثات (آخر 7 أيام)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" data-testid="stat-conversations">{stats.conversations}</div>
                        <p className="text-xs text-muted-foreground">إجمالي المحادثات النشطة</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الرسائل (Messages)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" data-testid="stat-messages">{stats.totalMessages}</div>
                        <p className="text-xs text-muted-foreground">{stats.userMessages} من العملاء · {stats.fahdMessages} من فهد</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الطلبات من الشات</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" data-testid="stat-orders">{stats.chatOrders}</div>
                        <p className="text-xs text-muted-foreground">طلب أنشأها فهد</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">معدل التحويل</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold" data-testid="stat-conversion">{stats.conversionRate}%</div>
                        <p className="text-xs text-muted-foreground">محادثة → طلب</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>الأدوات الأكثر استخداماً</CardTitle>
                    <CardDescription>عدد مرات استدعاء كل أداة خلال آخر 7 أيام</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {stats.topTools.length === 0 && (
                        <p className="text-sm text-muted-foreground">لم يتم استدعاء أي أداة بعد.</p>
                    )}
                    {stats.topTools.map((t) => (
                        <div key={t.name} className="flex items-center justify-between" data-testid={`row-tool-${t.name}`}>
                            <span className="text-sm">{TOOL_LABELS[t.name] || t.name}</span>
                            <span className="text-sm font-mono font-medium">{t.count}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

// --- Components ---

const ConnectionSettings = () => {
    const { config, updateConfig } = useAIStore();
    const [showKey, setShowKey] = useState(false);
    const { toast } = useToast();
    const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "fail">("idle");

    const handleTestConnection = async () => {
        setTestStatus("loading");
        // Simulate API call
        setTimeout(() => {
            if (config.apiKey.length > 5) {
                setTestStatus("success");
                toast({ title: "تم الاتصال بنجاح", description: "المفتاح يعمل بشكل صحيح مع الموديل المحدد." });
            } else {
                setTestStatus("fail");
                toast({ title: "فشل الاتصال", description: "تأكد من صحة المفتاح او الاتصال بالانترنت.", variant: "destructive" });
            }
        }, 1500);
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>مزود الخدمة والموديل</CardTitle>
                    <CardDescription>اختر الذكاء الاصطناعي الذي سيشغل فهد</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>المزود (Provider)</Label>
                        <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50 text-sm">
                            OpenRouter
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>الموديل (Model)</Label>
                        <Select
                            value={config.model}
                            onValueChange={(val) => updateConfig({ model: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</SelectItem>
                                <SelectItem value="google/gemini-2.5-flash-preview">Gemini 2.5 Flash</SelectItem>
                                <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
                                <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
                                <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                                <SelectItem value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</SelectItem>
                                <SelectItem value="google/gemma-3-27b-it">Gemma 4 26B A4B</SelectItem>
                                <SelectItem value="qwen/qwen3-235b-a22b:free">Qwen 3.6 Plus (free)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>API Key</Label>
                        <div className="relative">
                            <Input
                                type={showKey ? "text" : "password"}
                                value={config.apiKey}
                                onChange={(e) => updateConfig({ apiKey: e.target.value })}
                                placeholder="sk-or-..."
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertTriangle size={12} className="text-yellow-500" />
                            لا تشارك هذا المفتاح أبداً. يتم تخزينه محلياً (Insecure for production)
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button onClick={handleTestConnection} disabled={testStatus === "loading"}>
                            {testStatus === "loading" ? "جاري الاختبار..." : "Test Connection"}
                        </Button>
                        {testStatus === "success" && <span className="text-green-600 flex items-center gap-1"><CheckCircle size={16} /> متصل</span>}
                        {testStatus === "fail" && <span className="text-red-600 flex items-center gap-1"><XCircle size={16} /> فشل</span>}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>خصائص المحادثة (Hyperparameters)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Temperature (الإبداع): {config.temperature}</Label>
                        </div>
                        <Slider
                            value={[config.temperature]}
                            min={0}
                            max={1}
                            step={0.1}
                            onValueChange={(val) => updateConfig({ temperature: val[0] })}
                        />
                        <p className="text-xs text-muted-foreground">0 = دقيق ورسمي، 1 = مبدع وعشوائي.</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Max Tokens (الطول): {config.maxTokens}</Label>
                        </div>
                        <Slider
                            value={[config.maxTokens]}
                            min={100}
                            max={4000}
                            step={100}
                            onValueChange={(val) => updateConfig({ maxTokens: val[0] })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Response Style</Label>
                        <div className="flex gap-2">
                            {(["brief", "medium", "detailed"] as const).map((style) => (
                                <Button
                                    key={style}
                                    variant={config.responseStyle === style ? "default" : "outline"}
                                    onClick={() => updateConfig({ responseStyle: style })}
                                    className="flex-1 capitalize"
                                >
                                    {style === "brief" ? "مختصر" : style === "medium" ? "متوسط" : "مفصل"}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const PromptEditor = () => {
    const { systemPrompt, updateSystemPrompt, modules, updateModule } = useAIStore();
    const { toast } = useToast();

    return (
        <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>محرر تعليمات النظام (System Instructions)</CardTitle>
                        <CardDescription>هذا هو "دماغ" فهد. أكتب التعليمات الأساسية هنا.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>الهوية والنبرة (Identity)</Label>
                            <Textarea
                                value={systemPrompt.identity}
                                onChange={(e) => updateSystemPrompt("identity", e.target.value)}
                                rows={4}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>قواعد منع الهلوسة</Label>
                                <Textarea
                                    value={systemPrompt.hallucinationRules}
                                    onChange={(e) => updateSystemPrompt("hallucinationRules", e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>خطوات الإغلاق (Closing)</Label>
                                <Textarea
                                    value={systemPrompt.closingSteps}
                                    onChange={(e) => updateSystemPrompt("closingSteps", e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">الوحدات (Modules)</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        {modules.map((module) => (
                            <Card key={module.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-base">{module.name}</CardTitle>
                                        <SwitchUI checked={module.isActive} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        value={module.content}
                                        onChange={(e) => updateModule(module.id, e.target.value)}
                                        rows={3}
                                        className="resize-none"
                                    />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            <div className="md:col-span-4 space-y-4">
                <Card className="sticky top-4">
                    <CardHeader>
                        <CardTitle>نصائح سريعة</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2 text-muted-foreground">
                        <p>• استخدم لهجة سعودية بيضاء، لكن مفهومة للجميع.</p>
                        <p>• ركز على إغلاق البيعة، لا تكن مجرد مجيب آلي.</p>
                        <p>• إذا سأل العميل عن شيء غير موجود، اقترح بديل.</p>
                        <p>• دائماً اسأل سؤالاً في نهاية ردك لضمان استمرار المحادثة.</p>
                    </CardContent>
                    <div className="p-4 pt-0">
                        <Button className="w-full" onClick={() => toast({ title: "تم الحفظ", description: "تم تحديث التعليمات بنجاح" })}>
                            <Save className="ml-2 w-4 h-4" /> حفظ التعليمات
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

const Playground = () => {
    const [input, setInput] = useState("");
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRun = () => {
        setLoading(true);
        // Simulate response
        setTimeout(() => {
            setResponse("أهلاً بك يا غالي! 🌹\nالساعة عندنا متوفرة بلونين: الفضي والذهبي. وسعرها 299 ريال شامل الضريبة والتوصيل.\n\nتحب أعتمد لك وحدة؟ 🚚");
            setLoading(false);
        }, 1500);
    };

    return (
        <div className="grid gap-6 md:grid-cols-12 h-[600px]">
            <div className="md:col-span-4 flex flex-col gap-4 h-full">
                <Card className="flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>مدخلات التجربة (Inputs)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 overflow-auto">
                        <div className="space-y-2">
                            <Label>المنتج</Label>
                            <Select defaultValue="watch">
                                <SelectTrigger><SelectValue placeholder="اختر منتج" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="watch">ساعة ذكية Ultra</SelectItem>
                                    <SelectItem value="pods">سماعات Pro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>سيناريو</Label>
                            <Select defaultValue="price">
                                <SelectTrigger><SelectValue placeholder="اختر سيناريو" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="price">اعتراض على السعر</SelectItem>
                                    <SelectItem value="warranty">سؤال عن الضمان</SelectItem>
                                    <SelectItem value="address">عنوان ناقص</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>رسالة العميل</Label>
                            <Textarea
                                placeholder="اكتب رسالة العميل هنا..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                rows={4}
                            />
                        </div>
                        <Button onClick={handleRun} disabled={loading} className="w-full">
                            {loading ? "جاري التفكير..." : <><Play className="ml-2 w-4 h-4" /> تشغيل التجربة</>}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-8 h-full">
                <Card className="h-full flex flex-col">
                    <CardHeader className="border-b">
                        <CardTitle>النتيجة (Output)</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 flex flex-col sm:flex-row">
                        <div className="flex-1 p-6 border-l overflow-auto">
                            <Label className="mb-2 block text-muted-foreground">رد فهد:</Label>
                            {response ? (
                                <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap leading-relaxed">
                                    {response}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">
                                    انتظار التشغيل...
                                </div>
                            )}
                        </div>
                        <div className="w-full sm:w-64 bg-slate-50 p-4 border-t sm:border-t-0 space-y-4 overflow-auto">
                            <h4 className="font-semibold text-sm">Structured Data</h4>
                            <div className="space-y-2 text-xs">
                                <div className="bg-white p-2 rounded border">
                                    <span className="text-muted-foreground">Intent:</span> <Badge variant="outline">purchase_inquiry</Badge>
                                </div>
                                <div className="bg-white p-2 rounded border">
                                    <span className="text-muted-foreground">Confidence:</span> <span className="text-green-600 font-bold">98%</span>
                                </div>
                                <div className="bg-white p-2 rounded border">
                                    <span className="text-muted-foreground">Next Action:</span> <Badge>ask_variant</Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const GuardrailsEditor = () => {
    const { guardrails, updateGuardrails } = useAIStore();
    return (
        <Card>
            <CardHeader>
                <CardTitle>سياسات الأمان والحماية (Guardrails)</CardTitle>
                <CardDescription>الخطوط الحمراء التي لا يجب أن يتجاوزها فهد.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>ادعاءات ممنوعة (Forbidden Claims)</Label>
                    <p className="text-xs text-muted-foreground mb-2">اكتب كل جملة في سطر جديد</p>
                    <Textarea
                        defaultValue={guardrails.forbiddenClaims.join("\n")}
                        onChange={(e) => updateGuardrails({ forbiddenClaims: e.target.value.split("\n") })}
                        rows={5}
                        className="bg-red-50/50 border-red-100"
                    />
                </div>
                <div className="space-y-2">
                    <Label>المصادر المسموحة (Allowed Sources)</Label>
                    <p className="text-xs text-muted-foreground mb-2">المصادر التي يعتمد عليها فهد في المعلومات</p>
                    <Textarea
                        defaultValue={guardrails.allowedSources.join("\n")}
                        onChange={(e) => updateGuardrails({ allowedSources: e.target.value.split("\n") })}
                        rows={5}
                        className="bg-green-50/50 border-green-100"
                    />
                </div>
            </CardContent>
        </Card>
    );
};

const VersionsManager = () => {
    const { isPublished, publish } = useAIStore();
    const { toast } = useToast();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>حالة النشر</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-lg">{isPublished ? "منشور وشغال ✅" : "مسودة (Draft) 📝"}</p>
                        <p className="text-muted-foreground text-sm">آخر تعديل: منذ 5 دقائق</p>
                    </div>
                    <Button onClick={() => { publish(); toast({ title: "تم النشر", description: "التغييرات أصبحت حية الآن على الموقع." }); }}>
                        {isPublished ? "نشر التغييرات الجديدة" : "نشر لأول مرة"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>سجل الإصدارات (History)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((v) => (
                            <div key={v} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-semibold">Version 1.{v}</p>
                                    <p className="text-xs text-muted-foreground">Updated by Admin • 2 days ago</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm">Diff</Button>
                                    <Button variant="ghost" size="sm"><RotateCcw className="w-4 h-4 text-muted-foreground" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AIConfigPage;
