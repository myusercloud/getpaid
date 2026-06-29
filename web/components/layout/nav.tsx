"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { LayoutDashboard, Wallet, CheckSquare, Users, Settings, LogOut, Shield } from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  async function handleLogout() {
    try { await api.post("/auth/logout"); } catch {}
    setUser(null);
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">GP</span>
          </div>
          <span className="font-semibold text-gray-900">GETPAID</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={cn("px-3 py-1.5 text-sm rounded-md transition-colors",
                  active ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")}>
                {label}
              </Link>
            );
          })}
          {user?.role === "ADMIN" && (
            <Link href="/admin"
              className={cn("px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1",
                pathname.startsWith("/admin") ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")}>
              <Shield className="w-3.5 h-3.5" />Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:block truncate max-w-40">{user?.name}</span>
          <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="bg-amber-50 border-t border-amber-100 px-4 py-1">
        <p className="text-xs text-amber-700 text-center">Educational simulation — all balances are virtual and have no real monetary value</p>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
      {navLinks.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href}
            className={cn("flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors",
              active ? "text-blue-600" : "text-gray-500 hover:text-gray-800")}>
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
