"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Search,
  ShoppingBag,
  Mail,
  Phone,
  Calendar,
  KeyRound,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Eye,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  X,
  Trash2,
  ShoppingCart,
  Clock,
  ShieldCheck,
  Sparkles,
  Lock,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  MessageCircle,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  MapPin,
  LogOut,
  Monitor,
  Wifi,
} from "lucide-react";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Password Change Modal State
  const [customerToChangePassword, setCustomerToChangePassword] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Customer Deletion Modal
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Session Revocation State
  const [isRevokingSession, setIsRevokingSession] = useState<string | null>(null);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);

  const getCountryFlag = (country?: string) => {
    if (!country) return "🌐";
    const c = country.toLowerCase();
    if (c.includes("egypt") || c === "eg") return "🇪🇬";
    if (c.includes("saudi") || c === "sa") return "🇸🇦";
    if (c.includes("emirates") || c === "ae") return "🇦🇪";
    if (c.includes("united states") || c === "us") return "🇺🇸";
    if (c.includes("united kingdom") || c === "gb" || c === "uk") return "🇬🇧";
    if (c.includes("germany") || c === "de") return "🇩🇪";
    if (c.includes("france") || c === "fr") return "🇫🇷";
    if (c.includes("canada") || c === "ca") return "🇨🇦";
    if (c.includes("turkey") || c === "tr") return "🇹🇷";
    if (c.includes("kuwait") || c === "kw") return "🇰🇼";
    if (c.includes("qatar") || c === "qa") return "🇶🇦";
    return "🌐";
  };

  const getDeviceIcon = (device?: string) => {
    const d = (device || "").toLowerCase();
    if (d.includes("mobile") || d.includes("phone")) return <Smartphone className="w-4 h-4 text-emerald-400" />;
    if (d.includes("tablet") || d.includes("ipad")) return <Tablet className="w-4 h-4 text-emerald-400" />;
    return <Laptop className="w-4 h-4 text-emerald-400" />;
  };

  const handleRevokeSession = async (customerId: string, sessionId?: string, terminateAll?: boolean) => {
    if (terminateAll) {
      if (!confirm("Are you sure you want to terminate all active sessions for this customer? They will be immediately logged out on all devices.")) {
        return;
      }
    }
    setIsRevokingSession(sessionId || "all");
    setSessionFeedback(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, terminateAll }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to terminate session.");
      }
      setSessionFeedback(data.message);
      setTimeout(() => setSessionFeedback(null), 3000);
      await fetchCustomers(false);
    } catch (err: any) {
      alert(err.message || "Failed to revoke session.");
    } finally {
      setIsRevokingSession(null);
    }
  };

  const fetchCustomers = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        // If a customer was currently selected, refresh their data from the updated list
        if (selectedCustomer) {
          const fresh = (data.customers || []).find((c: any) => c.id === selectedCustomer.id);
          if (fresh) setSelectedCustomer(fresh);
        }
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(true);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let pwd = "PK#";
    for (let i = 0; i < 7; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setShowPasswordText(true);
    setPasswordError("");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToChangePassword) return;

    setPasswordError("");
    setPasswordSuccess("");

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerToChangePassword.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update customer password.");
      }

      setPasswordSuccess(data.message || "Customer password successfully updated.");
      setTimeout(() => {
        setCustomerToChangePassword(null);
        setNewPassword("");
        setPasswordSuccess("");
      }, 1800);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change customer password.");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete customer.");
      }
      setCustomerToDelete(null);
      if (selectedCustomer?.id === customerToDelete.id) {
        setSelectedCustomer(null);
      }
      fetchCustomers(false);
    } catch (err: any) {
      alert(err.message || "Failed to delete customer.");
    } finally {
      setIsDeleting(false);
    }
  };

  const { totalRegistered, totalRevenue, totalOrdersPlaced, customersWithAbandonedCart, totalAbandonedValue } = useMemo(() => {
    const totalRegistered = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
    const totalOrdersPlaced = customers.reduce((sum, c) => sum + (c.totalOrdersCount || 0), 0);
    const customersWithAbandonedCart = customers.filter((c) => c.cart?.hasItems);
    const totalAbandonedValue = customersWithAbandonedCart.reduce((sum, c) => sum + (c.cart?.subtotal || 0), 0);
    return { totalRegistered, totalRevenue, totalOrdersPlaced, customersWithAbandonedCart, totalAbandonedValue };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.trim().toLowerCase();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.id?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Admin CRM & Accounts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Customer Accounts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage customer accounts, change passwords directly from dashboard, and inspect live data including left cart items and purchase history.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Registered Users
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {totalRegistered}
            </span>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Total Customer Spending
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono">
              {totalRevenue.toLocaleString()} EGP
            </span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Orders by Registered Accounts
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {totalOrdersPlaced}
            </span>
            <ShoppingBag className="w-5 h-5 text-blue-400" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-amber-500/20 bg-amber-500/[0.02] space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-300 block tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Active / Abandoned Carts</span>
          </span>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {customersWithAbandonedCart.length}
              </span>
              <span className="text-[11px] text-slate-400 ml-1.5 font-mono">
                ({totalAbandonedValue.toLocaleString()} EGP)
              </span>
            </div>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative flex-1 w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or phone (instant)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input pl-9 pr-8 py-2 rounded-xl text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-slate-400">
            Showing <strong className="text-cyan-400 font-mono">{filteredCustomers.length}</strong> of{" "}
            <span className="font-mono">{customers.length}</span> customer accounts
          </span>

          <button
            type="button"
            onClick={() => fetchCustomers(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold btn-secondary flex items-center gap-1.5 shrink-0"
            title="Refresh accounts data"
          >
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Customer List / Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs font-mono">
          Loading customer accounts and account data...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-3">
          <Users className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Customers Found</h3>
          <p className="text-xs text-slate-400">
            {search ? "No customer accounts match your search query." : "No customers have registered yet."}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-2 px-3 py-1.5 rounded-xl text-xs font-semibold btn-secondary"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase text-[10px] tracking-wider font-mono">
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Contact Info</th>
                  <th className="py-3.5 px-4 font-semibold">Left In Cart</th>
                  <th className="py-3.5 px-4 font-semibold">Orders & Spent</th>
                  <th className="py-3.5 px-4 font-semibold">Registered</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.map((c) => {
                  const hasCartItems = c.cart?.hasItems;
                  const cartCount = c.cart?.itemsCount || 0;
                  const cartSubtotal = c.cart?.subtotal || 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => setSelectedCustomer(c)}
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {c.avatar ? (
                            <img
                              src={c.avatar}
                              alt={c.name}
                              className="w-9 h-9 rounded-xl object-cover border border-white/20 shadow-sm shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black text-xs uppercase shadow-sm shrink-0">
                              {c.name ? c.name.charAt(0) : "U"}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-white block group-hover:text-cyan-300 transition-colors text-sm">
                              {c.name}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {c.id.substring(0, 8)}...
                              </span>

                              {c.hasGoogle && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/15 text-cyan-300 border border-blue-500/30 shadow-sm"
                                  title="Google Account Linked"
                                >
                                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                  </svg>
                                  Google
                                </span>
                              )}

                              {c.hasPassword && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  title="Password authentication enabled"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  Password
                                </span>
                              )}

                              {c.activeSessionsCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                                  {c.activeSessionsCount} online
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-4 space-y-1">
                        {c.email ? (
                          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                            <Mail className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="truncate max-w-[170px]">{c.email}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(c.email, `email_${c.id}`);
                              }}
                              className="text-slate-500 hover:text-white"
                              title="Copy email"
                            >
                              {copiedText === `email_${c.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">No email</span>
                        )}

                        {c.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>{c.phone}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(c.phone, `phone_${c.id}`);
                              }}
                              className="text-slate-500 hover:text-white"
                              title="Copy phone"
                            >
                              {copiedText === `phone_${c.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <a
                              href={`https://wa.me/${c.phone.replace(/[^\d]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-400 hover:text-emerald-300"
                              title="Message customer on WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-400/80 text-[11px] italic">
                            <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>No phone</span>
                          </div>
                        )}
                      </td>

                      {/* Left in Cart Status */}
                      <td className="py-4 px-4">
                        {hasCartItems ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
                            <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              <strong>{cartCount}</strong> {cartCount === 1 ? "item" : "items"} ({cartSubtotal.toLocaleString()} EGP)
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.03] text-slate-500 text-[11px] font-mono">
                            <span>Cart empty</span>
                          </span>
                        )}
                      </td>

                      {/* Orders & Total Spent */}
                      <td className="py-4 px-4 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">
                            {c.totalOrdersCount} orders
                          </span>
                          {c.pendingOrdersCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {c.pendingOrdersCount} pending
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-black text-cyan-300 text-xs block">
                          {c.totalSpent.toLocaleString()} EGP
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-slate-400 text-[11px] font-mono">
                        {new Date(c.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change Password Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomerToChangePassword(c);
                              setNewPassword("");
                              setPasswordError("");
                              setPasswordSuccess("");
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all inline-flex items-center gap-1.5"
                            title="Change Customer Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Password</span>
                          </button>

                          {/* Inspect Account & Cart Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(c);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 text-cyan-300 border border-blue-500/30 hover:bg-blue-600/30 transition-all inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Account Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomerToDelete(c);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Customer Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHANGE CUSTOMER PASSWORD MODAL */}
      {/* ========================================================================= */}
      {customerToChangePassword && (
        <div
          onClick={() => {
            if (!passwordSubmitting) {
              setCustomerToChangePassword(null);
              setPasswordError("");
              setPasswordSuccess("");
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0b1026] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl shadow-cyan-950/50"
          >
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Change Account Password</h3>
                  <p className="text-xs text-slate-400">
                    For customer <strong className="text-cyan-300">{customerToChangePassword.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={passwordSubmitting}
                onClick={() => setCustomerToChangePassword(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Customer Info Snapshot */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Account ID:</span>
                <span className="text-slate-300 select-all">{customerToChangePassword.id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Contact Login:</span>
                <span className="text-cyan-300 select-all">
                  {customerToChangePassword.email || customerToChangePassword.phone || "No contact"}
                </span>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    New Account Password
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswordText ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError("");
                    }}
                    placeholder="Enter at least 6 characters..."
                    className="w-full glass-input pl-9 pr-20 py-2.5 rounded-xl text-xs font-mono"
                    autoFocus
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {newPassword && (
                      <button
                        type="button"
                        onClick={() => handleCopy(newPassword, "copied_new_pwd")}
                        className="px-2 py-1 rounded text-[10px] bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
                        title="Copy password to clipboard"
                      >
                        {copiedText === "copied_new_pwd" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="px-2 py-1 rounded text-[10px] text-slate-400 hover:text-white transition-colors"
                    >
                      {showPasswordText ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  ⚠️ This will update the customer&apos;s password immediately and reset their existing active sign-in sessions so they can log in with the new password.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={passwordSubmitting}
                  onClick={() => setCustomerToChangePassword(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting || !newPassword}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold btn-primary disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{passwordSubmitting ? "Updating..." : "Update Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOMER DEEP INSPECTION MODAL (CART, ORDERS, EVERYTHING BOUGHT) */}
      {/* ========================================================================= */}
      {selectedCustomer && (
        <div
          onClick={() => setSelectedCustomer(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col bg-[#070d1d] border border-white/20 shadow-2xl"
          >
            {/* Modal Top Header */}
            <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.01]">
              <div className="flex items-center gap-3.5">
                {selectedCustomer.avatar ? (
                  <img
                    src={selectedCustomer.avatar}
                    alt={selectedCustomer.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-white/20 shadow-lg shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white text-lg font-black uppercase shadow-lg shrink-0">
                    {selectedCustomer.name ? selectedCustomer.name.charAt(0) : "U"}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{selectedCustomer.name}</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      ID: {selectedCustomer.id.substring(0, 8)}...
                    </span>
                    {selectedCustomer.hasGoogle && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-cyan-300 border border-blue-500/30">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                        Google Linked
                      </span>
                    )}
                    {selectedCustomer.hasPassword && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <Lock className="w-3 h-3" />
                        Password Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedCustomer.email || "No email"} • {selectedCustomer.phone || "No phone"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Change Password CTA */}
                <button
                  type="button"
                  onClick={() => {
                    setCustomerToChangePassword(selectedCustomer);
                    setNewPassword("");
                    setPasswordError("");
                    setPasswordSuccess("");
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{selectedCustomer.hasPassword ? "Change Password" : "Set Password"}</span>
                </button>

                {selectedCustomer.phone && (
                  <a
                    href={`https://wa.me/${selectedCustomer.phone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all flex items-center gap-1.5"
                    title="Direct WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Financial & Account Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Orders</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-mono font-bold text-white">{selectedCustomer.totalOrdersCount}</span>
                    {selectedCustomer.pendingOrdersCount > 0 && (
                      <span className="text-[10px] text-amber-400 font-mono">({selectedCustomer.pendingOrdersCount} pending)</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lifetime Spend</span>
                  <span className="text-lg font-mono font-bold text-cyan-300 block mt-0.5">
                    {selectedCustomer.totalSpent.toLocaleString()} EGP
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Cart Value</span>
                  <span className="text-lg font-mono font-bold text-amber-300 block mt-0.5">
                    {(selectedCustomer.cart?.subtotal || 0).toLocaleString()} EGP
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Sessions</span>
                  <span className="text-lg font-mono font-bold text-emerald-400 block mt-0.5">
                    {selectedCustomer.activeSessionsCount ?? 0} signed-in
                  </span>
                </div>
              </div>

              {/* ================================================================= */}
              {/* AUTHENTICATION & LINKED ACCOUNTS */}
              {/* ================================================================= */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-500/[0.04] to-transparent border border-blue-500/25 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Authentication &amp; Linked Accounts
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Sign-in methods, linked social providers, and credential status.
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300 font-semibold">
                    Primary: {selectedCustomer.authProvider === "google" ? "Google SSO" : "Local / Direct"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Google Connection */}
                  <div className={`p-4 rounded-xl border space-y-2 ${
                    selectedCustomer.hasGoogle
                      ? "bg-blue-500/[0.08] border-blue-500/30"
                      : "bg-white/[0.02] border-white/5"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                        <span className="font-bold text-white text-[11px]">Google Account</span>
                      </div>
                      {selectedCustomer.hasGoogle ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Linked
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-white/5 text-slate-400">
                          Not Linked
                        </span>
                      )}
                    </div>
                    {selectedCustomer.hasGoogle ? (
                      <div className="space-y-1">
                        <p className="text-[11px] text-cyan-200 font-mono truncate">
                          {selectedCustomer.email || "Google Connected"}
                        </p>
                        {selectedCustomer.googleId && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            Sub ID: {selectedCustomer.googleId.substring(0, 14)}...
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        No Google social account connected
                      </p>
                    )}
                  </div>

                  {/* Password Login */}
                  <div className={`p-4 rounded-xl border space-y-2 ${
                    selectedCustomer.hasPassword
                      ? "bg-emerald-500/[0.06] border-emerald-500/25"
                      : "bg-amber-500/[0.06] border-amber-500/25"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-bold text-white text-[11px]">Password Login</span>
                      </div>
                      {selectedCustomer.hasPassword ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          No Password
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {selectedCustomer.hasPassword
                        ? "Configured. Customer can sign in using password."
                        : "No password set. Customer logs in via Google SSO."}
                    </p>
                  </div>

                  {/* Phone Status */}
                  <div className={`p-4 rounded-xl border space-y-2 ${
                    selectedCustomer.phone
                      ? "bg-white/[0.02] border-white/5"
                      : "bg-amber-500/[0.06] border-amber-500/25"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-bold text-white text-[11px]">Phone Status</span>
                      </div>
                      {selectedCustomer.phone ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Linked
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Missing
                        </span>
                      )}
                    </div>
                    {selectedCustomer.phone ? (
                      <p className="text-[11px] text-slate-200 font-mono truncate">
                        {selectedCustomer.phone}
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-300/80 italic">
                        No phone number linked to account
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* 1. CUSTOMER'S ACTIVE / ABANDONED CART */}
              {/* ================================================================= */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-500/[0.04] to-transparent border border-amber-500/25 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Items Left in Cart (Abandoned / Current Cart)</span>
                        {selectedCustomer.cart?.hasItems && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {selectedCustomer.cart.itemsCount} {selectedCustomer.cart.itemsCount === 1 ? "item" : "items"}
                          </span>
                        )}
                      </h3>
                      {selectedCustomer.cart?.updatedAt && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Last cart update: {new Date(selectedCustomer.cart.updatedAt).toLocaleString()}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedCustomer.cart?.hasItems && (
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-amber-300">
                        Total Cart Value: {selectedCustomer.cart.subtotal.toLocaleString()} EGP
                      </span>
                    </div>
                  )}
                </div>

                {!selectedCustomer.cart?.hasItems ? (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                    🛒 Customer does not currently have any items left in their cart.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-black/40">
                      {selectedCustomer.cart.items.map((item: any, idx: number) => (
                        <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <div className="w-12 h-12 rounded-xl overflow-hidden relative border border-white/10 bg-slate-900 shrink-0">
                                <Image
                                  src={item.image}
                                  alt={item.title || "Product"}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 shrink-0">
                                <Package className="w-5 h-5" />
                              </div>
                            )}

                            <div>
                              <Link
                                href={`/products/${item.slug || item.productSlug || item.productId}`}
                                target="_blank"
                                className="font-bold text-white text-xs sm:text-sm hover:text-cyan-300 transition-colors flex items-center gap-1 group"
                              >
                                <span>{item.title}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                              </Link>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                {item.platform && (
                                  <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[10px] text-slate-300">
                                    {item.platform}
                                  </span>
                                )}
                                {item.productType && (
                                  <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[10px] text-slate-300">
                                    {item.productType}
                                  </span>
                                )}
                                <span>Qty: <strong className="text-white font-mono">{item.quantity || 1}</strong></span>
                                <span>•</span>
                                <span>Price: <strong className="text-white font-mono">{(item.salePrice ?? item.originalPrice ?? 0).toLocaleString()} EGP</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right sm:self-center font-mono font-bold text-cyan-300 text-xs">
                            {(((item.salePrice ?? item.originalPrice ?? 0) * (item.quantity || 1))).toLocaleString()} EGP
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-center justify-between">
                      <span>💡 <strong>Tip for Admin:</strong> You can contact this customer on WhatsApp or email to assist them with any questions regarding their left items!</span>
                      {selectedCustomer.phone && (
                        <a
                          href={`https://wa.me/${selectedCustomer.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Hello ${selectedCustomer.name}, this is PremiKeys Support! We noticed you left some items in your cart. Let us know if you need any assistance.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 ml-2"
                        >
                          WhatsApp Customer
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ================================================================= */}
              {/* 2. ACTIVE SESSIONS & CONNECTED DEVICES */}
              {/* ================================================================= */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-500/[0.04] to-transparent border border-emerald-500/25 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Active Sessions & Connected Devices</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {selectedCustomer.sessions?.length ?? selectedCustomer.activeSessionsCount ?? 0} active
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Identifies device type, OS, browser, IP address, and geographic location
                      </p>
                    </div>
                  </div>

                  {selectedCustomer.sessions && selectedCustomer.sessions.length > 0 && (
                    <button
                      type="button"
                      disabled={isRevokingSession !== null}
                      onClick={() => handleRevokeSession(selectedCustomer.id, undefined, true)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/25 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>{isRevokingSession === "all" ? "Terminating..." : "Terminate All Sessions"}</span>
                    </button>
                  )}
                </div>

                {sessionFeedback && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{sessionFeedback}</span>
                  </div>
                )}

                {!selectedCustomer.sessions || selectedCustomer.sessions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-slate-400">
                    🔒 Customer has no active signed-in sessions right now.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.sessions.map((sess: any) => (
                      <div
                        key={sess.id}
                        className="p-3.5 rounded-xl bg-black/40 border border-white/10 hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Device & OS details */}
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white shrink-0 mt-0.5 sm:mt-0">
                            {getDeviceIcon(sess.device)}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">
                                {sess.device || "Desktop"} • {sess.os || "Unknown OS"}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                {sess.browser || "Browser"}
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                                Active
                              </span>
                            </div>

                            {/* Location and IP */}
                            <div className="flex items-center gap-2.5 text-[11px] text-slate-300 flex-wrap font-mono pt-0.5">
                              <span className="inline-flex items-center gap-1 text-slate-200">
                                <span className="text-sm">{getCountryFlag(sess.country)}</span>
                                <strong>{sess.city ? `${sess.city}, ` : ""}{sess.country || "Unknown Location"}</strong>
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <MapPin className="w-3 h-3 text-cyan-400" />
                                <span>IP: {sess.ipAddress || "Unknown"}</span>
                                {sess.ipAddress && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(sess.ipAddress, `ip_${sess.id}`)}
                                    className="text-slate-500 hover:text-white ml-0.5"
                                    title="Copy IP Address"
                                  >
                                    {copiedText === `ip_${sess.id}` ? (
                                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                )}
                              </span>
                            </div>

                            {/* Timing */}
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 flex-wrap pt-0.5">
                              <span>Signed in: {new Date(sess.createdAt).toLocaleDateString()} {new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-slate-600">•</span>
                              <span>Last active: {new Date(sess.lastActiveAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Revoke single session button */}
                        <div className="self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            disabled={isRevokingSession !== null}
                            onClick={() => handleRevokeSession(selectedCustomer.id, sess.id, false)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                            title="Revoke and force sign out this session"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>{isRevokingSession === sess.id ? "Revoking..." : "Revoke"}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ================================================================= */}
              {/* 3. EVERYTHING BOUGHT & DISPATCHED KEYS */}
              {/* ================================================================= */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Everything This Customer Bought ({selectedCustomer.everythingBought.length} unique products)
                  </h3>
                </div>

                {selectedCustomer.everythingBought.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    This customer hasn&apos;t completed any product purchases yet.
                  </p>
                ) : (
                  <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-black/30">
                    {selectedCustomer.everythingBought.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-white text-sm block">{item.title}</span>
                            <span className="text-xs text-slate-400">
                              Total Units Bought: <strong className="text-cyan-300 font-mono">{item.totalQuantity}</strong>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-emerald-300">
                              Total Paid: {item.totalPaid.toLocaleString()} EGP
                            </span>
                          </div>
                        </div>

                        {/* Associated Orders & License Keys Dispatched */}
                        <div className="pt-1.5 space-y-1.5">
                          {item.orders.map((ord: any, oIdx: number) => (
                            <div
                              key={oIdx}
                              className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-cyan-400 font-semibold select-all">
                                  {ord.orderNumber}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({new Date(ord.date).toLocaleDateString()})
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-white/5 text-slate-300">
                                  {ord.status}
                                </span>
                              </div>

                              {ord.licenseKey && (
                                <div className="text-xs font-mono text-cyan-200 bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-1 rounded-lg select-all truncate max-w-xs">
                                  Key: {ord.licenseKey}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ================================================================= */}
              {/* 3. ORDERS HISTORY */}
              {/* ================================================================= */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Orders History ({selectedCustomer.orders.length})
                    </h3>
                  </div>
                  <Link
                    href={`/admin/orders?search=${encodeURIComponent(selectedCustomer.name)}`}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>View in Orders Management</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {selectedCustomer.orders.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    No orders placed yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.orders.map((order: any) => (
                      <div
                        key={order.id}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white select-all">
                              {order.orderNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                              order.status === "DONE"
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                : order.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : "bg-white/5 text-slate-300"
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(order.createdAt).toLocaleDateString()} • {order.itemsCount} items • {order.paymentMethodName}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-cyan-300">
                            {order.totalAmount.toLocaleString()} {order.currency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ================================================================= */}
              {/* 4. REFUNDS (IF ANY) */}
              {/* ================================================================= */}
              {selectedCustomer.refunds && selectedCustomer.refunds.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Refund Requests ({selectedCustomer.refunds.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {selectedCustomer.refunds.map((ref: any) => (
                      <div
                        key={ref.id}
                        className="p-3 rounded-xl bg-rose-500/[0.04] border border-rose-500/20 text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-rose-300">{ref.refundNumber}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-rose-500/20 text-rose-200">
                              {ref.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">Reason: {ref.reason}</p>
                        </div>
                        <div className="text-right font-mono font-bold text-white">
                          {ref.requestedAmount.toLocaleString()} EGP
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerToChangePassword(selectedCustomer);
                    setNewPassword("");
                    setPasswordError("");
                    setPasswordSuccess("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerToDelete(selectedCustomer)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold btn-secondary"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CUSTOMER CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1026] border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Customer Account?</h3>
                <p className="text-xs text-rose-300">{customerToDelete.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the account of customer <strong className="text-white">{customerToDelete.name}</strong> ({customerToDelete.email || customerToDelete.phone || "No contact info"})?
            </p>
            <p className="text-[11px] text-slate-400 bg-white/[0.03] p-3 rounded-xl border border-white/5">
              ⚠️ This will delete the user profile and their active sign-in sessions. Their order history will remain preserved as historical records.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCustomer}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
