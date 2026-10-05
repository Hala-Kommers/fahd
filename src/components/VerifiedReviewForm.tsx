import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from './ui/button';
export default function VerifiedReviewForm({orderId,productId}:{orderId:number;productId:number}){
 const [rating,setRating]=useState(5);const [body,setBody]=useState('');const [status,setStatus]=useState('');const [pending,setPending]=useState(false);
 return <form className="border rounded-xl p-3 space-y-2" onSubmit={async e=>{e.preventDefault();setPending(true);try{await apiRequest('POST','/api/reviews',{orderId,productId,token:sessionStorage.getItem(`order_token:${orderId}`),rating,body});setStatus('شكرًا، تم استلام تقييمك')}catch{setStatus('تعذر إرسال التقييم، حاول مرة أخرى')}finally{setPending(false)}}}><label className="text-sm flex gap-2">تقييمك بعد الاستلام<select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(v=><option key={v} value={v}>{v} / 5</option>)}</select></label><textarea aria-label="تجربتك مع المنتج" className="w-full border rounded p-2 bg-background" minLength={3} maxLength={2000} required value={body} onChange={e=>setBody(e.target.value)} placeholder="شارك تجربتك الحقيقية"/><Button disabled={pending||status.startsWith('شكرًا')}>إرسال التقييم</Button>{status&&<p role="status">{status}</p>}</form>
}
