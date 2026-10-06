import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export default function TikTokSettings() {
 const [pixelId,setPixelId]=useState(''); const [enabled,setEnabled]=useState(false);
 const [saved,setSaved]=useState(false);
 const query=useQuery({queryKey:['admin-tiktok-pixel'],queryFn:async()=> (await (await apiRequest('GET','/api/admin/marketing/pixel')).json()).data});
 useEffect(()=>{if(query.data){setPixelId(query.data.pixelId);setEnabled(query.data.enabled)}},[query.data]);
 const save=useMutation({mutationFn:async()=>apiRequest('PUT','/api/admin/marketing/pixel',{pixelId:pixelId.trim(),enabled}),onSuccess:()=>setSaved(true)});
 return <section className="rounded-xl border bg-card p-5 space-y-3"><h2 className="font-bold">TikTok Pixel · تتبع الشراء</h2><p className="text-sm text-muted-foreground">يُرسل Purchase عند ظهور «استلمنا طلبك بنجاح» بعد حفظ الطلب، بقيمة الطلب والعملة والمنتجات. في الدفع عند الاستلام، هذا يعني استلام الطلب وليس تحصيل المبلغ.</p>{query.isError?<p role="alert">تعذر تحميل إعدادات البيكسل. <Button onClick={()=>query.refetch()}>إعادة المحاولة</Button></p>:<><label className="grid gap-1 text-sm">معرّف البيكسل (Pixel ID)<Input dir="ltr" value={pixelId} disabled={query.isLoading} placeholder="أدخل Pixel ID فقط" onChange={event=>{setPixelId(event.target.value);setSaved(false)}}/></label><label className="flex items-center gap-2 text-sm"><Switch checked={enabled} onCheckedChange={value=>{setEnabled(value);setSaved(false)}}/>تفعيل تتبع الشراء</label><Button disabled={query.isLoading||save.isPending} onClick={()=>save.mutate()}>حفظ إعدادات TikTok</Button>{saved&&<p role="status" className="text-emerald-700">تم حفظ إعدادات البيكسل</p>}{save.isError&&<p role="alert" className="text-destructive">{save.error.message}</p>}</>}<p className="text-xs text-muted-foreground">راجع وصول الحدث في Test Events داخل TikTok Events Manager. أدوات حجب الإعلانات أو إعدادات المتصفح قد تمنع وصوله.</p></section>
}
