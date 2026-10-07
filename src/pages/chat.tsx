
import { useState, useRef, useEffect, useCallback, Fragment, type ReactNode } from "react";
import ProductRating from "@/components/ProductRating";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ensureChatSession, trackCommerce, attribution } from "@/lib/commerce";
import { apiRequest } from "@/lib/queryClient";
import { mergeChatTimeline } from "@/lib/chat-timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFahd } from "@/lib/fahd-store";
import { useToast } from "@/hooks/use-toast";
import { getAnalyticsIdentity } from "@/lib/analytics";
import ChatProductActions, { ChatCommerceCard, type CommercePanel } from "@/components/ChatProductActions";
import OfferCards from "@/components/OfferCards";
import ChatOfferBanner from "@/components/ChatOfferBanner";
import {
  ArrowRight,
  Send,
  ShoppingBag,
  Gift,
  ArrowLeftRight,
  TrendingDown,
  Loader2,
  Wifi,
  WifiOff,
  Package,
} from "lucide-react";

interface ChatMsg {
  id: string;
  sender: "fahd" | "user";
  text: string;
  commerce?: { panel: CommercePanel; productId?: number; quantity?: number; variantId?: number };
  actions?: ChatAction[];
  meta?: {
    needsHuman: boolean;
    orderCreated: boolean;
    orderId: number | null;
  };
}

type ChatAction =
  | { type: "quick_reply"; payload: { label: string; message: string } }
  | { type: "show_offers" }
 | { type: "checkout" }
 | { type: "address_form" }
  | { type: "order_confirmation" }
  | { type: "show_product"; payload?: { productId: number } };

interface CityOption {
  id: number;
  name: string;
}

interface AddressFormPayload {
  customerName: string;
  customerPhone: string;
  addressRaw: string;
  cityId: number;
  cityName: string;
  addressZone?: string;
  addressDistrict?: string;
  paymentMethod: string;
}

const quickTiles = [
  { label: "رشّح لي الأفضل 🔥", sendText: "رشّح لي الأفضل", icon: TrendingDown, category: "best" },
  { label: "أبي أرخص خيار 💸", sendText: "أبي أرخص خيار", icon: ShoppingBag, category: "cheap" },
  { label: "أبي هدية 🎁", sendText: "أبي هدية", icon: Gift, category: "gift" },
  { label: "قارن بين منتجين 🤔", sendText: "قارن بين منتجين", icon: ArrowLeftRight, category: "compare" },
];

const productQuickChips = ["العروض", "التوصيل", "هل يناسبني؟", "اطلب الآن"];
const CHAT_SESSION_ID_KEY = "chat_session_id";
const CHAT_SESSION_TOKEN_KEY = "chat_token";
const CHAT_MESSAGES_KEY_PREFIX = "chat_messages:";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function getChatMessagesKey(sessionId: string) {
  return `${CHAT_MESSAGES_KEY_PREFIX}${sessionId}`;
}

function readStoredMessages(sessionId: string): ChatMsg[] {
  try {
    const raw = localStorage.getItem(getChatMessagesKey(sessionId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((message): message is ChatMsg => {
      return message
        && typeof message.id === "string"
        && (message.sender === "user" || message.sender === "fahd")
        && typeof message.text === "string";
    });
  } catch {
    return [];
  }
}

function parseHistoryMessages(messages: Array<{ id: string | number; role: string; content: string }>): ChatMsg[] {
  return [...messages]
    .reverse()
    .map((message) => ({
      id: String(message.id),
      sender: message.role === "assistant" ? "fahd" : "user",
      text: message.content || "",
    }));
}

function getAiEventText(data: any) {
  const candidates = [
    data?.content,
    data?.message,
    data?.text,
    data?.reply,
    data?.answer,
    data?.data?.content,
    data?.data?.message,
    data?.data?.text,
  ];
  const value = candidates.find((candidate) => typeof candidate === "string" && candidate.trim());
  return value ? String(value) : "";
}

function getAiChunkText(data: any, currentText: string) {
  const delta = typeof data?.delta === "string" ? data.delta : typeof data?.data?.delta === "string" ? data.data.delta : "";
  if (delta) return currentText + delta;

  const chunk = typeof data?.chunk === "string" ? data.chunk : typeof data?.data?.chunk === "string" ? data.data.chunk : "";
  const nextText = chunk || getAiEventText(data);
  if (!nextText) return currentText;
  if (!currentText || nextText.startsWith(currentText)) return nextText;
  return currentText + nextText;
}

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n");
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;

  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={`${match.index}-strong`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={`${match.index}-code`} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={`${match.index}-em`}>{token.slice(1, -1)}</em>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a key={`${match.index}-link`} href={linkMatch[2]} target="_blank" rel="noreferrer" className="underline underline-offset-2 text-primary break-words">
            {linkMatch[1]}
          </a>
        );
      } else {
        nodes.push(token);
      }
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function MarkdownMessage({ text }: { text: string }) {
  const lines = normalizeText(text).split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const unorderedMatch = /^\s*[*-]\s+(.+)$/.exec(line);
    if (unorderedMatch) {
      const items: string[] = [];
      while (index < lines.length) {
        const itemMatch = /^\s*[*-]\s+(.+)$/.exec(lines[index]);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        index += 1;
      }

      blocks.push(
        <ul key={`ul-${index}`} className="list-disc space-y-1 ps-5">
          {items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const orderedMatch = /^\s*(\d+)\.\s+(.+)$/.exec(line);
    if (orderedMatch) {
      const items: string[] = [];
      while (index < lines.length) {
        const itemMatch = /^\s*(\d+)\.\s+(.+)$/.exec(lines[index]);
        if (!itemMatch) break;
        items.push(itemMatch[2]);
        index += 1;
      }

      blocks.push(
        <ol key={`ol-${index}`} className="list-decimal space-y-1 ps-5">
          {items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines: string[] = [line.trim()];
    index += 1;

    while (index < lines.length && lines[index].trim() && !/^\s*[*-]\s+/.test(lines[index]) && !/^\s*\d+\.\s+/.test(lines[index])) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="whitespace-normal">
        {paragraphLines.map((paragraphLine, paragraphIndex) => (
          <Fragment key={`${index}-${paragraphIndex}`}>
            {paragraphIndex > 0 && <br />}
            {renderInlineMarkdown(paragraphLine)}
          </Fragment>
        ))}
      </p>
    );
  }

  return <div className="space-y-2">{blocks}</div>;
}

function getWsUrl() {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const base = baseUrl ? new URL(baseUrl) : new URL(window.location.origin);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = "/api/ws/chat";
  base.search = "";
  base.hash = "";
  return base.toString();
}

function buildAddressMessage(payload: AddressFormPayload) {
  return [
    "بيانات الطلب:",
    `الاسم: ${payload.customerName}`,
    `الجوال: ${payload.customerPhone}`,
    `العنوان: ${payload.addressRaw}`,
    `المنطقة: ${payload.cityName}`,
    ...(payload.addressZone ? [`المدينة: ${payload.addressZone}`] : []),
    ...(payload.addressDistrict ? [`الحي: ${payload.addressDistrict}`] : []),
    `طريقة الدفع: ${payload.paymentMethod}`,
  ].join("\n");
}

function getDisplayConnectionLabel(status: string) {
  if (status === "connected") return "متصل";
  if (status === "reconnecting") return "يعيد الاتصال";
  if (status === "connecting") return "جاري الاتصال";
  return "غير متصل";
}

function AddressFormCard({
  cities,
  onSubmit,
  disabled,
}: {
  cities: CityOption[];
  onSubmit: (payload: AddressFormPayload) => void;
  disabled: boolean;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [addressRaw, setAddressRaw] = useState("");
  const [cityId, setCityId] = useState<number | "">(cities[0]?.id ?? "");
  const [addressZone, setAddressZone] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");

  useEffect(() => {
    if (cityId === "" && cities.length > 0) {
      setCityId(cities[0].id);
    }
  }, [cities, cityId]);

  const selectedCity = cities.find((city) => city.id === cityId) || null;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Package className="w-3.5 h-3.5" />
        <span>أرسل بيانات الطلب</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="الاسم" disabled={disabled} className="rounded-xl" />
        <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="رقم الجوال" disabled={disabled} className="rounded-xl" />
      </div>
      <Textarea value={addressRaw} onChange={(e) => setAddressRaw(e.target.value)} placeholder="العنوان الكامل" disabled={disabled} className="min-h-20 rounded-xl resize-none" />
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={cityId}
          onChange={(e) => setCityId(Number(e.target.value))}
          disabled={disabled || cities.length === 0}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none"
          data-testid="select-chat-city"
        >
          <option value="" disabled>
            {cities.length ? "اختر المنطقة" : "لا توجد مناطق"}
          </option>
          {cities.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <Input value={addressZone} onChange={(e) => setAddressZone(e.target.value)} placeholder="المدينة" disabled={disabled} className="rounded-xl" />
        <Input value={addressDistrict} onChange={(e) => setAddressDistrict(e.target.value)} placeholder="الحي" disabled={disabled} className="rounded-xl" />
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          disabled={disabled}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none"
        >
          <option value="COD">الدفع عند الاستلام</option>
          <option value="Paymob">Paymob</option>
        </select>
      </div>
      <Button
        type="button"
        className="w-full rounded-xl bg-[#CDEB63] text-[#1a2e05] hover:bg-[#bddf52]"
        disabled={disabled || !customerName.trim() || !customerPhone.trim() || !addressRaw.trim() || cityId === ""}
        onClick={() => selectedCity && onSubmit({
          customerName,
          customerPhone,
          addressRaw,
          cityId: selectedCity.id,
          cityName: selectedCity.name,
          addressZone: addressZone.trim() || undefined,
          addressDistrict: addressDistrict.trim() || undefined,
          paymentMethod,
        })}
      >
        إرسال البيانات
      </Button>
    </div>
  );
}

function ActionButtons({
  actions,
  onSend,
  onOpenProduct,
  disabled,
}: {
  actions: ChatAction[];
  onSend: (text: string) => void;
  onOpenProduct: (productId: number) => void;
  disabled: boolean;
}) {
  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, idx) => {
        if (action.type === "show_product") {
          const productId = action.payload?.productId;
          return (
            <ProductActionCard
              key={`${action.type}-${idx}`}
              productId={productId}
              disabled={disabled}
              onOpenProduct={onOpenProduct}
            />
          );
        }

        if (action.type === "order_confirmation") {
          return (
            <Button key={`${action.type}-${idx}`} type="button" size="sm" disabled={disabled} onClick={() => onSend("confirm order")} className="rounded-full bg-[#CDEB63] text-[#1a2e05] hover:bg-[#bddf52]">
              تأكيد الطلب
            </Button>
          );
        }

        return null;
      })}
    </div>
  );
}

function ProductActionCard({
  productId,
  disabled,
  onOpenProduct,
}: {
  productId?: number;
  disabled: boolean;
  onOpenProduct: (productId: number) => void;
}) {
  const { data: product, isLoading } = useQuery<any>({
    queryKey: ["/api/products", productId],
    enabled: !!productId,
  });

  if (!productId) return null;

  const image = product?.primaryImage
    || product?.images?.find((img: any) => img?.isPrimary)?.url
    || product?.images?.[0]?.url
    || product?.image
    || "";
  const title = product?.title || "عرض المنتج";
  const price = product?.pricing?.price ?? product?.price ?? null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpenProduct(productId)}
      className="w-full max-w-sm rounded-2xl border border-card-border bg-card p-2 text-right hover-elevate active:scale-[0.98] transition-transform disabled:opacity-60"
      data-testid={`button-chat-product-${productId}`}
    >
      <div className="flex items-center gap-3">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-16 h-16 rounded-xl object-cover bg-muted shrink-0"
            data-testid={`img-chat-product-${productId}`}
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Package className="w-6 h-6 text-muted-foreground" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground mb-1">منتج مقترح</p>
          <h3 className="font-bold text-sm text-foreground line-clamp-2">{title}</h3>
          {price !== null && <p className="text-xs text-[#6f941e] font-semibold mt-1">{price} ر.س</p>}
        </div>
      </div>
    </button>
  );
}

function ProductContextCard({
  context,
}: {
  context: NonNullable<ReturnType<typeof useFahd>["chatProductContext"]>;
}) {
  const product = context.product as any;
  const price = product?.pricing?.price ?? product?.price ?? null;

  return (
    <div className="max-w-2xl mx-auto px-3 pb-1.5">
      <div className="rounded-2xl border border-[#CDEB63]/50 bg-card/95 shadow-sm p-1.5 flex gap-2 items-center animate-fade-in-up">
        {context.image ? (
          <img
            src={context.image}
            alt={context.product.title}
            className="w-[72px] h-[72px] rounded-xl object-cover border border-border/50 bg-muted shrink-0"
            data-testid="img-chat-product-context"
          />
        ) : (
          <div className="w-[72px] h-[72px] rounded-2xl bg-muted flex items-center justify-center shrink-0">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              
              <h2 className="text-xs font-bold text-foreground leading-4 line-clamp-2" data-testid="text-chat-product-title">
                {context.product.title}
              </h2>
              {price !== null && (
                <p className="text-xs text-muted-foreground">{price} ر.س</p>
              )}
            </div>
          </div>
          <ProductRating product={product} />
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { chatProductContext, clearChatProductContext } = useFahd();
  const [shoppingNeed,setShoppingNeed]=useState("");
 const [shoppingBudget,setShoppingBudget]=useState("");
  const { data: offerProduct } = useQuery<any>({ queryKey: ["/api/products", String(chatProductContext?.productId || "")], enabled: !!chatProductContext });
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const openCommerce = useCallback((panel: CommercePanel, quantity?: number, productId?: number, variantId?: number) => {
    setMessages(prev => [...prev, {
      id: `commerce-${generateId()}`, sender: 'fahd', text: '',
      commerce: { panel, quantity, productId: productId ?? chatProductContext?.productId, variantId: variantId ?? chatProductContext?.variantId ?? undefined },
    }]);
    setShowWelcome(false);
    if (panel === 'offers') trackCommerce('offer_viewed', productId ?? chatProductContext?.productId);
  }, [chatProductContext]);
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem(CHAT_SESSION_ID_KEY));
  const [inputText, setInputText] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(localStorage.getItem(CHAT_SESSION_ID_KEY));
  const tokenRef = useRef<string | null>(localStorage.getItem(CHAT_SESSION_TOKEN_KEY));
  const sessionHydratedRef = useRef(false);
  const sessionHydrationTimerRef = useRef<number | null>(null);
  const readyRef = useRef(false);
  const shouldReconnectRef = useRef(true);
  const typingMessageIdRef = useRef<string | null>(null);
  const streamingTextRef = useRef("");
  const pendingMessagesRef = useRef<string[]>([]);
  const historyRequestSentRef = useRef(false);
  const pendingFinalHistorySyncRef = useRef(false);
  useEffect(() => {
    if (!isHistoryLoaded || !offerProduct || !chatProductContext || messages.length) return;
    const text = `هلا والله 👋 معك فهد. شفت إنك مهتم بـ**${offerProduct.title}**، وهو متوفر بأكثر من عرض. إذا تبي أطلع لك الأوفر بينهم وأضبط لك الطلب مباشرة.`;
    setMessages([{ id: `welcome-${sessionId}-${offerProduct.id}`, sender: 'fahd', text, actions: [{ type: 'quick_reply', payload: { label: 'أظهر العروض', message: 'العروض' } }, { type: 'quick_reply', payload: { label: 'استفسار عن المنتج', message: 'وش أهم مميزات هذا المنتج ولمن يناسب؟' } }] }]);
  }, [isHistoryLoaded, offerProduct, chatProductContext, messages.length, sessionId]);

  const updateMessage = useCallback((messageId: string, updater: (message: ChatMsg) => ChatMsg) => {
    setMessages((prev) => prev.map((message) => (message.id === messageId ? updater(message) : message)));
  }, []);

  const sendSocketData = useCallback((data: Record<string, unknown>) => {
    const ws = wsRef.current;
    const payload = JSON.stringify(data);

    if (ws && ws.readyState === WebSocket.OPEN && readyRef.current) {
      ws.send(payload);
      return;
    }

    pendingMessagesRef.current.push(payload);
  }, []);

  const flushPendingMessages = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current) return;

    while (pendingMessagesRef.current.length) {
      ws.send(pendingMessagesRef.current.shift()!);
    }
  }, []);

  const requestHistory = useCallback(() => {
    if (!readyRef.current || historyRequestSentRef.current) return;
    historyRequestSentRef.current = true;
    sendSocketData({ type: "history" });
  }, [sendSocketData]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) window.clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && readyRef.current) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) window.clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = null;
  }, []);

  const connect = useCallback(async () => {
 try {await ensureChatSession(); sessionIdRef.current=localStorage.getItem(CHAT_SESSION_ID_KEY);tokenRef.current=localStorage.getItem(CHAT_SESSION_TOKEN_KEY);} catch {setConnectionStatus("reconnecting"); reconnectTimerRef.current=window.setTimeout(()=>connect(),3000);return}
    if (!shouldReconnectRef.current) return;

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    readyRef.current = false;
    historyRequestSentRef.current = false;
    setIsHistoryLoaded(false);
    setConnectionStatus((prev) => (prev === "connected" ? "reconnecting" : "connecting"));

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      const sessionId = sessionIdRef.current;
      const token = tokenRef.current;

      if (sessionId && token) {
        ws.send(JSON.stringify({ type: "auth", session_id: sessionId, token }));
      } else {
        ws.send(JSON.stringify({ type: "init" }));
      }
    };

    ws.onmessage = (event) => {
      let data: any;

      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (data.type === "session_created") {
        sessionIdRef.current = data.session_id;
        tokenRef.current = data.token;
        setSessionId(data.session_id);
        localStorage.setItem(CHAT_SESSION_ID_KEY, data.session_id);
        localStorage.setItem(CHAT_SESSION_TOKEN_KEY, data.token);
        readyRef.current = true;
        setIsReady(true);
        setConnectionStatus("connected");
        requestHistory();
        startHeartbeat();
        flushPendingMessages();
        return;
      }

      if (data.type === "auth_ok") {
        sessionIdRef.current = data.session_id;
        setSessionId(data.session_id);
        readyRef.current = true;
        setIsReady(true);
        setConnectionStatus("connected");
        requestHistory();
        startHeartbeat();
        flushPendingMessages();
        return;
      }

      if (data.type === "auth_error") {
        sessionIdRef.current = null;
        tokenRef.current = null;
        setSessionId(null);
        localStorage.removeItem(CHAT_SESSION_ID_KEY);
        localStorage.removeItem(CHAT_SESSION_TOKEN_KEY);
        readyRef.current = false;
        setIsReady(false);
        setIsHistoryLoaded(false);
        setMessages([]);
        setShowWelcome(true);
        ws.send(JSON.stringify({ type: "init" }));
        return;
      }

      if (data.type === "history") {
        const historyMessages = Array.isArray(data.messages) ? parseHistoryMessages(data.messages) : [];
        setMessages(previous => mergeChatTimeline(historyMessages, previous.length ? previous : readStoredMessages(data.session_id || sessionIdRef.current || '')));
        setShowWelcome(historyMessages.length === 0);
        setIsHistoryLoaded(true);
        if (pendingFinalHistorySyncRef.current) {
          pendingFinalHistorySyncRef.current = false;
          typingMessageIdRef.current = null;
          streamingTextRef.current = "";
          setIsTyping(false);
        }
        return;
      }

      if (data.type === "ai_typing") {
        setIsTyping(true);
        if (!typingMessageIdRef.current) {
          typingMessageIdRef.current = generateId();
          streamingTextRef.current = "";
        }
        return;
      }

      if (data.type === "message_received") {
        return;
      }

      if (data.type === "ai_chunk") {
        if (!typingMessageIdRef.current) typingMessageIdRef.current = generateId();
        streamingTextRef.current = getAiEventText(data);
 const streamedId=typingMessageIdRef.current; const streamedText=streamingTextRef.current;
 setMessages(prev=>[...prev.filter(m=>m.id!==streamedId),{id:streamedId!,sender:"fahd",text:streamedText}]);
        return;
      }

      if (data.type === "ai_done") {
 const messageId = typingMessageIdRef.current;
        const finalText = getAiEventText(data) || streamingTextRef.current;

        if (!finalText) {
          pendingFinalHistorySyncRef.current = true;
          historyRequestSentRef.current = false;
          sendSocketData({ type: "history" });
          return;
        }

        setMessages((prev) => [
          ...prev.filter(m=>m.id!==messageId),
          {
            id: messageId || generateId(),
            sender: "fahd",
            text: finalText,
            actions: Array.isArray(data.actions) ? data.actions : [],
            meta: data.meta || null,
          },
        ]);
        typingMessageIdRef.current = null;
        streamingTextRef.current = "";
        setIsTyping(false);
        return;
      }

      if (data.type === "ai_error") {
        const messageId = typingMessageIdRef.current;
        setMessages((prev) => [...prev.filter(m=>m.id!==messageId), { id: messageId || generateId(), sender: "fahd", text: "تعذر إكمال الرد الآن. تقدر تشوف العروض وتطلب من الأزرار أسفل المحادثة." }]);
        typingMessageIdRef.current = null;
        streamingTextRef.current = "";
        setIsTyping(false);
        toast({ title: "صار خطأ في الرد", description: String(data.error || "تعذر التواصل مع المساعد"), variant: "destructive" });
        return;
      }

      if (data.type === "error") {
        toast({ title: "خطأ في المحادثة", description: String(data.error || "حدث خطأ غير متوقع"), variant: "destructive" });
      }
    };

    ws.onerror = () => {
      setConnectionStatus("reconnecting");
    };

    ws.onclose = () => {
      readyRef.current = false;
      setIsReady(false);
      setIsHistoryLoaded(false);
      stopHeartbeat();
      if (!shouldReconnectRef.current) {
        setConnectionStatus("disconnected");
        return;
      }

      setConnectionStatus("reconnecting");
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, 1000);
    };
  }, [flushPendingMessages, startHeartbeat, stopHeartbeat, toast, updateMessage]);

  useEffect(() => {
    connect();

    return () => {
      shouldReconnectRef.current = false;
      readyRef.current = false;
      stopHeartbeat();
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect, stopHeartbeat]);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const res = await apiRequest("GET", "/api/cities");
        const payload = await res.json();
        const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.items) ? payload.items : [];
        setCities(list);
      } catch {
        setCities([]);
      }
    };

    loadCities();
  }, []);

  useEffect(() => {
    if (sessionHydrationTimerRef.current) {
      window.clearTimeout(sessionHydrationTimerRef.current);
      sessionHydrationTimerRef.current = null;
    }

    sessionHydratedRef.current = false;

    if (!sessionId) {
      setMessages([]);
      setShowWelcome(true);
      return;
    }

    const storedMessages = readStoredMessages(sessionId);
    setMessages(storedMessages);
    setShowWelcome(storedMessages.length === 0);
    sessionHydrationTimerRef.current = window.setTimeout(() => {
      sessionHydratedRef.current = true;
      sessionHydrationTimerRef.current = null;
    }, 0);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !sessionHydratedRef.current) return;
    localStorage.setItem(getChatMessagesKey(sessionId), JSON.stringify(messages));
  }, [messages, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      clearChatProductContext();
      if (sessionHydrationTimerRef.current) window.clearTimeout(sessionHydrationTimerRef.current);
    };
  }, []);

  const sendMessage = useCallback((textOverride?: string, extraContext?: Record<string, unknown>) => {
    const text = (textOverride || inputText).trim();
    if (!text || !isReady || !isHistoryLoaded || isTyping) return;

    const tempId = generateId();
    setMessages((prev) => [...prev, { id: tempId, sender: "user", text }]);
    setInputText("");
    setShowWelcome(false);
    let selection: {quantity?: number; variantId?: string} = {};
 try { selection = JSON.parse(sessionStorage.getItem(`fahd_selection:${localStorage.getItem("chat_session_id")}:${chatProductContext?.productId}`) || "{}"); } catch {}
 const analyticsIdentity = getAnalyticsIdentity();
 trackCommerce("chat_engaged",chatProductContext?.productId);
    sendSocketData({
      type: "message",
      content: text,
      context: {
        ...analyticsIdentity,
 ...attribution(chatProductContext?.productId),
        ...(chatProductContext
          ? {
              productId: chatProductContext.productId,
              selectedQuantity: selection.quantity || 1,
              ...(selection.variantId ? {variantId: Number(selection.variantId)} : {}),
              ...(chatProductContext.variantId != null ? { variantId: chatProductContext.variantId } : {}),
            }
          : {}),
        ...extraContext,
      },
    });
  }, [chatProductContext, inputText, isReady, isHistoryLoaded, isTyping, sendSocketData]);

  const handleTileClick = (tile: typeof quickTiles[0]) => {
    setShowWelcome(false);
    sendMessage(tile.sendText);
  };

  const handleQuickChipClick = (chip: string) => {
 if(chip==="العروض"){openCommerce('offers');return} if(chip==="اطلب الآن"){openCommerce('order');return}
 sendMessage(chip);
  };

  const handleAddressSubmit = (payload: AddressFormPayload) => {
    sendMessage(buildAddressMessage(payload), { cityId: payload.cityId });
  };

  const hasProductContext = !!chatProductContext;
  const isConnected = connectionStatus === "connected" && isReady;
  const canSend = isConnected && isHistoryLoaded;

  return (
    <div className="h-[100dvh] min-h-0 overflow-hidden bg-background flex flex-col">
      <header className="shrink-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-3 py-0.5 flex items-center gap-2">
          <button onClick={() => navigate("/")} className="text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center" data-testid="button-chat-back">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#CDEB63] to-[#a8d94a] flex items-center justify-center">
            <span className="text-sm font-bold text-[#1a2e05]">ف</span>
          </div>
          <div>
            <h1 className="font-bold text-foreground">فهد</h1>
            <p className="text-[11px] text-muted-foreground">مساعدك الذكي</p>
          </div>
          <div className="ms-auto">
            <div className={`flex items-center gap-1 text-[10px] ${isConnected ? "text-[#8ab525]" : "text-muted-foreground"}`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{getDisplayConnectionLabel(connectionStatus)}</span>
            </div>
          </div>
        </div>
        {chatProductContext && (
          <ChatOfferBanner productId={chatProductContext.productId} sessionId={sessionId} />
        )}
        {chatProductContext && (
          <ProductContextCard
            context={chatProductContext}
          />
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto saudi-chat-pattern">
        <div className="max-w-2xl mx-auto px-3 py-3">
          {showWelcome && !hasProductContext && (
            <div className="space-y-6 mb-6">
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#CDEB63] to-[#8fbe2a] flex items-center justify-center mb-5 shadow-lg animate-scale-in">
                  <span className="text-3xl font-bold text-[#1a2e05]">ف</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                  {chatProductContext ? `هلا! خلّنا نختار عرض ${chatProductContext.product.title} المناسب لك` : "هلا! وش تحتاج وكم ميزانيتك؟"}
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm animate-fade-in" style={{ animationDelay: "0.3s" }}>
                  {chatProductContext ? "شوف العروض أو اسألني عن الاستخدام والتوصيل، واطلب مباشرة وقت ما تكون جاهز." : "قل لي استخدامك والميزانية، وأرشّح لك خيارات مناسبة."}
                </p>
              </div>

              <div className="space-y-3">{!chatProductContext&&<form className="border rounded-2xl bg-card p-4 space-y-3" onSubmit={e=>{e.preventDefault();sendMessage(`أحتاج ${shoppingNeed} وميزانيتي ${shoppingBudget} ريال`,{need:shoppingNeed,budget:Number(shoppingBudget)})}}><h3 className="font-bold">ساعدني أختار</h3><Input aria-label="احتياجك" placeholder="وش تحتاج؟ لنفسك أو هدية؟" value={shoppingNeed} required maxLength={200} onChange={e=>setShoppingNeed(e.target.value)}/><Input aria-label="ميزانيتك بالريال" type="number" min={1} max={1000000} placeholder="ميزانيتك بالريال" value={shoppingBudget} required onChange={e=>setShoppingBudget(e.target.value)}/><Button className="w-full" disabled={!canSend||isTyping}>رشّح لي ٣ خيارات مناسبة</Button></form>}<div className="grid grid-cols-2 gap-3">
                {quickTiles.map((tile, idx) => (
                  <button
                    key={tile.label}
                    onClick={() => handleTileClick(tile)}
                    className="flex flex-col items-start gap-2 p-4 rounded-2xl bg-card border border-card-border text-right hover-elevate active-elevate-2 transition-all active:scale-95 min-h-[44px] animate-fade-in-up"
                    style={{ animationDelay: `${0.3 + idx * 0.08}s` }}
                    data-testid={`tile-${tile.category}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#CDEB63]/15 flex items-center justify-center">
                      <tile.icon className="w-4 h-4 text-[#8ab525]" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{tile.label}</span>
                  </button>
                ))}
              </div></div>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((msg, messageIndex) => (
              <div key={msg.id} className="animate-fade-in-up" data-chat-message={msg.id}>
                {msg.commerce ? <ChatCommerceCard cardId={msg.id} {...msg.commerce} onChoose={(quantity, productId, variantId) => openCommerce('order', quantity, productId, variantId)} /> : <>
                <div className={`flex gap-2 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.sender === "fahd" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#CDEB63] to-[#a8d94a] flex items-center justify-center shrink-0 mt-1">
                      <span className="text-[10px] font-bold text-[#1a2e05]">ف</span>
                    </div>
                  )}
                  <div className={`${msg.actions?.some(a => a.type === 'show_offers') ? 'flex-1 min-w-0' : 'max-w-[85%]'} space-y-2`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.75] ${msg.sender === "fahd"
                        ? "bg-card border border-card-border shadow-sm rounded-tr-md"
                        : "bg-[#CDEB63]/20 text-foreground rounded-tl-md whitespace-pre-line"
                        }`}
                    >
                      {msg.sender === "fahd" ? (
                        isTyping && msg.id === typingMessageIdRef.current ? (
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        ) : (
                          <MarkdownMessage text={msg.text} />
                        )
                      ) : msg.text}
                    </div>
                    {msg.sender === "fahd" && offerProduct && msg.actions?.some(a=>a.type==="show_offers") && (
                      <OfferCards product={offerProduct} stock={offerProduct.stockTotal ?? 0} onChoose={quantity => openCommerce('order', quantity)} />
                    )}
                    {msg.sender === "fahd" && (
                      <ActionButtons
                        actions={msg.actions || []}
                        disabled={!canSend || isTyping}
                        onSend={sendMessage}
                        onOpenProduct={(productId) => {
                          if (!productId) return;
                          navigate(`/product/${productId}`);
                        }}
                      />
                    )}
                    {msg.sender === "fahd" && messageIndex === messages.length - 1 && !isTyping && (
                      <div className="flex flex-wrap gap-1.5" aria-label="اختيارات سريعة للمحادثة">
                        {(msg.actions || []).filter((action): action is Extract<ChatAction, { type: 'quick_reply' }> => action.type === 'quick_reply').slice(0, 3).map(({ payload: choice }) => (
                          <button key={choice.label} type="button" disabled={!canSend || isTyping} onClick={() => handleQuickChipClick(choice.message)} className="rounded-full border border-[#CDEB63]/70 bg-[#CDEB63]/10 px-3 py-2 text-[11px] font-medium hover:bg-[#CDEB63]/25 active:scale-95 transition disabled:opacity-50">
                            {choice.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {msg.sender === "fahd" && msg.actions?.some((action) => action.type === "address_form" || action.type === "checkout") && (
                      <ChatCommerceCard cardId={msg.id} panel="order" productId={chatProductContext?.productId} variantId={chatProductContext?.variantId ?? undefined} onChoose={(quantity, productId, variantId) => openCommerce('order', quantity, productId, variantId)} />
                    )}
                  </div>
                </div>
                </>}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#CDEB63] to-[#a8d94a] flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-[#1a2e05]">ف</span>
                </div>
                <div className="bg-card border border-card-border shadow-sm rounded-2xl rounded-tr-md px-4 py-3">
                  <div className="flex gap-1">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="shrink-0 bg-background/90 backdrop-blur-xl border-t border-border/50 px-3 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto space-y-1">
          <ChatProductActions onOpen={openCommerce} />
          <div className="flex gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب لفهد هنا..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={!canSend || isTyping}
                className="flex-1 rounded-full bg-card border-card-border h-10 min-h-10 text-base"
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={() => sendMessage()}
                disabled={!canSend || isTyping}
                className="rounded-full bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] shrink-0 min-h-[44px] min-w-[44px]"
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
