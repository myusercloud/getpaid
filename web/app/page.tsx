import Link from "next/link";
import Image from "next/image";
import { Play, CheckSquare, Users, Wallet, Zap, BarChart2 } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const features = [
  { icon: Play,        color: "sky",    title: "Video Rewards",    desc: "Watch YouTube videos and earn credits automatically when you reach the end." },
  { icon: CheckSquare, color: "emerald",title: "Daily Tasks",      desc: "Complete up to 5 daily tasks with cooldowns. Every action earns straight to your wallet." },
  { icon: Users,       color: "violet", title: "Referral System",  desc: "Share your unique link and earn KES 50 for every friend who activates their membership." },
  { icon: Wallet,      color: "amber",  title: "Real-time Wallet", desc: "Track your balance, transaction history, and pending rewards in one clean dashboard." },
  { icon: Zap,         color: "sky",    title: "Fast Activation",  desc: "One-time KES 150 M-Pesa payment unlocks full earning potential plus a KES 20 bonus instantly." },
  { icon: BarChart2,   color: "slate",  title: "Admin Panel",      desc: "Full control over users, tasks, videos, and platform analytics for administrators." },
];

const iconColors: Record<string, string> = {
  sky:    "bg-sky-50 text-sky-600",
  emerald:"bg-emerald-50 text-emerald-600",
  violet: "bg-violet-50 text-violet-600",
  amber:  "bg-amber-50 text-amber-600",
  slate:  "bg-slate-100 text-slate-600",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="GETPAID" width={26} height={26} className="rounded-lg" />
            <span className="font-semibold text-slate-900 tracking-tight">GETPAID</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="text-sm text-white bg-sky-500 hover:bg-sky-600 px-4 py-1.5 rounded-md transition-colors font-medium">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-24 text-center">
        <p className="inline-flex items-center text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
          AI Work Platform
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-5 leading-[1.1] tracking-tight">
          Complete tasks.{" "}
          <span className="text-sky-500">Get paid.</span>
        </h1>
        <p className="text-lg text-slate-500 mb-8 max-w-xl mx-auto leading-relaxed">
          Watch videos, complete daily tasks, and refer friends — every action earns credits straight to your wallet.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <Link href="/register" className="inline-flex items-center justify-center text-white bg-sky-500 hover:bg-sky-600 px-8 py-3 rounded-md font-semibold transition-colors shadow-sm">
            Start earning free
          </Link>
          <Link href="/login" className="inline-flex items-center justify-center text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 px-8 py-3 rounded-md font-medium transition-colors">
            Sign in
          </Link>
        </div>

        {/* Stats divider */}
        <div className="flex items-center justify-center flex-wrap divide-x divide-slate-200">
          {[
            { stat: "Earn",  label: "per task" },
            { stat: "Earn extra", label: "per referral" },
          ].map(({ stat, label }) => (
            <div key={label} className="px-8 first:pl-0 last:pr-0 text-center">
              <p className="text-xl font-bold text-slate-900">{stat}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2 tracking-tight">Everything in one platform</h2>
          <p className="text-slate-500 text-center mb-12 text-sm">Six ways to grow your balance — every session counts.</p>
          <ScrollReveal stagger className="grid md:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, color, title, desc }) => (
              <div key={title}>
                <div className="h-full bg-white border border-slate-200 rounded-lg p-5 card-lift">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${iconColors[color]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1.5 text-sm tracking-tight">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* Membership */}
      <section className="max-w-sm mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">One membership, all access</h2>
          <p className="text-sm text-slate-500 mt-2">Activate once via M-Pesa. Start earning immediately.</p>
        </div>
        <ScrollReveal>
        <div className="bg-white border-2 border-sky-500 rounded-lg p-7 shadow-card">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-3">GETPAID Member</p>
          <div className="mb-5">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">KES 150</span>
            <span className="text-slate-400 text-sm ml-2">one-time</span>
          </div>
          <ul className="space-y-2.5 mb-6">
            {["Up to 5 tasks per day","YouTube video rewards","KES 50 referral bonus per activation","Wallet & transaction history","KES 20 activation bonus"].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                <span className="w-4 h-4 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/register" className="block w-full text-center text-white bg-sky-500 hover:bg-sky-600 px-4 py-2.5 rounded-md font-semibold transition-colors text-sm">
            Get started
          </Link>
        </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 px-4 text-center">
        <p className="text-xs text-slate-400">© 2026 GETPAID. All rights reserved.</p>
      </footer>
    </div>
  );
}
