import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { invalidateTikTokPixelSettings } from '@/lib/tiktok';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

type Settings = { pixelId: string; enabled: boolean };
type StoreProduct = { id: number; status: string };

export default function TikTokSettings() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Partial<Settings>>({});
  const [saved, setSaved] = useState(false);
  const query = useQuery<Settings>({
    queryKey: ['admin-tiktok-pixel'],
    queryFn: async () => (await (await apiRequest('GET', '/api/admin/marketing/pixel')).json()).data,
  });
  const products = useQuery<StoreProduct[]>({ queryKey: ['/api/products'] });
  const firstProduct = products.data?.find(product => product.status === 'active');
  const chatUrl = firstProduct ? `/chat/product/${firstProduct.id}` : '/chat';
  const pixelId = draft.pixelId ?? query.data?.pixelId ?? '';
  const enabled = draft.enabled ?? query.data?.enabled ?? false;

  const save = useMutation({
    mutationFn: async () => apiRequest('PUT', '/api/admin/marketing/pixel', { pixelId: pixelId.trim(), enabled }),
    onSuccess: async response => {
      const { data } = await response.json() as { data: Settings };
      queryClient.setQueryData(['admin-tiktok-pixel'], data);
      setDraft({});
      setSaved(true);
      invalidateTikTokPixelSettings();
    },
  });

  return <section className="rounded-xl border bg-card p-5 space-y-4" dir="rtl">
    <div className="space-y-1">
      <h2 className="font-bold">TikTok Pixel · رحلة الشراء</h2>
      <p className="text-sm text-muted-foreground">ضع معرّف البيكسل وفعّله، ثم اختبر الأحداث من شات منتج حقيقي باستخدام Pixel Helper وTest Events.</p>
    </div>
    {query.isError ? <p role="alert">تعذر تحميل إعدادات البيكسل. <Button onClick={() => void query.refetch()}>إعادة المحاولة</Button></p> : <>
      <label className="grid gap-1 text-sm">معرّف البيكسل (Pixel ID)
        <Input dir="ltr" value={pixelId} disabled={query.isLoading} placeholder="أدخل Pixel ID فقط" onChange={event => { setDraft(current => ({ ...current, pixelId: event.target.value })); setSaved(false); }} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={enabled} onCheckedChange={value => { setDraft(current => ({ ...current, enabled: value })); setSaved(false); }} />
        تفعيل TikTok Pixel
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={query.isLoading || save.isPending} onClick={() => save.mutate()}>حفظ إعدادات TikTok</Button>
        {query.data?.enabled && query.data?.pixelId && <a className="text-sm font-medium text-emerald-700 underline underline-offset-4" href={chatUrl}>افتح شات منتج للاختبار</a>}
      </div>
      {saved && <p role="status" className="text-sm text-emerald-700">تم حفظ الإعدادات. افتح شات المنتج وتحقق من الأحداث في Pixel Helper.</p>}
      {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
      {query.data && !query.data.enabled && <p className="text-xs text-muted-foreground">البيكسل غير مفعل حاليًا؛ لن تُرسل أحداث حتى تحفظ Pixel ID صحيحًا وتفعّل الزر.</p>}
    </>}
    <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed space-y-1">
      <p><b>PageView:</b> عند فتح صفحة المتجر أو الشات. <b>ViewContent:</b> عند فتح الشات. <b>Contact:</b> مع أول رسالة يرسلها العميل في المحادثة.</p>
      <p><b>InitiateCheckout:</b> عند فتح بطاقة الطلب. <b>PlaceAnOrder:</b> عند إرسال فورم صحيح. <b>Purchase:</b> بعد حفظ الطلب وظهور رسالة النجاح فقط.</p>
      <p className="text-muted-foreground">لا يُرسل اسم العميل أو جواله أو عنوانه. الدفع عند الاستلام يعني أن Purchase هنا يمثل استلام الطلب، لا تحصيل المبلغ. ظهور الحدث في Pixel Helper يثبت إطلاقه من المتصفح؛ وصوله إلى TikTok يُراجع في Test Events.</p>
    </div>
  </section>;
}
