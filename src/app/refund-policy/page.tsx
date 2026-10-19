import Link from "next/link";
import { RotateCcw, ArrowLeft, CheckCircle2, Clock, AlertCircle, HelpCircle } from "lucide-react";

export const metadata = {
  title: "Refund & Return Policy | PremiKeys",
  description: "Official Refund and Return Policy for PremiKeys digital store.",
};

export default function RefundPolicyPage() {
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
          Refund & Return Policy
        </h1>
        <p className="text-xs text-slate-400">
          Last updated: October 2026 • PremiKeys Digital Store
        </p>
      </div>

      <div className="glass-card rounded-3xl p-8 sm:p-12 border border-white/10 space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>1. Eligibility for Digital Product Refunds</span>
          </h2>
          <p>
            At PremiKeys, customer satisfaction is our utmost priority. We understand that digital software activations and game keys involve specific technical requirements. A customer is eligible to request a refund under the following circumstances:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li><strong>Defective or Unredeemable Key:</strong> If a digital license key provided is invalid, already redeemed, or defective, and our technical support cannot provide a replacement key.</li>
            <li><strong>Unfulfilled Order:</strong> If your payment was verified but the order cannot be fulfilled due to stock shortages or licensing issues.</li>
            <li><strong>Cancellation Before Delivery:</strong> If you requested a cancellation while your order status was still in <em>Pending</em> verification and before the digital key was dispatched.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-cyan-400" />
            <span>2. How to Submit a Refund Request</span>
          </h2>
          <p>
            You do not need to call or create a special account to request a refund. Simply visit our self-service portal:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-slate-400">
            <li>Navigate to <Link href="/my-orders" className="text-cyan-400 underline">My Orders</Link>.</li>
            <li>Enter your unique Order Number (e.g. <code className="text-cyan-300 font-mono">#DN...</code>) or verify with your mobile number.</li>
            <li>Click <strong>Request a Refund</strong> at the bottom of your order details.</li>
            <li>Select your reason, enter an explanation, and submit the request.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>3. Review Process & Status Timeline</span>
          </h2>
          <p>
            Our administration reviews refund requests within <strong>24 to 48 hours</strong>. You can monitor the progress on your My Orders page:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li><strong className="text-amber-400">Pending:</strong> Your refund request has been received and is in review.</li>
            <li><strong className="text-blue-400">Approved:</strong> The administrator has approved your refund, and the transfer has been queued.</li>
            <li><strong className="text-emerald-400">Done:</strong> The manual transfer has been sent back to your original payment account.</li>
            <li><strong className="text-rose-400">Rejected:</strong> The refund was declined with an explanation noted in your dashboard.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <span>4. Manual Payment Return Method</span>
          </h2>
          <p>
            Since payments are manual transfers (InstaPay, Vodafone Cash, Bank Wire), refunds are returned directly to the sender&apos;s originating account or wallet. Our team may contact you via WhatsApp or Email to confirm your refund recipient information.
          </p>
        </section>
      </div>
    </div>
  );
}
