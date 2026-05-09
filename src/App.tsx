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
