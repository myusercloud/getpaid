"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { formatKES, formatDate } from "@/lib/shared";
import type { AdminStatsResponse } from "@/lib/types";

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<AdminStatsResponse>("/admin/stats"),
    refetchInterval: 30_000,
  });

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}</div>
      <div className="grid md:grid-cols-2 gap-6"><div className="h-48 bg-gray-200 rounded-xl" /><div className="h-48 bg-gray-200 rounded-xl" /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Admin Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center"><p className="text-xs text-gray-500 mb-1">Total Users</p><p className="text-2xl font-bold text-gray-900">{data?.totalUsers ?? 0}</p></Card>
        <Card className="text-center"><p className="text-xs text-gray-500 mb-1">Active Members</p><p className="text-2xl font-bold text-blue-600">{data?.activeMembers ?? 0}</p></Card>
        <Card className="text-center"><p className="text-xs text-gray-500 mb-1">Tasks Today</p><p className="text-2xl font-bold text-gray-900">{data?.tasksCompletedToday ?? 0}</p></Card>
        <Card className="text-center"><p className="text-xs text-gray-500 mb-1">Total Virtual KES</p><p className="text-2xl font-bold text-gray-900">{formatKES(data?.totalVirtualKES ?? 0)}</p></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-sm font-medium text-gray-900 mb-4">Recent transactions</h2>
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {data.recentTransactions.map((tx) => (
                <li key={tx.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-800">{tx.description ?? tx.type}</p>
                    <p className="text-xs text-gray-400">{tx.userName} · {formatDate(tx.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-semibold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                    {tx.amount > 0 ? "+" : ""}{formatKES(tx.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>}
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-gray-900 mb-4">Top earners</h2>
          {data?.topEarners && data.topEarners.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {data.topEarners.map((u, i) => (
                <li key={u.id} className="py-2 flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0"><p className="text-sm text-gray-800 truncate">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div>
                  <span className="text-sm font-medium text-gray-700">{formatKES(u.totalEarned)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-400 text-center py-4">No data yet</p>}
        </Card>
      </div>
    </div>
  );
}
