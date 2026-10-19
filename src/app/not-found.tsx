import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Search, HelpCircle, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 glass-card rounded-3xl p-8 sm:p-12 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-cyan-400">
            <span className="text-3xl font-black font-mono">404</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white font-mono">Page Not Found</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              The digital destination or product key you requested could not be located in our store directory.
            </p>
          </div>

          <div className="pt-4 space-y-2.5">
            <Link
              href="/"
              className="w-full py-3 rounded-xl font-bold text-xs text-white btn-primary flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Home</span>
            </Link>

            <Link
              href="/products"
              className="w-full py-3 rounded-xl font-semibold text-xs text-slate-300 btn-secondary flex items-center justify-center gap-2"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Browse All Products</span>
            </Link>
          </div>

          <div className="pt-4 border-t border-white/5 text-[11px] text-slate-500">
            Need assistance? <Link href="/faq" className="text-cyan-400 underline">Visit our FAQ</Link> or email support@premikeys.com
          </div>
        </div>
      </div>
    </div>
  );
}
