"use client";
import { useState } from "react";
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
      <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Settings</h1>

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Profile</h2>
        <form onSubmit={saveName} className="space-y-4">
          <Input label="Full Name" value={nameValue} onChange={(e) => setNameValue(e.target.value)} required minLength={2} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5">{u?.email}</p>
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
          </div>
          {nameError && <p className="text-sm text-red-600">{nameError}</p>}
          {nameSaved && <p className="text-sm text-emerald-600">Name updated successfully</p>}
          <Button type="submit">Save changes</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Role</span>
            <Badge variant={u?.role === "ADMIN" ? "info" : "secondary"}>{u?.role}</Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Referral code</span>
            <span className="font-mono text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded-sm">{u?.referralCode}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Member since</span>
            <span className="text-slate-700">{u?.createdAt ? formatDate(u.createdAt) : "—"}</span>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-2">Session</h2>
        <p className="text-sm text-slate-500 mb-4">Sign out of your account on this device.</p>
        <Button variant="danger" loading={logoutMutation.isPending} onClick={() => logoutMutation.mutate()}>Sign out</Button>
      </Card>
    </div>
  );
}
