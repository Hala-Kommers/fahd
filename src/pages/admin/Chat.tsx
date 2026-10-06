import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Conversation = { id: number; customerName?: string; customerPhone?: string; status: string; updatedAt: string; createdAt: string; lastMessage: string; messageCount: number; orderCount: number };
type Message = { id: number; role: string; content: string; createdAt: string };
type Order = { id: number; orderNumber: string; status: string; grandTotal: number };
const date = (value: string) => new Date(value).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
async function get<T>(url: string): Promise<T> { return (await apiRequest("GET", url)).json(); }
const statusLabels: Record<string, string> = { new: "جديد", confirmed: "مؤكد", shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغى", returned: "مرتجع" };

export default function ChatPage() {
  const [location, navigate] = useLocation();
  const [activeId, setActiveId] = useState(() => new URLSearchParams(window.location.search).get("conversation"));
  const [view, setView] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [live, setLive] = useState(true);
  const threadRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  useEffect(() => { const timer = window.setTimeout(() => { setQuery(search); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { setActiveId(new URLSearchParams(window.location.search).get("conversation")); }, [location]);
  const list = useQuery({ queryKey: ["admin-conversation-archive", page, view, query], queryFn: () => get<{ data: Conversation[]; meta: { total: number; totalPages: number } }>(`/api/admin/conversations?${new URLSearchParams({ page: String(page), limit: "25", view, search: query })}`), refetchInterval: live ? 5000 : false });
  const detail = useQuery({ queryKey: ["admin-conversation-detail", activeId], queryFn: () => get<{ data: Conversation & { messages: Message[] }; orders: Order[] }>(`/api/admin/conversations/${activeId}`), enabled: !!activeId, refetchInterval: live ? 3000 : false });
  const messages = (detail.data?.data.messages ?? []).filter(message => ["user", "assistant", "agent"].includes(message.role) && message.content);
  useEffect(() => { nearBottom.current = true; }, [activeId]);
  useEffect(() => { if (nearBottom.current && threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [activeId, messages.length]);
  const select = (id: number) => { setActiveId(String(id)); navigate(`/admin/chat?conversation=${id}`); };
  return <div dir="rtl" className="flex flex-col h-[calc(100dvh-5rem)] min-h-[400px]">
    <header className="flex flex-wrap items-center justify-between gap-2 p-4 border-b"><div><h1 className="font-bold text-xl">سجل المحادثات</h1><p className="text-xs text-muted-foreground">المحادثات المحفوظة والطلبات المرتبطة بها · الجارية: نشاط خلال آخر ١٥ دقيقة</p></div><Button variant="outline" onClick={() => setLive(value => !value)}>{live ? "● تحديث مباشر مفعّل" : "تفعيل التحديث المباشر"}</Button></header>
    <div className="flex flex-1 min-h-0">
      <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0 flex-col border-l`}>
        <div className="p-3 space-y-2"><Input aria-label="بحث المحادثات" placeholder="الاسم، الجوال، رقم المحادثة أو الطلب" value={search} onChange={event => setSearch(event.target.value)} /><div className="grid grid-cols-4 gap-1">{[["all", "الكل"], ["live", "الجارية"], ["old", "القديمة"], ["orders", "بطلبات"]].map(([value, label]) => <Button key={value} size="sm" variant={view === value ? "default" : "outline"} className="text-xs px-1" onClick={() => { setView(value); setPage(1); }}>{label}</Button>)}</div></div>
        <div className="flex-1 overflow-y-auto">{list.isLoading ? <p className="p-4">جاري تحميل المحادثات…</p> : list.isError ? <div role="alert" className="p-4">تعذر تحميل المحادثات <Button onClick={() => list.refetch()}>إعادة المحاولة</Button></div> : !(list.data?.data?.length) ? <p className="p-4 text-muted-foreground">لا توجد محادثات مطابقة.</p> : list.data.data.map(chat => <button key={chat.id} onClick={() => select(chat.id)} className={`block w-full text-right p-3 border-b space-y-1 hover:bg-muted ${String(chat.id) === activeId ? "bg-primary/10" : ""}`}><div className="flex justify-between gap-2"><b className="text-sm">{chat.customerName || `زائر · محادثة #${chat.id}`}</b><span className="text-xs">{chat.status === "closed" ? "مغلقة" : Date.now() - Date.parse(chat.updatedAt) < 900000 ? "جارية" : "قديمة"}</span></div><p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "لم تُرسل رسائل بعد"}</p><p className="text-[11px] text-muted-foreground">{date(chat.updatedAt)} · {chat.messageCount} رسالة {chat.orderCount > 0 && `· ${chat.orderCount} طلب`}</p></button>)}</div>
        <div className="p-2 border-t flex items-center justify-between gap-1 text-xs"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>السابق</Button><span>{page} / {Math.max(1, list.data?.meta.totalPages ?? 1)} · {list.data?.meta.total ?? 0} محادثة</span><Button size="sm" variant="outline" disabled={page >= (list.data?.meta.totalPages ?? 1)} onClick={() => setPage(value => value + 1)}>التالي</Button></div>
      </aside>
      <main className={`${activeId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col bg-muted/20`}>
        {!activeId ? <p className="m-auto text-muted-foreground">اختر محادثة لعرض سجلها والطلبات المرتبطة بها</p> : <><div className="p-3 border-b space-y-2"><Button size="sm" variant="ghost" className="md:hidden" onClick={() => { setActiveId(null); navigate("/admin/chat"); }}>رجوع للقائمة</Button><h2 className="font-bold">{detail.data?.data.customerName || `محادثة #${activeId}`} <span className="font-normal text-sm">{detail.data?.data.customerPhone}</span></h2><div className="flex flex-wrap gap-2">{detail.data?.orders?.map(order => <Link key={order.id} href={`/admin/orders/${order.id}`} className="rounded-lg border bg-background px-3 py-2 text-xs">طلب {order.orderNumber} · {statusLabels[order.status] || order.status} · {order.grandTotal} ر.س ↗</Link>)}</div><p className="text-[11px] text-muted-foreground">{live ? "تتحدث الرسائل تلقائيًا كل ٣ ثوانٍ" : "التحديث متوقف"}</p></div>
        <div ref={threadRef} onScroll={event => { const el = event.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} className="flex-1 overflow-y-auto p-4 space-y-3">{detail.isLoading ? <p>جاري تحميل السجل…</p> : detail.isError ? <div role="alert">تعذر تحميل المحادثة <Button onClick={() => detail.refetch()}>إعادة المحاولة</Button></div> : messages.length === 0 ? <p>لا توجد رسائل محفوظة في هذه المحادثة.</p> : messages.map(message => <article key={message.id} className={`rounded-xl border p-3 max-w-[90%] w-fit ${message.role === "user" ? "bg-primary/10 ml-auto" : "bg-background mr-auto"}`}><p className="text-[11px] text-muted-foreground mb-1">{message.role === "user" ? "العميل" : message.role === "agent" ? "الموظف" : "فهد"} · {date(message.createdAt)}</p><p className="text-sm whitespace-pre-wrap break-words">{message.content}</p></article>)}</div></>}
      </main>
    </div>
  </div>;
}
