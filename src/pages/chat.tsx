
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFahd } from "@/lib/fahd-store";
import { useToast } from "@/hooks/use-toast";
import type { Product, Conversation, Message } from "@shared/schema";
import {
  ArrowRight,
  Send,
  ShoppingBag,
  Gift,
  ArrowLeftRight,
  TrendingDown,
  Sparkles,
  Loader2
} from "lucide-react";

interface ChatMsg {
  id: string;
  sender: "fahd" | "user";
  text: string;
  products?: Product[];
  actionButtons?: { label: string; productId: number }[];
}

const quickTiles = [
  { label: "رشّح لي الأفضل 🔥", sendText: "رشّح لي الأفضل", icon: TrendingDown, category: "best" },
  { label: "أبي أرخص خيار 💸", sendText: "أبي أرخص خيار", icon: ShoppingBag, category: "cheap" },
  { label: "أبي هدية 🎁", sendText: "أبي هدية", icon: Gift, category: "gift" },
  { label: "قارن بين منتجين 🤔", sendText: "قارن بين منتجين", icon: ArrowLeftRight, category: "compare" },
];

const productQuickChips = ["وش يميزه؟", "متى يوصل؟", "الضمان والاستبدال؟"];

export default function ChatPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { chatProductContext, clearChatProductContext } = useFahd();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [autoMessageSent, setAutoMessageSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const startChat = async () => {
      try {
        const res = await apiRequest("POST", "/api/chat/start", { userId: "user-123" });
        const data: Conversation = await res.json();
        setConversationId(data.id);
      } catch (e) {
        toast({ title: "ما قدرنا نبدأ المحادثة 😕", variant: "destructive" });
      }
    };
    startChat();
  }, []);

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!conversationId) throw new Error("No conversation ID");
      const res = await apiRequest("POST", "/api/chat/message", {
        conversationId,
        message: text,
        text,
        sender: "user"
      });
      return res.json();
    },
    onSuccess: (data: { userMessage: Message, aiMessage: Message | null }) => {
      if (data.aiMessage) {
        const aiMsg: ChatMsg = {
          id: data.aiMessage.id,
          sender: "fahd",
          text: data.aiMessage.text,
          products: [],
          actionButtons: []
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    },
    onError: () => {
      toast({ title: "ما قدرنا نرسل الرسالة، جرّب مرة ثانية", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (chatProductContext && conversationId && !autoMessageSent) {
      setAutoMessageSent(true);
      setShowWelcome(false);
      const text = chatProductContext.autoMessage;
      const tempId = Math.random().toString();
      setMessages(prev => [...prev, { id: tempId, sender: "user", text }]);
      sendMessageMutation.mutate(text);
    }
  }, [chatProductContext, conversationId, autoMessageSent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessageMutation.isPending]);

  useEffect(() => {
    return () => {
      clearChatProductContext();
    };
  }, []);

  const handleTileClick = (tile: typeof quickTiles[0]) => {
    setShowWelcome(false);
    handleSend(tile.sendText);
  };

  const handleSend = (textOverride?: string) => {
    const text = textOverride || inputText.trim();
    if (!text || !conversationId) return;

    const tempId = Math.random().toString();
    setMessages(prev => [...prev, { id: tempId, sender: "user", text }]);
    setInputText("");
    setShowWelcome(false);

    sendMessageMutation.mutate(text);
  };

  const handleQuickChipClick = (chip: string) => {
    handleSend(chip);
  };

  const isTyping = sendMessageMutation.isPending;

  const hasProductContext = !!chatProductContext;

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
            <div className="flex items-center gap-1 text-[10px] text-[#8ab525]">
              <Sparkles className="w-3 h-3" />
              <span>متصل</span>
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
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${msg.sender === "fahd"
                        ? "bg-card border border-card-border shadow-sm rounded-tr-md"
                        : "bg-[#CDEB63]/20 text-foreground rounded-tl-md"
                        }`}
                    >
                      {msg.text}
                    </div>
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
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={!conversationId || isTyping}
              className="flex-1 rounded-full bg-card border-card-border min-h-[44px]"
              data-testid="input-chat-message"
            />
            <Button
              size="icon"
              onClick={() => handleSend()}
              disabled={!conversationId || isTyping}
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
