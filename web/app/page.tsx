import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="GETPAID" width={28} height={28} className="rounded-md" />
            <span className="font-semibold text-gray-900">GETPAID</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors">Sign in</Link>
            <Link href="/register" className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md transition-colors font-medium">Get started</Link>
          </div>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="bg-amber-50 border-b border-amber-200">
        <p className="max-w-5xl mx-auto px-4 py-2 text-xs text-amber-700 text-center">
          Educational simulation only — All balances are virtual and have no real monetary value.
        </p>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-sm font-medium text-blue-600 mb-4">Open-source fintech education</p>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
          Learn how incentive platforms<br />are architected
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          GETPAID is a hands-on simulation of a real fintech platform —
          wallets, task rewards, referral systems, and transaction ledgers.
          Strictly for educational purposes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register" className="inline-flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors">
            Start the simulation
          </Link>
          <Link href="/login" className="inline-flex items-center justify-center text-gray-700 border border-gray-300 hover:bg-gray-50 px-6 py-3 rounded-lg font-medium transition-colors">
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">No real money. No real payments. Educational use only.</p>
      </section>

      {/* Features */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-semibold text-gray-900 text-center mb-12">What you&apos;ll learn to build</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Wallet Architecture", desc: "Virtual balance, transaction ledger, credit/debit flows, and pending rewards state." },
              { title: "Task & Reward Engine", desc: "Configurable tasks with cooldowns, daily limits, completion tracking, and anti-abuse rules." },
              { title: "Referral System", desc: "Unique referral codes, conversion tracking, conditional bonus payout on membership activation." },
              { title: "Membership Onboarding", desc: "Single-tier simulated payment flow, activation bonus, and member status management." },
              { title: "Video Rewards", desc: "YouTube embed with real progress tracking — reward gated at configurable watch threshold." },
              { title: "Admin Panel", desc: "User management, task configuration, analytics dashboard, and reward controls." },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership */}
      <section className="max-w-sm mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Membership</h2>
        <p className="text-sm text-gray-500 mb-8">Educational simulation — no real payment processed.</p>
        <div className="bg-white border-2 border-blue-600 rounded-2xl p-8">
          <p className="text-sm font-medium text-blue-600 mb-1">GETPAID Member</p>
          <p className="text-4xl font-bold text-gray-900 mb-0.5">KES 150</p>
          <p className="text-xs text-gray-400 mb-6">virtual credits · one-time</p>
          <ul className="text-sm text-gray-700 space-y-2 text-left mb-6">
            {["Up to 5 tasks per day","YouTube video rewards","Referral bonus (KES 50 per activation)","Virtual wallet & transfers","KES 20 activation bonus"].map((f) => (
              <li key={f} className="flex items-center gap-2"><span className="text-blue-600">✓</span>{f}</li>
            ))}
          </ul>
          <Link href="/register" className="block w-full text-center text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm">
            Start simulation
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-4 text-center">
        <p className="text-xs text-gray-400">
          <strong className="text-amber-600">DISCLAIMER:</strong> GETPAID is an educational simulation platform.
          All balances, rewards, and transactions are virtual with no real monetary value.
        </p>
        <p className="text-xs text-gray-400 mt-1">© 2026 GETPAID — For educational and portfolio purposes only.</p>
      </footer>
    </div>
  );
}
