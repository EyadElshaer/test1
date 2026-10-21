"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Package,
  Calendar,
  LogOut,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AccountProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/account");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-400 text-xs font-mono">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page Title */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full">
            Customer Account
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Account Profile &amp; Preferences
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your personal contact details, view purchases, and configure preferences.
          </p>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 self-start sm:self-center"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Profile Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 bg-[#070d1d]/80 space-y-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20 uppercase">
            {user.name ? user.name.charAt(0) : "U"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user.name}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {user.email || user.phone}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                Verified Customer
              </span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Full Name</span>
            </span>
            <p className="font-semibold text-white text-sm">{user.name}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Email Address</span>
            </span>
            <p className="font-semibold text-white text-sm font-mono">
              {user.email || <span className="text-slate-500 italic">Not set</span>}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mobile Phone Number</span>
            </span>
            <p className="font-semibold text-white text-sm font-mono">
              {user.phone || <span className="text-slate-500 italic">Not set</span>}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Member Since</span>
            </span>
            <p className="font-semibold text-white text-sm">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
            </p>
          </div>
        </div>

        {/* Quick Links Banner */}
        <div className="pt-2">
          <Link
            href="/account/orders"
            className="w-full p-4 rounded-2xl bg-blue-600/15 border border-blue-500/30 hover:bg-blue-600/25 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-cyan-300">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white group-hover:text-cyan-200 transition-colors">
                  View My Orders &amp; Purchased Keys
                </h3>
                <p className="text-[11px] text-slate-300">
                  Track delivery progress, review license keys, and request refunds.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
