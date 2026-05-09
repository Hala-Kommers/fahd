
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Send, User, Bot, StopCircle, PlayCircle, Loader2, Check, ExternalLink, Calendar
} from "lucide-react";
import { ChatSession, MessageSender } from "@/lib/mock-data";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface ChatThreadProps {
    chat: ChatSession;
    onSendMessage: (text: string, sender: MessageSender) => void;
    onTakeover: () => void;
    onResumeAI: () => void;
}

export function ChatThread({ chat, onSendMessage, onTakeover, onResumeAI }: ChatThreadProps) {
    const [inputText, setInputText] = useState("");
    const [isSending, setIsSending] = useState(false);

    const handleSend = () => {
        if (!inputText.trim()) return;

        setIsSending(true);
        // Simulate slight delay
        setTimeout(() => {
            onSendMessage(inputText, chat.aiStatus === 'manual' ? "agent" : "user"); // In reality, admin sends as 'agent'. 'user' is customer. Wait, admin manages this.
            // If admin is using this panel, they are sending as 'agent'.
            onSendMessage(inputText, "agent");
            setInputText("");
            setIsSending(false);
        }, 300);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-background rounded-lg shadow-sm border border-border/50 overflow-hidden">
            {/* Thread Header */}
            <div className="p-4 border-b bg-card flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                            {chat.customerName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base">{chat.customerName}</h3>
                            {chat.status === 'live' && <span className="animate-pulse w-2 h-2 rounded-full bg-green-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="font-mono">{chat.customerPhone}</span>
                            • {chat.city}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {chat.aiStatus === 'on' ? (
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 gap-2" onClick={onTakeover}>
                            <StopCircle className="w-4 h-4" />
                            استلام الشات
                        </Button>
                    ) : chat.aiStatus === 'manual' ? (
                        <Button size="sm" variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-2" onClick={onResumeAI}>
                            <Bot className="w-4 h-4" />
                            إرجاع للبوت
                        </Button>
                    ) : (
                        <Badge variant="outline">AI Off</Badge>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-muted/5">
                <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                    {chat.messages.map((msg, idx) => {
                        const isAgent = msg.sender === 'agent';
                        const isBot = msg.sender === 'bot';
                        const isUser = msg.sender === 'user';

                        return (
                            <div
                                key={msg.id}
                                className={`flex w-full ${isUser ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className={`flex flex-col max-w-[70%] ${isUser ? 'items-start' : 'items-end'}`}>
                                    <div className={`
                     p-3 rounded-2xl text-sm relative shadow-sm
                     ${isUser ? 'bg-white rounded-tl-sm text-gray-800' :
                                            isBot ? 'bg-blue-50 text-blue-900 border border-blue-100 rounded-tr-sm' :
                                                'bg-[#CDEB63] text-black rounded-tr-sm'}
                   `}>
                                        {msg.text}
                                    </div>

                                    <div className="flex items-center gap-1 mt-1 px-1">
                                        <span className="text-[10px] text-muted-foreground">
                                            {format(new Date(msg.timestamp), 'h:mm a', { locale: ar })}
                                        </span>
                                        {isBot && <Bot className="w-3 h-3 text-blue-400" />}
                                        {isAgent && <User className="w-3 h-3 text-green-600" />}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing indicator could go here */}
                </div>
            </ScrollArea>

            {/* Composer */}
            <div className="p-4 bg-card border-t mt-auto">
                <div className="relative flex items-center gap-2 max-w-3xl mx-auto">
                    {chat.aiStatus === 'on' && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg border border-dashed border-border">
                            <span className="text-sm font-medium text-muted-foreground flex gap-2 items-center bg-background px-3 py-1 rounded-full shadow-sm">
                                <Bot className="w-4 h-4" />
                                الذكاء الاصطناعي يتولى الرد. اضغط "استلام" للمشاركة.
                            </span>
                        </div>
                    )}

                    <Input
                        placeholder="كتب رسالة..."
                        className="flex-1 bg-muted/30 border-none transition-all focus:ring-1 focus:ring-[#CDEB63]"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={chat.aiStatus === 'on'}
                    />
                    <Button
                        size="icon"
                        className="bg-[#CDEB63] hover:bg-[#b5d648] text-black shrink-0 transition-transform active:scale-95"
                        onClick={handleSend}
                        disabled={isSending || chat.aiStatus === 'on' || !inputText.trim()}
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
                <div className="text-[10px] text-muted-foreground text-center mt-2">
                    Enter للإرسال • Shift + Enter لسطر جديد
                </div>
            </div>
        </div>
    );
}
