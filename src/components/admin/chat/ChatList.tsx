
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Filter, MessageSquare, AlertTriangle, CheckCircle2, User } from "lucide-react";
import { ChatSession } from "@/lib/mock-data";

interface ChatListProps {
    chats: ChatSession[];
    activeChatId: string | null;
    onSelectChat: (id: string) => void;
}

export function ChatList({ chats, activeChatId, onSelectChat }: ChatListProps) {
    const liveChats = chats.filter(c => c.status === 'live');
    const closedChats = chats.filter(c => c.status === 'closed');
    const convertedChats = chats.filter(c => c.outcome === 'order_created' || c.outcome === 'confirmed');
    const notConvertedChats = chats.filter(c => c.outcome === 'cancelled' || c.outcome === 'rejected');

    const renderChatCard = (chat: ChatSession) => {
        const isActive = chat.id === activeChatId;
        return (
            <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`p-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50 ${isActive ? "bg-muted border-l-4 border-l-[#CDEB63]" : "border-l-4 border-l-transparent"
                    }`}
            >
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-[#CDEB63] text-black text-xs font-bold">
                                {chat.customerName.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-bold leading-none">{chat.customerName}</p>
                            <span className="text-[10px] text-muted-foreground">{chat.city}</span>
                        </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                        {format(new Date(chat.lastMessageAt), 'HH:mm', { locale: ar })}
                    </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-1 mb-2 h-4">
                    {chat.messages[chat.messages.length - 1]?.text || "بدء المحادثة..."}
                </p>

                <div className="flex flex-wrap gap-1">
                    {chat.status === 'live' && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-green-200 bg-green-50 text-green-700">
                            Live
                        </Badge>
                    )}
                    {chat.aiStatus === 'manual' && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                            Manual
                        </Badge>
                    )}
                    {chat.aiStatus === 'on' && chat.status === 'live' && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200">
                            AI On
                        </Badge>
                    )}

                    <Badge variant="outline" className={`text-[10px] h-4 px-1 border-0 ${chat.addressConfidence > 80 ? 'bg-green-100 text-green-700' :
                            chat.addressConfidence > 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {chat.addressConfidence}% Addr
                    </Badge>

                    {chat.outcome === 'order_created' && (
                        <Badge className="text-[10px] h-4 px-1 bg-[#CDEB63] text-black">
                            تم الطلب
                        </Badge>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background border-l border-border w-[350px]">
            <div className="p-4 border-b border-border space-y-3">
                <h2 className="font-bold text-lg">المحادثات</h2>

                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="بحث..." className="pr-9 h-9 text-sm" />
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                        <Filter className="w-3 h-3 ml-1" />
                        تصفية
                    </Button>
                    {/* Add more quick filters if needed */}
                </div>
            </div>

            <Tabs defaultValue="live" className="flex-1 flex flex-col">
                <div className="px-4 pt-2">
                    <TabsList className="w-full grid grid-cols-4 h-8">
                        <TabsTrigger value="live" className="text-[10px]">Live</TabsTrigger>
                        <TabsTrigger value="closed" className="text-[10px]">Closed</TabsTrigger>
                        <TabsTrigger value="converted" className="text-[10px]">Order</TabsTrigger>
                        <TabsTrigger value="missed" className="text-[10px]">No Order</TabsTrigger>
                    </TabsList>
                </div>

                <ScrollArea className="flex-1 mt-2">
                    <TabsContent value="live" className="mt-0">
                        {liveChats.length === 0 ? <EmptyState text="لا يوجد محادثات نشطة" /> : liveChats.map(renderChatCard)}
                    </TabsContent>
                    <TabsContent value="closed" className="mt-0">
                        {closedChats.map(renderChatCard)}
                    </TabsContent>
                    <TabsContent value="converted" className="mt-0">
                        {convertedChats.map(renderChatCard)}
                    </TabsContent>
                    <TabsContent value="missed" className="mt-0">
                        {notConvertedChats.map(renderChatCard)}
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center h-40 text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm">{text}</span>
        </div>
    );
}
