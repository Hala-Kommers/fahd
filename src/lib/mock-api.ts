import type { Category, Conversation, Message, Order, Product } from "@shared/schema";

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

let orderCounter = 1000;
const orders = new Map<string, Order>();
const conversations = new Map<string, Conversation>();

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
    return jsonResponse({ userMessage, aiMessage });
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
