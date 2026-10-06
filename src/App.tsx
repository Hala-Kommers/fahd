import { lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FahdProvider } from "@/lib/fahd-store";
import OrderSheet from "@/components/OrderSheet";
import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import ProductChatPage from "@/pages/product-chat";
import ChatPage from "@/pages/chat";
import CartPage from "@/pages/cart";
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("@/pages/admin/Dashboard"));
const ProductsPage = lazy(() => import("@/pages/admin/Products"));
const OrdersPage = lazy(() => import("@/pages/admin/Orders"));
const OrderDetails = lazy(() => import("@/pages/admin/OrderDetails"));
const ProductDetails = lazy(() => import("@/pages/admin/ProductDetails"));
const CouponsPage = lazy(() => import("@/pages/admin/Coupons"));
const BotSettings = lazy(() => import("@/pages/admin/Settings"));
const CitiesPage = lazy(() => import("@/pages/admin/Cities"));
const ChatsPage = lazy(() => import("@/pages/admin/Chat"));
const LoginPage = lazy(() => import("@/pages/admin/Login"));
import AdminGuard from "@/components/AdminGuard";
import OrderTrackingPage from "@/pages/order-tracking";
import NotFound from "@/pages/not-found";
import { AnalyticsPageTracker } from "@/lib/analytics";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/chat/product/:id" component={ProductChatPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/order/:id" component={OrderTrackingPage} />

      {/* Admin Login (public) */}
      <Route path="/admin/login" component={LoginPage} />

      {/* Admin Routes (protected) */}
      <Route path="/admin" component={() => <AdminGuard><AdminLayout><Dashboard /></AdminLayout></AdminGuard>} />
      <Route path="/admin/products" component={() => <AdminGuard><AdminLayout><ProductsPage /></AdminLayout></AdminGuard>} />
      <Route path="/admin/products/:id" component={() => <AdminGuard><AdminLayout><ProductDetails /></AdminLayout></AdminGuard>} />
      <Route path="/admin/orders" component={() => <AdminGuard><AdminLayout><OrdersPage /></AdminLayout></AdminGuard>} />
      <Route path="/admin/orders/:id" component={() => <AdminGuard><AdminLayout><OrderDetails /></AdminLayout></AdminGuard>} />
      <Route path="/admin/coupons" component={() => <AdminGuard><AdminLayout><CouponsPage /></AdminLayout></AdminGuard>} />
      <Route path="/admin/chat" component={() => <AdminGuard><AdminLayout><ChatsPage /></AdminLayout></AdminGuard>} />
      <Route path="/admin/settings" component={() => <AdminGuard><AdminLayout><BotSettings /></AdminLayout></AdminGuard>} />
      <Route path="/admin/cities" component={() => <AdminGuard><AdminLayout><CitiesPage /></AdminLayout></AdminGuard>} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [path] = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FahdProvider>
          <AnalyticsPageTracker />
          <div className={path.startsWith('/admin') ? undefined : 'mobile-store'}><Suspense fallback={<p className="p-8 text-center" role="status">جار التحميل…</p>}><Router /></Suspense></div>
          <OrderSheet />
          <Toaster />
        </FahdProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
