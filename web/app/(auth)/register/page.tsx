"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import type { RegisterResponse } from "@/lib/types";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const password = form.get("password") as string;
    const confirm = form.get("confirmPassword") as string;
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post<RegisterResponse>("/auth/register", {
        name: form.get("name"),
        email: form.get("email"),
        password,
        confirmPassword: confirm,
        referralCode: form.get("referralCode") || undefined,
      });
      router.replace("/login?registered=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
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
          <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Join the GETPAID simulation</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" name="name" placeholder="Jane Doe" required minLength={2} />
            <Input label="Email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
            <Input label="Password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
            <Input label="Confirm Password" name="confirmPassword" type="password" placeholder="••••••••" required autoComplete="new-password" />
            <Input label="Referral Code" name="referralCode" placeholder="Optional" defaultValue={params.get("ref") ?? ""} maxLength={12} hint="Enter a referral code if you have one" />
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">Create account</Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
        <p className="text-center text-xs text-gray-400 mt-4">Educational simulation — no real money, no real financial services</p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
