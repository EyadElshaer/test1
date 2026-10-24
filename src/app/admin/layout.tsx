"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  RotateCcw,
  Package,
  Layers,
  SlidersHorizontal,
  CreditCard,
  Tag,
  HelpCircle,
  Settings,
  LogOut,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Menu,
  X,
  AlertTriangle,
  CheckCircle2,
  Users,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    // If on login route `/admin`, bypass auth check and mark ready
    if (pathname === "/admin") {
      setAuthChecked(true);
      return;
    }

    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/admin");
        } else {
          setAdminUser(data.admin);
          if (data.admin.mustChangePassword) {
            setShowPasswordModal(true);
          }
        }
      })
      .catch(() => router.replace("/admin"))
      .finally(() => setAuthChecked(true));
  }, [router, pathname]);

  // Sync actions from Telegram buttons automatically while in admin dashboard
  useEffect(() => {
    if (pathname === "/admin") return;
    const interval = setInterval(() => {
      fetch("/api/telegram/sync")
        .then((r) => r.json())
        .then((data) => {
          if (data?.pollResult?.processed > 0) {
            router.refresh();
          }
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin");
    } catch (e) {
      router.replace("/admin");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update password.");
      }

      setPasswordSuccess(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (pathname === "/admin") {
    return <>{children}</>;
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center text-slate-400 text-xs font-mono">
        Verifying administrator session...
      </div>
    );
  }

  const navItems = [
    { name: "Overview", href: "/admin/dashboard", icon: LayoutDashboard, permissionKey: "overview" },
    { name: "Orders", href: "/admin/orders", icon: ShoppingBag, permissionKey: "orders" },
    { name: "Customer Accounts", href: "/admin/customers", icon: Users, permissionKey: "customers" },
    { name: "Refunds", href: "/admin/refunds", icon: RotateCcw, permissionKey: "refunds" },
    { name: "Products", href: "/admin/products", icon: Package, permissionKey: "products" },
    { name: "Categories", href: "/admin/categories", icon: Layers, permissionKey: "categories" },
    { name: "Catalog Filters", href: "/admin/filters", icon: SlidersHorizontal, permissionKey: "filters" },
    { name: "Payment Methods", href: "/admin/payment-methods", icon: CreditCard, permissionKey: "payment-methods" },
    { name: "Promo Codes", href: "/admin/promo-codes", icon: Tag, permissionKey: "promo-codes" },
    { name: "FAQ Management", href: "/admin/faq", icon: HelpCircle, permissionKey: "faq" },
    { name: "Admin Staff", href: "/admin/staff", icon: ShieldCheck, permissionKey: "staff" },
    { name: "Store Settings", href: "/admin/settings", icon: Settings, permissionKey: "settings" },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (!adminUser) return true;
    if (adminUser.role === "SUPER_ADMIN") return true;
    if (item.name === "Overview") return true;
    if (!adminUser.permissions || adminUser.permissions === "*") return true;
    const allowed = adminUser.permissions.split(",").map((s: string) => s.trim().toLowerCase());
    return (
      allowed.includes(item.permissionKey.toLowerCase()) ||
      allowed.includes(item.name.toLowerCase())
    );
  });

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === "/admin/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col lg:flex-row text-slate-100">
      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`${
          mobileSidebarOpen ? "fixed inset-0 z-50 bg-[#070d1d] flex flex-col p-6" : "hidden"
        } lg:flex lg:flex-col lg:w-64 lg:static shrink-0 bg-[#060a18] border-r border-white/10`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="relative h-9 w-24">
              <Image
                src="/images/premikeys-logo.png"
                alt="PremiKeys"
                fill
                sizes="96px"
                className="object-contain"
              />
            </div>
            <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              Admin
            </span>
          </Link>

          {mobileSidebarOpen && (
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-blue-600/20 text-cyan-300 border border-blue-500/30 shadow-[0_0_15px_rgba(0,102,255,0.2)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile & Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Logged in as</span>
              <span className="font-bold text-white">{adminUser?.username || "Admin"}</span>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="text-slate-400 hover:text-cyan-300 p-1"
              title="Change Password"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN ADMIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 px-6 border-b border-white/10 bg-[#060a18]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-400 hidden sm:block">
              PremiKeys Management Platform
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span>View Storefront</span>
              <ExternalLink className="w-3 h-3 text-cyan-400" />
            </Link>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Change Password</span>
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-white/20 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                <span>Change Administrator Password</span>
              </h3>
              {!adminUser?.mustChangePassword && (
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {adminUser?.mustChangePassword && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  First-time setup detected. You must change your temporary admin password before accessing sensitive dashboards.
                </span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="flex-1 py-3 rounded-xl font-bold text-xs text-white btn-primary disabled:opacity-50"
                >
                  {passwordSubmitting ? "Updating..." : "Update Password"}
                </button>
                {!adminUser?.mustChangePassword && (
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-5 py-3 rounded-xl text-xs font-semibold btn-secondary"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
