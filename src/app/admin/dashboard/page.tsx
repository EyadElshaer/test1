"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
        }
      })
      .catch((err) => console.error("Error loading admin stats:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800/60 rounded w-1/4 skeleton-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900/60 rounded-2xl border border-white/5 skeleton-shimmer gpu-layer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time database metrics, manual payment reconciliations, and fulfillment queue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders?status=PENDING"
            className="px-4 py-2 rounded-xl text-xs font-bold btn-primary flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Review Pending ({stats.pendingOrders})</span>
          </Link>
        </div>
      </div>

      {/* REVENUE & FINANCIAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Confirmed Revenue Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-emerald-500/30 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Verified Revenue
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats.confirmedRevenue.toLocaleString()} <span className="text-lg text-emerald-400">EGP</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Accrued exclusively from verified manual payments in <strong>Approved</strong> and <strong>Done</strong> status.
            </p>
          </div>
        </div>

        {/* Total Submitted Order Value Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-blue-500/30 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              Total Order Submissions
            </span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats.totalSubmittedValue.toLocaleString()} <span className="text-lg text-cyan-300">EGP</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cumulative gross submitted value including pending reviews and unverified transfers.
            </p>
          </div>
        </div>
      </div>

      {/* METRIC PILLS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link
          href="/admin/orders"
          className="glass-card rounded-2xl p-4 border border-white/5 hover:border-cyan-400/30 space-y-2 block"
        >
          <span className="text-[11px] text-slate-400 font-semibold block">Total Orders</span>
          <div className="text-2xl font-bold font-mono text-white">{stats.totalOrders}</div>
        </Link>

        <Link
          href="/admin/orders?status=PENDING"
          className="glass-card rounded-2xl p-4 border border-amber-500/20 hover:border-amber-400 space-y-2 block bg-amber-500/[0.02]"
        >
          <span className="text-[11px] text-amber-400 font-semibold block">Pending Review</span>
          <div className="text-2xl font-bold font-mono text-amber-300">{stats.pendingOrders}</div>
        </Link>

        <Link
          href="/admin/orders?status=APPROVED"
          className="glass-card rounded-2xl p-4 border border-blue-500/20 hover:border-blue-400 space-y-2 block"
        >
          <span className="text-[11px] text-blue-400 font-semibold block">Approved Orders</span>
          <div className="text-2xl font-bold font-mono text-blue-300">{stats.approvedOrders}</div>
        </Link>

        <Link
          href="/admin/orders?status=DONE"
          className="glass-card rounded-2xl p-4 border border-emerald-500/20 hover:border-emerald-400 space-y-2 block"
        >
          <span className="text-[11px] text-emerald-400 font-semibold block">Completed (Done)</span>
          <div className="text-2xl font-bold font-mono text-emerald-300">{stats.doneOrders}</div>
        </Link>

        <Link
          href="/admin/refunds?status=PENDING"
          className="glass-card rounded-2xl p-4 border border-rose-500/20 hover:border-rose-400 space-y-2 block bg-rose-500/[0.02]"
        >
          <span className="text-[11px] text-rose-400 font-semibold block">Pending Refunds</span>
          <div className="text-2xl font-bold font-mono text-rose-300">{stats.pendingRefunds}</div>
        </Link>

        <Link
          href="/admin/products"
          className="glass-card rounded-2xl p-4 border border-white/5 hover:border-cyan-400/30 space-y-2 block"
        >
          <span className="text-[11px] text-slate-400 font-semibold block">Published Products</span>
          <div className="text-2xl font-bold font-mono text-white">{stats.publishedProducts}</div>
        </Link>
      </div>

      {/* TABLES SECTION: Recent Orders & Recent Refunds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders (8 cols) */}
        <div className="lg:col-span-8 glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-white text-base">Recent Orders</h3>
            <Link
              href="/admin/orders"
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No orders recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 font-semibold">Order</th>
                    <th className="py-2.5 font-semibold">Customer</th>
                    <th className="py-2.5 font-semibold">Method</th>
                    <th className="py-2.5 font-semibold">Amount</th>
                    <th className="py-2.5 font-semibold">Status</th>
                    <th className="py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.recentOrders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono font-bold text-cyan-300">{ord.orderNumber}</td>
                      <td className="py-3 font-medium text-white">{ord.customerName}</td>
                      <td className="py-3 text-slate-400">{ord.paymentMethodName}</td>
                      <td className="py-3 font-mono font-semibold text-white">
                        {ord.totalAmount.toLocaleString()} {ord.currency}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ord.status === "PENDING"
                              ? "status-badge-pending"
                              : ord.status === "APPROVED"
                              ? "status-badge-approved"
                              : ord.status === "DONE"
                              ? "status-badge-done"
                              : "status-badge-rejected"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/admin/orders`}
                          className="text-cyan-400 hover:underline font-semibold"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Refunds (4 cols) */}
        <div className="lg:col-span-4 glass-card rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="font-bold text-white text-base">Refund Requests</h3>
            <Link
              href="/admin/refunds"
              className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats.recentRefunds.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No refund requests recorded.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentRefunds.map((rf: any) => (
                <div
                  key={rf.id}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-rose-300">{rf.refundNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        rf.status === "PENDING"
                          ? "status-badge-pending"
                          : rf.status === "APPROVED"
                          ? "status-badge-approved"
                          : rf.status === "DONE"
                          ? "status-badge-done"
                          : "status-badge-rejected"
                      }`}
                    >
                      {rf.status}
                    </span>
                  </div>
                  <div className="text-slate-300 font-medium">Order: {rf.order?.orderNumber}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">Reason: {rf.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
