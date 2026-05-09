import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Bot, MessageSquare, ShieldCheck, FileText, Settings2, Zap, CheckCircle2, XCircle } from "lucide-react";
import type { BotConfig } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPENROUTER_MODELS = [
    { label: "Gemini 2.0 Flash", value: "google/gemini-2.0-flash-001" },
    { label: "Gemini 2.5 Flash", value: "google/gemini-2.5-flash-preview" },
    { label: "GPT-4o Mini", value: "openai/gpt-4o-mini" },
    { label: "GPT-4o", value: "openai/gpt-4o" },
    { label: "Claude 3.5 Sonnet", value: "anthropic/claude-3.5-sonnet" },
    { label: "Llama 3.3 70B", value: "meta-llama/llama-3.3-70b-instruct" },
    { label: "Gemma 4 26B A4B", value: "google/gemma-3-27b-it" },
    { label: "Qwen 3.6 Plus (free)", value: "qwen/qwen3-235b-a22b:free" },
];

export default function BotSettingsPage() {
    const { toast } = useToast();
    const [config, setConfig] = useState<BotConfig | null>(null);
    const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [testReply, setTestReply] = useState("");

    const { data: serverConfig, isLoading } = useQuery<BotConfig>({
        queryKey: ["/api/admin/bot/config"],
    });

    useEffect(() => {
        if (serverConfig) {
            setConfig({ ...serverConfig, provider: "google" });
        }
    }, [serverConfig]);

    const updateMutation = useMutation({
        mutationFn: (newConfig: Partial<BotConfig>) =>
            apiRequest("PATCH", "/api/admin/bot/config", newConfig),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/bot/config"] });
            toast({ title: "تم حفظ إعدادات البوت بنجاح" });
        },
        onError: (error: any) => {
            toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" });
        }
    });

    const handleSave = () => {
        if (config) {
            updateMutation.mutate({ ...config, provider: "google" });
        }
    };

    const handleTestConnection = async () => {
        if (!config) return;
        setTestStatus("loading");
        setTestReply("");
        try {
            const res = await apiRequest("POST", "/api/admin/bot/test-connection", {
                apiKey: config.apiKey,
                model: config.model,
            });
            const data = await res.json();
            if (data.success) {
                setTestStatus("success");
                setTestReply(data.reply || "✓");
            } else {
                setTestStatus("error");
                setTestReply(data.error || "فشل الاتصال");
            }
        } catch {
            setTestStatus("error");
            setTestReply("تعذّر الوصول للسيرفر");
        }
    };

    if (isLoading || !config) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    const setNestedConfig = (path: string, value: any) => {
        setConfig(prev => {
            if (!prev) return prev;
            // Deep clone to ensure React detects all nested changes
            const newConfig = JSON.parse(JSON.stringify(prev));
            const parts = path.split('.');
            let current: any = newConfig;
            for (let i = 0; i < parts.length - 1; i++) {
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;
            return newConfig;
        });
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">إعدادات فهد (Bot Config)</h1>
                    <p className="text-muted-foreground">تحكم في سلوك المساعد الذكي، شخصيته، وقواعد البيع.</p>
                </div>
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
                    {updateMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                    حفظ التغييرات
                </Button>
            </div>

            <Tabs defaultValue="provider" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="provider" className="gap-2"><Settings2 className="w-4 h-4" /> الموديل والإعدادات</TabsTrigger>
                    <TabsTrigger value="persona" className="gap-2"><Bot className="w-4 h-4" /> الشخصية</TabsTrigger>
                    <TabsTrigger value="system" className="gap-2"><FileText className="w-4 h-4" /> تعليمات النظام</TabsTrigger>
                    <TabsTrigger value="templates" className="gap-2"><MessageSquare className="w-4 h-4" /> القوالب</TabsTrigger>
                    <TabsTrigger value="closing" className="gap-2"><ShieldCheck className="w-4 h-4" /> قواعد الإغلاق</TabsTrigger>
                </TabsList>

                {/* AI Provider Config */}
                <TabsContent value="provider" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>مزود خدمة الذكاء الاصطناعي</CardTitle>
                            <CardDescription>إعدادات الاتصال بموديل الذكاء الاصطناعي</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between border p-4 rounded-lg">
                                <div className="space-y-0.5">
                                    <Label>تفعيل المساعد الذكي</Label>
                                    <p className="text-sm text-muted-foreground">تشغيل أو إيقاف "فهد" عن الرد الآلي</p>
                                </div>
                                <Switch checked={config.enabled} onCheckedChange={(c) => setNestedConfig('enabled', c)} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        onValueChange={(v) => { setNestedConfig('model', v); setTestStatus("idle"); }}
                                    >
                                        <SelectTrigger><SelectValue placeholder="اختر الموديل" /></SelectTrigger>
                                        <SelectContent>
                                            {OPENROUTER_MODELS.map(m => (
                                                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>API Key</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="password"
                                        placeholder="sk-or-..."
                                        value={config.apiKey || ""}
                                        onChange={(e) => { setNestedConfig('apiKey', e.target.value); setTestStatus("idle"); }}
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleTestConnection}
                                        disabled={testStatus === "loading"}
                                        className={`gap-2 shrink-0 ${testStatus === "success" ? "border-green-500 text-green-600" : testStatus === "error" ? "border-destructive text-destructive" : ""}`}
                                    >
                                        {testStatus === "loading" ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : testStatus === "success" ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : testStatus === "error" ? (
                                            <XCircle className="w-4 h-4" />
                                        ) : (
                                            <Zap className="w-4 h-4" />
                                        )}
                                        {testStatus === "loading" ? "جاري الاختبار..." : testStatus === "success" ? "متصل ✓" : testStatus === "error" ? "فشل ✗" : "اختبار الاتصال"}
                                    </Button>
                                </div>
                                {testStatus === "success" && testReply && (
                                    <p className="text-xs text-green-600 bg-green-50 rounded px-2 py-1">رد الموديل: "{testReply}"</p>
                                )}
                                {testStatus === "error" && testReply && (
                                    <p className="text-xs text-destructive bg-destructive/5 rounded px-2 py-1">{testReply}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    مفتاح OpenRouter API — اتركه فارغاً لاستخدام المفتاح المخزن في البيئة (Environment Variables)
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Temperature (الإبداع): {config.temperature}</Label>
                                    <Input
                                        type="range" min="0" max="2" step="0.1"
                                        value={config.temperature}
                                        onChange={(e) => setNestedConfig('temperature', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Max Tokens</Label>
                                    <Input
                                        type="number"
                                        value={config.maxTokens}
                                        onChange={(e) => setNestedConfig('maxTokens', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Persona */}
                <TabsContent value="persona" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>شخصية فهد</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>اسم البوت</Label>
                                    <Input value={config.persona.botName} onChange={(e) => setNestedConfig('persona.botName', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>نبرة الصوت (Tone)</Label>
                                    <Select value={config.persona.tone} onValueChange={(v) => setNestedConfig('persona.tone', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="friendly_saudi">ودود (سعودي)</SelectItem>
                                            <SelectItem value="formal">رسمي</SelectItem>
                                            <SelectItem value="casual">عامي بسيط</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>الأسلوب (Style)</Label>
                                    <Select value={config.persona.style} onValueChange={(v) => setNestedConfig('persona.style', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="concise">مختصر</SelectItem>
                                            <SelectItem value="balanced">متوازن</SelectItem>
                                            <SelectItem value="detailed">مفصل</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>استخدام الإيموجي</Label>
                                    <Select value={config.persona.emojiLevel} onValueChange={(v) => setNestedConfig('persona.emojiLevel', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">قليل</SelectItem>
                                            <SelectItem value="medium">متوسط</SelectItem>
                                            <SelectItem value="high">كثير</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* System Prompt */}
                <TabsContent value="system" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>تعليمات النظام (System Prompt)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>النص الأساسي للتعليمات</Label>
                                <Textarea
                                    className="min-h-[300px] font-mono text-sm"
                                    value={config.system.systemPrompt}
                                    onChange={(e) => setNestedConfig('system.systemPrompt', e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>قاعدة التصرف عند نقص المعلومات (Fallback Rule)</Label>
                                    <Textarea
                                        value={config.system.fallbackRule}
                                        onChange={(e) => setNestedConfig('system.fallbackRule', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>الجمل الممنوعة (Forbidden Claims)</Label>
                                    <Textarea
                                        placeholder="جملة في كل سطر"
                                        value={config.system.forbiddenClaims.join('\n')}
                                        onChange={(e) => setNestedConfig('system.forbiddenClaims', e.target.value.split('\n'))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Templates */}
                <TabsContent value="templates" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>رسالة الترحيب</CardTitle></CardHeader>
                            <CardContent>
                                <Textarea value={config.templates.welcome} onChange={(e) => setNestedConfig('templates.welcome', e.target.value)} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>طلب العنوان</CardTitle></CardHeader>
                            <CardContent>
                                <Textarea value={config.templates.askAddress} onChange={(e) => setNestedConfig('templates.askAddress', e.target.value)} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>سؤال عن الخيارات (Variant)</CardTitle></CardHeader>
                            <CardContent>
                                <Textarea value={config.templates.askVariant} onChange={(e) => setNestedConfig('templates.askVariant', e.target.value)} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>تأكيد الطلب</CardTitle></CardHeader>
                            <CardContent>
                                <Textarea value={config.templates.confirm} onChange={(e) => setNestedConfig('templates.confirm', e.target.value)} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>منتج غير متوفر</CardTitle></CardHeader>
                            <CardContent>
                                <Textarea value={config.templates.outOfStock} onChange={(e) => setNestedConfig('templates.outOfStock', e.target.value)} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>تحويل لموظف</CardTitle></CardHeader>
                            <CardContent>
                                <Textarea value={config.templates.handover} onChange={(e) => setNestedConfig('templates.handover', e.target.value)} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Closing Rules */}
                <TabsContent value="closing" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>قواعد إغلاق الطلب</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label>وضع الـ OTP</Label>
                                    <Select value={config.closing.otpMode} onValueChange={(v) => setNestedConfig('closing.otpMode', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="off">معطل</SelectItem>
                                            <SelectItem value="risk_based">حسب المخاطر (Risk Based)</SelectItem>
                                            <SelectItem value="always">دائماً</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>زر مشاركة الموقع (Pin Location)</Label>
                                    <Select value={config.closing.showPinLocationButton} onValueChange={(v) => setNestedConfig('closing.showPinLocationButton', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="off">معطل</SelectItem>
                                            <SelectItem value="risk_based">حسب المخاطر</SelectItem>
                                            <SelectItem value="on">مفعل دائماً</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>الحقول المطلوبة للعنوان في السعودية</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {["city", "district", "street", "building_no", "postal_code"].map(field => (
                                        <div key={field} className="flex items-center gap-2 border p-2 rounded">
                                            <Switch
                                                checked={config.closing.addressMinFieldsSA.includes(field)}
                                                onCheckedChange={(checked) => {
                                                    const current = config.closing.addressMinFieldsSA;
                                                    const updated = checked
                                                        ? [...current, field]
                                                        : current.filter(f => f !== field);
                                                    setNestedConfig('closing.addressMinFieldsSA', updated);
                                                }}
                                            />
                                            <span>{field}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>نسبة الثقة في العنوان (Address Confidence Thresholds)</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <span className="text-xs text-muted-foreground">قبول فوري (Accept)</span>
                                        <Input type="number" value={config.closing.addressConfidenceThresholds.accept} onChange={(e) => setNestedConfig('closing.addressConfidenceThresholds.accept', parseInt(e.target.value))} />
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground">سؤال توضيحي (Ask One)</span>
                                        <Input type="number" value={config.closing.addressConfidenceThresholds.ask_one_question} onChange={(e) => setNestedConfig('closing.addressConfidenceThresholds.ask_one_question', parseInt(e.target.value))} />
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground">طلب موقع دقيق (Require Pin)</span>
                                        <Input type="number" value={config.closing.addressConfidenceThresholds.require_pin} onChange={(e) => setNestedConfig('closing.addressConfidenceThresholds.require_pin', parseInt(e.target.value))} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
