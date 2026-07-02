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

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -top-3 -right-3 z-10 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
        +KES 5 earned
      </div>
      <div className="rounded-lg border border-slate-200 shadow-modal overflow-hidden bg-white">
        {/* Browser chrome */}
        <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 block flex-shrink-0" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block flex-shrink-0" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block flex-shrink-0" />
          <div className="flex-1 ml-2 bg-white border border-slate-200 rounded text-[11px] text-slate-400 px-2 py-0.5 text-center font-mono truncate">
            getpaid.app/dashboard
          </div>
        </div>
        {/* Dashboard preview content */}
        <div className="bg-slate-50 p-3 space-y-2.5">
          {/* Page title skeleton */}
          <div>
            <div className="h-3 w-36 bg-slate-800 rounded-sm mb-1.5" />
            <div className="h-2 w-24 bg-slate-300 rounded-sm" />
          </div>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Balance",     value: "KES 340", sub: "KES",   accent: "border-l-sky-500" },
              { label: "Tasks Today", value: "3 of 5",  sub: "limit", accent: "border-l-sky-500" },
            ].map(({ label, value, sub, accent }) => (
              <div key={label} className={`bg-white border border-slate-200 border-l-[3px] ${accent} rounded p-2`}>
                <p className="text-[10px] text-slate-400 mb-1">{label}</p>
                <p className="text-sm font-bold text-slate-900 tracking-tight leading-none">{value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
          {/* Rewarded task card */}
          <div className="bg-white border border-slate-200 border-l-[3px] border-l-emerald-500 rounded p-2 flex items-center gap-2">
            <div className="w-11 h-7 rounded bg-slate-900 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-600/80 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-slate-900 truncate">Web3 for Beginners</p>
              <p className="text-[10px] font-medium text-emerald-600 mt-0.5">&#10003; +KES 5 earned</p>
            </div>
          </div>
          {/* Pending task card */}
          <div className="bg-white border border-slate-200 rounded p-2 flex items-center gap-2">
            <div className="w-11 h-7 rounded bg-slate-900 flex-shrink-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-2 h-2 text-white ml-px" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-slate-900 truncate">REST APIs with FastAPI</p>
              <p className="text-[10px] text-sky-600 mt-0.5">&#9654; Watch to earn +KES 5</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo-hero.png" alt="GETPAID" width={120} height={48} priority />
          </Link>
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

      {/* Hero — two column */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left — text */}
          <div className="page-enter">
            <p className="inline-flex items-center text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
              AI Work Platform
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-5 leading-[1.1] tracking-tight">
              Complete tasks,<br />
              <span className="text-sky-500">start earning.</span>
            </h1>
            <p className="text-lg text-slate-500 mb-8 max-w-lg leading-relaxed">
              Watch videos, complete daily tasks, and refer friends &mdash; every action earns credits straight to your wallet.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/register" className="inline-flex items-center justify-center text-white bg-sky-500 hover:bg-sky-600 px-8 py-3 rounded-md font-semibold btn-micro shadow-sm">
                Start earning free
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 px-8 py-3 rounded-md font-medium btn-micro">
                Sign in
              </Link>
            </div>
            {/* Feature callouts */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {[
                { icon: Play,        label: "Video Rewards", desc: "Watch & earn instantly" },
                { icon: CheckSquare, label: "Daily Tasks",   desc: "Up to 5 tasks per day" },
                { icon: Users,       label: "Refer & Earn",  desc: "KES 50 per activation" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — product preview */}
          <ScrollReveal className="max-w-md mx-auto md:mx-0 w-full">
            <HeroPreview />
          </ScrollReveal>

        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2 tracking-tight">Everything in one platform</h2>
          <p className="text-slate-500 text-center mb-12 text-sm">Six ways to grow your balance &mdash; every session counts.</p>
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
        <p className="text-xs text-slate-400">&copy; 2026 GETPAID. All rights reserved.</p>
      </footer>
    </div>
  );
}
