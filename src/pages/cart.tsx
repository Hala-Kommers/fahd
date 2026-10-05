import { useState } from 'react';
import { useFahd } from '@/lib/fahd-store';
import Header from '@/components/Header';
import CheckoutForm from '@/components/CheckoutForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function CartPage(){
 const {cartItems,updateCartQuantity,removeFromCart,clearCart}=useFahd();const [checkout,setCheckout]=useState(false);const [snapshot,setSnapshot]=useState<{productId:number;variantId?:number|null;qty:number}[]>([]);
 return <div className="min-h-screen bg-background" dir="rtl"><Header/><main className="max-w-xl mx-auto p-4 space-y-5"><h1 className="text-2xl font-bold">{checkout?'إتمام الطلب':'سلة المشتريات'}</h1>{checkout?<CheckoutForm source="cart" items={snapshot} onSuccess={()=>clearCart()}/>:<>{cartItems.length===0?<p>السلة فاضية. <a className="underline" href="/">تصفح المنتجات</a></p>:cartItems.map(item=><section key={`${item.product.id}:${item.variantId}`} className="rounded-2xl border p-4 space-y-3"><h2 className="font-bold">{item.product.title}</h2>{item.variantLabel&&<p>{item.variantLabel}</p>}<label className="grid gap-1 text-sm">الكمية<Input type="number" min={1} max={1000} value={item.quantity} onChange={e=>updateCartQuantity(item.product.id,Math.max(1,Number(e.target.value)),item.variantId)}/></label><Button variant="ghost" onClick={()=>removeFromCart(item.product.id,item.variantId)}>إزالة</Button></section>)}{cartItems.length>0&&<><p className="text-sm text-muted-foreground">السعر النهائي والعروض والشحن يظهروا في ملخص الطلب حسب المدينة.</p><Button className="w-full rounded-full min-h-12" onClick={()=>{setSnapshot(cartItems.map(i=>({productId:Number(i.product.id),variantId:i.variantId?Number(i.variantId):null,qty:i.quantity})));setCheckout(true)}}>مراجعة السعر وإتمام الطلب</Button></>}</>}</main></div>
}
