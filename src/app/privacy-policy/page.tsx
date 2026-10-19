import Link from "next/link";
import { ShieldCheck, Lock, Eye, FileText, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | PremiKeys",
  description: "Customer Privacy Policy for PremiKeys digital products store.",
};

export default function PrivacyPolicyPage() {
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
          Customer Privacy Policy
        </h1>
        <p className="text-xs text-slate-400">
          Last updated: October 2026 • PremiKeys Digital Store
        </p>
      </div>

      <div className="glass-card rounded-3xl p-8 sm:p-12 border border-white/10 space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>1. Information We Collect</span>
          </h2>
          <p>
            When you purchase digital products on PremiKeys, we collect only the essential personal data necessary to process your transaction and securely deliver your digital keys:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li><strong>Full Name:</strong> To address you and verify bank/wallet deposit references.</li>
            <li><strong>Phone Number & Country Calling Code:</strong> To enable order lookup, send critical verification codes (OTP), and communicate urgent fulfillment updates.</li>
            <li><strong>Email Address:</strong> To deliver official order receipts, activation guides, and backup license records.</li>
            <li><strong>Payment Transfer Evidence (Screenshots):</strong> Uploaded receipts showing the transfer confirmation, timestamp, and transaction reference.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <span>2. Private & Secure Storage of Payment Proof</span>
          </h2>
          <p>
            Payment screenshots and transfer vouchers are stored in <strong>private, restricted-access storage</strong> outside of public web directories. They are accessible strictly by authorized PremiKeys verification personnel for reconciling manual bank or wallet transactions. They are never published, shared with third parties, or indexed by search engines.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-400" />
            <span>3. How We Use Your Information</span>
          </h2>
          <p>
            We process your information solely for:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Verifying manual transfers sent via InstaPay, Vodafone Cash, Bank Wire, or Crypto.</li>
            <li>Authorizing and releasing your purchased digital license keys and activations.</li>
            <li>Maintaining historical order snapshot records so you can look up your orders at any time.</li>
            <li>Evaluating customer-submitted refund requests in accordance with our Refund Policy.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <span>4. Data Retention & Customer Rights</span>
          </h2>
          <p>
            We retain order snapshots and license delivery records to ensure you always have access to your purchased keys through the My Orders lookup portal. You may request data verification, correction, or deletion by contacting our privacy team at <code className="text-cyan-300">support@premikeys.com</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
