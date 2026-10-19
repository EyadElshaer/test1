"use client";

import React, { useEffect, useState } from "react";
import { CreditCard, Plus, Edit, Trash2, X, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";

export default function AdminPaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [transferReferenceHint, setTransferReferenceHint] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [publicPaymentUrl, setPublicPaymentUrl] = useState("");
  const [minAmount, setMinAmount] = useState<number | "">("");
  const [maxAmount, setMaxAmount] = useState<number | "">("");
  const [requireScreenshot, setRequireScreenshot] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payment-methods");
      const data = await res.json();
      if (data.success) {
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setCode("");
    setDescription("");
    setInstructions("");
    setRecipientName("");
    setAccountDetails("");
    setCurrency("EGP");
    setTransferReferenceHint("Transfer Reference / Sender Wallet Number");
    setDeepLink("");
    setPublicPaymentUrl("");
    setMinAmount("");
    setMaxAmount("");
    setRequireScreenshot(true);
    setDisplayOrder(paymentMethods.length + 1);
    setIsActive(true);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (pm: any) => {
    setEditingId(pm.id);
    setName(pm.name);
    setCode(pm.code);
    setDescription(pm.description || "");
    setInstructions(pm.instructions || "");
    setRecipientName(pm.recipientName || "");
    setAccountDetails(pm.accountDetails || "");
    setCurrency(pm.currency || "EGP");
    setTransferReferenceHint(pm.transferReferenceHint || "");
    setDeepLink(pm.deepLink || "");
    setPublicPaymentUrl(pm.publicPaymentUrl || "");
    setMinAmount(pm.minAmount || "");
    setMaxAmount(pm.maxAmount || "");
    setRequireScreenshot(Boolean(pm.requireScreenshot));
    setDisplayOrder(pm.displayOrder);
    setIsActive(Boolean(pm.isActive));
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, pmName: string) => {
    if (!confirm(`Are you sure you want to remove payment method '${pmName}'?`)) return;

    try {
      const res = await fetch(`/api/admin/payment-methods/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Cannot delete payment method.");
        return;
      }
      loadMethods();
    } catch (e) {
      alert("Error deleting payment method.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!name.trim() || !instructions.trim()) {
      setFormError("Name and payment instructions are required.");
      return;
    }

    setIsSaving(true);
    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      instructions: instructions.trim(),
      recipientName: recipientName.trim(),
      accountDetails: accountDetails.trim(),
      currency,
      transferReferenceHint: transferReferenceHint.trim(),
      deepLink: deepLink.trim(),
      publicPaymentUrl: publicPaymentUrl.trim(),
      minAmount: minAmount ? Number(minAmount) : null,
      maxAmount: maxAmount ? Number(maxAmount) : null,
      requireScreenshot,
      displayOrder: Number(displayOrder) || 0,
      isActive,
    };

    try {
      const url = editingId
        ? `/api/admin/payment-methods/${editingId}`
        : "/api/admin/payment-methods";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save payment method.");
      }

      setFormSuccess("Payment method saved successfully!");
      setTimeout(() => {
        setIsModalOpen(false);
        loadMethods();
      }, 800);
    } catch (err: any) {
      setFormError(err.message || "Failed to save payment method.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Payment Methods
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure manual payment channels (InstaPay, Vodafone Cash, Bank Wire, Crypto), recipient credentials, and deep links.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Payment Method</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            Loading payment channels...
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs glass-card rounded-2xl p-6">
            No payment methods configured.
          </div>
        ) : (
          paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="glass-card rounded-3xl p-6 border border-white/10 space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg">{pm.name}</h3>
                    <span className="font-mono text-xs text-cyan-400 font-semibold uppercase">
                      Code: {pm.code} • {pm.currency}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      pm.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {pm.isActive ? "Active" : "Disabled"}
                  </span>
                </div>

                {pm.description && (
                  <p className="text-xs text-slate-300 mt-2">{pm.description}</p>
                )}

                {/* Recipient & Account */}
                {pm.accountDetails && (
                  <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs space-y-1">
                    {pm.recipientName && (
                      <span className="text-slate-400 block text-[11px]">
                        Recipient: <strong className="text-white">{pm.recipientName}</strong>
                      </span>
                    )}
                    <span className="text-slate-400 block text-[11px]">
                      Account / Wallet: <strong className="font-mono text-cyan-300">{pm.accountDetails}</strong>
                    </span>
                  </div>
                )}

                {/* Badges row */}
                <div className="flex flex-wrap gap-2 pt-3 text-[10px]">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-cyan-300 border border-blue-500/20">
                    {pm.requireScreenshot ? "Requires Screenshot Proof" : "No Screenshot Needed"}
                  </span>
                  {pm.deepLink && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      App Deep Link Enabled
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(pm)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Method</span>
                </button>
                <button
                  onClick={() => handleDelete(pm.id, pm.name)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-white/5"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-white/20 shadow-2xl my-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white font-mono">
                {editingId ? "Edit Payment Method" : "Add Payment Method"}
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
                    Display Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="InstaPay Egypt, Vodafone Cash..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Unique Code
                  </label>
                  <input
                    type="text"
                    placeholder="INSTAPAY, VODAFONE_CASH"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="Instant, fee-free transfer via InstaPay IPA or mobile number."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Payment Instructions (Shown to customer at checkout) <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="1. Open your app...&#10;2. Transfer exact amount to...&#10;3. Upload confirmation screenshot below."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    placeholder="PremiKeys Digital Services"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Account / Wallet / IBAN Details
                  </label>
                  <input
                    type="text"
                    placeholder="premikeys@instapay or 0100-000-0000"
                    value={accountDetails}
                    onChange={(e) => setAccountDetails(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    App Deep Link (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="instapay:// or binance://"
                    value={deepLink}
                    onChange={(e) => setDeepLink(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Transfer Reference Hint
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sender Mobile Number"
                    value={transferReferenceHint}
                    onChange={(e) => setTransferReferenceHint(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={requireScreenshot}
                    onChange={(e) => setRequireScreenshot(e.target.checked)}
                    className="rounded bg-slate-900 text-blue-600"
                  />
                  <span>Require Transfer Screenshot Upload at Checkout</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded bg-slate-900 text-blue-600"
                  />
                  <span>Enable Payment Method on Storefront</span>
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
                  {isSaving ? "Saving..." : "Save Payment Method"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
