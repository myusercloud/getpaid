"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatKES, formatDate, MEMBERSHIP_COST } from "@/lib/shared";
import type { WalletResponse, ActivateMembershipResponse } from "@/lib/types";

export default function WalletPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.get<WalletResponse>("/wallet"),
  });

  const activateMutation = useMutation({
    mutationFn: () => api.post<ActivateMembershipResponse>("/wallet/activate-membership"),
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
          {activateMutation.error && <p className="text-sm text-red-600 mb-3">{activateMutation.error instanceof ApiError ? activateMutation.error.message : "Activation failed"}</p>}
          {activateMutation.isSuccess && <p className="text-sm text-green-600 mb-3">Membership activated! +KES 20 bonus credited.</p>}
          <Button onClick={() => activateMutation.mutate()} loading={activateMutation.isPending} disabled={(wallet?.virtualBalance ?? 0) < MEMBERSHIP_COST}>
            Activate for KES {MEMBERSHIP_COST}
          </Button>
          {(wallet?.virtualBalance ?? 0) < MEMBERSHIP_COST && (
            <p className="text-xs text-red-500 mt-2">Insufficient balance. You need KES {MEMBERSHIP_COST - (wallet?.virtualBalance ?? 0)} more.</p>
          )}
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
