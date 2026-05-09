
import {
    create,
    StateCreator,
    StoreMutatorIdentifier,
    Mutate,
    StoreApi,
} from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';
import {
    mockOrders,
    mockChats,
    Order,
    OrderStatus,
    ChatMessage,
    ChatSession,
    AIStatus,
    ChatOutcome,
    RejectionReason,
    AuditLog
} from './mock-data';

export type AdminState = {
    orders: Order[];
    chats: ChatSession[];

    // Order Actions
    updateOrderStatus: (id: string, status: OrderStatus) => void;
    deleteOrder: (id: string) => void;
    addTag: (id: string, tag: string) => void;

    // Chat Actions
    updateChatStatus: (id: string, status: "live" | "closed") => void;
    toggleAI: (id: string, aiStatus: AIStatus) => void;
    setChatOutcome: (id: string, outcome: ChatOutcome, reason?: RejectionReason | null) => void;
    sendMessage: (id: string, text: string, sender: "bot" | "agent") => void;
    addAuditLog: (id: string, event: string, actor: "system" | "admin", oldValue?: string, newValue?: string) => void;
};

type AdminStore = AdminState;

const createAdminStore: StateCreator<
    AdminStore,
    [['zustand/persist', unknown]]
> = (set) => ({
    orders: mockOrders,
    chats: mockChats,

    updateOrderStatus: (id, status) =>
        set((state) => ({
            orders: state.orders.map((o) =>
                o.id === id ? { ...o, status } : o
            ),
        })),

    deleteOrder: (id) =>
        set((state) => ({
            orders: state.orders.filter((o) => o.id !== id),
        })),

    addTag: (id, tag) => {
        // Implement if needed
    },

    updateChatStatus: (id, status) =>
        set((state) => ({
            chats: state.chats.map((c) =>
                c.id === id ? { ...c, status } : c
            ),
        })),

    toggleAI: (id, aiStatus) =>
        set((state) => ({
            chats: state.chats.map((c) =>
                c.id === id ? { ...c, aiStatus } : c
            ),
        })),

    setChatOutcome: (id, outcome, reason) =>
        set((state) => ({
            chats: state.chats.map((c) =>
                c.id === id ? { ...c, outcome, reasonCode: reason || null } : c
            ),
        })),

    sendMessage: (id, text, sender) =>
        set((state) => ({
            chats: state.chats.map((c) =>
                c.id === id
                    ? {
                        ...c,
                        messages: [
                            ...c.messages,
                            {
                                id: `msg-${Date.now()}`,
                                text,
                                sender,
                                timestamp: new Date().toISOString(),
                            },
                        ],
                        lastMessageAt: new Date().toISOString(),
                    }
                    : c
            ),
        })),

    addAuditLog: (id, event, actor, oldValue, newValue) =>
        set((state) => ({
            chats: state.chats.map((c) =>
                c.id === id
                    ? {
                        ...c,
                        auditLogs: [
                            ...(c.auditLogs || []),
                            {
                                id: `audit-${Date.now()}`,
                                event,
                                actor,
                                oldValue,
                                newValue,
                                timestamp: new Date().toISOString(),
                            },
                        ],
                    }
                    : c
            ),
        })),
});

export const useAdminStore = create(
    persist(createAdminStore, {
        name: 'admin-storage',
    })
);
