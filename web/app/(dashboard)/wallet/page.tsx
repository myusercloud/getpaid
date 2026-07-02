"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatKES, formatDate, MEMBERSHIP_COST } from "@/lib/shared";
import type { WalletResponse, StkPushResponse, StkStatusResponse } from "@/lib/types";

type Tab = "overview" | "withdraw";
type ModalStage = "phone" | "pushing" | "waiting" | "success" | "failed";

export default function WalletPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.get<WalletResponse>("/wallet"),
  });

  const [tab, setTab] = useState<Tab>("overview");
  const [modalOpen, setModalOpen] = useState(false);

  function openActivate() { setModalOpen(true); }
  function closeModal() {
    setModalOpen(false);
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  if (isLoading) return <WalletSkeleton />;
  const { wallet, membership, transactions } = data ?? {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Wallet</h1>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-sky-600 to-sky-700 rounded-lg p-6 text-white">
        <p className="text-sm text-sky-200 mb-1">Balance</p>
        <p className="text-4xl font-bold mb-0.5 tracking-tight">{formatKES(wallet?.virtualBalance ?? 0)}</p>
        <p className="text-xs text-sky-300">KES</p>
        <div className="mt-4 pt-4 border-t border-sky-500/50 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${membership?.isActive ? "bg-emerald-400" : "bg-amber-400"}`} />
          <p className="text-sm text-sky-100">{membership?.isActive ? "GETPAID Member" : "Membership not activated"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {(["overview", "withdraw"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? "border-sky-500 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          {!membership?.isActive && (
            <Card>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-slate-900">Activate Membership</h2>
                  <p className="text-sm text-slate-500 mt-0.5 mb-4">Pay KES {MEMBERSHIP_COST} via M-Pesa to unlock tasks and earn. You get a KES 20 bonus instantly.</p>
                  <Button onClick={openActivate} className="bg-green-600 hover:bg-green-700">
                    Pay with M-Pesa — KES {MEMBERSHIP_COST}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Transaction history</h2>
            {transactions && transactions.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <li key={tx.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-800">{tx.description ?? tx.type}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-400">{formatDate(tx.createdAt)}</p>
                        <Badge variant={tx.amount > 0 ? "success" : "danger"} className="text-xs px-1.5 py-0">{tx.type}</Badge>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${tx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {tx.amount > 0 ? "+" : ""}{formatKES(tx.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-400 text-center py-6">No transactions yet</p>}
          </Card>
        </>
      )}

      {tab === "withdraw" && (
        <WithdrawTab balance={wallet?.virtualBalance ?? 0} isActivated={!!membership?.isActive} />
      )}

      {modalOpen && <StkPushModal onClose={closeModal} />}
    </div>
  );
}

// ─── STK Push Modal ───────────────────────────────────────────────────────────
function StkPushModal({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<ModalStage>("phone");
  const [phone, setPhone] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [simMode, setSimMode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isVibrating, setIsVibrating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (stage !== "waiting") return;
    const id = setInterval(() => {
      setIsVibrating(true);
      setTimeout(() => setIsVibrating(false), 500);
    }, 4000);
    setIsVibrating(true);
    setTimeout(() => setIsVibrating(false), 500);
    return () => clearInterval(id);
  }, [stage]);

  function startPolling(id: string) {
    let secs = 60;
    setSecondsLeft(60);

    countdownRef.current = setInterval(() => {
      secs -= 1;
      setSecondsLeft(secs);
      if (secs <= 0) {
        clearTimers();
        setStage("failed");
        setErrorMsg("Payment timed out. Please try again.");
      }
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get<StkStatusResponse>(`/wallet/mpesa/status/${id}`);
        if (res.status === "SUCCESS") {
          clearTimers();
          setStage("success");
        } else if (res.status === "FAILED") {
          clearTimers();
          setStage("failed");
          setErrorMsg(res.resultDesc ?? "Payment was declined or cancelled.");
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 3000);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStage("pushing");
    try {
      const res = await api.post<StkPushResponse>("/wallet/stk-push", { phone: `+254${phone}` });
      setCheckoutId(res.checkoutRequestId);
      setSimMode(res.simMode);
      setStage("waiting");
      startPolling(res.checkoutRequestId);
    } catch (err) {
      setStage("failed");
      setErrorMsg(err instanceof ApiError ? err.message : "Failed to send STK push. Try again.");
    }
  }

  function handleRetry() {
    clearTimers();
    setStage("phone");
    setErrorMsg("");
    setCheckoutId("");
  }

  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference * (1 - secondsLeft / 60);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-sm rounded-t-xl sm:rounded-xl shadow-2xl overflow-hidden">

        {/* ── Phone input ── */}
        {stage === "phone" && (
          <div>
            <div className="bg-gradient-to-br from-green-500 to-green-700 px-6 pt-8 pb-10 text-white text-center relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-white/5" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xl font-bold">M-Pesa Payment</p>
                <p className="text-green-100 text-sm mt-0.5">KES {MEMBERSHIP_COST} · Membership activation</p>
              </div>
            </div>

            <form onSubmit={handleSend} className="px-6 py-6 space-y-5 -mt-4">
              <div className="bg-white rounded-lg shadow-md p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">M-Pesa Number</label>
                  <div className="flex items-center border-2 border-slate-200 rounded-md overflow-hidden focus-within:border-green-500 transition-colors">
                    <span className="px-3 py-3 bg-slate-50 text-sm font-semibold text-slate-600 border-r border-slate-200 select-none">+254</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                      placeholder="7XXXXXXXX"
                      required
                      pattern="\d{9}"
                      className="flex-1 px-3 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none bg-white"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">A payment prompt will be sent to this number</p>
                </div>

                <div className="bg-green-50 rounded-md p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Membership activation</span>
                    <span className="font-semibold text-slate-900">KES {MEMBERSHIP_COST}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Bonus credited</span>
                    <span className="font-semibold text-green-600">+ KES 20</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={phone.length !== 9}
                className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-md transition-all duration-150 text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Send STK Push
              </button>
              <button type="button" onClick={onClose} className="w-full text-slate-400 hover:text-slate-600 text-sm py-1 transition-colors">
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* ── Pushing / Sending ── */}
        {stage === "pushing" && (
          <div className="px-6 py-12 flex flex-col items-center">
            <div className="relative w-24 h-24 mb-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-green-400 animate-ripple-out"
                  style={{ animationDelay: `${i * 0.6}s` }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-end gap-1 mb-5">
              {[3, 5, 7, 9, 11].map((h, i) => (
                <div
                  key={i}
                  className="w-2 bg-green-500 rounded-[2px] origin-bottom"
                  style={{
                    height: `${h * 3}px`,
                    animation: `signal-rise 0.6s ease-out ${i * 0.12}s both`,
                  }}
                />
              ))}
            </div>

            <p className="text-base font-semibold text-slate-800 mb-1">Sending to your phone</p>
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-green-500 rounded-full animate-pulse-dot"
                  style={{ animationDelay: `${i * 0.25}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Waiting for PIN ── */}
        {stage === "waiting" && (
          <div className="px-6 py-8 flex flex-col items-center">
            <div className="relative w-32 h-32 mb-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-green-300 animate-ripple-out"
                  style={{ animationDelay: `${i * 0.7}s` }}
                />
              ))}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-transform ${isVibrating ? "animate-phone-vibrate" : ""}`}
              >
                <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-200">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-badge-pop">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
              </div>
            </div>

            <p className="text-base font-bold text-slate-900 mb-1">Check your phone</p>
            <p className="text-sm text-slate-500 text-center mb-1">
              STK push sent to <strong className="text-slate-700">+254{phone}</strong>
            </p>
            <p className="text-sm text-slate-400 text-center mb-6">Enter your M-Pesa PIN to complete payment</p>

            {simMode && (
              <div className="w-full bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5 mb-4 text-center">
                <p className="text-xs text-amber-700 font-medium">Simulation mode — auto-completing in a moment</p>
              </div>
            )}

            <div className="relative w-16 h-16 mb-6">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  stroke={secondsLeft > 20 ? "#16a34a" : secondsLeft > 10 ? "#d97706" : "#dc2626"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold tabular-nums ${secondsLeft <= 10 ? "text-red-600" : "text-slate-700"}`}>
                  {secondsLeft}
                </span>
              </div>
            </div>

            <div className="w-full space-y-2.5 mb-6">
              <Step n={1} text="Open the M-Pesa notification" done />
              <Step n={2} text="Enter your M-Pesa PIN" done={false} />
              <Step n={3} text="Confirm payment of KES 150" done={false} />
            </div>

            <button onClick={() => { clearTimers(); onClose(); }} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Cancel payment
            </button>
          </div>
        )}

        {/* ── Success ── */}
        {stage === "success" && (
          <SuccessStage onClose={onClose} phone={phone} />
        )}

        {/* ── Failed ── */}
        {stage === "failed" && (
          <div className="px-6 py-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-5 animate-burst-scale">
              <svg className="w-9 h-9 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-bold text-slate-900 mb-1">Payment failed</p>
            <p className="text-sm text-slate-500 text-center mb-6">{errorMsg}</p>
            <button
              onClick={handleRetry}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-md text-sm transition-colors mb-2"
            >
              Try again
            </button>
            <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessStage({ onClose, phone }: { onClose: () => void; phone: string }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  const confettiItems = [
    { cx: "-60px", cy: "-70px", cr: "-30deg", color: "#16a34a", delay: "0s" },
    { cx: "60px",  cy: "-70px", cr: "30deg",  color: "#2563eb", delay: "0.05s" },
    { cx: "-80px", cy: "0px",   cr: "-45deg", color: "#d97706", delay: "0.1s" },
    { cx: "80px",  cy: "0px",   cr: "45deg",  color: "#dc2626", delay: "0.08s" },
    { cx: "-50px", cy: "60px",  cr: "20deg",  color: "#7c3aed", delay: "0.12s" },
    { cx: "50px",  cy: "60px",  cr: "-20deg", color: "#0891b2", delay: "0.06s" },
    { cx: "0px",   cy: "-85px", cr: "0deg",   color: "#16a34a", delay: "0.15s" },
    { cx: "0px",   cy: "80px",  cr: "0deg",   color: "#2563eb", delay: "0.03s" },
  ];

  return (
    <div className="px-6 py-12 flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {confettiItems.map((c, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-sm"
            style={{
              backgroundColor: c.color,
              // @ts-expect-error css custom properties
              "--cx": c.cx, "--cy": c.cy, "--cr": c.cr,
              animation: `confetti-fly 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${c.delay} both`,
            }}
          />
        ))}
      </div>

      <div className="relative w-24 h-24 mb-6">
        <div className="w-24 h-24 bg-green-100 rounded-full animate-burst-scale" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
            <path
              d="M12 25l8 8 16-16"
              stroke="#16a34a"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40"
              strokeDashoffset="40"
              style={{ animation: "check-draw 0.4s ease-out 0.3s forwards" }}
            />
          </svg>
        </div>
      </div>

      <div className="text-center animate-slide-up-fade" style={{ animationDelay: "0.35s", opacity: 0 }}>
        <p className="text-2xl font-bold text-slate-900">Payment confirmed!</p>
        <p className="text-sm text-slate-500 mt-1">KES 150 · M-Pesa · +254{phone}</p>
      </div>

      <div
        className="mt-5 bg-green-50 border border-green-200 rounded-lg px-6 py-4 text-center w-full animate-slide-up-fade"
        style={{ animationDelay: "0.55s", opacity: 0 }}
      >
        <p className="text-base font-bold text-green-700">Welcome to GETPAID!</p>
        <p className="text-sm text-green-600 mt-0.5">+ KES 20 bonus credited · Membership active</p>
      </div>
    </div>
  );
}

function Step({ n, text, done }: { n: number; text: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all duration-500 ${done ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"}`}>
        {done ? (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : n}
      </div>
      <span className={`text-sm transition-colors duration-500 ${done ? "text-slate-800 font-medium" : "text-slate-400"}`}>{text}</span>
    </div>
  );
}

// ─── Withdraw tab ─────────────────────────────────────────────────────────────
function WithdrawTab({ balance, isActivated }: { balance: number; isActivated: boolean }) {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isActivated) {
    return (
      <Card className="text-center py-10">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700">Activate your membership to withdraw</p>
        <p className="text-xs text-slate-400 mt-1">Withdrawals are available to active members only.</p>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="text-center py-10">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-900">Request received</p>
        <p className="text-sm text-slate-500 mt-1">Processing withdrawal to <strong>+254{phone}</strong>.</p>
        <button onClick={() => { setSubmitted(false); setPhone(""); setAmount(""); }} className="mt-5 text-sm text-sky-600 font-medium hover:underline">
          Make another request
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-base font-semibold text-slate-900 mb-1">Withdraw</h2>
      <p className="text-sm text-slate-500 mb-5">Enter your M-Pesa number to withdraw your earnings.</p>
      <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">M-Pesa phone number</label>
          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 transition-colors">
            <span className="px-3 py-2.5 bg-slate-50 text-sm text-slate-500 font-medium border-r border-slate-300 select-none">+254</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="7XXXXXXXX"
              required
              pattern="\d{9}"
              className="flex-1 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Amount (KES)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            min="10"
            max={balance}
            required
            className="block w-full px-4 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
          />
          <p className="text-xs text-slate-400">Available: {formatKES(balance)}</p>
        </div>
        <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2.5 rounded-md transition-colors text-sm">
          Request withdrawal
        </button>
      </form>
    </Card>
  );
}

function WalletSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-32" />
      <div className="h-36 bg-slate-200 rounded-lg" />
      <div className="h-40 bg-slate-200 rounded-lg" />
      <div className="h-64 bg-slate-200 rounded-lg" />
    </div>
  );
}
