
import { useState, useRef, useEffect, useCallback, Fragment, type ReactNode } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFahd } from "@/lib/fahd-store";
import { useToast } from "@/hooks/use-toast";
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
  actions?: ChatAction[];
  meta?: {
    needsHuman: boolean;
    orderCreated: boolean;
    orderId: number | null;
  };
}

type ChatAction =
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
  city: string;
  paymentMethod: string;
}

const quickTiles = [
  { label: "رشّح لي الأفضل 🔥", sendText: "رشّح لي الأفضل", icon: TrendingDown, category: "best" },
  { label: "أبي أرخص خيار 💸", sendText: "أبي أرخص خيار", icon: ShoppingBag, category: "cheap" },
  { label: "أبي هدية 🎁", sendText: "أبي هدية", icon: Gift, category: "gift" },
  { label: "قارن بين منتجين 🤔", sendText: "قارن بين منتجين", icon: ArrowLeftRight, category: "compare" },
];

const productQuickChips = ["وش يميزه؟", "متى يوصل؟", "الضمان والاستبدال؟"];
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
    `المدينة: ${payload.city}`,
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
  const [city, setCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");

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
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={cities.length ? "اختر أو اكتب المدينة" : "المدينة"}
          list="chat-cities"
          disabled={disabled}
          className="rounded-xl"
        />
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
      <datalist id="chat-cities">
        {cities.map((option) => (
          <option key={option.id} value={option.name} />
        ))}
      </datalist>
      <Button
        type="button"
        className="w-full rounded-xl bg-[#CDEB63] text-[#1a2e05] hover:bg-[#bddf52]"
        disabled={disabled || !customerName.trim() || !customerPhone.trim() || !addressRaw.trim() || !city.trim()}
        onClick={() => onSubmit({ customerName, customerPhone, addressRaw, city, paymentMethod })}
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
            <Button key={`${action.type}-${idx}`} type="button" variant="outline" size="sm" disabled={disabled || !productId} onClick={() => productId && onOpenProduct(productId)} className="rounded-full">
              عرض المنتج
            </Button>
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

export default function ChatPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { chatProductContext, clearChatProductContext } = useFahd();
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem(CHAT_SESSION_ID_KEY));
  const [inputText, setInputText] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);
  const [autoMessageSent, setAutoMessageSent] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isReady, setIsReady] = useState(false);
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
  const pendingMessagesRef = useRef<string[]>([]);

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

  const connect = useCallback(() => {
    if (!shouldReconnectRef.current) return;

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    readyRef.current = false;
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
        setMessages([]);
        setShowWelcome(true);
        setAutoMessageSent(false);
        ws.send(JSON.stringify({ type: "init" }));
        return;
      }

      if (data.type === "ai_typing") {
        setIsTyping(true);
        if (!typingMessageIdRef.current) {
          const messageId = generateId();
          typingMessageIdRef.current = messageId;
          setMessages((prev) => [...prev, { id: messageId, sender: "fahd", text: "" }]);
        }
        return;
      }

      if (data.type === "message_received") {
        return;
      }

      if (data.type === "ai_chunk") {
        if (!typingMessageIdRef.current) {
          const messageId = generateId();
          typingMessageIdRef.current = messageId;
          setMessages((prev) => [...prev, { id: messageId, sender: "fahd", text: String(data.content || "") }]);
          return;
        }

        updateMessage(typingMessageIdRef.current, (message) => ({
          ...message,
          text: String(data.content || ""),
        }));
        return;
      }

      if (data.type === "ai_done") {
        const messageId = typingMessageIdRef.current;
        if (messageId) {
          updateMessage(messageId, (message) => ({
            ...message,
            text: message.text || "تم الرد.",
            actions: Array.isArray(data.actions) ? data.actions : [],
            meta: data.meta || null,
          }));
        }
        typingMessageIdRef.current = null;
        setIsTyping(false);
        return;
      }

      if (data.type === "ai_error") {
        const messageId = typingMessageIdRef.current;
        if (messageId) {
          updateMessage(messageId, (message) => ({
            ...message,
            text: "تعذر إكمال الرد الآن. جرّب مرة ثانية.",
          }));
        }
        typingMessageIdRef.current = null;
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

  useEffect(() => {
    if (!chatProductContext || autoMessageSent || !isReady) return;
    if (messages.length > 0 && !chatProductContext.forceAutoSend) return;

    setAutoMessageSent(true);
    setShowWelcome(false);
    const text = chatProductContext.autoMessage;
    const tempId = generateId();
    setMessages((prev) => [...prev, { id: tempId, sender: "user", text }]);
    sendSocketData({ type: "message", content: text });
  }, [chatProductContext, autoMessageSent, isReady, messages.length, sendSocketData]);

  const sendMessage = useCallback((textOverride?: string) => {
    const text = (textOverride || inputText).trim();
    if (!text || !isReady || isTyping) return;

    const tempId = generateId();
    setMessages((prev) => [...prev, { id: tempId, sender: "user", text }]);
    setInputText("");
    setShowWelcome(false);
    sendSocketData({ type: "message", content: text });
  }, [inputText, isReady, isTyping, sendSocketData]);

  const handleTileClick = (tile: typeof quickTiles[0]) => {
    setShowWelcome(false);
    sendMessage(tile.sendText);
  };

  const handleQuickChipClick = (chip: string) => {
    sendMessage(chip);
  };

  const handleAddressSubmit = (payload: AddressFormPayload) => {
    sendMessage(buildAddressMessage(payload));
  };

  const hasProductContext = !!chatProductContext;
  const isConnected = connectionStatus === "connected" && isReady;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center" data-testid="button-chat-back">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#CDEB63] to-[#a8d94a] flex items-center justify-center">
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
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {showWelcome && !hasProductContext && (
            <div className="space-y-6 mb-6">
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#CDEB63] to-[#8fbe2a] flex items-center justify-center mb-5 shadow-lg animate-scale-in">
                  <span className="text-3xl font-bold text-[#1a2e05]">ف</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                  هلا وغلا! وش أقدر أسوّي لك؟ 👋
                </h2>
                <p className="text-sm text-muted-foreground max-w-sm animate-fade-in" style={{ animationDelay: "0.3s" }}>
                  اختر من الخيارات تحت أو اكتب لي وأنا بخدمتك
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="animate-fade-in-up">
                <div className={`flex gap-2 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.sender === "fahd" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#CDEB63] to-[#a8d94a] flex items-center justify-center shrink-0 mt-1">
                      <span className="text-[10px] font-bold text-[#1a2e05]">ف</span>
                    </div>
                  )}
                  <div className="max-w-[85%] space-y-2">
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.sender === "fahd"
                        ? "bg-card border border-card-border shadow-sm rounded-tr-md"
                        : "bg-[#CDEB63]/20 text-foreground rounded-tl-md whitespace-pre-line"
                        }`}
                    >
                      {msg.sender === "fahd" ? <MarkdownMessage text={msg.text} /> : msg.text}
                    </div>
                    {msg.sender === "fahd" && (
                      <ActionButtons
                        actions={msg.actions || []}
                        disabled={!isConnected || isTyping}
                        onSend={sendMessage}
                        onOpenProduct={(productId) => {
                          if (!productId) return;
                          navigate(`/product/${productId}`);
                        }}
                      />
                    )}
                    {msg.sender === "fahd" && msg.actions?.some((action) => action.type === "address_form") && (
                      <AddressFormCard cities={cities} disabled={!isConnected || isTyping} onSubmit={handleAddressSubmit} />
                    )}
                  </div>
                </div>
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

      <div className="sticky bottom-0 bg-background/90 backdrop-blur-xl border-t border-border/50 p-3">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب لفهد هنا..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={!isConnected || isTyping}
                className="flex-1 rounded-full bg-card border-card-border min-h-[44px]"
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={() => sendMessage()}
                disabled={!isConnected || isTyping}
                className="rounded-full bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] shrink-0 min-h-[44px] min-w-[44px]"
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          {hasProductContext && (
            <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-hide">
              {chatProductContext.image && (
                <img
                  src={chatProductContext.image}
                  alt={chatProductContext.product.title}
                  className="w-8 h-8 rounded-lg object-cover border border-border/50 shrink-0"
                  data-testid="img-chat-product-thumb"
                />
              )}
              {productQuickChips.map((chip, idx) => {
                const testIds = ["features", "shipping", "warranty"];
                return (
                  <button
                    key={chip}
                    onClick={() => handleQuickChipClick(chip)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground border border-border/50 hover-elevate"
                    data-testid={`chip-chat-quick-${testIds[idx]}`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
