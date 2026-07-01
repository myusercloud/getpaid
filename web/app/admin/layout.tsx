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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" alt="GETPAID" width={28} height={28} className="rounded-md" />
              <span className="font-semibold text-gray-900">GETPAID</span>
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-medium text-gray-500">Admin</span>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">← Back to app</Link>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <nav className="w-48 flex-shrink-0">
            <ul className="space-y-1">
              {links.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === href ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}>
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
