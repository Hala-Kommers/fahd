import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, setAuthTokens } from "@/lib/queryClient";
import { useLocation } from "wouter";

export interface AdminUser {
  id: number;
  username: string;
  email?: string;
  name?: string;
  role: string;
  createdAt?: string;
}

export function useAuth() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user: AdminUser | null =
    data?.user ??
    data?.data?.user ??
    data?.data ??
    null;

  return {
    user,
    isLoading,
  };
}

export function useLogin() {
  const [, navigate] = useLocation();
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const body = await res.json();
      const source = body?.data ?? body;
      const accessToken = source?.token ?? source?.accessToken ?? source?.tokens?.accessToken;
      const refreshToken = source?.refreshToken ?? source?.tokens?.refreshToken;
      if (accessToken) {
        setAuthTokens(accessToken, refreshToken);
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      navigate("/admin");
    },
  });
}

export function useLogout() {
  const [, navigate] = useLocation();
  return useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem("fahd_refresh_token");
      await apiRequest("POST", "/api/auth/logout", refreshToken ? { refreshToken } : {});
    },
    onSuccess: () => {
      setAuthTokens(null, null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.clear();
      navigate("/admin/login");
    },
  });
}
