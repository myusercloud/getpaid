"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type Stage = "phone" | "otp" | "success";

export function PhoneVerifyModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && stage !== "success") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, stage]);

  // auto-close after success
  useEffect(() => {
    if (stage !== "success") return;
    const id = setTimeout(onClose, 2600);
    return () => clearTimeout(id);
  }, [stage, onClose]);

  const requestMutation = useMutation({
    mutationFn: (ph: string) =>
      api.post<{ sent: boolean; devOtp?: string }>("/auth/me/phone/request", { phone: `+254${ph}` }),
    onSuccess: (res) => {
      setStage("otp");
      setDevOtp(res.devOtp ?? null);
      setSecondsLeft(600);
      setError("");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to send code"),
  });

  const verifyMutation = useMutation({
    mutationFn: (otp: string) => api.post<{ user: typeof user }>("/auth/me/phone/verify", { otp }),
    onSuccess: (res) => {
      if (res.user) setUser(res.user);
      qc.invalidateQueries({ queryKey: ["me"] });
      setStage("success");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Incorrect code");
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    },
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
    const next = ["", "", "", "", "", ""];
    pasted.forEach((d, i) => { next[i] = d; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) verifyMutation.mutate(pasted.join(""));
  }, [verifyMutation]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={(e) => { if (e.target === e.currentTarget && stage !== "success") onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Phone stage */}
        {stage === "phone" && (
          <div className="p-6">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mx-auto mb-5">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Verify your number</h2>
            <p className="text-sm text-gray-500 text-center mb-6">Enter your M-Pesa number to receive a verification code.</p>

            <form onSubmit={(e) => { e.preventDefault(); if (phoneInput.length === 9) requestMutation.mutate(phoneInput); }} className="space-y-4">
              <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
                <span className="px-3.5 py-3 bg-gray-50 text-sm font-semibold text-gray-600 border-r border-gray-200 select-none">+254</span>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => { setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 9)); setError(""); }}
                  placeholder="7XXXXXXXX"
                  autoFocus
                  className="flex-1 px-3.5 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-white"
                />
              </div>
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <button
                type="submit"
                disabled={phoneInput.length !== 9 || requestMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {requestMutation.isPending ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                ) : "Send code"}
              </button>
            </form>
          </div>
        )}

        {/* OTP stage */}
        {stage === "otp" && (
          <div className="p-6">
            <button onClick={() => { setStage("phone"); setDigits(["", "", "", "", "", ""]); setError(""); }} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mx-auto mb-5">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Enter the code</h2>
            <p className="text-sm text-gray-500 text-center mb-1">Sent to <strong>+254{phoneInput}</strong></p>
            <div className="flex justify-center mb-5">
              <span className={`text-xs font-mono font-semibold tabular-nums ${secondsLeft < 60 ? "text-red-500" : "text-gray-400"}`}>{fmt(secondsLeft)}</span>
            </div>

            {devOtp && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 text-center mb-4">
                Dev — code is <strong className="font-mono tracking-widest">{devOtp}</strong>
              </div>
            )}

            <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
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
                  className={`w-11 h-12 text-center text-xl font-bold border-2 rounded-xl transition-all duration-150 focus:outline-none focus:border-blue-500 disabled:opacity-40 ${
                    d ? "border-blue-400 bg-blue-50 text-blue-700" : "border-gray-200 bg-gray-50"
                  } ${error ? "border-red-400 bg-red-50 text-red-600" : ""}`}
                />
              ))}
            </div>

            {verifyMutation.isPending && (
              <p className="text-xs text-center text-blue-600 animate-pulse mb-2">Verifying…</p>
            )}
            {error && <p className="text-sm text-center text-red-600 mb-2">{error}</p>}

            <div className="flex justify-center">
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

        {/* Success stage */}
        {stage === "success" && (
          <div className="p-8 flex flex-col items-center">
            <div className="relative w-20 h-20 mb-5">
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
              <div className="relative w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  style={{ strokeDasharray: 60, strokeDashoffset: 0, animation: "draw 0.4s ease forwards" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Number verified!</h2>
            <p className="text-sm text-gray-500 text-center">Your M-Pesa number is linked to your account.</p>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm font-medium text-green-700">
              +254{phoneInput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
