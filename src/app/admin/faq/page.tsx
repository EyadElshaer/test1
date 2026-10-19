"use client";

import React, { useEffect, useState } from "react";
import { HelpCircle, Plus, Edit, Trash2, X, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminFaqPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [category, setCategory] = useState("General");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/faq");
      const data = await res.json();
      if (data.success) {
        setFaqs(data.faqs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setCategory("General");
    setQuestion("");
    setAnswer("");
    setDisplayOrder(faqs.length + 1);
    setIsPublished(true);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (f: any) => {
    setEditingId(f.id);
    setCategory(f.category);
    setQuestion(f.question);
    setAnswer(f.answer);
    setDisplayOrder(f.displayOrder);
    setIsPublished(f.isPublished);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, q: string) => {
    if (!confirm(`Are you sure you want to delete FAQ '${q}'?`)) return;

    try {
      const res = await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Cannot delete FAQ.");
        return;
      }
      loadFaqs();
    } catch (e) {
      alert("Error deleting FAQ.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!question.trim() || !answer.trim()) {
      setFormError("Question and answer are required.");
      return;
    }

    setIsSaving(true);
    const payload = {
      category,
      question: question.trim(),
      answer: answer.trim(),
      displayOrder: Number(displayOrder) || 0,
      isPublished,
    };

    try {
      const url = editingId ? `/api/admin/faq/${editingId}` : "/api/admin/faq";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save FAQ.");
      }

      setFormSuccess("FAQ saved successfully!");
      setTimeout(() => {
        setIsModalOpen(false);
        loadFaqs();
      }, 800);
    } catch (err: any) {
      setFormError(err.message || "Failed to save FAQ.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            FAQ Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain customer self-service answers for ordering, manual payment proofs, license delivery, and refunds.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New FAQ</span>
        </button>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Question</th>
                <th className="py-3.5 px-4 font-semibold">Display Order</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                    Loading FAQs...
                  </td>
                </tr>
              ) : faqs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No FAQs created yet.
                  </td>
                </tr>
              ) : (
                faqs.map((f) => (
                  <tr key={f.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-cyan-300 border border-blue-500/20">
                        {f.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white max-w-md">
                      <div>{f.question}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 font-normal mt-0.5">
                        {f.answer}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {f.displayOrder}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.isPublished
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {f.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(f)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id, f.question)}
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
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/20 shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white font-mono">
                {editingId ? "Edit FAQ" : "Add FAQ Question"}
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
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  >
                    <option value="Ordering" className="bg-slate-900">Ordering</option>
                    <option value="Payments" className="bg-slate-900">Payments</option>
                    <option value="Delivery" className="bg-slate-900">Delivery</option>
                    <option value="Refunds" className="bg-slate-900">Refunds</option>
                    <option value="General" className="bg-slate-900">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Question <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How do I redeem my Windows 11 key?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Answer <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Comprehensive answer..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded bg-slate-900 text-blue-600"
                  />
                  <span>Publish to Public FAQ Page</span>
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
                  {isSaving ? "Saving..." : "Save FAQ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
