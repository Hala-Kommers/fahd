import type { BotConfig, Category, Conversation, GlobalFaq, Message, Order, Policy, Product } from "@shared/schema";

const products: Product[] = [
  {
    id: "P-1001",
    title: "سماعات لاسلكية برو",
    sku: "EAR-1001",
    status: "active",
    category: "سماعات",
    descriptionShort: "صوت نقي وعزل ضوضاء ممتاز.",
    descriptionLong: "سماعات مريحة للاستخدام اليومي، بطارية طويلة وجودة صوت عالية.",
    pricing: { price: 249, compareAt: 329, currency: "SAR" },
    images: [{ id: "img-1", url: "/images/product-earbuds.png", isPrimary: true }],
    inventory: { mode: "global", stockTotal: 40, lowStockThreshold: 5 },
    hasVariants: true,
    variantOptions: ["color"],
    variants: [
      { id: "v-1", sku: "EAR-1001-W", attributes: { color: "أبيض" }, stock: 20 },
      { id: "v-2", sku: "EAR-1001-B", attributes: { color: "أسود" }, stock: 20 },
    ],
    specs: [{ key: "البطارية", value: "حتى 30 ساعة" }],
    faq: [
      { question: "وش يميزه؟", answer: "صوت ممتاز وعزل ضوضاء فعال." },
      { question: "متى يوصل؟", answer: "عادة خلال 1-3 أيام عمل." },
      { question: "الضمان والاستبدال؟", answer: "ضمان سنة واستبدال 7 أيام." },
    ],
    usageInstructions: "اشحن العلبة بالكامل قبل أول استخدام.",
    pricingTiers: [],
    salesCount: 240,
    rating: 4.8,
  },
  {
    id: "P-1002",
    title: "ساعة ذكية رياضية",
    sku: "WAT-1002",
    status: "active",
    category: "ساعات",
    descriptionShort: "تتبع نشاطك اليومي ونومك بسهولة.",
    pricing: { price: 399, compareAt: 499, currency: "SAR" },
    images: [{ id: "img-2", url: "/images/product-smartwatch.png", isPrimary: true }],
    inventory: { mode: "global", stockTotal: 28, lowStockThreshold: 5 },
    hasVariants: true,
    variantOptions: ["size"],
    variants: [
      { id: "v-3", sku: "WAT-1002-42", attributes: { size: "42mm" }, stock: 14 },
      { id: "v-4", sku: "WAT-1002-46", attributes: { size: "46mm" }, stock: 14 },
    ],
    specs: [{ key: "مقاومة الماء", value: "حتى 50 متر" }],
    faq: [],
    pricingTiers: [],
    salesCount: 170,
    rating: 4.7,
  },
  {
    id: "P-1003",
    title: "باور بانك سريع 20000",
    sku: "PWR-1003",
    status: "active",
    category: "شواحن",
    descriptionShort: "يشحن جوالك بسرعة ويدوم يومك.",
    pricing: { price: 179, compareAt: 229, currency: "SAR" },
    images: [{ id: "img-3", url: "/images/product-powerbank.png", isPrimary: true }],
    inventory: { mode: "global", stockTotal: 55, lowStockThreshold: 6 },
    hasVariants: false,
    variantOptions: [],
    variants: [],
    specs: [{ key: "السعة", value: "20000mAh" }],
    faq: [],
    pricingTiers: [
      { qty: 1, label: "قطعة واحدة", originalPrice: 179, finalPrice: 179 },
      { qty: 2, label: "قطعتان", originalPrice: 358, finalPrice: 329 },
    ],
    salesCount: 300,
    rating: 4.9,
  },
];

const categories: Category[] = [
  { id: "سماعات", name: "سماعات", icon: "Headphones", count: 1 },
  { id: "ساعات", name: "ساعات", icon: "Watch", count: 1 },
  { id: "شواحن", name: "شواحن", icon: "Lightbulb", count: 1 },
];

const coupons = {
  FAHD10: { code: "FAHD10", type: "percentage" as const, value: 10 },
  SAVE50: { code: "SAVE50", type: "fixed" as const, value: 50 },
};

let adminLoggedIn = false;

let botApiKey = "mock-key";
const botConfig = {
  id: 1,
  provider: "google",
  model: "gemini-2.0-flash",
  hasApiKey: true,
  temperature: 0.7,
  maxTokens: 1000,
  enabled: true,
  persona: {
    botName: "فهد",
    tone: "friendly_saudi",
    style: "concise",
    language: "ar-SA",
    emojiLevel: "medium",
  },
  customInstructions: "Some custom instructions here",
};

const policies: Policy[] = [
  {
    id: "shipping",
    title: "سياسة الشحن",
    content: ["التوصيل خلال 1-3 أيام عمل", "الشحن مجاني للطلبات فوق 200 ريال"],
    cities: ["الرياض", "جدة", "الدمام"],
    lastUpdated: new Date().toISOString(),
    appliesTo: "all",
  },
];

let globalFaq: GlobalFaq = {
  id: "global-faq",
  items: [
    { q: "هل يوجد استبدال؟", a: "نعم خلال 7 أيام" },
    { q: "كم مدة الضمان؟", a: "ضمان سنة" },
  ],
};

let orderCounter = 1000;
const orders = new Map<string, Order>();
const conversations = new Map<string, Conversation>();
const conversationMessages = new Map<string, Message[]>();

for (let i = 0; i < 6; i += 1) {
  const id = `ORD-${900 + i}`;
  const now = new Date(Date.now() - i * 86400000).toISOString();
  orders.set(id, {
    id,
    orderNumber: id,
    createdAt: now,
    status: i % 4 === 0 ? "shipped" : i % 3 === 0 ? "processing" : "new",
    paymentMethod: i % 2 === 0 ? "COD" : "Online",
    totals: { subtotal: 220, shipping: 0, discount: 20, grandTotal: 200, currency: "SAR" },
    customer: { name: `عميل ${i + 1}`, phone: `05000000${i}${i}` },
    address: { raw: "الرياض، حي الياسمين", city: "الرياض", confidence: 85 },
    risk: { score: 10 + i, flags: [], otpStatus: "none" },
    items: [{ title: products[i % products.length].title, qty: 1, unitPrice: 220, lineTotal: 220 }],
    activityLog: [{ at: now, action: "created" }],
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getProducts(url: URL) {
  const search = (url.searchParams.get("search") || "").toLowerCase();
  const category = url.searchParams.get("category");
  const minPrice = Number(url.searchParams.get("minPrice") || 0);
  const maxPrice = Number(url.searchParams.get("maxPrice") || 999999);
  const sort = url.searchParams.get("sort") || "popular";

  let filtered = products.filter((p) => {
    const price = p.pricing.price;
    const matchesSearch = !search || p.title.toLowerCase().includes(search);
    const matchesCategory = !category || p.category === category;
    const matchesPrice = price >= minPrice && price <= maxPrice;
    return matchesSearch && matchesCategory && matchesPrice;
  });

  filtered = filtered.sort((a, b) => {
    if (sort === "newest") return b.id.localeCompare(a.id);
    if (sort === "price_asc") return a.pricing.price - b.pricing.price;
    if (sort === "price_desc") return b.pricing.price - a.pricing.price;
    if (sort === "rating") return b.rating - a.rating;
    return b.salesCount - a.salesCount;
  });

  return filtered;
}

function createOrder(payload: any) {
  orderCounter += 1;
  const id = `ORD-${orderCounter}`;
  const now = new Date().toISOString();
  const item = payload.items?.[0];
  const product = products.find((p) => String(p.id) === String(item?.productId || payload.productId));
  const unitPrice = product?.pricing.price || 0;
  const qty = item?.quantity || payload.quantity || 1;
  const lineTotal = unitPrice * qty;
  const order: Order = {
    id,
    orderNumber: id,
    createdAt: now,
    status: "new",
    paymentMethod: payload.paymentMethod === "دفع أونلاين" ? "Online" : "COD",
    totals: {
      subtotal: lineTotal,
      shipping: lineTotal > 200 ? 0 : 25,
      discount: payload.couponCode ? 20 : 0,
      grandTotal: payload.totalAmount || lineTotal,
      currency: "SAR",
    },
    customer: { name: payload.customerName || "عميل", phone: payload.customerPhone || "0500000000" },
    address: { raw: payload.customerAddress || "الرياض", city: "الرياض", confidence: 90 },
    risk: { score: 5, flags: [], otpStatus: "none" },
    items: [{ title: product?.title || "منتج", qty, unitPrice, lineTotal, variant: item || {} }],
    activityLog: [{ at: now, action: "created" }],
  };
  orders.set(id, order);
  return { id, orderNumber: id };
}

export async function mockApiRequest(method: string, endpoint: string, body?: unknown) {
  const url = new URL(endpoint, "http://local.mock");

  if (method === "POST" && url.pathname === "/api/auth/login") {
    const payload = body as { username?: string; password?: string };
    if (!payload?.username || !payload?.password) return jsonResponse({ message: "بيانات ناقصة" }, 400);
    adminLoggedIn = true;
    return jsonResponse({ user: { id: 1, username: payload.username, role: "admin", createdAt: new Date().toISOString() } });
  }

  if (method === "POST" && url.pathname === "/api/auth/logout") {
    adminLoggedIn = false;
    return jsonResponse({ ok: true });
  }

  if (method === "GET" && url.pathname === "/api/auth/me") {
    if (!adminLoggedIn) return jsonResponse(null, 401);
    return jsonResponse({ user: { id: 1, username: "admin", role: "admin", createdAt: new Date().toISOString() } });
  }

  if (method === "GET" && url.pathname === "/api/categories") {
    return jsonResponse(categories);
  }

  if (method === "GET" && url.pathname === "/api/products") {
    return jsonResponse(getProducts(url));
  }

  if (method === "GET" && url.pathname.startsWith("/api/products/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const product = products.find((p) => String(p.id) === id);
    return product ? jsonResponse(product) : jsonResponse({ message: "Not found" }, 404);
  }

  if (method === "POST" && url.pathname === "/api/coupons/validate") {
    const code = String((body as any)?.code || "").toUpperCase();
    const coupon = (coupons as Record<string, unknown>)[code];
    return coupon ? jsonResponse(coupon) : jsonResponse({ message: "Invalid coupon" }, 400);
  }

  if (method === "POST" && url.pathname === "/api/orders") {
    return jsonResponse(createOrder(body));
  }

  if (method === "GET" && url.pathname.startsWith("/api/orders/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const order = orders.get(id);
    return order ? jsonResponse(order) : jsonResponse({ message: "Not found" }, 404);
  }

  if (method === "POST" && url.pathname === "/api/chat/start") {
    const id = `CONV-${Date.now()}`;
    const now = new Date().toISOString();
    const conv: Conversation = { id, userId: "guest", status: "active", createdAt: now, updatedAt: now };
    conversations.set(id, conv);
    conversationMessages.set(id, []);
    return jsonResponse(conv);
  }

  if (method === "POST" && url.pathname === "/api/chat/message") {
    const payload = body as { conversationId: string; text: string };
    const now = new Date().toISOString();
    const userMessage: Message = {
      id: `MSG-U-${Date.now()}`,
      conversationId: payload.conversationId,
      sender: "user",
      text: payload.text,
      timestamp: now,
    };
    const aiText = payload.text.includes("أرخص")
      ? "أرخص خيار ممتاز عندنا هو باور بانك سريع 20000 وبسعر مناسب 👌"
      : "أبشر! أقدر أرشح لك أفضل الخيارات حسب ميزانيتك واحتياجك.";
    const aiMessage: Message = {
      id: `MSG-A-${Date.now()}`,
      conversationId: payload.conversationId,
      sender: "fahd",
      text: aiText,
      timestamp: now,
    };
    const existing = conversationMessages.get(payload.conversationId) || [];
    conversationMessages.set(payload.conversationId, [...existing, userMessage, aiMessage]);
    return jsonResponse({ userMessage, aiMessage });
  }

  if (method === "GET" && url.pathname === "/api/admin/stats") {
    return jsonResponse({
      totalRevenue: 128900,
      totalOrders: orders.size,
      totalProducts: products.length,
      averageOrderValue: 230,
      topProducts: products.slice(0, 3).map((p) => ({ id: p.id, title: p.title, salesCount: p.salesCount, revenue: p.salesCount * p.pricing.price })),
    });
  }

  if (method === "GET" && url.pathname === "/api/admin/products") {
    return jsonResponse(products);
  }

  if (method === "POST" && url.pathname === "/api/admin/products") {
    const payload = body as Partial<Product>;
    const newItem: Product = {
      id: `P-${Date.now()}`,
      title: payload.title || "منتج جديد",
      sku: payload.sku || `SKU-${Date.now()}`,
      status: payload.status || "draft",
      category: payload.category || "عام",
      descriptionShort: payload.descriptionShort,
      descriptionLong: payload.descriptionLong,
      pricing: payload.pricing || { price: 0, currency: "SAR" },
      images: payload.images || [],
      inventory: payload.inventory || { mode: "global", stockTotal: 0, lowStockThreshold: 5 },
      hasVariants: payload.hasVariants || false,
      variantOptions: payload.variantOptions || [],
      variants: payload.variants || [],
      specs: payload.specs || [],
      faq: payload.faq || [],
      usageInstructions: payload.usageInstructions,
      pricingTiers: payload.pricingTiers || [],
      salesCount: payload.salesCount || 0,
      rating: payload.rating || 0,
    };
    products.unshift(newItem);
    return jsonResponse(newItem);
  }

  if (method === "PATCH" && url.pathname.startsWith("/api/admin/products/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const idx = products.findIndex((p) => String(p.id) === id);
    if (idx < 0) return jsonResponse({ message: "Not found" }, 404);
    products[idx] = { ...products[idx], ...(body as Partial<Product>) };
    return jsonResponse(products[idx]);
  }

  if (method === "DELETE" && url.pathname.startsWith("/api/admin/products/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const idx = products.findIndex((p) => String(p.id) === id);
    if (idx >= 0) products.splice(idx, 1);
    return jsonResponse({ ok: true });
  }

  if (method === "GET" && url.pathname === "/api/admin/orders") {
    return jsonResponse(Array.from(orders.values()));
  }

  if (method === "GET" && url.pathname.startsWith("/api/admin/orders/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const order = orders.get(id);
    return order ? jsonResponse(order) : jsonResponse({ message: "Not found" }, 404);
  }

  if (method === "PATCH" && url.pathname.startsWith("/api/admin/orders/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const order = orders.get(id);
    if (!order) return jsonResponse({ message: "Not found" }, 404);
    const status = (body as { status?: Order["status"] })?.status;
    if (status) order.status = status;
    orders.set(id, order);
    return jsonResponse(order);
  }

  if (method === "GET" && url.pathname === "/api/admin/coupons") {
    return jsonResponse(Object.values(coupons));
  }

  if (method === "POST" && url.pathname === "/api/admin/coupons") {
    const payload = body as { code: string; type: "percentage" | "fixed"; value: number };
    (coupons as Record<string, { code: string; type: "percentage" | "fixed"; value: number }>)[payload.code.toUpperCase()] = payload;
    return jsonResponse(payload);
  }

  if (method === "PATCH" && url.pathname.startsWith("/api/admin/coupons/")) {
    const code = decodeURIComponent(url.pathname.split("/").pop() || "").toUpperCase();
    const existing = (coupons as Record<string, any>)[code] || { code };
    (coupons as Record<string, any>)[code] = { ...existing, ...(body as Record<string, unknown>) };
    return jsonResponse((coupons as Record<string, any>)[code]);
  }

  if (method === "DELETE" && url.pathname.startsWith("/api/admin/coupons/")) {
    const code = decodeURIComponent(url.pathname.split("/").pop() || "").toUpperCase();
    delete (coupons as Record<string, any>)[code];
    return jsonResponse({ ok: true });
  }

  if (method === "GET" && url.pathname === "/api/admin/bot/config") {
    return jsonResponse({ data: botConfig });
  }

  if (method === "PATCH" && url.pathname === "/api/admin/bot/config") {
    const payload = body as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(payload, "provider") && typeof payload.provider === "string") botConfig.provider = payload.provider;
    if (Object.prototype.hasOwnProperty.call(payload, "model") && typeof payload.model === "string") botConfig.model = payload.model;
    if (Object.prototype.hasOwnProperty.call(payload, "temperature")) botConfig.temperature = Number(payload.temperature ?? botConfig.temperature);
    if (Object.prototype.hasOwnProperty.call(payload, "maxTokens")) botConfig.maxTokens = Number(payload.maxTokens ?? botConfig.maxTokens);
    if (Object.prototype.hasOwnProperty.call(payload, "enabled")) botConfig.enabled = Boolean(payload.enabled);
    if (Object.prototype.hasOwnProperty.call(payload, "persona") && payload.persona && typeof payload.persona === "object") {
      botConfig.persona = { ...botConfig.persona, ...(payload.persona as Record<string, string>) };
    }
    if (Object.prototype.hasOwnProperty.call(payload, "customInstructions") && typeof payload.customInstructions === "string") {
      botConfig.customInstructions = payload.customInstructions;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "apiKey")) {
      const key = payload.apiKey;
      if (key === "") botApiKey = "";
      else if (typeof key === "string") botApiKey = key;
      botConfig.hasApiKey = botApiKey.length > 0;
    }
    return jsonResponse({ data: { id: botConfig.id } });
  }

  if (method === "POST" && url.pathname === "/api/admin/bot/test-connection") {
    return jsonResponse({ data: { ok: botConfig.hasApiKey || botApiKey.length > 0, provider: botConfig.provider } });
  }

  if (method === "GET" && url.pathname === "/api/admin/policies") {
    return jsonResponse(policies);
  }

  if (method === "POST" && url.pathname === "/api/admin/policies") {
    const payload = body as Policy;
    policies.push(payload);
    return jsonResponse(payload);
  }

  if (method === "PATCH" && url.pathname.startsWith("/api/admin/policies/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const idx = policies.findIndex((p) => p.id === id);
    if (idx < 0) return jsonResponse({ message: "Not found" }, 404);
    policies[idx] = { ...policies[idx], ...(body as Partial<Policy>) };
    return jsonResponse(policies[idx]);
  }

  if (method === "DELETE" && url.pathname.startsWith("/api/admin/policies/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const idx = policies.findIndex((p) => p.id === id);
    if (idx >= 0) policies.splice(idx, 1);
    return jsonResponse({ ok: true });
  }

  if (method === "GET" && url.pathname === "/api/admin/faq") {
    return jsonResponse(globalFaq);
  }

  if (method === "PATCH" && url.pathname === "/api/admin/faq") {
    globalFaq = body as GlobalFaq;
    return jsonResponse(globalFaq);
  }

  if (method === "GET" && url.pathname === "/api/admin/ai/stats") {
    return jsonResponse({
      window: "7d",
      totalMessages: 840,
      userMessages: 512,
      fahdMessages: 328,
      conversations: conversations.size || 30,
      chatOrders: 81,
      conversionRate: 65.3,
      topTools: [
        { name: "search_products", count: 124 },
        { name: "get_product_details", count: 98 },
        { name: "create_order", count: 81 },
      ],
    });
  }

  if (method === "GET" && url.pathname === "/api/admin/conversations") {
    const list = Array.from(conversations.values());
    if (list.length === 0) {
      const now = new Date().toISOString();
      const id = `CONV-${Date.now()}`;
      const conv: Conversation = { id, userId: "user-123", status: "active", createdAt: now, updatedAt: now, title: "استفسار منتج" };
      conversations.set(id, conv);
      conversationMessages.set(id, [{ id: `MSG-${Date.now()}`, conversationId: id, sender: "user", text: "مرحبا", timestamp: now }]);
    }
    return jsonResponse(Array.from(conversations.values()));
  }

  if (method === "GET" && url.pathname.startsWith("/api/admin/conversations/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop() || "");
    const conv = conversations.get(id);
    if (!conv) return jsonResponse({ message: "Not found" }, 404);
    return jsonResponse({ ...conv, messages: conversationMessages.get(id) || [] });
  }

  return jsonResponse({ message: `Unhandled mock endpoint: ${method} ${url.pathname}` }, 404);
}

export async function mockQuery(queryPath: string) {
  const res = await mockApiRequest("GET", queryPath);
  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }
  return res.json();
}
