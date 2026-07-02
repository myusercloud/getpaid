"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/store/auth";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/tasks", label: "Tasks & Videos" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN")) router.replace("/dashboard");
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" alt="GETPAID" width={26} height={26} className="rounded-lg" />
              <span className="font-semibold text-slate-900 tracking-tight">GETPAID</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-medium text-slate-500">Admin</span>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">← Back to app</Link>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <nav className="w-48 flex-shrink-0">
            <ul className="space-y-1">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === href ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
