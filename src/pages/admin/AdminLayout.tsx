
import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenuBadge
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, ShoppingCart, Package, MessageSquare,
  Settings, Ticket,
  Search, Plus, ArrowRight, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/lib/admin-store";
import { useLogout } from "@/hooks/use-auth";
import { useAdminWebSocket } from "@/hooks/use-ws";

const menuItems = [
  { title: "نظرة عامة", href: "/admin", icon: LayoutDashboard },
  { title: "الطلبات", href: "/admin/orders", icon: ShoppingCart, badge: "new" },
  { title: "المنتجات", href: "/admin/products", icon: Package },
  { title: "الكوبونات", href: "/admin/coupons", icon: Ticket },
  { title: "المحادثات", href: "/admin/chat", icon: MessageSquare },
  { title: "الإعدادات", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { orders } = useAdminStore();
  const newOrdersCount = orders.filter(o => o.status === 'New').length;
  const logout = useLogout();
  useAdminWebSocket();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  useEffect(() => {
    const previousDir = document.documentElement.dir;
    document.documentElement.dir = "rtl";
    document.body.dir = "rtl";

    return () => {
      document.documentElement.dir = previousDir || "ltr";
      document.body.dir = previousDir || "ltr";
    };
  }, []);

  return (
    <SidebarProvider style={style as React.CSSProperties} defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-muted/20" dir="rtl">
        <Sidebar side="right" variant="floating" className="border-l border-sidebar-border">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="gap-2 h-12 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#CDEB63] to-[#a8d94a] flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-black text-[#1a2e05]">ف</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">فهد</span>
                  <span className="text-[10px] text-muted-foreground">AI Store Manager</span>
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.href}
                        tooltip={item.title}
                        className="h-10 transition-all hover:translate-x-[-2px]"
                      >
                        <Link href={item.href} data-testid={`nav-${item.href.split("/").pop()}`}>
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                          {item.badge === "new" && newOrdersCount > 0 && (
                            <SidebarMenuBadge className="bg-[#CDEB63] text-black font-bold pointer-events-none">
                              {newOrdersCount}
                            </SidebarMenuBadge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="text-muted-foreground hover:text-foreground">
                      <Link href="/" data-testid="nav-back-store">
                        <ArrowRight className="w-4 h-4 transform rotate-180" />
                        <span>العودة للمتجر</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-40 flex items-center justify-between gap-3 px-6 py-3 border-b border-border bg-background/80 backdrop-blur-xl">
            <div className="flex items-center gap-3 flex-1">
              <SidebarTrigger data-testid="button-admin-sidebar-toggle" />
              <div className="relative w-full max-w-md hidden md:block">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن طلب، عميل، منتج..."
                  className="pr-9 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-[#CDEB63]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-destructive"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </Button>
              <Link href="/admin/products/new">
                <Button size="sm" className="bg-[#CDEB63] text-black hover:bg-[#b5d648] gap-2 font-medium" data-testid="button-create-product">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">إنشاء منتج</span>
                </Button>
              </Link>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-8 md:pt-6 bg-muted/5">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
