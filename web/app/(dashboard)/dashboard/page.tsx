"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatKES, formatDate, DAILY_TASK_LIMIT } from "@/lib/shared";
import Link from "next/link";
import type { DashboardResponse } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardResponse>("/tasks/dashboard"),
    refetchInterval: 60_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  const { wallet, membership, stats, recentActivity, notifications } = data ?? {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Good day, {user?.name?.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500 mt-0.5">Here&apos;s your overview</p>
      </div>

      {!membership?.isActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-amber-600 mt-0.5 text-base">⚠</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Membership not activated</p>
            <p className="text-xs text-amber-600 mt-0.5">Activate your GETPAID membership (KES 150) to unlock tasks and video rewards.</p>
            <Link href="/wallet" className="text-xs font-medium text-amber-700 underline mt-1 inline-block">Activate now →</Link>
          </div>
        </div>
      )}

      {/* Stat cards with accent top border */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Balance",      value: formatKES(wallet?.virtualBalance ?? 0), sub: "KES" },
          { label: "Tasks Today",  value: String(stats?.tasksCompletedToday ?? 0), sub: `of ${DAILY_TASK_LIMIT}` },
          { label: "Total Earned", value: formatKES(wallet?.totalEarned ?? 0),     sub: "KES" },
          { label: "Referrals",    value: String(stats?.totalReferrals ?? 0),       sub: "activated" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white border border-slate-200 border-t-2 border-t-sky-500 rounded-2xl shadow-card p-5 text-center">
            <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-900">Daily task progress</h2>
          <Badge variant={stats?.tasksCompletedToday === DAILY_TASK_LIMIT ? "danger" : "default"}>
            {stats?.tasksCompletedToday ?? 0}/{DAILY_TASK_LIMIT}
          </Badge>
        </div>
        <Progress value={((stats?.tasksCompletedToday ?? 0) / DAILY_TASK_LIMIT) * 100} label={`${DAILY_TASK_LIMIT - (stats?.tasksCompletedToday ?? 0)} tasks remaining today`} />
        <Link href="/tasks" className="text-xs text-sky-600 font-medium hover:underline mt-4 block">Go to tasks →</Link>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-sm font-medium text-slate-900 mb-4">Recent activity</h2>
          {recentActivity && recentActivity.length > 0 ? (
            <ul className="space-y-3">
              {recentActivity.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-800">{tx.description ?? tx.type}</p>
                    <p className="text-xs text-slate-400">{formatDate(tx.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-semibold ${tx.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {tx.amount > 0 ? "+" : ""}{formatKES(tx.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400 text-center py-4">No activity yet</p>}
          <Link href="/wallet" className="text-xs text-sky-600 font-medium hover:underline mt-4 block">View all →</Link>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-900">Notifications</h2>
            {notifications && notifications.length > 0 && <Badge variant="info">{notifications.length} new</Badge>}
          </div>
          {notifications && notifications.length > 0 ? (
            <ul className="space-y-3">
              {notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-600">{n.message}</p>
                    <p className="text-xs text-slate-400">{formatDate(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-400 text-center py-4">You&apos;re all caught up</p>}
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
      </div>
      <div className="h-28 bg-slate-200 rounded-2xl" />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-48 bg-slate-200 rounded-2xl" />
        <div className="h-48 bg-slate-200 rounded-2xl" />
      </div>
    </div>
  );
}
