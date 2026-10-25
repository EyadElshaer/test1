"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  KeyRound,
  FileText,
  Copy,
  Check,
  ChevronRight,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AccountOrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Refund request modal state
  const [activeRefundOrder, setActiveRefundOrder] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState("Defective or unredeemed key");
  const [refundExplanation, setRefundExplanation] = useState("");
  const [refundAmount, setRefundAmount] = useState<number | "">("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");
  const [refundError, setRefundError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login?redirect=/account/orders");
      return;
    }

    if (user) {
      fetchUserOrders();
    }
  }, [user, authLoading, router]);

  const fetchUserOrders = async () => {
    setLoadingOrders(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/user/orders");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load orders");
      }
      setOrders(data.orders || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load your orders.");
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleOpenRefund = (order: any) => {
    setActiveRefundOrder(order);
    setRefundReason("Defective or unredeemed key");
    setRefundExplanation("");
    setRefundAmount(order.totalAmount);
    setRefundMessage("");
    setRefundError("");
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRefundOrder) return;
    setRefundSubmitting(true);
    setRefundMessage("");
    setRefundError("");

    try {
      const res = await fetch("/api/refunds/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: activeRefundOrder.orderNumber,
          reason: refundReason,
          explanation: refundExplanation,
          requestedAmount: Number(refundAmount) || activeRefundOrder.totalAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit refund request.");
      }

      setRefundMessage(`Refund request submitted! Refund Number: ${data.refundNumber}`);
      setTimeout(() => {
        setActiveRefundOrder(null);
        fetchUserOrders();
      }, 1500);
    } catch (err: any) {
      setRefundError(err.message || "Failed to submit refund request.");
    } finally {
      setRefundSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-cyan-400 border border-blue-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>APPROVED</span>
          </span>
        );
      case "DONE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>COMPLETED / DELIVERED</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>REJECTED</span>
          </span>
        );
      case "REFUND_REQUESTED":
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{status}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>PENDING VERIFICATION</span>
          </span>
        );
    }
  };

  if (authLoading || (!user && !errorMessage)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-400 text-xs font-mono">
        Verifying account credentials...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Customer Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Orders &amp; Digital Licenses
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            All orders linked to {user?.name} ({user?.email || user?.phone}).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/account"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            Profile Settings
          </Link>
          <Link
            href="/products"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20 hover:from-blue-500 hover:to-cyan-400 transition-all"
          >
            Shop More Keys
          </Link>
        </div>
      </div>

      {/* Phone Number Missing Notice for Google SSO or Direct Users */}
      {user && !user.phone && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300">No Mobile Phone Number Linked</p>
              <p className="text-[11px] text-slate-300">
                Google accounts do not share phone numbers by default. Add your mobile number to receive instant order notifications via WhatsApp.
              </p>
            </div>
          </div>
          <Link
            href="/account"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 shadow-md shadow-amber-500/20 transition-all shrink-0"
          >
            + Add Phone Number
          </Link>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loadingOrders ? (
        <div className="py-16 text-center text-slate-400 text-xs font-mono">
          Loading your order history &amp; keys...
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-slate-400">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Orders Found Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            You haven&apos;t placed any orders with this account yet. Browse our catalog of genuine software licenses and game keys!
          </p>
          <div className="pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Browse Products Catalog</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="glass-card rounded-3xl border border-white/10 bg-[#070d1d]/80 overflow-hidden shadow-xl transition-all hover:border-cyan-500/30"
            >
              {/* Order Header Banner */}
              <div className="p-5 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-black text-sm text-white select-all">
                      {order.orderNumber}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Placed on{" "}
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" • "}Payment: <strong className="text-slate-200">{order.paymentMethodName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block">Total Amount</span>
                    <span className="font-mono font-bold text-cyan-300 text-base">
                      {order.totalAmount.toLocaleString()} {order.currency}
                    </span>
                  </div>

                  {/* Refund action if applicable */}
                  {!order.refundRequests?.length && order.status !== "REJECTED" && (
                    <button
                      onClick={() => handleOpenRefund(order)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Refund</span>
                    </button>
                  )}
                </div>
              </div>

              {/* DISPATCHED LICENSE KEYS / ADMIN NOTE SECTION */}
              {order.adminCustomerNote && (
                <div className="p-5 bg-gradient-to-r from-blue-950/60 via-cyan-950/40 to-slate-950/80 border-b border-cyan-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Your Digital License Key &amp; Activation Guide
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(order.adminCustomerNote, order.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 flex items-center gap-1 transition-colors"
                    >
                      {copiedKeyId === order.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-black/70 border border-cyan-500/30 font-mono text-xs text-cyan-200 select-all whitespace-pre-wrap break-all leading-relaxed">
                    {order.adminCustomerNote}
                  </pre>
                </div>
              )}

              {/* Order Items List */}
              <div className="p-5 divide-y divide-white/5">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="flex items-center gap-3.5 group/item hover:opacity-90 transition-opacity"
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-white/10 shrink-0 group-hover/item:border-cyan-400/50 transition-colors flex items-center justify-center p-0.5">
                        <Image
                          src={item.productImage || "/images/premikeys-logo.png"}
                          alt=""
                          fill
                          className="object-cover blur-xs opacity-25 scale-125 pointer-events-none"
                        />
                        <Image
                          src={item.productImage || "/images/premikeys-logo.png"}
                          alt={item.productTitle}
                          fill
                          className="object-contain p-0.5 group-hover/item:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white group-hover/item:text-cyan-300 transition-colors">
                          {item.productTitle}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Qty: {item.quantity} × {item.salePrice.toLocaleString()} {order.currency}
                        </p>
                      </div>
                    </Link>

                    <div className="text-right">
                      <span className="font-mono font-bold text-white text-xs">
                        {item.lineTotal.toLocaleString()} {order.currency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status Note or Refund Alert */}
              {order.refundRequests && order.refundRequests.length > 0 && (
                <div className="p-4 bg-amber-500/10 border-t border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                  <span>
                    Refund Request Active: <strong>{order.refundRequests[0].refundNumber}</strong> (Status: {order.refundRequests[0].status})
                  </span>
                  <span className="text-[11px] text-amber-200/80">
                    {order.refundRequests[0].requestedAmount} {order.currency}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* REFUND MODAL */}
      {activeRefundOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/20 bg-[#070d1d] max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Request Order Refund</h3>
                <p className="text-xs text-slate-400 font-mono">Order {activeRefundOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => setActiveRefundOrder(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {refundError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {refundError}
              </div>
            )}

            {refundMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {refundMessage}
              </div>
            )}

            <form onSubmit={handleSubmitRefund} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Reason</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  <option value="Defective or unredeemed key" className="bg-slate-900">Defective or unredeemed key</option>
                  <option value="Accidental duplicate purchase" className="bg-slate-900">Accidental duplicate purchase</option>
                  <option value="Incompatible system or region" className="bg-slate-900">Incompatible system or region</option>
                  <option value="Other customer inquiry" className="bg-slate-900">Other reason</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Explanation / Issue Details
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Please describe what issue occurred with the product or transfer..."
                  value={refundExplanation}
                  onChange={(e) => setRefundExplanation(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRefundOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50"
                >
                  {refundSubmitting ? "Submitting..." : "Submit Refund Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
