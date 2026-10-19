"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Layers, Plus, Edit, Trash2, X, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCatId(null);
    setName("");
    setSlug("");
    setDescription("");
    setImage("");
    setDisplayOrder(categories.length + 1);
    setIsFeatured(false);
    setIsActive(true);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCatId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setImage(cat.image || "");
    setDisplayOrder(cat.displayOrder);
    setIsFeatured(cat.isFeatured);
    setIsActive(cat.isActive);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category '${name}'?`)) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Cannot delete category.");
        return;
      }
      loadCategories();
    } catch (e) {
      alert("Error deleting category.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!name.trim()) {
      setFormError("Category name is required.");
      return;
    }

    setIsSaving(true);
    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      image: image.trim(),
      displayOrder: Number(displayOrder) || 0,
      isFeatured,
      isActive,
    };

    try {
      const url = editingCatId
        ? `/api/admin/categories/${editingCatId}`
        : "/api/admin/categories";
      const method = editingCatId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save category.");
      }

      setFormSuccess("Category saved successfully!");
      setTimeout(() => {
        setIsModalOpen(false);
        loadCategories();
      }, 800);
    } catch (err: any) {
      setFormError(err.message || "Failed to save category.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Category Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize catalog groupings, configure featured categories, and manage navigation badges.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Slug</th>
                <th className="py-3.5 px-4 font-semibold">Products</th>
                <th className="py-3.5 px-4 font-semibold">Display Order</th>
                <th className="py-3.5 px-4 font-semibold">Featured</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                          {cat.image ? (
                            <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 font-mono text-[10px]">
                              CAT
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-white text-sm">{cat.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-cyan-300">/{cat.slug}</td>

                    <td className="py-3 px-4 text-slate-300 font-semibold">
                      {cat._count?.products || 0} active
                    </td>

                    <td className="py-3 px-4 text-slate-400 font-mono">{cat.displayOrder}</td>

                    <td className="py-3 px-4">
                      {cat.isFeatured ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          Featured
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">No</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          cat.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {cat.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full border border-white/20 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white font-mono">
                {editingCatId ? "Edit Category" : "Add New Category"}
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
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PC Games & Activations"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  placeholder="pc-games"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Category overview..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Cover Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
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

              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded bg-slate-900 text-blue-600"
                  />
                  <span>Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded bg-slate-900 text-blue-600"
                  />
                  <span>Active</span>
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
                  {isSaving ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
