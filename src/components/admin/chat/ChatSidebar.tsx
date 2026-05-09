
import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    MapPin,
    ShieldCheck,
    ShieldAlert,
    Save,
    MoreVertical,
    XCircle,
    TrendingUp,
    History
} from "lucide-react";
import {
    ChatSession, ChatOutcome, RejectionReason
} from "@/lib/mock-data";

interface ChatSidebarProps {
    chat: ChatSession;
    onUpdateOutcome: (outcome: string, reason?: string) => void;
}

export function ChatSidebar({ chat, onUpdateOutcome }: ChatSidebarProps) {
    const [notes, setNotes] = useState("");
    const [selectedOutcome, setSelectedOutcome] = useState<string>(chat.outcome);
    const [selectedReason, setSelectedReason] = useState<string>(chat.reasonCode || "");

    const handleSave = () => {
        // Save outcome and notes
        onUpdateOutcome(selectedOutcome, selectedReason);
    };

    return (
        <div className="w-[300px] border-r border-border bg-muted/10 h-full flex flex-col p-4 gap-4 overflow-y-auto">

            {/* 1. Outcome Panel */}
            <Card className="p-4 border-l-4 border-l-[#CDEB63] space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm">نتيجة المحادثة</h3>
                    <Badge variant="outline" className={`text-[10px] ${selectedOutcome === 'connected' ? 'bg-green-50 text-green-700' : ''
                        }`}>
                        Required
                    </Badge>
                </div>

                <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="اختر نتيجة" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="order_created">تم إنشاء طلب</SelectItem>
                        <SelectItem value="confirmed">تم التأكيد</SelectItem>
                        <SelectItem value="cancelled">تم الإلغاء</SelectItem>
                        <SelectItem value="rejected">تم الرفض</SelectItem>
                        <SelectItem value="incomplete">غير مكتمل</SelectItem>
                        <SelectItem value="pending">قيد المعالجة</SelectItem>
                    </SelectContent>
                </Select>

                {(selectedOutcome === 'cancelled' || selectedOutcome === 'rejected' || selectedOutcome === 'incomplete') && (
                    <Select value={selectedReason} onValueChange={setSelectedReason}>
                        <SelectTrigger className="h-8 text-xs bg-red-50 border-red-200 text-red-700">
                            <SelectValue placeholder="سبب الرفض/الإلغاء" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="price_high">السعر مرتفع</SelectItem>
                            <SelectItem value="shipping_time">مدة الشحن</SelectItem>
                            <SelectItem value="trust_issues">عدم ثقة</SelectItem>
                            <SelectItem value="out_of_stock">المنتج غير متوفر</SelectItem>
                            <SelectItem value="address_unclear">العنوان غير واضح</SelectItem>
                            <SelectItem value="customer_changed_mind">تراجع العميل</SelectItem>
                            <SelectItem value="fraud_risk">مخاطرة/احتيال</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                <Button size="sm" className="w-full h-7 text-xs bg-[#CDEB63] text-black hover:bg-[#b5d648]" onClick={handleSave}>
                    <Save className="w-3 h-3 ml-1" />
                    حفظ التغييرات
                </Button>
            </Card>

            {/* 2. Analytics Panel */}
            <Card className="p-4 space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    تحليل المحادثة
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 p-2 rounded">
                        <span className="text-muted-foreground block mb-1">المدة</span>
                        <span className="font-mono font-bold">12m 30s</span>
                    </div>
                    <div className="bg-muted/50 p-2 rounded">
                        <span className="text-muted-foreground block mb-1">الرسائل</span>
                        <span className="font-mono font-bold">{chat.messages.length}</span>
                    </div>
                </div>

                <Separator />

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Risk Score</span>
                        <Badge variant="outline" className={`font-mono ${chat.riskScore > 70 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
                            {chat.riskScore}/100
                        </Badge>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${chat.riskScore > 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${chat.riskScore}%` }} />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Addr Confidence</span>
                        <span className="font-bold">{chat.addressConfidence}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${(chat.addressConfidence / 20) >= i ? 'bg-blue-500' : 'bg-muted'
                                }`} />
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                    {chat.objections?.map(obj => (
                        <Badge key={obj} variant="secondary" className="text-[10px] bg-red-50 text-red-600 border border-red-100">
                            {obj === 'price' ? 'سعر' : obj === 'trust' ? 'ثقة' : obj === 'shipping' ? 'شحن' : obj}
                        </Badge>
                    ))}
                    {chat.otpStatus === 'verified' && (
                        <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-600 border border-green-100">
                            OTP ✅
                        </Badge>
                    )}
                </div>
            </Card>

            {/* 3. Notes & Tags */}
            <Card className="p-4 space-y-3 flex-1">
                <h3 className="font-bold text-sm">ملاحظات داخلية</h3>
                <Textarea
                    placeholder="أضف ملاحظة للمراجعة..."
                    className="resize-none text-xs min-h-[100px] bg-muted/20"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
                <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="cursor-pointer hover:bg-muted text-[10px]">+ Tag</Badge>
                    <Badge variant="outline" className="border-dashed text-[10px]">Follow Up</Badge>
                </div>
            </Card>

            {/* 4. Audit Log Preview */}
            <div className="bg-muted/30 rounded-lg p-3">
                <h3 className="font-bold text-xs mb-2 flex items-center gap-1 text-muted-foreground">
                    <History className="w-3 h-3" />
                    سجل النشاط
                </h3>
                <div className="space-y-3 relative pl-2 border-l border-border/50 ml-1">
                    {chat.auditLogs?.slice(-3).map(log => (
                        <div key={log.id} className="relative pl-3 text-[10px]">
                            <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-border border border-background" />
                            <p className="text-foreground">{log.event}</p>
                            <span className="text-muted-foreground text-[9px]">{format(new Date(log.timestamp), 'HH:mm')} • {log.actor}</span>
                        </div>
                    ))}
                    {(!chat.auditLogs || chat.auditLogs.length === 0) && (
                        <p className="text-[10px] text-muted-foreground pl-3">لا يوجد نشاط مسجل</p>
                    )}
                </div>
            </div>

        </div>
    );
}
