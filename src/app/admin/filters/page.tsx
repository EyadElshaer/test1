"use client";

import React, { useEffect, useState } from "react";
import { SlidersHorizontal, Plus, Edit, Trash2, X, CheckCircle2, AlertCircle, ListPlus } from "lucide-react";

export default function AdminFiltersPage() {
  const [filterGroups, setFilterGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Form Fields
  const [label, setLabel] = useState("");
  const [attributeKey, setAttributeKey] = useState("");
  const [filterType, setFilterType] = useState("CHECKBOX");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [options, setOptions] = useState<{ label: string; value: string }[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionValue, setNewOptionValue] = useState("");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadFilters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/filters");
      const data = await res.json();
      if (data.success) {
        setFilterGroups(data.filterGroups || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  const openCreateModal = () => {
    setEditingGroupId(null);
    setLabel("");
    setAttributeKey("");
    setFilterType("CHECKBOX");
    setDisplayOrder(filterGroups.length + 1);
    setIsActive(true);
    setOptions([]);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (group: any) => {
    setEditingGroupId(group.id);
    setLabel(group.label);
    setAttributeKey(group.attributeKey);
    setFilterType(group.filterType);
    setDisplayOrder(group.displayOrder);
    setIsActive(group.isActive);
    setOptions(group.options?.map((o: any) => ({ label: o.label, value: o.value })) || []);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const addOption = () => {
    if (!newOptionLabel.trim()) return;
    const val = newOptionValue.trim() || newOptionLabel.trim();
    setOptions((prev) => [...prev, { label: newOptionLabel.trim(), value: val }]);
    setNewOptionLabel("");
    setNewOptionValue("");
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDelete = async (id: string, groupLabel: string) => {
    if (!confirm(`Are you sure you want to delete filter '${groupLabel}'?`)) return;

    try {
      const res = await fetch(`/api/admin/filters/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Cannot delete filter group.");
        return;
      }
      loadFilters();
    } catch (e) {
      alert("Error deleting filter.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!label.trim() || (!editingGroupId && !attributeKey.trim())) {
      setFormError("Label and attributeKey are required.");
      return;
    }

    setIsSaving(true);
    const payload = {
      label: label.trim(),
      attributeKey: attributeKey.trim().toLowerCase(),
      filterType,
      displayOrder: Number(displayOrder) || 0,
      isActive,
      options,
    };

    try {
      const url = editingGroupId
        ? `/api/admin/filters/${editingGroupId}`
        : "/api/admin/filters";
      const method = editingGroupId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save filter.");
      }

      setFormSuccess("Filter group saved successfully!");
      setTimeout(() => {
        setIsModalOpen(false);
        loadFilters();
      }, 800);
    } catch (err: any) {
      setFormError(err.message || "Failed to save filter.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Catalog Filter Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Data-driven catalog filters. Adding or modifying filter options here updates the storefront catalog in real-time.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Filter Group</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            Loading filters...
          </div>
        ) : filterGroups.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs glass-card rounded-2xl p-6">
            No dynamic filters configured.
          </div>
        ) : (
          filterGroups.map((group) => (
            <div
              key={group.id}
              className="glass-card rounded-2xl p-5 border border-white/10 space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">{group.label}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      group.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {group.isActive ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                  key: <strong>{group.attributeKey}</strong> • Type: {group.filterType}
                </div>

                {/* Filter Options list */}
                <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Available Options ({group.options?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {group.options?.map((opt: any) => (
                      <span
                        key={opt.id}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-300 font-medium"
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(group)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Edit Filter</span>
                </button>
                <button
                  onClick={() => handleDelete(group.id, group.label)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5"
                  title="Delete Filter"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/20 shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white font-mono">
                {editingGroupId ? "Edit Filter Group" : "Create New Filter Group"}
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
                  Filter Label (Storefront Title) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Platform, Region, License Type"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Attribute Key (Internal Unique Identifier) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingGroupId}
                  placeholder="platform, region, license_type"
                  value={attributeKey}
                  onChange={(e) => setAttributeKey(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Filter Display Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  >
                    <option value="CHECKBOX" className="bg-slate-900">CHECKBOX (Multi-select)</option>
                    <option value="DROPDOWN" className="bg-slate-900">DROPDOWN</option>
                    <option value="BOOLEAN" className="bg-slate-900">BOOLEAN (Yes/No)</option>
                    <option value="RANGE" className="bg-slate-900">NUMERIC RANGE</option>
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

              {/* Options Management */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-xs font-bold text-white block">
                  Configurable Filter Options
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Option Label (e.g. Steam)"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    className="flex-1 glass-input px-3 py-1.5 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Value (optional)"
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    className="w-32 glass-input px-3 py-1.5 rounded-xl text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-secondary shrink-0"
                  >
                    Add
                  </button>
                </div>

                {options.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 max-h-36 overflow-y-auto">
                    {options.map((opt, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-cyan-200 flex items-center gap-1.5"
                      >
                        <span>{opt.label}</span>
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="hover:text-rose-400 p-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded bg-slate-900 text-blue-600"
                  />
                  <span>Activate Filter on Storefront</span>
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
                  {isSaving ? "Saving..." : "Save Filter Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
