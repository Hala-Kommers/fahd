import {useState} from 'react';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {useFahd} from '@/lib/fahd-store';
import CheckoutForm from './CheckoutForm';
export default function OrderSheet(){
 const {orderSheetOpen,closeOrderSheet,orderProduct,quantity}=useFahd();const [busy,setBusy]=useState(false);if(!orderProduct)return null;const p=orderProduct as any;
 return <Sheet open={orderSheetOpen} onOpenChange={o=>{if(!o&&!busy)closeOrderSheet()}}><SheetContent dir="rtl" className="overflow-y-auto"><SheetTitle>طلب {p.title}</SheetTitle><SheetDescription>راجع السعر والتوصيل قبل إرسال الطلب.</SheetDescription>{orderSheetOpen&&<CheckoutForm onPendingChange={setBusy} source="cart" items={[{productId:Number(p.id),qty:quantity,variantId:p.selectedVariantId?Number(p.selectedVariantId):null}]}/>}</SheetContent></Sheet>
}
