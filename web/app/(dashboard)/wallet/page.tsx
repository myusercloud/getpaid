"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatKES, formatDate, MEMBERSHIP_COST } from "@/lib/shared";
import type { WalletResponse, ActivateMembershipResponse } from "@/lib/types";

type SimStep = "idle" | "confirm" | "processing" | "approved" | "activating";

export default function WalletPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.get<WalletResponse>("/wallet"),
  });

  const [simStep, setSimStep] = useState<SimStep>("idle");

  const activateMutation = useMutation({
    mutationFn: () => api.post<ActivateMembershipResponse>("/wallet/activate-membership", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      router.push("/tasks");
    },
  });

  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState("");

  const transferMutation = useMutation({
    mutationFn: (body: { recipientEmail: string; amount: number }) => api.post("/wallet/transfer", body),
    onSuccess: () => {
      setTransferSuccess(`Transferred ${formatKES(parseFloat(transferAmount))} to ${transferTo}`);
      setTransferTo(""); setTransferAmount(""); setTransferError("");
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err) => setTransferError(err instanceof ApiError ? err.message : "Transfer failed"),
  });

  function handleActivateClick() {
    setSimStep("confirm");
  }

  function handleConfirmPayment() {
    setSimStep("processing");
    setTimeout(() => {
      setSimStep("approved");
      setTimeout(() => {
        setSimStep("activating");
        activateMutation.mutate();
      }, 1800);
    }, 2200);
  }

  function handleCancelSim() {
    setSimStep("idle");
  }

  if (isLoading) return <WalletSkeleton />;

  const { wallet, membership, transactions } = data ?? {};

  function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTransferError(""); setTransferSuccess("");
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount < 10) { setTransferError("Minimum transfer is KES 10"); return; }
    transferMutation.mutate({ recipientEmail: transferTo, amount });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Wallet</h1>

      <div className="bg-blue-600 rounded-2xl p-6 text-white">
        <p className="text-sm text-blue-200 mb-1">Virtual balance</p>
        <p className="text-4xl font-bold mb-0.5">{formatKES(wallet?.virtualBalance ?? 0)}</p>
        <p className="text-xs text-blue-300">KES · Educational simulation</p>
        <div className="mt-4 pt-4 border-t border-blue-500 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${membership?.isActive ? "bg-green-400" : "bg-amber-400"}`} />
          <p className="text-sm text-blue-100">{membership?.isActive ? "GETPAID Member" : "Membership not activated"}</p>
        </div>
      </div>

      {!membership?.isActive && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Activate Membership</h2>
          <p className="text-sm text-gray-500 mb-4">Costs KES {MEMBERSHIP_COST} virtual credits. You&apos;ll receive a KES 20 bonus upon activation.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-700">
            This deducts KES {MEMBERSHIP_COST} from your virtual balance. No real payment is made.
          </div>
          {activateMutation.error && simStep === "idle" && (
            <p className="text-sm text-red-600 mb-3">{activateMutation.error instanceof ApiError ? activateMutation.error.message : "Activation failed"}</p>
          )}
          <Button onClick={handleActivateClick}>
            Activate for KES {MEMBERSHIP_COST}
          </Button>
        </Card>
      )}

      {membership?.isActive && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Transfer Credits</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-700">Virtual credits only — no real money transferred.</div>
          <form onSubmit={handleTransfer} className="space-y-3">
            <Input label="Recipient email" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} placeholder="user@example.com" type="email" required />
            <Input label="Amount (KES)" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="10" type="number" min="10" required />
            {transferError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{transferError}</p>}
            {transferSuccess && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{transferSuccess}</p>}
            <Button type="submit" loading={transferMutation.isPending}>Transfer</Button>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Transaction history</h2>
        {transactions && transactions.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <li key={tx.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">{tx.description ?? tx.type}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                    <Badge variant={tx.amount > 0 ? "success" : "danger"} className="text-xs px-1.5 py-0">{tx.type}</Badge>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {tx.amount > 0 ? "+" : ""}{formatKES(tx.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-400 text-center py-6">No transactions yet</p>}
      </Card>

      {simStep !== "idle" && (
        <PaymentSimModal
          step={simStep}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelSim}
          error={activateMutation.error instanceof ApiError ? activateMutation.error.message : activateMutation.error ? "Activation failed" : null}
        />
      )}
    </div>
  );
}

function PaymentSimModal({
  step,
  onConfirm,
  onCancel,
  error,
}: {
  step: SimStep;
  onConfirm: () => void;
  onCancel: () => void;
  error: string | null;
}) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (step !== "processing" && step !== "activating") return;
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(id);
  }, [step]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {step === "confirm" && (
          <div className="p-6">
            <div className="flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Confirm Payment</h2>
            <p className="text-sm text-gray-500 text-center mb-6">Educational simulation — no real money is charged</p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Membership activation</span>
                <span className="font-semibold text-gray-900">KES {MEMBERSHIP_COST}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Activation bonus</span>
                <span className="font-semibold text-green-600">+ KES 20</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold">
                <span className="text-gray-700">Net deduction</span>
                <span className="text-gray-900">KES 130</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={onConfirm}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Pay KES {MEMBERSHIP_COST}
              </button>
              <button
                onClick={onCancel}
                className="w-full text-gray-500 hover:text-gray-700 font-medium py-2 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="p-8 flex flex-col items-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Processing payment{dots}</h2>
            <p className="text-sm text-gray-500 text-center mb-6">Verifying transaction security</p>

            <div className="w-full space-y-3">
              <ProcessingStep label="Authenticating account" done />
              <ProcessingStep label="Verifying virtual funds" done={dots.length >= 2} />
              <ProcessingStep label="Processing payment" done={dots.length >= 3} />
            </div>
          </div>
        )}

        {step === "approved" && (
          <div className="p-8 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-bounce">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Approved!</h2>
            <p className="text-sm text-gray-500 mb-4">KES {MEMBERSHIP_COST} deducted from your virtual wallet</p>
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center w-full">
              <p className="text-sm font-semibold text-green-700">+ KES 20 activation bonus</p>
              <p className="text-xs text-green-600 mt-0.5">Credited to your account</p>
            </div>
            <p className="text-xs text-gray-400 mt-5 animate-pulse">Activating membership{dots}</p>
          </div>
        )}

        {step === "activating" && (
          <div className="p-8 flex flex-col items-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Activating membership{dots}</h2>
            <p className="text-sm text-gray-500">Setting up your account</p>
            {error && (
              <div className="mt-4 w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProcessingStep({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${done ? "bg-green-500" : "bg-gray-200"}`}>
        {done ? (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className="w-2 h-2 rounded-full bg-gray-400" />
        )}
      </div>
      <span className={`text-sm transition-colors duration-500 ${done ? "text-gray-800 font-medium" : "text-gray-400"}`}>{label}</span>
    </div>
  );
}

function WalletSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32" />
      <div className="h-36 bg-gray-200 rounded-2xl" />
      <div className="h-40 bg-gray-200 rounded-xl" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  );
}
