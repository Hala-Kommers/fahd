
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Provider = "google";

export type AIConfig = {
    provider: Provider;
    model: string;
    apiKey: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    responseStyle: "brief" | "medium" | "detailed";
};

export type PromptModule = {
    id: string;
    name: string;
    content: string;
    isActive: boolean;
};

export type SystemPrompt = {
    identity: string;
    hallucinationRules: string;
    closingSteps: string;
    policies: string;
    objectionHandling: string;
};

export type Guardrail = {
    forbiddenClaims: string[];
    allowedSources: string[];
};

export type AIPromptState = {
    config: AIConfig;
    systemPrompt: SystemPrompt;
    modules: PromptModule[];
    guardrails: Guardrail;

    // Actions
    updateConfig: (config: Partial<AIConfig>) => void;
    updateSystemPrompt: (section: keyof SystemPrompt, content: string) => void;
    updateModule: (id: string, content: string) => void;
    updateGuardrails: (guardrails: Partial<Guardrail>) => void;

    // Versioning (Mock)
    isPublished: boolean;
    publish: () => void;
};

export const defaultSystemPrompt: SystemPrompt = {
    identity: "أنت فهد، مساعد ذكي لمتجر إلكتروني سعودي. تتحدث باللهجة السعودية البيضاء، نبرتك ودودة ومحترفة.",
    hallucinationRules: "لا تقم بتأليف معلومات غير موجودة في الكتالوج. إذا لم تعرف الإجابة، اطلب من العميل التواصل مع الدعم.",
    closingSteps: "1. تأكيد المنتج 2. طلب الاسم 3. طلب رقم الجوال 4. طلب العنوان 5. تأكيد الطلب النهائي",
    policies: "الشحن يستغرق 1-3 أيام عمل. الدفع عند الاستلام متاح. الضمان لمدة سنة على الأعطال المصنعية.",
    objectionHandling: "إذا اعترض العميل على السعر، وضح القيمة والجودة. إذا ما زال متردداً، اعرض عليه خصم بسيط إذا كان متاحاً."
};

export const defaultModules: PromptModule[] = [
    { id: "greeting", name: "Greeting Module", content: "رحب بالعميل بحرارة وعرف عن نفسك.", isActive: true },
    { id: "product_qa", name: "Product Q&A", content: "أجب عن أسئلة المنتجات بناءً على الكتالوج فقط.", isActive: true },
    { id: "objections", name: "Objection Handling", content: "تعامل مع الاعتراضات بذكاء وصبر.", isActive: true },
    { id: "closing", name: "Order Closing", content: "وجه العميل نحو إتمام الطلب خطوة بخطوة.", isActive: true },
    { id: "address", name: "Address Parsing", content: "استخرج العنوان والمدينة بدقة.", isActive: true },
    { id: "fallback", name: "Fallback / Escalation", content: "حول المحادثة لإنسان إذا تعقدت الأمور.", isActive: true },
];

export const useAIStore = create<AIPromptState>()(
    persist(
        (set) => ({
            config: {
                provider: "google",
                model: "google/gemini-2.0-flash-001",
                apiKey: "",
                temperature: 0.7,
                maxTokens: 500,
                topP: 1,
                responseStyle: "medium",
            },
            systemPrompt: defaultSystemPrompt,
            modules: defaultModules,
            guardrails: {
                forbiddenClaims: ["شحن فوري", "أرخص سعر في العالم"],
                allowedSources: ["Catalog", "FAQ", "Policies"],
            },
            isPublished: false,

            updateConfig: (newConfig) =>
                set((state) => ({ config: { ...state.config, ...newConfig } })),
            updateSystemPrompt: (section, content) =>
                set((state) => ({
                    systemPrompt: { ...state.systemPrompt, [section]: content },
                })),
            updateModule: (id, content) =>
                set((state) => ({
                    modules: state.modules.map((m) =>
                        m.id === id ? { ...m, content } : m
                    ),
                })),
            updateGuardrails: (newGuardrails) =>
                set((state) => ({
                    guardrails: { ...state.guardrails, ...newGuardrails },
                })),

            publish: () => set({ isPublished: true }),
        }),
        {
            name: "ai-prompt-storage",
        }
    )
);
