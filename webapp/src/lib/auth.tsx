import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import type { SessionUser } from "./types";

const ME_KEY = ["auth", "me"];

// Current session user. null when not logged in.
export function useAuth() {
  const query = useQuery<SessionUser | null>({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        return await api.get<SessionUser>("/api/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 1000 * 60,
    retry: false,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    isAdmin: query.data?.role === "ADMIN",
  };
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { username: string; pin: string }) =>
      api.post<SessionUser>("/api/auth/login", vars),
    onSuccess: (user) => {
      qc.setQueryData(ME_KEY, user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/auth/logout", {}),
    onSuccess: () => {
      qc.setQueryData(ME_KEY, null);
      qc.clear();
    },
  });
}
