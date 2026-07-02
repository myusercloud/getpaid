"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { LayoutDashboard, Wallet, CheckSquare, Users, Settings, LogOut, Shield } from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet",    label: "Wallet",    icon: Wallet },
  { href: "/tasks",     label: "Tasks",     icon: CheckSquare },
  { href: "/referrals", label: "Referrals", icon: Users },
  { href: "/settings",  label: "Settings",  icon: Settings },
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
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <Image src="/logo.png" alt="GETPAID" width={26} height={26} className="rounded-lg" />
          <span className="font-semibold text-slate-900 tracking-tight">GETPAID</span>
        </Link>

        <nav className="hidden md:flex items-center h-14">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative px-3 h-full flex items-center text-sm transition-colors duration-150",
                  active ? "text-sky-600 font-medium" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-500 rounded-full" />
                )}
              </Link>
            );
          })}
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={cn(
                "relative px-3 h-full flex items-center gap-1.5 text-sm transition-colors duration-150",
                pathname.startsWith("/admin") ? "text-violet-600 font-medium" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
              {pathname.startsWith("/admin") && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-500 rounded-full" />
              )}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[10px]">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <span className="text-sm font-medium text-slate-700 truncate max-w-28">
              {user?.name?.split(" ")[0]}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors duration-150"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200">
      <div className="flex">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors duration-150",
                active ? "text-sky-600" : "text-slate-400 hover:text-slate-700"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
