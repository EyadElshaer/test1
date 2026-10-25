"use client";

import React, { useState, useEffect } from "react";
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
  const { user, loading: authLoading, logout, refreshUser } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    setIsSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setEditSuccess("Profile updated successfully!");
      await refreshUser();
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditSuccess("");
      }, 1200);
    } catch (err: any) {
      setEditError(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

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
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-16 h-16 rounded-2xl object-cover border border-white/20 shadow-lg shadow-blue-500/20"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20 uppercase">
              {user.name ? user.name.charAt(0) : "U"}
            </div>
          )}
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
              {user.authProvider === "google" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  Google Account
                </span>
              )}
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
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white text-sm">{user.name}</p>
              <button
                type="button"
                onClick={() => {
                  setEditName(user.name);
                  setEditEmail(user.email || "");
                  setIsEditModalOpen(true);
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                Edit
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Email Address</span>
            </span>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white text-sm font-mono">
                {user.email || <span className="text-amber-400/80 italic font-sans">No email linked</span>}
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditName(user.name);
                  setEditEmail(user.email || "");
                  setIsEditModalOpen(true);
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {user.email ? "Edit Email" : "+ Add Email"}
              </button>
            </div>
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

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1026] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                <span>Update Account Information</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditError("");
                  setEditSuccess("");
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  {editSuccess}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Account Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm font-mono"
                  placeholder="yourname@example.com"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  You can use this email to sign in and receive order confirmation keys.
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white btn-primary shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
