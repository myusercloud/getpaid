"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/shared";
import type { ReferralsResponse } from "@/lib/types";

export default function ReferralsPage() {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["referrals"], queryFn: () => api.get<ReferralsResponse>("/referrals") });

  const referralLink = data?.referralLink ?? (typeof window !== "undefined" ? `${window.location.origin}/register?ref=${user?.referralCode}` : "");

  function copyLink() { navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  if (isLoading) return <ReferralsSkeleton />;

  const { stats, referrals, leaderboard } = data ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Referrals</h1>
        <p className="text-sm text-gray-500 mt-0.5">Earn KES 50 for each activated referral</p>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-gray-900 mb-3">Your referral link</h2>
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono truncate">{referralLink}</div>
          <Button variant="outline" onClick={copyLink}>{copied ? "Copied!" : "Copy"}</Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Code: <strong className="font-mono text-gray-600">{data?.referralCode ?? user?.referralCode}</strong></p>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center"><p className="text-xs text-gray-500 mb-1">Total</p><p className="text-2xl font-bold text-gray-900">{stats?.totalReferrals ?? 0}</p></Card>
        <Card className="text-center"><p className="text-xs text-gray-500 mb-1">Activated</p><p className="text-2xl font-bold text-green-600">{stats?.activeReferrals ?? 0}</p></Card>
        <Card className="text-center"><p className="text-xs text-gray-500 mb-1">Earned</p><p className="text-2xl font-bold text-gray-900">{formatKES(stats?.totalBonus ?? 0)}</p></Card>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-gray-900 mb-4">Your referrals</h2>
        {referrals && referrals.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {referrals.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div><p className="text-sm text-gray-800">{r.referred.name}</p><p className="text-xs text-gray-400">{r.referred.email}</p></div>
                <Badge variant={r.status === "REWARDED" ? "success" : r.status === "PENDING" ? "warning" : "secondary"}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-400 text-center py-6">No referrals yet — share your link to get started</p>}
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-gray-900 mb-4">Top referrers</h2>
        <ul className="space-y-3">
          {[
            { name: "Alex M.", refs: 24 },
            { name: "Sarah K.", refs: 19 },
            { name: "James O.", refs: 15 },
            { name: "Priya R.", refs: 11 },
            { name: "David N.", refs: 8 },
          ].map((entry, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-200 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0"><p className="text-sm text-gray-800 truncate">{entry.name}</p></div>
              <Badge variant="success">{entry.refs} refs</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ReferralsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32" />
      <div className="h-24 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}</div>
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  );
}
