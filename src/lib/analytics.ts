import { useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const VISITOR_ID_KEY = "fahd_visitor_id";
const SESSION_ID_KEY = "fahd_session_id";

function createAnalyticsId(prefix: "v" | "s") {
  const cryptoValue = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${cryptoValue.replace(/-/g, "").slice(0, 16)}`;
}

function getOrCreateStorageId(storage: Storage, key: string, prefix: "v" | "s") {
  const existing = storage.getItem(key);
  if (existing) return existing;

  const next = createAnalyticsId(prefix);
  storage.setItem(key, next);
  return next;
}

export function getAnalyticsIdentity() {
  return {
    visitorId: getOrCreateStorageId(localStorage, VISITOR_ID_KEY, "v"),
    sessionId: getOrCreateStorageId(sessionStorage, SESSION_ID_KEY, "s"),
  };
}

function getPageMetadata(path: string) {
  const productMatch = path.match(/^\/product\/(\d+)/);
  if (productMatch) return { productId: Number(productMatch[1]) };
  return undefined;
}

export function AnalyticsPageTracker() {
  const [path] = useLocation();

  useEffect(() => {
    if (path.startsWith("/admin")) return;

    const identity = getAnalyticsIdentity();
    apiRequest("POST", "/api/analytics/events", {
      ...identity,
      eventType: "page_view",
      path,
      referrer: document.referrer || undefined,
      metadata: getPageMetadata(path),
    }).catch(() => {
      // Analytics should never block storefront browsing.
    });
  }, [path]);

  return null;
}
