import {useEffect,useState} from 'react';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {apiRequest} from '@/lib/queryClient';
import {Button} from './ui/button';
import {Input} from './ui/input';
export default function DeliverySettings(){
 const {data:cities=[]}=useQuery<any[]>({queryKey:['/api/cities']});const [id,setId]=useState('');const [fee,setFee]=useState(0);const [eta,setEta]=useState('');const qc=useQueryClient();
 useEffect(()=>{const c=cities.find(c=>String(c.id)===id);if(c){setFee(c.shippingFee||0);setEta(c.deliveryEstimate||'')}},[id,cities]);
 const save=useMutation({mutationFn:()=>apiRequest('PATCH',`/api/admin/cities/${id}/delivery`,{shippingFee:fee,deliveryEstimate:eta}),onSuccess:()=>qc.invalidateQueries({queryKey:['/api/cities']})});
 const {data:metrics=[]}=useQuery<any[]>({queryKey:['/api/admin/analytics/performance'],queryFn:async()=>{const r=await apiRequest('GET','/api/admin/analytics/performance');return(await r.json()).data}});
 return <details className="rounded-xl border bg-card p-4"><summary className="font-bold cursor-pointer">إعداد التوصيل وقياس الأداء</summary><div className="grid gap-3 mt-4"><label>المدينة<select className="block border rounded p-2" value={id} onChange={e=>setId(e.target.value)}><option value="">اختر المدينة</option>{cities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>تكلفة الشحن ر.س<Input type="number" min={0} value={fee} onChange={e=>setFee(Number(e.target.value))}/></label><label>موعد التوصيل الفعلي حسب اتفاق الشحن<Input placeholder="اتركه فارغًا إذا لم يتحدد" value={eta} onChange={e=>setEta(e.target.value)}/></label><Button onClick={()=>save.mutate()} disabled={!id||save.isPending}>حفظ التوصيل</Button>{save.isSuccess&&<p role="status">تم الحفظ</p>}{save.error&&<p role="alert">تعذر الحفظ</p>}<h3 className="font-bold">الأداء خلال آخر ٧ أيام</h3><p className="text-xs">LCP ≤ 2500ms · INP ≤ 200ms · CLS ≤ 0.1 عند P75. أول محتوى للبوت ≤ 3000ms عند P95. القياسات المحلية ليست بديلًا عن الإنتاج.</p>{metrics.length?metrics.map((m:any)=><p className="text-sm" key={`${m.name}:${m.device}`}>{m.name} · {m.device} · P75: {m.p75.toFixed(2)} · P95: {m.p95.toFixed(2)} · عدد القياسات: {m.samples}</p>):<p>لا توجد قياسات كافية بعد.</p>}</div></details>
}
