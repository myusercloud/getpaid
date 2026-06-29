"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { LoginResponse } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await api.post<LoginResponse>("/auth/login", {
        email: form.get("email"),
        password: form.get("password"),
      });
      setUser(res.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">GP</span>
            </div>
            <span className="font-semibold text-gray-900">GETPAID</span>
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-xs text-blue-700">
            <strong>Demo credentials:</strong> demo@getpaid.dev / demo1234
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
            <Input label="Password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">Sign in</Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          No account? <Link href="/register" className="text-blue-600 hover:underline">Create one</Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-4">Educational simulation — no real money</p>
      </div>
    </div>
  );
}
