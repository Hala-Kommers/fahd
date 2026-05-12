import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Bot, MessageSquare, KeyRound, SlidersHorizontal, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

const PROVIDERS = [
  { label: "Google", value: "google" },
];

const MODELS_BY_PROVIDER: Record<string, { label: string; value: string }[]> = {
  google: [
    { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
    { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
    { label: "Gemini 3.0 Pro", value: "gemini-3.0-pro" },
    { label: "Gemini 3.0 Flash", value: "gemini-3.0-flash" },
  ],
};

type BotConfig = {
  id?: number;
  provider: string;
  model: string;
  hasApiKey: boolean;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  persona: {
    tone: string;
    style: string;
    botName: string;
    language: string;
    emojiLevel: string;
  };
  customInstructions: string;
};

type ApiKeyMode = "preserve" | "update" | "clear";

const DEFAULT_CONFIG: BotConfig = {
  provider: "google",
  model: "gemini-2.0-flash",
  hasApiKey: false,
  temperature: 0.7,
  maxTokens: 1000,
  enabled: true,
  persona: {
    tone: "friendly_saudi",
    style: "concise",
    botName: "فهد",
    language: "ar-SA",
    emojiLevel: "medium",
  },
  customInstructions: "",
};

function normalizeConfig(config?: Partial<BotConfig> | null): BotConfig {
  if (!config) return DEFAULT_CONFIG;

  const rawPersona = config.persona;
  const parsedPersona = typeof rawPersona === "string"
    ? (() => {
        try {
          return JSON.parse(rawPersona);
        } catch {
          return {};
        }
      })()
    : (rawPersona ?? {});

  return {
    ...DEFAULT_CONFIG,
    ...config,
    hasApiKey: !!config.hasApiKey,
    persona: {
      ...DEFAULT_CONFIG.persona,
      ...(parsedPersona as Partial<BotConfig["persona"]>),
    },
  };
}

export default function BotSettingsPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyMode, setApiKeyMode] = useState<ApiKeyMode>("preserve");
  const [testState, setTestState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const { data: serverConfig, isLoading } = useQuery<BotConfig>({
    queryKey: ["/api/admin/bot/config"],
  });

  useEffect(() => {
    setConfig(normalizeConfig(serverConfig));
    setApiKey("");
    setApiKeyMode(serverConfig?.hasApiKey ? "preserve" : "update");
  }, [serverConfig]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => apiRequest("PATCH", "/api/admin/bot/config", payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/bot/config"] });
      setApiKey("");
      setApiKeyMode("preserve");
      toast({ title: "تم حفظ إعدادات فهد" });
    },
    onError: (error: any) => {
      toast({ title: "فشل الحفظ", description: error?.message || "حصل خطأ غير متوقع", variant: "destructive" });
    },
  });

  const payload = useMemo(() => {
    if (!config) return null;

    const next: Record<string, unknown> = {
      provider: config.provider,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enabled: config.enabled,
      persona: config.persona,
      customInstructions: config.customInstructions,
    };

    if (apiKeyMode === "update") next.apiKey = apiKey;
    if (apiKeyMode === "clear") next.apiKey = "";

    return next;
  }, [apiKey, apiKeyMode, config]);

  const modelOptions = MODELS_BY_PROVIDER[config?.provider || DEFAULT_CONFIG.provider] || MODELS_BY_PROVIDER.google;

  const handleSave = () => {
    if (!payload) return;
    updateMutation.mutate(payload);
  };

  const handleTestConnection = async () => {
    setTestState("loading");
    setTestMessage("");
    try {
      const res = await apiRequest("POST", "/api/admin/bot/test-connection");
      const data = await res.json();
      const result = data?.data ?? data;
      if (result?.ok) {
        setTestState("success");
        setTestMessage(`متصل: ${result.provider}`);
      } else {
        setTestState("error");
        setTestMessage("تعذّر اختبار الاتصال");
      }
    } catch (error: any) {
      setTestState("error");
      setTestMessage(error?.message || "تعذّر الوصول للسيرفر");
    }
  };

  if (isLoading || !config) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">إعدادات فهد</h1>
          <p className="text-muted-foreground">إدارة مزود الذكاء الاصطناعي، المفتاح، والشخصية.</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التغييرات
        </Button>
      </div>

      <Tabs defaultValue="provider" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="provider" className="gap-2"><SlidersHorizontal className="w-4 h-4" /> الإعدادات</TabsTrigger>
          <TabsTrigger value="persona" className="gap-2"><Bot className="w-4 h-4" /> الشخصية</TabsTrigger>
          <TabsTrigger value="instructions" className="gap-2"><MessageSquare className="w-4 h-4" /> التعليمات</TabsTrigger>
        </TabsList>

        <TabsContent value="provider" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>مزود الاتصال</CardTitle>
              <CardDescription>الحقول هنا تطابق الاستجابة والطلب الموثقين</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border p-4 rounded-lg gap-3">
                <div className="space-y-0.5">
                  <Label>تفعيل المساعد</Label>
                  <p className="text-sm text-muted-foreground">تشغيل أو إيقاف الرد الآلي</p>
                </div>
                <Switch checked={config.enabled} onCheckedChange={(enabled) => setConfig((prev) => prev ? { ...prev, enabled } : prev)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المزود</Label>
                  <Select value={config.provider} onValueChange={(provider) => setConfig((prev) => prev ? { ...prev, provider, model: MODELS_BY_PROVIDER[provider]?.[0]?.value || prev.model } : prev)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => <SelectItem key={provider.value} value={provider.value}>{provider.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الموديل</Label>
                  <Select value={config.model} onValueChange={(model) => setConfig((prev) => prev ? { ...prev, model } : prev)}>
                    <SelectTrigger><SelectValue placeholder="اختر الموديل" /></SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((model) => <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Label>API Key</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {config.hasApiKey ? "مخزن" : "غير موجود"}
                    </Badge>
                    {apiKeyMode === "clear" && <Badge className="text-[10px] bg-destructive/10 text-destructive border-0">سيتم المسح</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiKey}
                    placeholder={config.hasApiKey ? "اتركه فارغاً للمحافظة على المفتاح المخزن" : "أدخل مفتاحاً جديداً"}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setApiKeyMode(e.target.value ? "update" : config.hasApiKey ? "preserve" : "update");
                      setTestState("idle");
                    }}
                    className="flex-1"
                  />
                  {config.hasApiKey && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setApiKey("");
                        setApiKeyMode("clear");
                        setTestState("idle");
                      }}
                      className="min-w-[120px]"
                    >
                      <KeyRound className="w-4 h-4" />
                      مسح المفتاح
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testState === "loading"}
                    className="min-w-[140px]"
                  >
                    {testState === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : testState === "success" ? <CheckCircle2 className="w-4 h-4" /> : testState === "error" ? <XCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    {testState === "loading" ? "جاري الاختبار..." : testState === "success" ? "تم الاتصال" : testState === "error" ? "فشل الاتصال" : "اختبار الاتصال"}
                  </Button>
                </div>
                {testMessage && (
                  <p className={`text-xs rounded px-2 py-1 ${testState === "success" ? "text-green-700 bg-green-50" : "text-destructive bg-destructive/5"}`}>
                    {testMessage}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Temperature: {config.temperature}</Label>
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig((prev) => prev ? { ...prev, temperature: Number(e.target.value) } : prev)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => setConfig((prev) => prev ? { ...prev, maxTokens: Number(e.target.value) } : prev)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persona" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>شخصية فهد</CardTitle>
              <CardDescription>تحدد لهجته وأسلوبه واسم البوت</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم البوت</Label>
                  <Input value={config.persona.botName} onChange={(e) => setConfig((prev) => prev ? { ...prev, persona: { ...prev.persona, botName: e.target.value } } : prev)} />
                </div>
                <div className="space-y-2">
                  <Label>اللغة</Label>
                  <Input value={config.persona.language} onChange={(e) => setConfig((prev) => prev ? { ...prev, persona: { ...prev.persona, language: e.target.value } } : prev)} />
                </div>
                <div className="space-y-2">
                  <Label>النبرة</Label>
                  <Select value={config.persona.tone} onValueChange={(tone) => setConfig((prev) => prev ? { ...prev, persona: { ...prev.persona, tone } } : prev)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly_saudi">ودود (سعودي)</SelectItem>
                      <SelectItem value="formal">رسمي</SelectItem>
                      <SelectItem value="casual">عامي بسيط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الأسلوب</Label>
                  <Select value={config.persona.style} onValueChange={(style) => setConfig((prev) => prev ? { ...prev, persona: { ...prev.persona, style } } : prev)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">مختصر</SelectItem>
                      <SelectItem value="balanced">متوازن</SelectItem>
                      <SelectItem value="detailed">مفصل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الإيموجي</Label>
                  <Select value={config.persona.emojiLevel} onValueChange={(emojiLevel) => setConfig((prev) => prev ? { ...prev, persona: { ...prev.persona, emojiLevel } } : prev)}>
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

        <TabsContent value="instructions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>تعليمات مخصصة</CardTitle>
              <CardDescription>تضاف هذه التعليمات إلى نظام الذكاء الاصطناعي</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Custom Instructions</Label>
                <Textarea
                  className="min-h-[280px]"
                  value={config.customInstructions}
                  onChange={(e) => setConfig((prev) => prev ? { ...prev, customInstructions: e.target.value } : prev)}
                  placeholder="اكتب التعليمات هنا..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
