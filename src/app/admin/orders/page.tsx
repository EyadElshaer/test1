"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  CreditCard,
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  KeyRound,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  AlertCircle,
  X,
} from "lucide-react";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Selected order for detail view / editing
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [adminCustomerNote, setAdminCustomerNote] = useState("");
  const [adminInternalNote, setAdminInternalNote] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [updateError, setUpdateError] = useState("");

  // Screenshot modal preview
  const [screenshotModalUrl, setScreenshotModalUrl] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      params.set("limit", "15");

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setTotalOrders(data.pagination?.total || 0);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const openOrderDetail = async (orderId: string) => {
    setUpdateSuccess("");
    setUpdateError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.order);
        setNewStatus(data.order.status);
        setAdminCustomerNote(data.order.adminCustomerNote || "");
        setAdminInternalNote(data.order.adminInternalNote || "");
      }
    } catch (err) {
      console.error("Failed to fetch order detail:", err);
    }
  };

  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsUpdatingStatus(true);
    setUpdateSuccess("");
    setUpdateError("");

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
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
        throw new Error(data.error || "Failed to update order status.");
      }

      setUpdateSuccess("Order status and customer notes updated successfully!");
      setSelectedOrder(data.order);
      // Refresh list
      fetchOrders();
    } catch (err: any) {
      setUpdateError(err.message || "Failed to update order.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Order Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review customer submissions, verify manual payment proofs, dispatch license keys, and track status transitions.
          </p>
        </div>
        <div className="text-xs text-slate-400">
          Total in system: <strong className="text-cyan-400 font-mono text-sm">{totalOrders}</strong>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {["ALL", "PENDING", "APPROVED", "DONE", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {st === "ALL" ? "All Statuses" : st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-72">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search #DN, name, phone..."
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

      {/* Orders Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-semibold">Order Number</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold">Items</th>
                <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                <th className="py-3.5 px-4 font-semibold">Payment Method</th>
                <th className="py-3.5 px-4 font-semibold">Screenshot</th>
                <th className="py-3.5 px-4 font-semibold">Order Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Order Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                      {ord.orderNumber}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{ord.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{ord.customerPhone}</div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(ord.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Items count */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {ord.items?.length || 0} item(s)
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                      {ord.totalAmount.toLocaleString()} {ord.currency}
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {ord.paymentMethodName}
                    </td>

                    {/* Payment Screenshot */}
                    <td className="py-3.5 px-4">
                      {ord.paymentScreenshotUrl ? (
                        <button
                          type="button"
                          onClick={() => setScreenshotModalUrl(ord.paymentScreenshotUrl)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-500/10 text-cyan-300 border border-blue-500/30 hover:bg-blue-500/20 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Proof</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">None</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
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

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openOrderDetail(ord.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                      >
                        Review Order
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg bg-white/5 disabled:opacity-30 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg bg-white/5 disabled:opacity-30 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ORDER DETAILS & STATUS UPDATE MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-3xl w-full border border-white/20 shadow-2xl my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <span className="text-[11px] text-slate-400 block">Manage Order</span>
                <h3 className="font-mono text-xl sm:text-2xl font-black text-cyan-300">
                  {selectedOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification messages */}
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

            {/* Customer Details & Payment Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Customer Box */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="font-bold text-white uppercase tracking-wider text-[11px] block text-cyan-400">
                  Customer Information
                </span>
                <div>
                  <span className="text-slate-400 block text-[10px]">Name:</span>
                  <span className="font-semibold text-white text-sm">{selectedOrder.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Phone Number:</span>
                  <span className="font-mono font-semibold text-white select-all">{selectedOrder.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Email Address:</span>
                  <span className="font-semibold text-white select-all">{selectedOrder.customerEmail}</span>
                </div>
                {selectedOrder.customerNotes && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Customer Note:</span>
                    <span className="text-slate-300 italic">{selectedOrder.customerNotes}</span>
                  </div>
                )}
              </div>

              {/* Payment Box */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="font-bold text-white uppercase tracking-wider text-[11px] block text-cyan-400">
                  Payment Transfer Details
                </span>
                <div>
                  <span className="text-slate-400 block text-[10px]">Payment Method:</span>
                  <span className="font-semibold text-white">{selectedOrder.paymentMethodName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Transfer Reference:</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {selectedOrder.paymentReference || "Not provided by customer"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Proof Screenshot:</span>
                  {selectedOrder.paymentScreenshotUrl ? (
                    <button
                      type="button"
                      onClick={() => setScreenshotModalUrl(selectedOrder.paymentScreenshotUrl)}
                      className="mt-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600/30 text-cyan-300 border border-blue-500/40 hover:bg-blue-600/50 flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Uploaded Transfer Receipt</span>
                    </button>
                  ) : (
                    <span className="text-slate-500 italic">No screenshot uploaded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Historical Order Items Snapshot */}
            <div className="space-y-3">
              <span className="font-bold text-white text-xs uppercase tracking-wider block">
                Purchased Digital Keys & Items Snapshot
              </span>
              <div className="divide-y divide-white/5 border rounded-2xl border-white/10 overflow-hidden bg-black/20">
                {selectedOrder.items?.map((item: any) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                        <Image
                          src={item.productImage || "/images/premikeys-logo.png"}
                          alt={item.productTitle}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-white block">{item.productTitle}</span>
                        <span className="text-slate-400 text-[11px]">Qty: {item.quantity} × {item.salePrice} {selectedOrder.currency}</span>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-white text-sm">
                      {item.lineTotal.toLocaleString()} {selectedOrder.currency}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="flex justify-between items-baseline pt-2 px-1 text-xs">
                <span className="text-slate-400">
                  Subtotal: {selectedOrder.subtotal} {selectedOrder.currency}
                  {selectedOrder.discountAmount > 0 && ` | Promo (${selectedOrder.promoCodeCode}): -${selectedOrder.discountAmount} ${selectedOrder.currency}`}
                </span>
                <span className="font-mono text-base font-black text-cyan-300">
                  Final Total: {selectedOrder.totalAmount.toLocaleString()} {selectedOrder.currency}
                </span>
              </div>
            </div>

            {/* Status Change Form */}
            <form onSubmit={handleUpdateOrderStatus} className="pt-4 border-t border-white/10 space-y-4">
              <span className="font-bold text-white text-xs uppercase tracking-wider block text-cyan-400">
                Update Order Status & Dispatch License Key
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Order Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <option value="PENDING" className="bg-slate-900">PENDING (Awaiting Review)</option>
                    <option value="APPROVED" className="bg-slate-900">APPROVED (Payment Verified)</option>
                    <option value="DONE" className="bg-slate-900">DONE (Key Delivered / Complete)</option>
                    <option value="REJECTED" className="bg-slate-900">REJECTED (Payment Declined)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Internal Staff Note (Private to Admins)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bank txn #48291 verified in CIB portal"
                    value={adminInternalNote}
                    onChange={(e) => setAdminInternalNote(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Customer-Visible Note (Key Delivery Field!) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Customer-Visible Note & License Key Code <span className="text-cyan-400 font-bold">(Displayed in customer&apos;s My Orders!)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter 25-digit activation key or customer instructions here... e.g.&#10;Key: W269N-WFGWX-YVC9B-4J6C9-T83GX&#10;Activation guide: Visit Settings > Activation > Change Product Key."
                  value={adminCustomerNote}
                  onChange={(e) => setAdminCustomerNote(e.target.value)}
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-7 py-2.5 rounded-xl text-xs font-bold btn-primary shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {isUpdatingStatus ? "Updating..." : "Save Order Status & Notes"}
                </button>
              </div>
            </form>

            {/* Audit History Timeline */}
            {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  Status Change History Log
                </span>
                <div className="space-y-1.5 text-[11px] text-slate-400">
                  {selectedOrder.statusHistory.map((h: any) => (
                    <div key={h.id} className="p-2 rounded-lg bg-white/[0.01] flex items-center justify-between">
                      <div>
                        <strong className="text-white uppercase">{h.fromStatus} → {h.toStatus}</strong>
                        {h.notes && <span className="ml-2 text-slate-400 italic">({h.notes})</span>}
                      </div>
                      <div className="font-mono text-slate-500">
                        by {h.changedBy} • {new Date(h.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCREENSHOT FULLSCREEN PREVIEW MODAL */}
      {screenshotModalUrl && (
        <div
          onClick={() => setScreenshotModalUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full h-[80vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black">
            <Image
              src={screenshotModalUrl}
              alt="Payment Evidence Proof"
              fill
              className="object-contain"
            />
            <div className="absolute top-4 right-4 bg-black/70 px-3 py-1.5 rounded-xl text-xs text-white border border-white/10 flex items-center gap-2">
              <span>Payment Proof Verified Storage</span>
              <button
                type="button"
                onClick={() => setScreenshotModalUrl(null)}
                className="p-1 hover:text-rose-400"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
