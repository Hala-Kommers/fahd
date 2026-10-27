import TikTokSettings from "@/components/TikTokSettings";
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
import { Loader2, Save, Bot, MessageSquare, KeyRound, SlidersHorizontal, CheckCircle2, XCircle, ShieldCheck, BarChart3, RefreshCw } from "lucide-react";

const PROVIDERS = [
  { label: "Google AI Studio", value: "google" },
];

const DEFAULT_GOOGLE_MODEL = "gemini-3.8-flash";

type GoogleModels = {
  models: Array<{ id: string; displayName: string }>;
  defaultModel: string;
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

type AIStats = {
  messages: number;
  conversations: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    cacheWriteTokens: number;
    cacheReadTokens: number;
    reasoningTokens: number;
  };
  byProvider: Array<{ provider: string; totalMessages: number; promptTokens: number; completionTokens: number }>;
  byModel: Array<{ model: string; totalMessages: number; promptTokens: number; completionTokens: number }>;
  byStatus: Array<{ status: string; totalConversations: number }>;
};

type ApiKeyMode = "preserve" | "update" | "clear";

function UsageMetrics({ messages, promptTokens, completionTokens }: { messages: number; promptTokens: number; completionTokens: number }) {
  return (
    <div className="mt-2 space-y-1 text-muted-foreground">
      <div className="flex items-center justify-between gap-3">
        <span>الرسائل</span>
        <span dir="ltr" className="font-medium tabular-nums">{messages.toLocaleString("ar-SA")}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span dir="ltr">Prompt tokens</span>
        <span dir="ltr" className="font-medium tabular-nums">{promptTokens.toLocaleString("ar-SA")}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span dir="ltr">Completion tokens</span>
        <span dir="ltr" className="font-medium tabular-nums">{completionTokens.toLocaleString("ar-SA")}</span>
      </div>
    </div>
  );
}

const DEFAULT_CONFIG: BotConfig = {
  provider: "google",
  model: DEFAULT_GOOGLE_MODEL,
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
    provider: "google",
    model: config.model?.trim().replace(/^google\//, "").replace(/^models\//, "") || DEFAULT_GOOGLE_MODEL,
    hasApiKey: !!config.hasApiKey,
    persona: {
      ...DEFAULT_CONFIG.persona,
      ...(parsedPersona as Partial<BotConfig["persona"]>),
    },
  };
}

async function fetchAIStats(): Promise<AIStats> {
  const res = await apiRequest("GET", "/api/admin/ai/stats");
  const payload = await res.json();
  const data = payload?.data ?? payload ?? {};

  return {
    messages: Number(data.messages ?? 0),
    conversations: Number(data.conversations ?? 0),
    usage: {
      promptTokens: Number(data.usage?.promptTokens ?? 0),
      completionTokens: Number(data.usage?.completionTokens ?? 0),
      cacheWriteTokens: Number(data.usage?.cacheWriteTokens ?? 0),
      cacheReadTokens: Number(data.usage?.cacheReadTokens ?? 0),
      reasoningTokens: Number(data.usage?.reasoningTokens ?? 0),
    },
    byProvider: Array.isArray(data.byProvider) ? data.byProvider : [],
    byModel: Array.isArray(data.byModel) ? data.byModel : [],
    byStatus: Array.isArray(data.byStatus) ? data.byStatus : [],
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

  const { data: aiStats, isLoading: statsLoading } = useQuery<AIStats>({
    queryKey: ["/api/admin/ai/stats"],
    queryFn: fetchAIStats,
  });

  const { data: googleModels, error: modelsError, isFetching: modelsLoading, refetch: refreshModels } = useQuery<GoogleModels>({
    queryKey: ["/api/admin/bot/models"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/bot/models");
      const body = await res.json();
      return body.data;
    },
    enabled: !!serverConfig?.hasApiKey,
    staleTime: 5 * 60 * 1000,
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
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/bot/models"] });
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

    if (apiKeyMode === "update") next.apiKey = apiKey.trim();
    if (apiKeyMode === "clear") next.apiKey = "";

    return next;
  }, [apiKey, apiKeyMode, config]);

  const modelOptions = useMemo(() => {
    const options = googleModels?.models?.length
      ? googleModels.models.map((model) => ({ label: model.displayName || model.id, value: model.id }))
      : [{ label: "Gemini 3.8 Flash", value: DEFAULT_GOOGLE_MODEL }];
    if (config?.model && !options.some((model) => model.value === config.model)) {
      options.unshift({ label: `${config.model} (الإعداد الحالي)`, value: config.model });
    }
    return options;
  }, [config?.model, googleModels]);
  const connectionBusy = testState === "loading" || updateMutation.isPending;
  const providerStats = Array.isArray(aiStats?.byProvider) ? aiStats.byProvider : [];
  const modelStats = Array.isArray(aiStats?.byModel) ? aiStats.byModel : [];
  const statusStats = Array.isArray(aiStats?.byStatus) ? aiStats.byStatus : [];

  const handleSave = () => {
    if (!payload) return;
    if (apiKeyMode === "update" && apiKey.trim()) {
      void handleTestConnection();
      return;
    }
    updateMutation.mutate(payload);
  };

  const resetConnectionTest = () => {
    setTestState("idle");
    setTestMessage("");
  };

  const handleTestConnection = async () => {
    setTestState("loading");
    setTestMessage("");
    let verified = false;
    try {
      if (!payload) throw new Error("انتظر تحميل الإعدادات أولًا");
      if (apiKeyMode === "clear" || (!apiKey.trim() && !config?.hasApiKey)) throw new Error("أدخل مفتاح Google AI Studio أولًا");
      const draft: Record<string, unknown> = { provider: config?.provider, model: config?.model };
      if (apiKeyMode === "update") draft.apiKey = apiKey.trim();
      const res = await apiRequest("POST", "/api/admin/bot/test-connection", draft);
      const data = await res.json();
      const result = data?.data ?? data;
      if (result?.ok !== true || result?.streamVerified !== true) {
        throw new Error(data?.error || "لم يتم تأكيد استلام رد فعلي من Google. تأكد من تحديث الباك وأعد الاختبار.");
      }
      verified = true;
      await updateMutation.mutateAsync(payload);
      setTestState("success");
      const seconds = (Number(result.latencyMs) / 1000).toLocaleString("ar-SA", { maximumFractionDigits: 1 });
      setTestMessage(`المفتاح صحيح والاتصال بـ Google ناجح. تم حفظ الإعدادات واستلام رد فعلي من ${result.model} خلال ${seconds} ثانية.${config?.enabled ? " تُستخدم هذه الإعدادات في ردود فهد." : " فعّل المساعد لبدء الردود في الشات."}`);
      toast({ title: "المفتاح صحيح والاتصال ناجح", description: "تم اختبار رد Google وحفظ إعدادات الربط." });
    } catch (error: any) {
      setTestState("error");
      setTestMessage(`${verified ? "المفتاح صحيح، لكن تعذر حفظ الإعدادات: " : ""}${error?.message || "تعذّر الوصول للسيرفر"}`);
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
        <Button onClick={handleSave} disabled={connectionBusy} className="gap-2">
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التغييرات
        </Button>
      </div>

      <TikTokSettings />
      <Tabs defaultValue="provider" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="provider" className="gap-2"><SlidersHorizontal className="w-4 h-4" /> الإعدادات</TabsTrigger>
          <TabsTrigger value="persona" className="gap-2"><Bot className="w-4 h-4" /> الشخصية</TabsTrigger>
          <TabsTrigger value="instructions" className="gap-2"><MessageSquare className="w-4 h-4" /> التعليمات</TabsTrigger>
          <TabsTrigger value="stats" className="gap-2"><BarChart3 className="w-4 h-4" /> الإحصائيات</TabsTrigger>
        </TabsList>

        <TabsContent value="provider" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>مزود الاتصال</CardTitle>
              <CardDescription>اربط مفتاح Google AI Studio بفهد واختبر ردًا فعليًا قبل اعتماده.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border p-4 rounded-lg gap-3">
                <div className="space-y-0.5">
                  <Label>تفعيل المساعد</Label>
                  <p className="text-sm text-muted-foreground">تشغيل أو إيقاف الرد الآلي</p>
                </div>
                <Switch checked={config.enabled} disabled={connectionBusy} onCheckedChange={(enabled) => { resetConnectionTest(); setConfig((prev) => prev ? { ...prev, enabled } : prev); }} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المزود</Label>
                  <Select value={config.provider} disabled={connectionBusy} onValueChange={(provider) => { resetConnectionTest(); setConfig((prev) => prev ? { ...prev, provider } : prev); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((provider) => <SelectItem key={provider.value} value={provider.value}>{provider.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>الموديل</Label>
                    <Button type="button" size="sm" variant="ghost" className="h-6 gap-1 px-1 text-xs" disabled={!config.hasApiKey || modelsLoading || connectionBusy} onClick={() => void refreshModels()}>
                      <RefreshCw className={`h-3 w-3 ${modelsLoading ? "animate-spin" : ""}`} /> تحديث الموديلات
                    </Button>
                  </div>
                  <Select value={config.model} disabled={connectionBusy} onValueChange={(model) => { resetConnectionTest(); setConfig((prev) => prev ? { ...prev, model } : prev); }}>
                    <SelectTrigger className="min-w-0"><SelectValue placeholder="اختر الموديل" /></SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((model) => <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{modelsError ? `تعذر تحديث القائمة: ${modelsError.message}` : googleModels ? "الموديلات المتاحة من Google للمفتاح المحفوظ؛ اختبار الرد يؤكد إمكانية الاستخدام." : "بعد حفظ المفتاح، تُحدّث القائمة مباشرة من Google."}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <Label htmlFor="google-api-key">مفتاح Google AI Studio</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {config.hasApiKey ? "مخزن" : "غير موجود"}
                    </Badge>
                    {apiKeyMode === "clear" && <Badge className="text-[10px] bg-destructive/10 text-destructive border-0">سيتم المسح</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="google-api-key"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={connectionBusy}
                    value={apiKey}
                    placeholder={config.hasApiKey ? "اتركه فارغاً للمحافظة على المفتاح المخزن" : "أدخل مفتاحاً جديداً"}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setApiKeyMode(e.target.value.trim() ? "update" : config.hasApiKey ? "preserve" : "update");
                      resetConnectionTest();
                    }}
                    className="min-w-0 flex-1 basis-56"
                  />
                  {config.hasApiKey && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={connectionBusy}
                      onClick={() => {
                        setApiKey("");
                        setApiKeyMode("clear");
                        resetConnectionTest();
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
                    disabled={connectionBusy}
                    className="min-w-[140px]"
                  >
                    {testState === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : testState === "success" ? <CheckCircle2 className="w-4 h-4" /> : testState === "error" ? <XCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    {testState === "loading" ? "جاري التحقق من Google..." : testState === "success" ? "المفتاح صحيح ✓" : testState === "error" ? "إعادة الاختبار" : "حفظ واختبار الاتصال"}
                  </Button>
                </div>
                {testMessage && (
                  <p role={testState === "error" ? "alert" : "status"} aria-live="polite" className={`break-words text-sm leading-relaxed rounded-lg px-3 py-2 ${testState === "success" ? "text-green-800 bg-green-50 border border-green-200" : "text-destructive bg-destructive/5"}`}>
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

        <TabsContent value="stats" className="mt-4 space-y-4">
          {statsLoading || !aiStats ? (
            <Card><CardContent className="p-6 text-muted-foreground">جاري تحميل إحصائيات الذكاء الاصطناعي...</CardContent></Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">الرسائل</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{aiStats.messages}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">المحادثات</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{aiStats.conversations}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Prompt Tokens</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{aiStats.usage.promptTokens.toLocaleString("ar-SA")}</div></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Completion Tokens</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{aiStats.usage.completionTokens.toLocaleString("ar-SA")}</div></CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">حسب المزود</CardTitle>
                    <CardDescription>استهلاك الرسائل والتوكنز حسب Provider</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {providerStats.map((row) => (
                        <div key={row.provider} className="rounded-lg border p-3 text-sm">
                          <div className="font-semibold" dir="ltr">{row.provider}</div>
                          <UsageMetrics messages={row.totalMessages} promptTokens={row.promptTokens} completionTokens={row.completionTokens} />
                        </div>
                      ))}
                    {providerStats.length === 0 && <p className="text-sm text-muted-foreground">لا توجد بيانات</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">حسب الموديل</CardTitle>
                    <CardDescription>تفصيل الاستخدام لكل Model</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {modelStats.map((row) => (
                        <div key={row.model} className="rounded-lg border p-3 text-sm">
                          <div className="font-semibold" dir="ltr">{row.model}</div>
                          <UsageMetrics messages={row.totalMessages} promptTokens={row.promptTokens} completionTokens={row.completionTokens} />
                        </div>
                      ))}
                    {modelStats.length === 0 && <p className="text-sm text-muted-foreground">لا توجد بيانات</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">حالة المحادثات</CardTitle>
                    <CardDescription>عدد المحادثات حسب الحالة</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {statusStats.map((row) => (
                        <div key={row.status} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                          <span className="font-semibold">{row.status}</span>
                          <Badge variant="secondary">{row.totalConversations}</Badge>
                        </div>
                      ))}
                    {statusStats.length === 0 && <p className="text-sm text-muted-foreground">لا توجد بيانات</p>}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
