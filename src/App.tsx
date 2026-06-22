import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FahdProvider } from "@/lib/fahd-store";
import OrderSheet from "@/components/OrderSheet";
import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import ChatPage from "@/pages/chat";
import CartPage from "@/pages/cart";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import ProductsPage from "@/pages/admin/Products";
import OrdersPage from "@/pages/admin/Orders";
import OrderDetails from "@/pages/admin/OrderDetails";
import ProductDetails from "@/pages/admin/ProductDetails";
import CouponsPage from "@/pages/admin/Coupons";
import BotSettings from "@/pages/admin/Settings";
import ChatsPage from "@/pages/admin/Chat";
import LoginPage from "@/pages/admin/Login";
import AdminGuard from "@/components/AdminGuard";
import OrderTrackingPage from "@/pages/order-tracking";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:id" component={ProductDetail} />
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

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FahdProvider>
          <Router />
          <OrderSheet />
          <Toaster />
        </FahdProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
