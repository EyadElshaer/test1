"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Phone,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  KeyRound,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Info,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function MyOrdersContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get("orderNumber") || "";

  const [lookupMode, setLookupMode] = useState<"orderNumber" | "phone">("orderNumber");
  const [orderNumberInput, setOrderNumberInput] = useState(initialOrderNumber);
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Result state
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [phoneOrdersList, setPhoneOrdersList] = useState<any[]>([]);

  // Refund modal/form state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("Defective or unredeemed key");
  const [refundExplanation, setRefundExplanation] = useState("");
  const [refundAmount, setRefundAmount] = useState<number | "">("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");
  const [refundError, setRefundError] = useState("");
  const [copiedOrderNum, setCopiedOrderNum] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCopyOrderNumber = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOrderNum(true);
    setTimeout(() => setCopiedOrderNum(false), 2000);
  };

  const handleCopyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Auto-search if URL contains orderNumber
  useEffect(() => {
    if (initialOrderNumber) {
      lookupByOrderNumber(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const lookupByOrderNumber = async (numToSearch: string) => {
    if (!numToSearch.trim()) return;
    setIsLoading(true);
    setErrorMessage("");
    setActiveOrder(null);
    setPhoneOrdersList([]);

    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: numToSearch.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Order not found. Please verify the order number.");
      }
      setActiveOrder(data.order);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to locate order.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    setIsLoading(true);
    setErrorMessage("");
    setOtpHint("");

    try {
      const res = await fetch("/api/orders/phone-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REQUEST_OTP", phone: phoneInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Phone verification request failed.");
      }
      setIsOtpSent(true);
      setOtpHint(data.message);
      if (data.debugCode) {
        setOtpInput(data.debugCode);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error requesting verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/orders/phone-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_OTP",
          phone: phoneInput.trim(),
          code: otpInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Incorrect or expired verification code.");
      }
      setPhoneOrdersList(data.orders || []);
      if (data.orders.length > 0) {
        setActiveOrder(data.orders[0]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setRefundError("");
    setRefundMessage("");
    setRefundSubmitting(true);

    try {
      const res = await fetch("/api/refunds/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: activeOrder.orderNumber,
          reason: refundReason,
          explanation: refundExplanation,
          requestedAmount: refundAmount || activeOrder.totalAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit refund request.");
      }
      setRefundMessage(data.message);
      setShowRefundModal(false);
      // Reload order details
      lookupByOrderNumber(activeOrder.orderNumber);
    } catch (err: any) {
      setRefundError(err.message || "Refund submission failed.");
    } finally {
      setRefundSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Title */}
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-cyan-400 border border-blue-500/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          Customer Self-Service Center
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-mono">
          Track Orders & Request Refunds
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
          Lookup your digital keys, view real-time administrative verification progress, and manage refund requests without creating an account.
        </p>
      </div>

      {/* Logged in User Callout */}
      {user && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-blue-950/70 to-cyan-950/50 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                You are signed in as {user.name}
              </p>
              <p className="text-[11px] text-slate-300">
                All your past orders and digital licenses are ready in your account.
              </p>
            </div>
          </div>
          <Link
            href="/account/orders"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 shrink-0 text-center shadow-md shadow-blue-500/20"
          >
            Go to My Account Orders
          </Link>
        </div>
      )}

      {/* Lookup Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 max-w-2xl mx-auto space-y-6">
        {/* Lookup Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setLookupMode("orderNumber");
              setErrorMessage("");
            }}
            className={`py-2.5 rounded-lg transition-all ${
              lookupMode === "orderNumber"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            By Order Number (#DN...)
          </button>
          <button
            type="button"
            onClick={() => {
              setLookupMode("phone");
              setErrorMessage("");
            }}
            className={`py-2.5 rounded-lg transition-all ${
              lookupMode === "phone"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            By Phone Number (OTP)
          </button>
        </div>

        {/* Mode 1: Order Number Form */}
        {lookupMode === "orderNumber" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookupByOrderNumber(orderNumberInput);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Enter Your Order Number
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. #DN7K4P9X2"
                  value={orderNumberInput}
                  onChange={(e) => setOrderNumberInput(e.target.value.toUpperCase())}
                  className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-sm font-mono uppercase tracking-wider"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !orderNumberInput.trim()}
              className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white btn-primary shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
              {isLoading ? "Searching Order..." : "Lookup Order Status"}
            </button>
          </form>
        )}

        {/* Mode 2: Phone Verification Form */}
        {lookupMode === "phone" && (
          <div className="space-y-4">
            {!isOtpSent ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Mobile Phone Number Used at Checkout
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 01012345678"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-sm font-mono"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    A secure 6-digit verification code will be dispatched to confirm ownership.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !phoneInput.trim()}
                  className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white btn-primary shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                  {isLoading ? "Sending Code..." : "Send Verification Code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-cyan-200">
                  {otpHint || "Enter the 6-digit code sent to your phone."}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="w-full glass-input px-4 py-3 rounded-xl text-center text-lg font-mono tracking-widest"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading || otpInput.length < 6}
                    className="flex-1 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white btn-primary shadow-lg shadow-blue-500/30 disabled:opacity-50"
                  >
                    {isLoading ? "Verifying..." : "Verify & View Orders"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="px-4 py-3.5 rounded-xl text-xs font-semibold btn-secondary"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Multiple Orders Selector (if verified via phone) */}
      {phoneOrdersList.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Orders Linked to {phoneInput} ({phoneOrdersList.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {phoneOrdersList.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setActiveOrder(order)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  activeOrder?.id === order.id
                    ? "bg-blue-600/20 border-cyan-400 text-white"
                    : "glass-card text-slate-400 hover:text-white"
                }`}
              >
                <div className="font-mono font-bold text-sm text-cyan-300">{order.orderNumber}</div>
                <div className="text-xs text-slate-300 mt-1">
                  {order.totalAmount.toLocaleString()} {order.currency}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Status: <strong className="text-white">{order.status}</strong>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Order Details Display */}
      {activeOrder && (
        <div className="glass-card rounded-3xl p-6 sm:p-10 border border-white/10 space-y-8 animate-fadeIn">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs text-slate-400">Order Number</span>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-2xl sm:text-3xl font-black font-mono text-cyan-300 select-all">
                  {activeOrder.orderNumber}
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopyOrderNumber(activeOrder.orderNumber)}
                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 transition-all active:scale-95 text-xs flex items-center gap-1"
                  title="Copy order number"
                >
                  {copiedOrderNum ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[11px] font-sans">{copiedOrderNum ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <span className="text-xs text-slate-400 block mt-1">
                Placed on {new Date(activeOrder.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Status Pill */}
            <div className="flex items-center gap-3">
              {activeOrder.status === "PENDING" && (
                <span className="px-4 py-1.5 rounded-full text-xs font-bold status-badge-pending flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>Pending Payment Review</span>
                </span>
              )}
              {activeOrder.status === "APPROVED" && (
                <span className="px-4 py-1.5 rounded-full text-xs font-bold status-badge-approved flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Payment Approved & Processing</span>
                </span>
              )}
              {activeOrder.status === "REFUND_REQUESTED" && (
                <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-md shadow-amber-500/10">
                  <RotateCcw className="w-4 h-4 text-amber-400 animate-spin-slow" />
                  <span>Refund Requested (Under Review)</span>
                </span>
              )}
              {activeOrder.status === "REFUND_APPROVED" && (
                <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  <span>Refund Approved (Processing Transfer)</span>
                </span>
              )}
              {activeOrder.status === "REFUNDED" && (
                <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>Refund Completed</span>
                </span>
              )}
              {activeOrder.status === "DONE" && (
                <span className="px-4 py-1.5 rounded-full text-xs font-bold status-badge-done flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Fulfillment Complete</span>
                </span>
              )}
              {activeOrder.status === "REJECTED" && (
                <span className="px-4 py-1.5 rounded-full text-xs font-bold status-badge-rejected flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  <span>Order Rejected</span>
                </span>
              )}
            </div>
          </div>

          {/* REFUND REQUEST DETAILS BANNER - WITH MAIN LINE AT THE TOP */}
          {(activeOrder.status === "REFUND_REQUESTED" || (activeOrder.refundRequests && activeOrder.refundRequests.length > 0)) && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/15 to-amber-950/20 p-5 sm:p-6 space-y-4 shadow-xl shadow-amber-950/30">
              {/* Highlight accent main line across the top */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <RotateCcw className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                      Active Refund Request
                    </span>
                    <h3 className="text-base sm:text-lg font-black font-mono text-white">
                      {activeOrder.refundRequests?.[0]?.refundNumber || "Refund Under Review"}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Status:</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {activeOrder.refundRequests?.[0]?.status === "PENDING"
                      ? "Under Customer Support Review"
                      : activeOrder.refundRequests?.[0]?.status || "In Review"}
                  </span>
                </div>
              </div>

              {/* Grid of refund details - just like order details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Requested Amount</span>
                  <span className="text-base font-black font-mono text-amber-300">
                    {activeOrder.refundRequests?.[0]?.requestedAmount?.toLocaleString() || activeOrder.totalAmount?.toLocaleString()} {activeOrder.currency}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Reason For Request</span>
                  <span className="text-xs font-semibold text-white">
                    {activeOrder.refundRequests?.[0]?.reason || "Defective / unredeemed key"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Submitted Date</span>
                  <span className="text-xs text-slate-300">
                    {activeOrder.refundRequests?.[0]?.createdAt
                      ? new Date(activeOrder.refundRequests[0].createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Recently submitted"}
                  </span>
                </div>
              </div>

              {/* Customer explanation */}
              {activeOrder.refundRequests?.[0]?.explanation && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Your Explanation:</span>
                  <p className="text-slate-200 leading-relaxed italic">
                    &ldquo;{activeOrder.refundRequests[0].explanation}&rdquo;
                  </p>
                </div>
              )}

              {/* Staff Response Note */}
              {activeOrder.refundRequests?.[0]?.adminCustomerNote && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
                  <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Staff Response Note:</span>
                  <p className="text-white font-medium">
                    {activeOrder.refundRequests[0].adminCustomerNote}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Customer Facing Note from Staff (Key delivery or notes!) */}
          {activeOrder.adminCustomerNote && (
            <div className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-400/40 space-y-3 shadow-lg shadow-cyan-950/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                  <KeyRound className="w-4 h-4" />
                  <span>Digital License Key & Activation Instructions:</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyKey(activeOrder.adminCustomerNote)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Details</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-xs sm:text-sm text-white font-mono whitespace-pre-line bg-black/70 p-4 rounded-xl border border-white/10 select-all leading-relaxed">
                {activeOrder.adminCustomerNote}
              </div>
            </div>
          )}

          {/* Status Timeline */}
          {activeOrder.statusTimeline && activeOrder.statusTimeline.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Status History & Timeline
              </h3>
              <div className="space-y-3 relative pl-6 border-l-2 border-blue-500/30">
                {activeOrder.statusTimeline.map((step: any, idx: number) => (
                  <div key={idx} className="relative space-y-1">
                    <span className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-[#030712]" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase">{step.toStatus}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(step.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {step.notes && (
                      <p className="text-xs text-slate-400">{step.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchased Items Snapshot */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="font-bold text-white text-base">Ordered Products</h3>
            <div className="divide-y divide-white/5 border-t border-b border-white/10">
              {activeOrder.items.map((item: any) => (
                <div key={item.id} className="py-4 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                      <Image
                        src={item.productImage || "/images/premikeys-logo.png"}
                        alt={item.productTitle}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <span className="font-bold text-white block">{item.productTitle}</span>
                      <span className="text-xs text-slate-400">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-white">
                    {item.lineTotal.toLocaleString()} {activeOrder.currency}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline pt-2">
              <span className="text-xs text-slate-400">Total Paid / Due</span>
              <span className="text-xl font-black text-cyan-300 font-mono">
                {activeOrder.totalAmount.toLocaleString()} {activeOrder.currency}
              </span>
            </div>
          </div>

          {/* Refund Status or Request Refund Trigger */}
          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {activeOrder.refundRequests && activeOrder.refundRequests.length > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1 w-full">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" />
                  Refund Request {activeOrder.refundRequests[0].refundNumber} ({activeOrder.refundRequests[0].status})
                </span>
                <p className="text-slate-300 text-[11px]">
                  Reason: {activeOrder.refundRequests[0].reason}. Amount: {activeOrder.refundRequests[0].requestedAmount} {activeOrder.currency}
                </p>
                {activeOrder.refundRequests[0].adminCustomerNote && (
                  <p className="text-white text-[11px] pt-1">
                    Staff Note: {activeOrder.refundRequests[0].adminCustomerNote}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <span className="text-xs text-slate-400 block">Issue with your order?</span>
                <button
                  type="button"
                  onClick={() => setShowRefundModal(true)}
                  className="mt-1 text-xs text-rose-400 hover:text-rose-300 underline font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Request a Refund for this Order</span>
                </button>
              </div>
            )}

            <Link
              href="/faq"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Questions about delivery & statuses?</span>
            </Link>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {showRefundModal && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1026] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <span>Submit Refund Request</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Reason for Refund
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
                >
                  <option value="Defective or unredeemed key" className="bg-slate-900">
                    Defective or unredeemed key
                  </option>
                  <option value="Accidental duplicate order" className="bg-slate-900">
                    Accidental duplicate order
                  </option>
                  <option value="Incorrect platform selected" className="bg-slate-900">
                    Incorrect platform selected
                  </option>
                  <option value="Order cancellation before fulfillment" className="bg-slate-900">
                    Order cancellation before fulfillment
                  </option>
                  <option value="Other" className="bg-slate-900">
                    Other Reason
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Detailed Explanation <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why you are requesting a refund..."
                  value={refundExplanation}
                  onChange={(e) => setRefundExplanation(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Requested Refund Amount ({activeOrder.currency})
                </label>
                <input
                  type="number"
                  placeholder={String(activeOrder.totalAmount)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value ? Number(e.target.value) : "")}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                />
                <span className="text-[11px] text-slate-500">
                  Default is full order amount ({activeOrder.totalAmount} {activeOrder.currency}).
                </span>
              </div>

              {refundError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {refundError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={refundSubmitting || !refundExplanation.trim()}
                  className="flex-1 py-3 rounded-xl font-bold text-xs text-white btn-danger disabled:opacity-50"
                >
                  {refundSubmitting ? "Submitting..." : "Submit Refund Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="px-5 py-3 rounded-xl text-xs font-semibold btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400">
          Loading order tracking...
        </div>
      }
    >
      <MyOrdersContent />
    </Suspense>
  );
}
