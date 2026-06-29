"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKES, formatDate } from "@/lib/shared";
import type { User, Wallet, Membership } from "@/lib/types";

type AdminUser = User & { wallet?: Wallet; membership?: Membership };

export default function AdminUsersPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<AdminUser[]>("/admin/users"),
  });

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-24" />
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <Badge variant="secondary">{data.length} total</Badge>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Member</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Balance</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3"><p className="font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></td>
                <td className="px-4 py-3"><Badge variant={u.role === "ADMIN" ? "info" : "secondary"}>{u.role}</Badge></td>
                <td className="px-4 py-3"><Badge variant={u.membership?.isActive ? "success" : "default"}>{u.membership?.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="px-4 py-3 font-mono text-gray-700">{formatKES(u.wallet?.virtualBalance ?? 0)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No users found</p>}
      </Card>
    </div>
  );
}
