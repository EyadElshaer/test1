"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  AlertCircle,
  ArrowRight,
  X,
  FileText,
  ExternalLink,
} from "lucide-react";

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Selected refund for detail/actions
  const [selectedRefund, setSelectedRefund] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [adminCustomerNote, setAdminCustomerNote] = useState("");
  const [adminInternalNote, setAdminInternalNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [updateError, setUpdateError] = useState("");

  // Screenshot modal preview
  const [screenshotModalUrl, setScreenshotModalUrl] = useState<string | null>(null);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/refunds?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRefunds(data.refunds || []);
      }
    } catch (err) {
      console.error("Failed to load refunds:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRefunds();
  };

  const openRefundDetail = (rf: any) => {
    setSelectedRefund(rf);
    setNewStatus(rf.status);
    setAdminCustomerNote(rf.adminCustomerNote || "");
    setAdminInternalNote(rf.adminInternalNote || "");
    setUpdateSuccess("");
    setUpdateError("");
  };

  const handleUpdateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefund) return;
    setIsUpdating(true);
    setUpdateSuccess("");
    setUpdateError("");

    try {
      const res = await fetch(`/api/admin/refunds/${selectedRefund.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          adminCustomerNote: adminCustomerNote.trim(),
          adminInternalNote: adminInternalNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update refund.");
      }

      setUpdateSuccess("Refund request updated successfully!");
      setSelectedRefund(data.refund);
      fetchRefunds();
    } catch (err: any) {
      setUpdateError(err.message || "Failed to update refund.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Refund Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review customer refund requests, assess defective key reports, and record manual transfer returns.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Total requests: <strong className="text-rose-400 font-mono text-sm">{refunds.length}</strong>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {["ALL", "PENDING", "APPROVED", "DONE", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === st
                  ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {st === "ALL" ? "All Requests" : st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-72">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search #RF, #DN, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input pl-9 pr-3 py-1.5 rounded-xl text-xs"
            />
          </div>
          <button type="submit" className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-primary">
            Filter
          </button>
        </form>
      </div>

      {/* Refunds Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-semibold">Refund ID</th>
                <th className="py-3.5 px-4 font-semibold">Order #</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Requested Amount</th>
                <th className="py-3.5 px-4 font-semibold">Reason</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    Loading refund requests...
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No refund requests found.
                  </td>
                </tr>
              ) : (
                refunds.map((rf) => (
                  <tr key={rf.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-300">
                      {rf.refundNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-cyan-300">
                      {rf.order?.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{rf.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{rf.customerPhone}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {rf.requestedAmount.toLocaleString()} EGP
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      {rf.reason}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
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
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openRefundDetail(rf)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                      >
                        Review Refund
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REFUND DETAIL & REVIEW MODAL */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-white/20 shadow-2xl my-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[11px] text-slate-400 block">Manage Refund</span>
                <h3 className="font-mono text-xl font-black text-rose-300">
                  {selectedRefund.refundNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRefund(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {updateSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{updateSuccess}</span>
              </div>
            )}
            {updateError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            {/* Info Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold text-cyan-400">Associated Order Details</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    {selectedRefund.order?.orderNumber}
                  </span>
                  <Link
                    href={`/admin/orders?search=${selectedRefund.order?.orderNumber}`}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>View in Orders</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="text-slate-300 text-[11px]">
                  Total: <strong>{selectedRefund.order?.totalAmount?.toLocaleString()} {selectedRefund.order?.currency || "EGP"}</strong>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Payment Method: <strong className="text-white">{selectedRefund.order?.paymentMethodName}</strong>
                </div>
                {selectedRefund.order?.paymentScreenshotUrl && (
                  <button
                    type="button"
                    onClick={() => setScreenshotModalUrl(selectedRefund.order.paymentScreenshotUrl)}
                    className="mt-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-500/10 text-cyan-300 border border-blue-500/30 hover:bg-blue-500/20 flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Customer Transfer Receipt</span>
                  </button>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold text-cyan-400">Customer Contact</span>
                <span className="font-bold text-white text-sm block">{selectedRefund.customerName}</span>
                <span className="font-mono text-slate-300 block select-all text-xs">{selectedRefund.customerPhone}</span>
                <span className="text-slate-400 block text-[11px] select-all">{selectedRefund.customerEmail}</span>
              </div>
            </div>

            {/* Order Items Breakdown Snapshot (if available) */}
            {selectedRefund.order?.items && selectedRefund.order.items.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
                  Original Order Items
                </span>
                <div className="divide-y divide-white/5 border rounded-xl border-white/10 overflow-hidden bg-black/20 text-xs">
                  {selectedRefund.order.items.map((item: any) => (
                    <div key={item.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white block">{item.productTitle}</span>
                        <span className="text-slate-400 text-[11px]">Qty: {item.quantity} × {item.salePrice} EGP</span>
                      </div>
                      <div className="font-mono font-bold text-slate-200 text-xs">
                        {item.lineTotal?.toLocaleString()} EGP
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Explanation */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1 text-xs">
              <span className="font-bold text-slate-400 uppercase text-[10px] block">
                Reason: <strong className="text-rose-300">{selectedRefund.reason}</strong>
              </span>
              <p className="text-slate-200 leading-relaxed whitespace-pre-line pt-1">
                {selectedRefund.explanation}
              </p>
            </div>

            {/* Status Change Form */}
            <form onSubmit={handleUpdateRefund} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Refund Decision Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-semibold"
                >
                  <option value="PENDING" className="bg-slate-900">PENDING (Under review)</option>
                  <option value="APPROVED" className="bg-slate-900">APPROVED (Approved; transfer queued)</option>
                  <option value="DONE" className="bg-slate-900">DONE (Refund transfer completed manually)</option>
                  <option value="REJECTED" className="bg-slate-900">REJECTED (Declined)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Customer-Visible Note & Explanation (Displayed in My Orders)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Refund approved. The amount was transferred back to your Vodafone Cash wallet #010... on 18 Oct."
                  value={adminCustomerNote}
                  onChange={(e) => setAdminCustomerNote(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Internal Staff Note
                </label>
                <input
                  type="text"
                  placeholder="Internal audit notes..."
                  value={adminInternalNote}
                  onChange={(e) => setAdminInternalNote(e.target.value)}
                  className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-slate-300">
                <strong>Manual Transfer Safeguard:</strong> Marking a refund as &quot;Done&quot; confirms you have manually issued the transfer through your bank/wallet app.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRefund(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold btn-secondary"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold btn-danger disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "Save Refund Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCREENSHOT FULLSCREEN PREVIEW MODAL */}
      {screenshotModalUrl && (
        <div
          onClick={() => setScreenshotModalUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-slate-950 p-4 space-y-3"
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 px-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white tracking-wide">
                  Customer Transfer Receipt Proof
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={screenshotModalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-cyan-300 border border-white/10 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Size</span>
                </a>
                <button
                  type="button"
                  onClick={() => setScreenshotModalUrl(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                  aria-label="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Direct Image Container */}
            <div className="relative flex-1 min-h-[50vh] max-h-[75vh] flex items-center justify-center bg-black/60 rounded-2xl p-2 overflow-auto">
              <img
                src={screenshotModalUrl}
                alt="Payment Evidence Proof"
                className="max-w-full max-h-[72vh] object-contain rounded-xl select-none shadow-2xl"
                loading="eager"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
