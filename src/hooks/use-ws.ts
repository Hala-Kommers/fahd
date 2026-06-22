import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useAdminWebSocket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[ws] Admin WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_order") {
          const order = data.order;
          // Refresh orders list
          queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/overview"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/orders"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics/sales-chart"] });
          // Show toast notification
          toast({
            title: "🛍️ طلب جديد!",
            description: `${order?.customer?.name || "عميل"} — ${order?.totals?.grandTotal || ""} ريال (${order?.orderNumber || order?.id})`,
          });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = (err) => {
      console.warn("[ws] WebSocket error", err);
    };

    ws.onclose = () => {
      console.log("[ws] WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);
}
