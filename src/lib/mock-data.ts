
import { subMinutes, subHours, format } from "date-fns";

export type OrderStatus = "New" | "Confirmed" | "Shipped" | "Delivered" | "Returned" | "Cancelled";
export type PaymentMethod = "COD" | "Online";
export type RiskLevel = "Low" | "Medium" | "High";

export interface Order {
    id: string;
    customerName: string;
    customerPhone: string;
    city: string;
    total: number;
    paymentMethod: PaymentMethod;
    status: OrderStatus;
    riskLevel: RiskLevel;
    addressConfidence: number;
    date: string;
    items: number;
}

export type ChatStatus = "live" | "closed";
export type AIStatus = "on" | "off" | "manual";
export type ChatOutcome = "pending" | "order_created" | "confirmed" | "cancelled" | "rejected" | "incomplete";
export type RejectionReason = "price_high" | "shipping_time" | "trust_issues" | "out_of_stock" | "address_unclear" | "customer_changed_mind" | "fraud_risk" | null;
export type MessageSender = "user" | "bot" | "agent";

export interface ChatMessage {
    id: string;
    sender: MessageSender;
    text: string;
    timestamp: string;
}

export interface AuditLog {
    id: string;
    event: string;
    oldValue?: string;
    newValue?: string;
    timestamp: string;
    actor: "system" | "admin";
}

export interface ChatSession {
    id: string;
    customerName: string;
    customerPhone: string;
    city: string;
    status: ChatStatus;
    aiStatus: AIStatus;
    outcome: ChatOutcome;
    reasonCode: RejectionReason;
    riskScore: number;
    addressConfidence: number;
    objections: string[]; // "price", "trust", "shipping", "warranty"
    otpStatus: "none" | "sent" | "verified";
    pinUsed: boolean;
    orderId?: string;
    messages: ChatMessage[];
    auditLogs: AuditLog[];
    lastMessageAt: string;
    unreadCount: number;
}

// ... existing order mocks ...
export const mockOrders: Order[] = Array.from({ length: 50 }).map((_, i) => {
    const statusOptions: OrderStatus[] = ["New", "Confirmed", "Shipped", "Delivered", "Returned", "Cancelled"];
    const cities = ["الرياض", "جدة", "الدمام", "مكة", "المدينة", "الخبر"];
    const riskOptions: RiskLevel[] = ["Low", "Low", "Low", "Medium", "High"];

    return {
        id: `ORD-${1000 + i}`,
        customerName: `عميل ${i + 1}`,
        customerPhone: `05${Math.floor(Math.random() * 90000000 + 10000000)}`,
        city: cities[Math.floor(Math.random() * cities.length)],
        total: Math.floor(Math.random() * 500) + 100,
        paymentMethod: Math.random() > 0.3 ? "COD" : "Online",
        status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
        riskLevel: riskOptions[Math.floor(Math.random() * riskOptions.length)],
        addressConfidence: Math.floor(Math.random() * 100),
        date: subHours(new Date(), Math.floor(Math.random() * 24 * 30)).toISOString(),
        items: Math.floor(Math.random() * 5) + 1,
    };
});

export const mockStats = {
    totalOrdersToday: 23,
    ordersProcessing: 12,
    conversionRate: 3.2,
    avgOrderTime: "4m 30s",
    weakAddressPercentage: 15,
    highRiskPercentage: 5,
    returnRate: 2.1,
    revenueToday: 4500,
};

export const salesData = Array.from({ length: 30 }).map((_, i) => ({
    date: format(subHours(new Date(), (29 - i) * 24), "MMM dd"),
    orders: Math.floor(Math.random() * 50) + 10,
    revenue: Math.floor(Math.random() * 5000) + 1000,
}));

// --- Chat Mocks ---
const chatObjections = ["price", "trust", "shipping", "warranty"];
const chatOutcomes: ChatOutcome[] = ["pending", "order_created", "confirmed", "cancelled", "rejected", "incomplete"];
const chatReasons: RejectionReason[] = ["price_high", "shipping_time", "trust_issues", "out_of_stock", "address_unclear", null];

export const mockChats: ChatSession[] = Array.from({ length: 30 }).map((_, i) => {
    const isLive = i < 10;
    const msgsCount = Math.floor(Math.random() * 10) + 5;
    const messages: ChatMessage[] = [];

    for (let m = 0; m < msgsCount; m++) {
        messages.push({
            id: `msg-${i}-${m}`,
            sender: m % 2 === 0 ? "user" : "bot",
            text: m % 2 === 0 ? "مرحبا، هل المنتج متوفر؟" : "أهلاً بك! نعم متوفر ولدينا عرض حصري.",
            timestamp: subMinutes(new Date(), (msgsCount - m) * 5).toISOString(),
        });
    }

    return {
        id: `CHAT-${1000 + i}`,
        customerName: `عميل واتساب ${i + 1}`,
        customerPhone: `05${Math.floor(Math.random() * 90000000 + 10000000)}`,
        city: ["الرياض", "جدة", "الدمام"][Math.floor(Math.random() * 3)],
        status: isLive ? "live" : "closed",
        aiStatus: isLive && i % 3 === 0 ? "manual" : "on",
        outcome: isLive ? "pending" : chatOutcomes[Math.floor(Math.random() * chatOutcomes.length)],
        reasonCode: isLive ? null : chatReasons[Math.floor(Math.random() * chatReasons.length)],
        riskScore: Math.floor(Math.random() * 100),
        addressConfidence: Math.floor(Math.random() * 100),
        objections: Math.random() > 0.5 ? [chatObjections[Math.floor(Math.random() * chatObjections.length)]] : [],
        otpStatus: Math.random() > 0.7 ? "verified" : "none",
        pinUsed: Math.random() > 0.8,
        orderId: Math.random() > 0.8 ? `ORD-${1000 + i}` : undefined,
        messages,
        auditLogs: [],
        lastMessageAt: messages[messages.length - 1].timestamp,
        unreadCount: isLive ? Math.floor(Math.random() * 3) : 0,
    };
});
