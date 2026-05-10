import { QueryClient, type QueryFunction } from "@tanstack/react-query";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
const ACCESS_TOKEN_KEY = "fahd_access_token";
const REFRESH_TOKEN_KEY = "fahd_refresh_token";

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken?: string | null, refreshToken?: string | null) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);

  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function toAbsoluteUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function buildHeaders(data?: unknown) {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (data !== undefined) headers["Content-Type"] = "application/json";
  return headers;
}

async function tryRefreshToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const refreshRes = await fetch(toAbsoluteUrl("/api/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!refreshRes.ok) {
    setAuthTokens(null, null);
    return false;
  }

  const refreshData = await refreshRes.json();
  const nextAccessToken = refreshData?.accessToken ?? refreshData?.tokens?.accessToken;
  const nextRefreshToken = refreshData?.refreshToken ?? refreshData?.tokens?.refreshToken ?? refreshToken;
  setAuthTokens(nextAccessToken, nextRefreshToken);
  return !!nextAccessToken;
}

async function fetchWithAuth(method: string, url: string, data?: unknown, retry = true) {
  const res = await fetch(toAbsoluteUrl(url), {
    method,
    headers: buildHeaders(data),
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

  if (res.status !== 401 || !retry) return res;

  const refreshed = await tryRefreshToken();
  if (!refreshed) return res;

  return fetchWithAuth(method, url, data, false);
}

function normalizeApiData(path: string, payload: unknown) {
  const data = payload as any;
  if (path === "/api/products" || path === "/api/admin/products") {
    return data?.items ?? data?.data ?? data?.results ?? payload;
  }
  if (path === "/api/categories") {
    return data?.items ?? data?.data ?? payload;
  }
  if (path.startsWith("/api/products/") || path.startsWith("/api/admin/products/")) {
    return data?.item ?? data?.data ?? data?.product ?? payload;
  }
  return payload;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText || "Request failed";

    try {
      const data = await res.clone().json();
      errorMessage = data?.error || data?.message || data?.details || errorMessage;
    } catch {
      const text = await res.text();
      if (text) errorMessage = text;
    }

    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetchWithAuth(method, url, data);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const queryPath = queryKey.join("/") as string;
    const res = await fetchWithAuth("GET", queryPath);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const payload = await res.json();
    return normalizeApiData(queryPath.split("?")[0], payload);
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
