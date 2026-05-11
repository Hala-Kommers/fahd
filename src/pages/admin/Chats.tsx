
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, Clock, User, Smile, Frown, Meh, BarChart3, GripVertical, ShoppingCart, Package, Phone, MapPin, CreditCard, Tag, CheckCircle2, Circle } from "lucide-react";
import type { Conversation, Message } from "@shared/schema";
import { mockQuery } from "@/lib/mock-api";

interface ToolCallEntry {
    name: string;
    args: Record<string, unknown>;
    result: unknown;
    ok: boolean;
}

interface DraftSnapshot {
    product?: string | null;
    qty?: number | null;
    unitPrice?: number | null;
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    payment?: string | null;
    coupon?: string | null;
    discount?: number | null;
    step?: string | null;
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

const STEP_LABELS: Record<string, string> = {
    idle: "لم يبدأ",
    collecting_product: "اختيار المنتج",
    collecting_name: "الاسم",
    collecting_phone: "رقم الجوال",
    collecting_address: "العنوان",
    collecting_payment: "طريقة الدفع",
    confirming: "في انتظار التأكيد",
    done: "اكتمل الطلب",
};

const STEP_ORDER = ["collecting_product", "collecting_name", "collecting_phone", "collecting_address", "collecting_payment", "confirming", "done"];

function renderToolLabel(t: { name: string; ok: boolean }) {
    return `${t.ok ? "✓" : "✗"} ${TOOL_LABELS[t.name] || t.name}`;
}

function isDraftMeaningful(d: DraftSnapshot | undefined | null): d is DraftSnapshot {
    if (!d) return false;
    if (d.step && d.step !== "idle") return true;
    return Boolean(d.product || d.name || d.phone || d.address || d.payment || d.coupon);
}

function getLatestDraft(messages: Message[]): DraftSnapshot | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.sender !== "fahd") continue;
        const meta = (msg.metadata ?? {}) as { draft?: DraftSnapshot };
        if (isDraftMeaningful(meta.draft)) return meta.draft!;
    }
    return null;
}

function OrderDraftPanel({ draft }: { draft: DraftSnapshot }) {
    const effectiveQty = draft.qty || 1;
    const subtotal = (draft.unitPrice || 0) * effectiveQty;
    const total = Math.max(0, subtotal - (draft.discount || 0));
    const currentStepIdx = draft.step ? STEP_ORDER.indexOf(draft.step) : -1;

    return (
        <div className="border-b bg-gradient-to-l from-primary/5 to-transparent p-4 space-y-3" data-testid="order-draft-panel">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <h4 className="font-bold text-sm">مسودة الطلب</h4>
                </div>
                <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30 text-primary" data-testid="badge-draft-step">
                    {STEP_LABELS[draft.step || "idle"] || draft.step}
                </Badge>
            </div>

            <div className="flex gap-1 items-center">
                {STEP_ORDER.slice(0, 6).map((step, i) => {
                    const reached = i <= currentStepIdx;
                    return (
                        <div key={step} className="flex items-center flex-1 last:flex-none">
                            {reached ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            ) : (
                                <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                            )}
                            {i < 5 && (
                                <div className={`flex-1 h-0.5 mx-1 ${i < currentStepIdx ? "bg-primary" : "bg-muted-foreground/20"}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                {draft.product && (
                    <div className="col-span-2 flex items-start gap-2 p-2 bg-background rounded-md border" data-testid="draft-product">
                        <Package className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{draft.product}</div>
                            {(draft.qty || draft.unitPrice) && (
                                <div className="text-muted-foreground">
                                    {draft.qty || 1} × {draft.unitPrice || 0} ر.س = <span className="font-bold text-foreground">{subtotal} ر.س</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {draft.name && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-background rounded-md border" data-testid="draft-name">
                        <User className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{draft.name}</span>
                    </div>
                )}
                {draft.phone && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-background rounded-md border" data-testid="draft-phone">
                        <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate" dir="ltr">{draft.phone}</span>
                    </div>
                )}
                {(draft.address || draft.city) && (
                    <div className="col-span-2 flex items-center gap-1.5 p-1.5 bg-background rounded-md border" data-testid="draft-address">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">
                            {draft.city ? `${draft.city} - ` : ""}{draft.address || ""}
                        </span>
                    </div>
                )}
                {draft.payment && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-background rounded-md border" data-testid="draft-payment">
                        <CreditCard className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{draft.payment}</span>
                    </div>
                )}
                {draft.coupon && (
                    <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50 dark:bg-emerald-950 rounded-md border border-emerald-200 dark:border-emerald-800" data-testid="draft-coupon">
                        <Tag className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate text-emerald-700 dark:text-emerald-400">{draft.coupon} (-{draft.discount || 0})</span>
                    </div>
                )}
            </div>

            {draft.product && (draft.qty || draft.unitPrice) && (
                <div className="flex justify-between items-center pt-2 border-t text-sm">
                    <span className="text-muted-foreground">المجموع</span>
                    <span className="font-bold text-primary" data-testid="draft-total">{total} ر.س</span>
                </div>
            )}
        </div>
    );
}

export default function ChatsPage() {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
        queryKey: ["/api/admin/conversations"],
        queryFn: () => mockQuery("/api/admin/conversations"),
        refetchInterval: 5000, // Real-time ish
    });

    const { data: selectedChat } = useQuery<Conversation & { messages: Message[] }>({
        queryKey: ["/api/admin/conversations", selectedId],
        queryFn: () => mockQuery(`/api/admin/conversations/${selectedId}`),
        enabled: !!selectedId,
        refetchInterval: 3000,
    });

    // Simple stats
    const activeCount = conversations.filter(c => c.status === "active").length;
    const sentimentCounts = {
        positive: conversations.filter(c => c.sentiment === "positive").length,
        neutral: conversations.filter(c => c.sentiment === "neutral").length,
        negative: conversations.filter(c => c.sentiment === "negative").length,
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">تحليل المحادثات</h1>

                <div className="flex gap-4">
                    <Card className="px-4 py-2 flex items-center gap-2 border-green-200 bg-green-50">
                        <Smile className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-green-700">{sentimentCounts.positive}</span>
                    </Card>
                    <Card className="px-4 py-2 flex items-center gap-2 border-yellow-200 bg-yellow-50">
                        <Meh className="w-4 h-4 text-yellow-600" />
                        <span className="font-bold text-yellow-700">{sentimentCounts.neutral}</span>
                    </Card>
                    <Card className="px-4 py-2 flex items-center gap-2 border-red-200 bg-red-50">
                        <Frown className="w-4 h-4 text-red-600" />
                        <span className="font-bold text-red-700">{sentimentCounts.negative}</span>
                    </Card>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                {/* Chat List */}
                <Card className="col-span-1 border-card-border flex flex-col overflow-hidden">
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="بحث..." className="pr-9" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {isLoading ? (
                            <div className="p-4 text-center text-muted-foreground">جاري التحميل...</div>
                        ) : conversations.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">لا يوجد محادثات حالياً</div>
                        ) : (
                            conversations.map((chat) => (
                                <div
                                    key={chat.id}
                                    onClick={() => setSelectedId(chat.id)}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedId === chat.id
                                            ? "bg-primary/10 border-primary/20"
                                            : "bg-background border-transparent hover:bg-muted"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-semibold text-sm flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {chat.userId ? `User ${chat.userId.slice(0, 4)}` : "زائر"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {format(new Date(chat.updatedAt), "HH:mm", { locale: arSA })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Badge variant="outline" className={`text-[10px] h-5 ${chat.sentiment === "positive" ? "text-green-600 bg-green-50" :
                                                chat.sentiment === "negative" ? "text-red-600 bg-red-50" :
                                                    "text-gray-500 bg-gray-50"
                                            }`}>
                                            {chat.sentiment || "Unknown"}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {chat.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Chat Detail */}
                <Card className="col-span-1 md:col-span-2 border-card-border flex flex-col overflow-hidden bg-muted/20">
                    {selectedChat ? (
                        <>
                            {(() => {
                                const draft = getLatestDraft(selectedChat.messages);
                                return draft ? <OrderDraftPanel draft={draft} /> : null;
                            })()}
                            <div className="p-4 border-b bg-background flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold">محادثة {selectedChat.id.slice(0, 8)}</h3>
                                        <p className="text-xs text-muted-foreground">
                                            بدأت {format(new Date(selectedChat.createdAt), "dd MMM, HH:mm", { locale: arSA })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-xs px-2 py-1 bg-muted rounded">
                                        Model: {selectedChat.messages.filter(m => m.sender === 'fahd').length} الردود
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {selectedChat.messages.map((msg) => {
                                    const meta = (msg.metadata ?? {}) as { toolCalls?: ToolCallEntry[] };
                                    const toolCalls = meta.toolCalls;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                                        >
                                            <div
                                                className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === "user"
                                                        ? "bg-primary text-primary-foreground rounded-br-none"
                                                        : "bg-background border border-border shadow-sm rounded-bl-none"
                                                    }`}
                                            >
                                                {msg.text}
                                                <div className={`text-[10px] mt-1 text-right ${msg.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                    {format(new Date(msg.timestamp), "HH:mm")}
                                                </div>
                                            </div>
                                            {msg.sender === "fahd" && toolCalls && toolCalls.length > 0 && (
                                                <div className="mt-1 max-w-[80%] flex flex-wrap gap-1" data-testid={`tool-calls-${msg.id}`}>
                                                    {toolCalls.map((t, i) => (
                                                        <Badge
                                                            key={i}
                                                            variant="outline"
                                                            className={`text-[10px] gap-1 ${t.ok ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700"}`}
                                                            title={JSON.stringify(t.args)}
                                                            data-testid={`tool-call-${t.name}-${i}`}
                                                        >
                                                            {renderToolLabel(t)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 bg-background border-t">
                                <div className="flex items-center justify-center text-muted-foreground text-sm gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    تحليل المشاعر:
                                    <span className={`font-bold ${selectedChat.sentiment === "positive" ? "text-green-600" :
                                            selectedChat.sentiment === "negative" ? "text-red-600" :
                                                "text-gray-600"
                                        }`}>
                                        {selectedChat.sentiment?.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <MessageSquare className="w-16 h-16 opacity-20 mb-4" />
                            <p>اختر محادثة لعرض التفاصيل</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
