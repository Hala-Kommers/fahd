import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export interface AdminUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  createdAt: string;
}

export function useAuth() {
  const { data, isLoading } = useQuery<{ user: AdminUser } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: data?.user ?? null,
    isLoading,
  };
}

export function useLogin() {
  const [, navigate] = useLocation();
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "فشل تسجيل الدخول");
      }
      return res.json();
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
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.clear();
      navigate("/admin/login");
    },
  });
}
