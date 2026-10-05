import { useEffect,useState } from 'react';
import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
export default function ProductContentEditor({productId}:{productId:string}){
 const qc=useQueryClient();const [video,setVideo]=useState('');const [related,setRelated]=useState<number[]>([]);
 const {data:p}=useQuery<any>({queryKey:['/api/products',productId]});const {data:products=[]}=useQuery<any[]>({queryKey:['/api/products']});
 useEffect(()=>{if(p){setVideo(p.videoUrl||'');setRelated(p.relatedProductIds||[])}},[p]);
 const save=useMutation({mutationFn:()=>apiRequest('PATCH',`/api/admin/products/${productId}/content`,{videoUrl:video,relatedProductIds:related}),onSuccess:()=>qc.invalidateQueries({queryKey:['/api/products',productId]})});
 return <section className="rounded-xl border bg-card p-5 space-y-3"><h2 className="font-bold">محتوى يساعد على قرار الشراء</h2><label className="grid gap-2 text-sm">فيديو استخدام حقيقي — رابط HTTPS مباشر<Input type="url" dir="ltr" value={video} onChange={e=>setVideo(e.target.value)} placeholder="https://…/product.mp4"/></label><p className="text-xs text-muted-foreground">أضف صور الاستخدام والمواصفات والسياسات من أقسام المنتج أدناه. التقييمات تظهر فقط من طلبات مستلمة.</p><p className="text-sm font-medium">منتجات مكملة بعد الطلب — ٣ بحد أقصى</p><div className="flex flex-wrap gap-3">{products.filter(x=>String(x.id)!==productId).map(x=><label className="flex gap-2 text-sm" key={x.id}><input type="checkbox" checked={related.includes(x.id)} disabled={!related.includes(x.id)&&related.length===3} onChange={e=>setRelated(e.target.checked?[...related,x.id]:related.filter(id=>id!==x.id))}/>{x.title}</label>)}</div><Button type="button" onClick={()=>save.mutate()} disabled={save.isPending}>حفظ الفيديو والمنتجات المكملة</Button>{save.isSuccess&&<p role="status">تم الحفظ</p>}{save.error&&<p role="alert">{save.error.message}</p>}</section>
}
