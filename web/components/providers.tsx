"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import type { MeResponse } from "@/lib/types";

export function Providers({ children }: { children: React.ReactNode }) {
  const { setUser } = useAuthStore();

  useEffect(() => {
    api.get<MeResponse>("/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => setUser(null));
  }, [setUser]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
