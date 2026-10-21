"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, X } from "lucide-react";

export default function CookieNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("premikeys_cookie_consent");
      if (!consent) {
        // Small delay for smooth entry
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // Storage access blocked or restricted
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("premikeys_cookie_consent", "accepted");
    } catch (e) {}
    setIsVisible(false);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem("premikeys_cookie_consent", "dismissed");
    } catch (e) {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="glass-card rounded-2xl p-5 border border-cyan-500/30 bg-[#060c1d]/95 backdrop-blur-xl shadow-2xl shadow-cyan-950/40 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Dismiss cookie notice"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
              <span>Cookie Policy &amp; Privacy</span>
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            </h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              We use essential cookies to keep you securely signed in to your account, preserve your
              digital keys, and remember your cart. No third-party ad trackers.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-white/10">
          <Link
            href="/cookie-policy"
            className="text-[11px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors self-start sm:self-center"
          >
            Read Cookie Policy
          </Link>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleAccept}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-md shadow-blue-500/30 transition-all active:scale-95 text-center"
            >
              Accept Cookies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
