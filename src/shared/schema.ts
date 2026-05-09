import { z } from "zod";

export const productImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  isPrimary: z.boolean().default(false),
});

export const productVariantValueSchema = z.object({
  id: z.string(),
  sku: z.string(),
  attributes: z.record(z.string()), // e.g. { color: "Red", size: "L" }
  priceOverride: z.number().optional(),
  stock: z.number(),
  image: z.string().optional(),
});

export const productInventorySchema = z.object({
  mode: z.enum(["global", "variant"]),
  stockTotal: z.number(),
  lowStockThreshold: z.number().default(5),
});

export const productPricingSchema = z.object({
  cost: z.number().optional(), // Internal cost
  price: z.number(), // Selling price
  compareAt: z.number().optional(), // Original price (struck through)
  currency: z.string().default("SAR"),
});

export const pricingTierSchema = z.object({
  qty: z.number().int().positive(),
  label: z.string().optional(),    // "قطعة واحدة"، "قطعتان"...
  originalPrice: z.number(),       // سعر البيع (مشطوب)
  finalPrice: z.number(),          // السعر النهائي
});
export type PricingTier = z.infer<typeof pricingTierSchema>;

export const productSchema = z.object({
  id: z.string(), // Changed to string for "P-1001" style
  title: z.string(),
  sku: z.string(),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  descriptionShort: z.string().optional(),
  descriptionLong: z.string().optional(),
  category: z.string(),

  pricing: productPricingSchema,
  images: z.array(productImageSchema),
  inventory: productInventorySchema,

  // Variants Config
  hasVariants: z.boolean().default(false),
  variantOptions: z.array(z.string()).default([]), // ["color", "size"]
  variants: z.array(productVariantValueSchema).default([]),

  specs: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),

  usageInstructions: z.string().optional(),
  pricingTiers: z.array(pricingTierSchema).default([]),

  salesCount: z.number().default(0),
  rating: z.number().default(0),
});

export type Product = z.infer<typeof productSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type ProductVariant = z.infer<typeof productVariantValueSchema>;

export const insertProductSchema = productSchema.omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;

export const updateProductSchema = insertProductSchema.partial();
export type UpdateProduct = z.infer<typeof updateProductSchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  count: z.number(),
});

export type Category = z.infer<typeof categorySchema>;

export const cartItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1),
  color: z.string().optional(),
  size: z.string().optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

export const couponSchema = z.object({
  code: z.string(),
  type: z.enum(["percentage", "fixed"]),
  value: z.number(),
  minOrder: z.number().optional(),
  expiresAt: z.string().optional(),
});

export type Coupon = z.infer<typeof couponSchema>;

export const insertCouponSchema = couponSchema;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;

// Removed legacy insertOrderSchema


export const orderTotalsSchema = z.object({
  subtotal: z.number(),
  shipping: z.number(),
  discount: z.number(),
  grandTotal: z.number(),
  currency: z.string().default("SAR"),
});

export const orderCustomerSchema = z.object({
  name: z.string(),
  phone: z.string(),
});

export const orderAddressSchema = z.object({
  raw: z.string(),
  city: z.string(),
  district: z.string().optional(),
  street: z.string().optional(),
  buildingNo: z.string().optional(),
  landmark: z.string().optional(),
  confidence: z.number(),
});

export const orderRiskSchema = z.object({
  score: z.number(),
  flags: z.array(z.string()),
  otpStatus: z.enum(["none", "sent", "verified"]),
});

export const orderItemVariantSchema = z.record(z.string()); // e.g., { color: "red", size: "M" }

export const orderItemSchema = z.object({
  sku: z.string().optional(),
  title: z.string(),
  variant: orderItemVariantSchema.optional(),
  qty: z.number(),
  unitPrice: z.number(),
  lineTotal: z.number(),
});

export const orderActivityLogSchema = z.object({
  at: z.string(),
  action: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  note: z.string().optional(),
});

export const orderStatusSchema = z.enum(["new", "confirmed", "processing", "shipped", "delivered", "returned", "cancelled"]);
export const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(), // Keeping for display purposes if needed, though ID acts as one
  createdAt: z.string(),
  status: orderStatusSchema,
  paymentMethod: z.enum(["COD", "Online"]),
  totals: orderTotalsSchema,
  customer: orderCustomerSchema,
  address: orderAddressSchema,
  risk: orderRiskSchema,
  items: z.array(orderItemSchema),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  activityLog: z.array(orderActivityLogSchema),
});

export type Order = z.infer<typeof orderSchema>;
export type OrderStatus = Order["status"];

export const insertOrderSchema = orderSchema.omit({
  id: true,
  createdAt: true,
  activityLog: true,
  orderNumber: true
}).extend({
  // Optional overrides or specific fields for creation if needed
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;

// ... (previous schemas)

// --- Bot Configuration Schema ---

export const botPersonaSchema = z.object({
  botName: z.string().default("فهد"),
  tone: z.enum(["friendly_saudi", "formal", "casual"]).default("friendly_saudi"),
  style: z.enum(["concise", "balanced", "detailed"]).default("concise"),
  language: z.string().default("ar-SA"),
  emojiLevel: z.enum(["low", "medium", "high"]).default("medium"),
});

export const botSystemSchema = z.object({
  systemPrompt: z.string(),
  allowedSources: z.array(z.string()).default(["catalog", "product_faq", "store_policies"]),
  fallbackRule: z.string().default("If missing data, ask 1 clarifying question or offer support handover."),
  forbiddenClaims: z.array(z.string()).default([]),
});

export const botTemplatesSchema = z.object({
  welcome: z.string().default("هلا 👋 أبشر..."),
  askVariant: z.string().default("وش تفضّل من الخيارات؟"),
  askAddress: z.string().default("اكتب عنوانك: المدينة/الحي/الشارع/رقم المبنى"),
  confirm: z.string().default("ممتاز ✅ أبشر أأكد الطلب؟"),
  outOfStock: z.string().default("للأسف المنتج خالص حالياً"),
  handover: z.string().default("بحولك على أحد الزملاء للمساعدة"),
});

export const botClosingSchema = z.object({
  requiredFields: z.array(z.string()).default(["name", "phone", "address"]),
  paymentMethodsEnabled: z.array(z.enum(["COD", "Online"])).default(["COD"]),
  otpMode: z.enum(["off", "always", "risk_based"]).default("risk_based"),
  showPinLocationButton: z.enum(["off", "on", "risk_based"]).default("risk_based"),
  addressMinFieldsSA: z.array(z.string()).default(["city", "district", "street"]),
  addressConfidenceThresholds: z.object({
    accept: z.number().default(80),
    ask_one_question: z.number().default(60),
    require_pin: z.number().default(40),
  }).default({}),
});

export const botConfigSchema = z.object({
  id: z.string().default("bot_config_main"),
  provider: z.enum(["google"]).default("google"),
  model: z.string().default("gemini-2.0-flash"),
  apiKey: z.string().optional(), // In practice, handle securely
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().default(1000),
  enabled: z.boolean().default(true),

  persona: botPersonaSchema,
  system: botSystemSchema,
  templates: botTemplatesSchema,
  closing: botClosingSchema,
});

export type BotConfig = z.infer<typeof botConfigSchema>;

// Conversation & Chat Schemas

export const conversationSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  title: z.string().optional(),
  status: z.enum(["active", "closed", "archived"]),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  summary: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Conversation = z.infer<typeof conversationSchema>;

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  sender: z.enum(["user", "fahd"]),
  text: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional(), // For product links, action buttons etc
});

export type Message = z.infer<typeof messageSchema>;

export const insertMessageSchema = messageSchema.omit({ id: true, timestamp: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export const settingSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
});

export type Setting = z.infer<typeof settingSchema>;

// Deprecated AiConfig - mapped to BotConfig for backward compatibility if needed, or removed.
// We will replace usage with BotConfig.


// --- Policies & Knowledge Base Schema ---

export const policySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.array(z.string()), // Paragraphs or bullet points
  cities: z.array(z.string()).optional(),
  lastUpdated: z.string(),
  appliesTo: z.enum(["all", "category", "product"]).default("all"),
});

export type Policy = z.infer<typeof policySchema>;

export const faqItemSchema = z.object({
  q: z.string(),
  a: z.string(),
});

export const globalFaqSchema = z.object({
  id: z.string(),
  items: z.array(faqItemSchema),
});

export type GlobalFaq = z.infer<typeof globalFaqSchema>;

// --- User / Auth Schema ---

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().optional(),
  passwordHash: z.string(),
  role: z.string().default("admin"),
  createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;

// Chat Order Draft (persisted per conversation)
export const chatOrderDraftSchema = z.object({
  conversationId: z.string(),
  productTitle: z.string().optional(),
  productSku: z.string().optional(),
  productId: z.string().optional(),
  unitPrice: z.number().optional(),
  qty: z.number().optional(),
  variant: z.record(z.string()).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  addressRaw: z.string().optional(),
  city: z.string().optional(),
  paymentMethod: z.enum(["COD", "Online"]).optional(),
  couponCode: z.string().optional(),
  discount: z.number().optional(),
  step: z.enum([
    "idle", "collecting_product", "collecting_name",
    "collecting_phone", "collecting_address", "collecting_payment",
    "confirming", "done"
  ]).default("idle"),
  updatedAt: z.string().optional(),
});

export type ChatOrderDraft = z.infer<typeof chatOrderDraftSchema>;

// Admin Stats Update
export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  topProducts: { id: string; title: string; salesCount: number; revenue: number }[]; // Changed id to string
}
