import React from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, CheckCircle2, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Cookie Policy | PremiKeys",
  description: "Learn how PremiKeys uses cookies to keep your account securely signed in and optimize your checkout experience.",
};

export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-cyan-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Store</span>
      </Link>

      {/* Header */}
      <div className="border-b border-white/10 pb-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
          <Cookie className="w-3.5 h-3.5" />
          <span>Transparency &amp; Privacy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Cookie Policy &amp; Usage
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
          At PremiKeys, we respect your privacy and only use cookies that are strictly necessary to deliver a secure, frictionless shopping experience.
        </p>
      </div>

      {/* Main Content */}
      <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
        {/* Section 1 */}
        <section className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>1. What Are Cookies?</span>
          </h2>
          <p>
            Cookies are small cryptographic text files placed on your device by your web browser when you visit a website. They allow the website to recognize your browser, remember your session, and keep your shopping cart intact.
          </p>
        </section>

        {/* Section 2 */}
        <section className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>2. Essential Cookies We Use</span>
          </h2>
          <p>
            PremiKeys utilizes strictly essential first-party cookies. We do not sell your personal data or partner with cross-site behavioral advertising networks:
          </p>
          <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-black/30">
            <div className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-cyan-300 text-xs">premikeys_user_session</span>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Essential</span>
              </div>
              <p className="text-xs text-slate-300">
                Maintains your signed-in account state for up to 90 days across visits, allowing you to access purchased license keys, invoices, and profile details without having to re-authenticate repeatedly.
              </p>
            </div>
            <div className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-cyan-300 text-xs">premikeys_cookie_consent</span>
                <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Preferences</span>
              </div>
              <p className="text-xs text-slate-300">
                Remembers your choice to accept or dismiss the cookie notice so that you are not prompted repeatedly.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
          <h2 className="text-lg font-bold text-white">3. Managing and Deleting Cookies</h2>
          <p>
            You can modify your browser settings to decline or delete cookies at any time through your browser preferences. Please note that disabling essential authentication cookies will prevent you from staying logged in to your account or automatically tracking your purchased digital keys.
          </p>
        </section>

        {/* Section 4 */}
        <section className="glass-card rounded-2xl p-6 border border-white/10 space-y-3">
          <h2 className="text-lg font-bold text-white">4. Updates to This Policy</h2>
          <p>
            We may update our Cookie Policy periodically to reflect technological or legal updates. Any modifications will be posted here with an updated revision date.
          </p>
          <p className="text-xs text-slate-400">
            Last updated: October 2026
          </p>
        </section>
      </div>
    </div>
  );
}
