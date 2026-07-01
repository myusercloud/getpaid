"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/shared";
import type { MeResponse } from "@/lib/types";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/auth/me"),
    initialData: user ? { user } as MeResponse : undefined,
  });

  const [nameValue, setNameValue] = useState(data?.user?.name ?? "");
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState("");

  const logoutMutation = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => { setUser(null); window.location.href = "/login"; },
  });

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameError(""); setNameSaved(false);
    if (nameValue.trim().length < 2) { setNameError("Name must be at least 2 characters"); return; }
    try {
      const res = await api.put<MeResponse>("/auth/me", { name: nameValue.trim() });
      setUser(res.user);
      qc.invalidateQueries({ queryKey: ["me"] });
      setNameSaved(true);
    } catch (err) {
      setNameError(err instanceof ApiError ? err.message : "Failed to update name");
    }
  }

  const u = data?.user;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>
        <form onSubmit={saveName} className="space-y-4">
          <Input label="Full Name" value={nameValue} onChange={(e) => setNameValue(e.target.value)} required minLength={2} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{u?.email}</p>
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          {nameError && <p className="text-sm text-red-600">{nameError}</p>}
          {nameSaved && <p className="text-sm text-green-600">Name updated successfully</p>}
          <Button type="submit">Save changes</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Role</span>
            <Badge variant={u?.role === "ADMIN" ? "info" : "secondary"}>{u?.role}</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Referral code</span>
            <span className="font-mono text-gray-800 text-xs bg-gray-100 px-2 py-1 rounded">{u?.referralCode}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-500">Member since</span>
            <span className="text-gray-700">{u?.createdAt ? formatDate(u.createdAt) : "—"}</span>
          </div>
        </div>
      </Card>

      <PhoneVerification phone={u?.phone} phoneVerified={u?.phoneVerified} onVerified={() => qc.invalidateQueries({ queryKey: ["me"] })} />

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-2">Session</h2>
        <p className="text-sm text-gray-500 mb-4">Sign out of your account on this device.</p>
        <Button variant="danger" loading={logoutMutation.isPending} onClick={() => logoutMutation.mutate()}>Sign out</Button>
      </Card>

    </div>
  );
}

function PhoneVerification({ phone, phoneVerified, onVerified }: { phone?: string | null; phoneVerified?: boolean; onVerified: () => void }) {
  type Stage = "idle" | "otp";
  const [stage, setStage] = useState<Stage>("idle");
  const [phoneInput, setPhoneInput] = useState(phone?.replace("+254", "") ?? "");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const requestMutation = useMutation({
    mutationFn: (ph: string) => api.post<{ sent: boolean; devOtp?: string }>("/auth/me/phone/request", { phone: `+254${ph}` }),
    onSuccess: (res) => {
      setStage("otp");
      setDevOtp(res.devOtp ?? null);
      setSecondsLeft(600);
      setError("");
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to send code"),
  });

  const verifyMutation = useMutation({
    mutationFn: (otp: string) => api.post("/auth/me/phone/verify", { otp }),
    onSuccess: () => { onVerified(); setStage("idle"); setDigits(["", "", "", "", "", ""]); setDevOtp(null); },
    onError: (err) => { setError(err instanceof ApiError ? err.message : "Verification failed"); setDigits(["", "", "", "", "", ""]); setTimeout(() => inputRefs.current[0]?.focus(), 80); },
  });

  const handleDigit = useCallback((i: number, val: string) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = d;
    setDigits(next);
    setError("");
    if (d && i < 5) inputRefs.current[i + 1]?.focus();
    if (next.every((x) => x)) verifyMutation.mutate(next.join(""));
  }, [digits, verifyMutation]);

  const handleKeyDown = useCallback((i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }, [digits]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = [...digits];
    pasted.forEach((d, i) => { next[i] = d; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) verifyMutation.mutate(pasted.join(""));
  }, [digits, verifyMutation]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (phoneVerified && phone && stage === "idle") {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Phone number</h2>
            <p className="text-sm text-gray-500 mt-0.5">{phone}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full border border-green-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Verified
            </span>
            <button onClick={() => { setStage("idle"); setPhoneInput(phone.replace("+254", "")); }} className="text-xs text-gray-400 hover:text-gray-600 underline">Change</button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-base font-semibold text-gray-900 mb-1">Phone number</h2>
      <p className="text-sm text-gray-500 mb-4">Required for withdrawals via M-Pesa.</p>

      {stage === "idle" && (
        <form onSubmit={(e) => { e.preventDefault(); if (phoneInput.length === 9) requestMutation.mutate(phoneInput); }} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">M-Pesa number</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium select-none">+254</span>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => { setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 9)); setError(""); }}
                  placeholder="7XXXXXXXX"
                  required
                  className="block w-full pl-14 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={phoneInput.length !== 9 || requestMutation.isPending}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                {requestMutation.isPending ? (
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Sending…</span>
                ) : "Send code"}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}

      {stage === "otp" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Code sent to <strong>+254{phoneInput}</strong></p>
            <span className={`text-xs font-mono font-medium tabular-nums ${secondsLeft < 60 ? "text-red-500" : "text-gray-400"}`}>{fmt(secondsLeft)}</span>
          </div>

          {devOtp && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              Dev mode — your code is <strong className="font-mono tracking-widest">{devOtp}</strong>
            </div>
          )}

          {/* OTP boxes */}
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={verifyMutation.isPending}
                className={`w-11 h-12 text-center text-lg font-bold border-2 rounded-xl transition-all duration-150 focus:outline-none focus:border-blue-500 focus:ring-0 disabled:opacity-50 ${
                  d ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50 text-gray-900"
                } ${error ? "border-red-400 bg-red-50" : ""}`}
              />
            ))}
          </div>

          {verifyMutation.isPending && (
            <p className="text-xs text-center text-blue-600 animate-pulse">Verifying…</p>
          )}
          {error && <p className="text-sm text-center text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <button onClick={() => { setStage("idle"); setDigits(["", "", "", "", "", ""]); setError(""); }} className="text-xs text-gray-400 hover:text-gray-600">
              ← Change number
            </button>
            {secondsLeft === 0 ? (
              <button onClick={() => requestMutation.mutate(phoneInput)} className="text-xs text-blue-600 font-medium hover:underline">
                Resend code
              </button>
            ) : (
              <span className="text-xs text-gray-400">Resend in {fmt(secondsLeft)}</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
