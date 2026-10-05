import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useFahd } from "@/lib/fahd-store";
import ChatPage from "@/pages/chat";
import { Loader2 } from "lucide-react";

export default function ProductChatPage() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const validId = Number.isSafeInteger(productId) && productId > 0;
  const { chatProductContext, setChatProductContext } = useFahd();
  const { data: product, isError } = useQuery<any>({ queryKey: ["/api/products", String(productId)], enabled: validId });
  useEffect(() => {
    if (!product || chatProductContext?.productId === productId) return;
    setChatProductContext({ product, productId, image: product.images?.find((image: any) => image.isPrimary)?.url || product.images?.[0]?.url || "" });
  }, [product, productId, chatProductContext?.productId, setChatProductContext]);
  if (!validId || isError) return <div dir="rtl" className="p-8 text-center space-y-4"><p>تعذّر فتح شات هذا المنتج.</p><Link href="/" className="underline">رجوع للمتجر</Link></div>;
  if (!product || chatProductContext?.productId !== productId) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" aria-label="جاري تحميل شات المنتج" /></div>;
  return <ChatPage key={productId} />;
}
