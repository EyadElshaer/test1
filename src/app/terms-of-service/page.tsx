import Link from "next/link";
import { FileText, ArrowLeft, CheckCircle2, AlertTriangle, Scale } from "lucide-react";

export const metadata = {
  title: "Terms of Service | PremiKeys",
  description: "Terms and conditions for purchasing digital products on PremiKeys.",
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="space-y-3">
        <Link
          href="/"
          className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-white font-mono">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-400">
          Last updated: October 2026 • PremiKeys Digital Store
        </p>
      </div>

      <div className="glass-card rounded-3xl p-8 sm:p-12 border border-white/10 space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>1. Scope of Digital Services</span>
          </h2>
          <p>
            PremiKeys provides an online digital marketplace for authentic PC game keys, Windows operating system activation licenses, Microsoft Office productivity suites, and software memberships. We sell genuine digital licenses for personal and professional hardware.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            <span>2. Ordering & Manual Payment Verification</span>
          </h2>
          <p>
            Due to our manual payment infrastructure (InstaPay, Vodafone Cash, Bank Wire, Crypto), order submission does not constitute immediate completion. The transaction remains in <strong>Pending</strong> status until an authorized administrator verifies the deposit and reconciles the transfer confirmation. Orders submitted with invalid payment receipts or mismatched amounts may be rejected.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-cyan-400" />
            <span>3. Product Compatibility & Redemption</span>
          </h2>
          <p>
            Customers are responsible for ensuring that their hardware, operating system, and regional account settings meet the specifications listed on the product details page prior to purchase. Once an activated key is successfully bound to your account, redemption is permanent.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-cyan-400" />
            <span>4. Limitation of Liability & Contact</span>
          </h2>
          <p>
            PremiKeys provides digital goods and warranties regarding authentic license origin. If you encounter any redemption issues, contact our support team immediately at <code className="text-cyan-300">support@premikeys.com</code> with your order number.
          </p>
        </section>
      </div>
    </div>
  );
}
