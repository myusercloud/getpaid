"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Tag, ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import type { RegisterResponse } from "@/lib/types";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const pw = form.get("password") as string;
    const confirm = form.get("confirmPassword") as string;
    if (pw !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.post<RegisterResponse>("/auth/register", {
        name: form.get("name"),
        email: form.get("email"),
        password: pw,
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center mb-6">
            <Image src="/logo-hero.png" alt="GETPAID" width={140} height={56} />
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create your account</h1>
          <p className="text-slate-500 mt-1.5">Join the GETPAID community</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-5">

            <Input
              name="name"
              type="text"
              label="Full name"
              placeholder="Enter your full names"
              startIcon={<User className="w-4 h-4" />}
              required
              minLength={2}
            />

            <Input
              name="email"
              type="email"
              label="Email address"
              placeholder="Enter your email address"
              startIcon={<Mail className="w-4 h-4" />}
              required
              autoComplete="email"
            />

            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="Choose a strong password"
              startIcon={<Lock className="w-4 h-4" />}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
              minLength={8}
              autoComplete="new-password"
            />

            <Input
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              label="Confirm password"
              placeholder="••••••••"
              startIcon={<Lock className="w-4 h-4" />}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
              autoComplete="new-password"
            />

            <Input
              name="referralCode"
              type="text"
              label={<>Referral code <span className="text-slate-400 font-normal">(optional)</span></>}
              placeholder="Enter code"
              defaultValue={params.get("ref") ?? ""}
              maxLength={12}
              startIcon={<Tag className="w-4 h-4" />}
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-md transition-colors mt-1"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>Create account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-sky-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>;
}
