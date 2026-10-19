"use client";

import React, { useEffect, useState } from "react";
import { Tag, Plus, Edit, Trash2, X, CheckCircle2, AlertCircle, Percent, DollarSign, Calendar } from "lucide-react";

export default function AdminPromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxUses, setMaxUses] = useState<number | "">("");
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState(1);
  const [minSubtotal, setMinSubtotal] = useState<number | "">("");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | "">("");
  const [minProductPrice, setMinProductPrice] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadPromoCodes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes");
      const data = await res.json();
      if (data.success) {
        setPromoCodes(data.promoCodes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromoCodes();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setCode("");
    setDescription("");
    setDiscountType("PERCENTAGE");
    setDiscountValue("");
    setStartDate("");
    setEndDate("");
    setMaxUses("");
    setMaxUsesPerCustomer(1);
    setMinSubtotal("");
    setMaxDiscountAmount("");
    setMinProductPrice("");
    setIsActive(true);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setCode(p.code);
    setDescription(p.description || "");
    setDiscountType(p.discountType);
    setDiscountValue(p.discountValue);
    setStartDate(p.startDate ? new Date(p.startDate).toISOString().slice(0, 16) : "");
    setEndDate(p.endDate ? new Date(p.endDate).toISOString().slice(0, 16) : "");
    setMaxUses(p.maxUses || "");
    setMaxUsesPerCustomer(p.maxUsesPerCustomer || 1);
    setMinSubtotal(p.minSubtotal || "");
    setMaxDiscountAmount(p.maxDiscountAmount || "");
    setMinProductPrice(p.minProductPrice || "");
    setIsActive(Boolean(p.isActive));
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, promoCode: string) => {
    if (!confirm(`Are you sure you want to delete promo code '${promoCode}'?`)) return;

    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Cannot delete promo code.");
        return;
      }
      loadPromoCodes();
    } catch (e) {
      alert("Error deleting promo code.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!code.trim() || Number(discountValue) <= 0) {
      setFormError("Code and a positive discount value are required.");
      return;
    }

    setIsSaving(true);
    const payload = {
      code: code.trim().toUpperCase(),
      description: description.trim(),
      discountType,
      discountValue: Number(discountValue),
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      maxUses: maxUses ? Number(maxUses) : null,
      maxUsesPerCustomer: Number(maxUsesPerCustomer) || 1,
      minSubtotal: minSubtotal ? Number(minSubtotal) : null,
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      minProductPrice: minProductPrice ? Number(minProductPrice) : null,
      isActive,
    };

    try {
      const url = editingId
        ? `/api/admin/promo-codes/${editingId}`
        : "/api/admin/promo-codes";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save promo code.");
      }

      setFormSuccess("Promo code saved successfully!");
      setTimeout(() => {
        setIsModalOpen(false);
        loadPromoCodes();
      }, 800);
    } catch (err: any) {
      setFormError(err.message || "Failed to save promo code.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Promo Code Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure percentage and fixed discounts, minimum order limits, qualifying product price constraints, and global usage caps.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Promo Code</span>
        </button>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-semibold">Code</th>
                <th className="py-3.5 px-4 font-semibold">Type</th>
                <th className="py-3.5 px-4 font-semibold">Value</th>
                <th className="py-3.5 px-4 font-semibold">Min Subtotal</th>
                <th className="py-3.5 px-4 font-semibold">Min Item Price</th>
                <th className="py-3.5 px-4 font-semibold">Usage (Used / Max)</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    Loading promo codes...
                  </td>
                </tr>
              ) : promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No promo codes created yet.
                  </td>
                </tr>
              ) : (
                promoCodes.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-sm text-cyan-300 block select-all">
                        {p.code}
                      </span>
                      {p.description && (
                        <span className="text-[11px] text-slate-400 line-clamp-1">{p.description}</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {p.discountType}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                      {p.discountType === "PERCENTAGE" ? `${p.discountValue}%` : `${p.discountValue} EGP`}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {p.minSubtotal ? `${p.minSubtotal} EGP` : "None"}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-amber-300">
                      {p.minProductPrice ? `≥ ${p.minProductPrice} EGP` : "All"}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {p.currentUses} / {p.maxUses || "∞"}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {p.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.code)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-white/20 shadow-2xl my-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white font-mono">
                {editingId ? "Edit Promo Code" : "Create Promo Code"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}
            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Promo Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PREMI10"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Discount Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  >
                    <option value="PERCENTAGE" className="bg-slate-900">PERCENTAGE (%)</option>
                    <option value="FIXED" className="bg-slate-900">FIXED AMOUNT (EGP)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Discount Value ({discountType === "PERCENTAGE" ? "%" : "EGP"}) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder={discountType === "PERCENTAGE" ? "10" : "50"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value ? Number(e.target.value) : "")}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Get 10% off your digital keys order..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              {/* Special Prompt Requirement: Minimum Product Qualifying Price Rule */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <label className="text-xs font-bold text-amber-300 block">
                  Qualifying Minimum Product Price Rule
                </label>
                <input
                  type="number"
                  placeholder="e.g. 300"
                  value={minProductPrice}
                  onChange={(e) => setMinProductPrice(e.target.value ? Number(e.target.value) : "")}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                />
                <span className="text-[11px] text-slate-300 block leading-relaxed">
                  &quot;The promo code does not apply to products priced below a specified minimum price.&quot; If set (e.g. 300 EGP), only products with sale price ≥ 300 receive the discount.
                </span>
              </div>

              {/* Subtotal & Max Discount Cap */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Minimum Order Subtotal (EGP)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 250"
                    value={minSubtotal}
                    onChange={(e) => setMinSubtotal(e.target.value ? Number(e.target.value) : "")}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Max Discount Cap (EGP)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 300"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value ? Number(e.target.value) : "")}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Global Maximum Uses
                  </label>
                  <input
                    type="number"
                    placeholder="1000 (blank = unlimited)"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : "")}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Uses Per Customer
                  </label>
                  <input
                    type="number"
                    value={maxUsesPerCustomer}
                    onChange={(e) => setMaxUsesPerCustomer(Number(e.target.value) || 1)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full glass-input px-3 py-1.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded bg-slate-900 text-blue-600"
                  />
                  <span>Activate Promo Code</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl text-xs font-bold btn-primary disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Promo Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
