import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Product } from "@shared/schema";

export interface ChatMessage {
  id: string;
  sender: "fahd" | "user";
  text: string;
  type?: "text" | "chips" | "address-card" | "summary" | "success" | "product-card";
  chips?: string[];
  addressData?: {
    city: string;
    district: string;
    street: string;
    building: string;
    notes: string;
  };
  summaryData?: {
    product: string;
    variant: string;
    quantity: number;
    price: number;
    name: string;
    phone: string;
    address: string;
    payment: string;
  };
  productData?: Product;
}

export type OrderStep = "variant" | "info" | "address" | "payment" | "summary" | "success";

export interface CartItemData {
  product: Product;
  quantity: number;
  color: string;
  size: string;
}

export interface ChatProductContext {
  product: Product;
  autoMessage: string;
  image: string;
}

interface FahdStore {
  orderSheetOpen: boolean;
  orderProduct: Product | null;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  orderStep: OrderStep;
  orderMessages: ChatMessage[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: string;
  cartItems: CartItemData[];
  appliedCoupon: { code: string; type: "percentage" | "fixed"; value: number } | null;
  chatProductContext: ChatProductContext | null;

  openOrderSheet: (product: Product) => void;
  closeOrderSheet: () => void;
  setSelectedColor: (color: string) => void;
  setSelectedSize: (size: string) => void;
  setQuantity: (qty: number) => void;
  addOrderMessage: (msg: ChatMessage) => void;
  advanceStep: (step: OrderStep) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setCustomerAddress: (address: string) => void;
  setPaymentMethod: (method: string) => void;
  addToCart: (product: Product, quantity: number, color: string, size: string) => void;
  removeFromCart: (productId: string | number) => void;
  updateCartQuantity: (productId: string | number, quantity: number) => void;
  clearCart: () => void;
  setAppliedCoupon: (coupon: { code: string; type: "percentage" | "fixed"; value: number } | null) => void;
  getCartTotal: () => number;
  getCartDiscount: () => number;
  resetOrder: () => void;
  setChatProductContext: (ctx: ChatProductContext | null) => void;
  clearChatProductContext: () => void;
}

const FahdContext = createContext<FahdStore | null>(null);

export function useFahd() {
  const ctx = useContext(FahdContext);
  if (!ctx) throw new Error("useFahd must be used within FahdProvider");
  return ctx;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function FahdProvider({ children }: { children: ReactNode }) {
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [orderStep, setOrderStep] = useState<OrderStep>("variant");
  const [orderMessages, setOrderMessages] = useState<ChatMessage[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; type: "percentage" | "fixed"; value: number } | null>(null);
  const [chatProductContext, setChatProductContext] = useState<ChatProductContext | null>(null);

  const clearChatProductContext = useCallback(() => {
    setChatProductContext(null);
  }, []);

  const openOrderSheet = useCallback((product: Product) => {
    setOrderProduct(product);
    const p = product as any;
    const productColors: { name: string }[] = p.variants?.colors
      ?? (p.variants ?? []).filter((v: any) => v.attributes?.color).map((v: any) => ({ name: v.attributes.color }));
    const productSizes: string[] = p.variants?.sizes
      ?? Array.from(new Set((p.variants ?? []).filter((v: any) => v.attributes?.size).map((v: any) => v.attributes.size as string)));

    setSelectedColor(productColors[0]?.name || "");
    setSelectedSize(productSizes[0] || "");
    setQuantity(1);
    setOrderStep("variant");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setPaymentMethod("");

    const initialMessages: ChatMessage[] = [
      {
        id: generateId(),
        sender: "fahd",
        text: `أهلاً! أنا فهد بساعدك تطلب "${product.title}" بأسرع وقت.`,
      },
    ];

    const hasMultipleColors = productColors.length > 1;
    const hasSizes = productSizes.length > 0;

    if (hasMultipleColors || hasSizes) {
      initialMessages.push({
        id: generateId(),
        sender: "fahd",
        text: hasMultipleColors ? "وش اللون اللي تفضّله؟" : "وش المقاس اللي تبيه؟",
        type: "chips",
        chips: hasMultipleColors
          ? productColors.map((c: { name: string }) => c.name)
          : productSizes,
      });
    } else {
      initialMessages.push({
        id: generateId(),
        sender: "fahd",
        text: "تمام! أحتاج اسمك الكامل ورقم جوالك عشان أكمّل الطلب.",
      });
      setOrderStep("info");
    }

    setOrderMessages(initialMessages);
    setOrderSheetOpen(true);
  }, []);

  const closeOrderSheet = useCallback(() => {
    setOrderSheetOpen(false);
  }, []);

  const addOrderMessage = useCallback((msg: ChatMessage) => {
    setOrderMessages((prev) => [...prev, msg]);
  }, []);

  const advanceStep = useCallback((step: OrderStep) => {
    setOrderStep(step);
  }, []);

  const addToCart = useCallback((product: Product, qty: number, color: string, size: string) => {
    setCartItems((prev) => {
      const existing = prev.findIndex(
        (item) => item.product.id === product.id && item.color === color && item.size === size
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + qty };
        return updated;
      }
      return [...prev, { product, quantity: qty, color, size }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string | number) => {
    setCartItems((prev) => prev.filter((item) => String(item.product.id) !== String(productId)));
  }, []);

  const updateCartQuantity = useCallback((productId: string | number, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => String(item.product.id) !== String(productId)));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        String(item.product.id) === String(productId) ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setAppliedCoupon(null);
  }, []);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((sum, item) => {
      const p = item.product as any;
      const price = p.pricing?.price ?? p.price ?? 0;
      return sum + price * item.quantity;
    }, 0);
  }, [cartItems]);

  const getCartDiscount = useCallback(() => {
    if (!appliedCoupon) return 0;
    const total = cartItems.reduce((sum, item) => {
      const p = item.product as any;
      const price = p.pricing?.price ?? p.price ?? 0;
      return sum + price * item.quantity;
    }, 0);
    if (appliedCoupon.type === "percentage") {
      return Math.round(total * (appliedCoupon.value / 100));
    }
    return appliedCoupon.value;
  }, [cartItems, appliedCoupon]);

  const resetOrder = useCallback(() => {
    setOrderStep("variant");
    setOrderMessages([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setPaymentMethod("");
    setOrderProduct(null);
    setQuantity(1);
    setSelectedColor("");
    setSelectedSize("");
  }, []);

  const value: FahdStore = {
    orderSheetOpen,
    orderProduct,
    selectedColor,
    selectedSize,
    quantity,
    orderStep,
    orderMessages,
    customerName,
    customerPhone,
    customerAddress,
    paymentMethod,
    cartItems,
    appliedCoupon,
    chatProductContext,
    openOrderSheet,
    closeOrderSheet,
    setSelectedColor,
    setSelectedSize,
    setQuantity,
    addOrderMessage,
    advanceStep,
    setCustomerName,
    setCustomerPhone,
    setCustomerAddress,
    setPaymentMethod,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    setAppliedCoupon,
    getCartTotal,
    getCartDiscount,
    resetOrder,
    setChatProductContext,
    clearChatProductContext,
  };

  return <FahdContext.Provider value={value}>{children}</FahdContext.Provider>;
}
