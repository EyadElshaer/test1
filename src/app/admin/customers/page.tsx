"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Customer Deletion Modal
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      fetchCustomers(search);
    } catch (err: any) {
      alert(err.message || "Failed to delete customer.");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchCustomers = async (query = "") => {
    setLoading(true);
    try {
      const url = query ? `/api/admin/customers?search=${encodeURIComponent(query)}` : "/api/admin/customers";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(search);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const totalRegistered = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const totalOrdersPlaced = customers.reduce((sum, c) => sum + (c.totalOrdersCount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Admin CRM
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Customer Accounts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse registered customer accounts, inspect lifetime purchases, and review dispatched digital licenses.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

      {/* Search Toolbar */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-96">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input pl-9 pr-3 py-2 rounded-xl text-xs"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-semibold btn-secondary"
          >
            Search
          </button>
        </form>

        <span className="text-xs text-slate-400">
          Showing <strong className="text-cyan-400 font-mono">{customers.length}</strong> accounts
        </span>
      </div>

      {/* Customer List / Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs font-mono">
          Loading customer accounts and catalog purchase snapshots...
        </div>
      ) : customers.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/10 space-y-3">
          <Users className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Customers Found</h3>
          <p className="text-xs text-slate-400">
            {search ? "No customer accounts match your search query." : "No customers have registered yet."}
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase text-[10px] tracking-wider font-mono">
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Contact Details</th>
                  <th className="py-3.5 px-4 font-semibold">Total Orders</th>
                  <th className="py-3.5 px-4 font-semibold">Total Spent</th>
                  <th className="py-3.5 px-4 font-semibold">Registered</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Everything Bought</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    {/* Name */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-black text-xs uppercase shadow-sm">
                          {c.name ? c.name.charAt(0) : "U"}
                        </div>
                        <div>
                          <span className="font-bold text-white block group-hover:text-cyan-300 transition-colors text-sm">
                            {c.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {c.id.substring(0, 10)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-4 space-y-1">
                      {c.email ? (
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                          <Mail className="w-3 h-3 text-cyan-400" />
                          <span>{c.email}</span>
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
                          <Phone className="w-3 h-3 text-cyan-400" />
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
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">No phone</span>
                      )}
                    </td>

                    {/* Orders Count */}
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-white/5 border border-white/10 text-white">
                        {c.totalOrdersCount} orders
                      </span>
                    </td>

                    {/* Total Spent */}
                    <td className="py-4 px-4">
                      <span className="font-mono font-black text-cyan-300 text-sm">
                        {c.totalSpent.toLocaleString()} EGP
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-slate-400 text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(c);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 text-cyan-300 border border-blue-500/30 hover:bg-blue-600/30 transition-all inline-flex items-center gap-1"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Inspect ({c.everythingBought.length} items)</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EVERYTHING BOUGHT & CUSTOMER DETAILS MODAL */}
      {selectedCustomer && (
        <div
          onClick={() => setSelectedCustomer(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-[#070d1d] border border-white/20 shadow-2xl"
          >
            {/* Modal Top Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white text-lg font-black uppercase shadow-lg">
                  {selectedCustomer.name ? selectedCustomer.name.charAt(0) : "U"}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedCustomer.name}</h2>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedCustomer.email || "No email"} • {selectedCustomer.phone || "No phone"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Orders</span>
                  <span className="text-lg font-mono font-bold text-white">{selectedCustomer.totalOrdersCount}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lifetime Spend</span>
                  <span className="text-lg font-mono font-bold text-cyan-300">
                    {selectedCustomer.totalSpent.toLocaleString()} EGP
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Unique Products Bought</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">{selectedCustomer.everythingBought.length} items</span>
                </div>
              </div>

              {/* EVERYTHING BOUGHT LIST */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Everything This Customer Bought ({selectedCustomer.everythingBought.length})
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
                                <span className="text-[10px] text-slate-400">
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

              {/* PAST ORDERS TIMELINE */}
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
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>View in Orders Management</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

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
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 text-slate-300">
                            {order.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
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
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCustomerToDelete(selectedCustomer)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold btn-secondary"
              >
                Close Customer Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CUSTOMER CONFIRMATION MODAL */}
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
