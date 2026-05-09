
import { useState } from "react";
import { useAdminStore } from "@/lib/admin-store";
import { ChatList } from "@/components/admin/chat/ChatList";
import { ChatThread } from "@/components/admin/chat/ChatThread";
import { ChatSidebar as ChatRightPanel } from "@/components/admin/chat/ChatSidebar";
import {
    ChatSession, ChatOutcome, RejectionReason, MessageSender
} from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
    const { chats, sendMessage, toggleAI, setChatOutcome, addAuditLog } = useAdminStore();
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const { toast } = useToast();

    const activeChat = chats.find(c => c.id === activeChatId);

    const handleSelectChat = (id: string) => {
        setActiveChatId(id);
    };

    const handleSendMessage = (text: string, sender: MessageSender) => {
        if (activeChatId) {
            sendMessage(activeChatId, text, sender === "user" ? "agent" : sender);
            // If admin sends message, ensure AI is paused if it wasn't already? 
            // User requested: "If AI active: admin sends as admin (manual event)"
            // Let's log it.
            if (sender === 'agent') {
                addAuditLog(activeChatId, "رسالة يدوية من الأدمن", "admin");
            }
        }
    };

    const handleTakeover = () => {
        if (activeChatId) {
            toggleAI(activeChatId, 'manual');
            addAuditLog(activeChatId, "استلام الشات (Manual Mode)", "admin");
            toast({
                title: "تم استلام الشات",
                description: "تم إيقاف الرد الآلي وتحويل المحادثة للوضع اليدوي",
                variant: "default",
            });
        }
    };

    const handleResumeAI = () => {
        if (activeChatId) {
            toggleAI(activeChatId, 'on');
            addAuditLog(activeChatId, "إعادة تفعيل البوت", "admin");
            toast({
                title: "تم تفعيل البوت",
                description: "سيكمل الذكاء الاصطناعي المحادثة الآن",
                variant: "default",
            });
        }
    };

    const handleUpdateOutcome = (outcome: string, reason?: string) => {
        if (activeChatId) {
            setChatOutcome(activeChatId, outcome as ChatOutcome, reason as RejectionReason);
            addAuditLog(activeChatId, `تغيير النتيجة: ${outcome}`, "admin");
            toast({
                title: "تم حفظ النتيجة",
                description: `تم تحديث حالة المحادثة إلى ${outcome}`,
            });
        }
    };

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] w-full overflow-hidden bg-background">
            {/* Left List */}
            <ChatList
                chats={chats}
                activeChatId={activeChatId}
                onSelectChat={handleSelectChat}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-muted/10 h-full relative">
                {activeChat ? (
                    <div className="flex h-full">
                        <div className="flex-1 h-full">
                            <ChatThread
                                chat={activeChat}
                                onSendMessage={handleSendMessage}
                                onTakeover={handleTakeover}
                                onResumeAI={handleResumeAI}
                            />
                        </div>

                        {/* Right Information Panel */}
                        <ChatRightPanel
                            chat={activeChat}
                            onUpdateOutcome={handleUpdateOutcome}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <span className="text-2xl">💬</span>
                        </div>
                        <h3 className="font-bold text-lg">لم يتم اختيار محادثة</h3>
                        <p>اختر محادثة من القائمة لبدء الرد أو المراجعة</p>
                    </div>
                )}
            </div>
        </div>
    );
}
