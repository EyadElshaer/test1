"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  ShoppingBag,
  RotateCcw,
  Package,
  Layers,
  SlidersHorizontal,
  CreditCard,
  Tag,
  HelpCircle,
  Settings,
  Users,
  ShieldAlert,
} from "lucide-react";

interface StaffMember {
  id: string;
  username: string;
  email: string | null;
  role: string;
  permissions: string | null;
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { key: "orders", label: "Orders", description: "Review and manage incoming orders & license keys", icon: ShoppingBag },
  { key: "refunds", label: "Refund Requests", description: "Review customer refund claims and approvals", icon: RotateCcw },
  { key: "customers", label: "Customers CRM", description: "Inspect customer accounts and purchase histories", icon: Users },
  { key: "products", label: "Products Catalog", description: "Create and edit digital keys and software listings", icon: Package },
  { key: "categories", label: "Categories", description: "Manage software suites and taxonomy", icon: Layers },
  { key: "filters", label: "Catalog Filters", description: "Configure platforms, regions, and attributes", icon: SlidersHorizontal },
  { key: "payment-methods", label: "Payment Accounts", description: "Manage bank, wallet, and payment instructions", icon: CreditCard },
  { key: "promo-codes", label: "Promo Codes", description: "Create coupons and discounts", icon: Tag },
  { key: "faq", label: "FAQ Management", description: "Edit help center and customer Q&As", icon: HelpCircle },
  { key: "settings", label: "Store Settings", description: "Telegram alerts and global store configurations", icon: Settings },
  { key: "staff", label: "Staff & Permissions", description: "Manage administrator accounts and roles", icon: ShieldCheck },
];

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Form Fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [customPermissionsText, setCustomPermissionsText] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Deletion Modal
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (data.success) {
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error("Failed to load staff list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openCreateModal = () => {
    setEditingStaffId(null);
    setUsername("");
    setPassword("");
    setEmail("");
    setRole("ADMIN");
    setSelectedPermissions(["orders", "refunds"]);
    setCustomPermissionsText("orders, refunds");
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaffId(staff.id);
    setUsername(staff.username);
    setPassword("");
    setEmail(staff.email || "");
    setRole(staff.role as any);
    const perms = staff.permissions ? staff.permissions.split(",").map((s) => s.trim()).filter(Boolean) : [];
    setSelectedPermissions(perms);
    setCustomPermissionsText(staff.permissions || "");
    setModalError("");
    setIsModalOpen(true);
  };

  const handleTogglePermission = (key: string) => {
    let updated: string[];
    if (selectedPermissions.includes(key)) {
      updated = selectedPermissions.filter((k) => k !== key);
    } else {
      updated = [...selectedPermissions, key];
    }
    setSelectedPermissions(updated);
    setCustomPermissionsText(updated.join(", "));
  };

  const handleCustomPermissionsTextChange = (text: string) => {
    setCustomPermissionsText(text);
    const parsed = text
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    setSelectedPermissions(parsed);
  };

  const handleSelectAllPermissions = () => {
    const allKeys = AVAILABLE_PERMISSIONS.map((p) => p.key);
    setSelectedPermissions(allKeys);
    setCustomPermissionsText(allKeys.join(", "));
  };

  const handleClearPermissions = () => {
    setSelectedPermissions([]);
    setCustomPermissionsText("");
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    setSubmitting(true);

    const permissionsString = selectedPermissions.join(",");

    try {
      if (editingStaffId) {
        // Update existing
        const res = await fetch(`/api/admin/staff/${editingStaffId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role,
            permissions: role === "SUPER_ADMIN" ? null : permissionsString,
            email: email.trim() || null,
            ...(password ? { password } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to update staff account.");
        }
      } else {
        // Create new
        const res = await fetch("/api/admin/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
            email: email.trim() || null,
            role,
            permissions: role === "SUPER_ADMIN" ? null : permissionsString,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to create staff account.");
        }
      }

      setIsModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      setModalError(err.message || "Failed to save staff account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/staff/${staffToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete staff account.");
      }
      setStaffToDelete(null);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || "Failed to delete staff account.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Access Control &amp; RBAC
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Staff &amp; Admin Accounts
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Create specialized admin team accounts with restricted access. For instance, grant an agent access strictly to Orders and Refunds without exposing financial settings or user database.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white btn-primary shadow-lg shadow-blue-500/25 flex items-center gap-2 self-start sm:self-center"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Staff Account</span>
        </button>
      </div>

      {/* Staff Accounts Grid */}
      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-[#070d1d]/80">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Active Administrators &amp; Staff Members ({staffList.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-mono">
            Loading team members...
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No staff accounts found.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {staffList.map((staff) => {
              const perms = staff.permissions ? staff.permissions.split(",").map((s) => s.trim()).filter(Boolean) : [];
              const isSuper = staff.role === "SUPER_ADMIN";

              return (
                <div
                  key={staff.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow-md">
                        {staff.username.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-mono font-bold text-sm text-white">
                            {staff.username}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isSuper
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25"
                            }`}
                          >
                            {isSuper ? "SUPER ADMIN" : "STAFF"}
                          </span>
                        </div>
                        {staff.email && (
                          <p className="text-[11px] text-slate-400 font-mono">{staff.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Permissions Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1">
                        Accessible Sections:
                      </span>
                      {isSuper ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          ALL ACCESS (Full Administrative Rights)
                        </span>
                      ) : perms.length === 0 ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400">
                          No sections assigned
                        </span>
                      ) : (
                        perms.map((p) => {
                          const meta = AVAILABLE_PERMISSIONS.find((ap) => ap.key === p);
                          return (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/5 border border-white/10 text-slate-300 font-mono"
                            >
                              {meta ? meta.label : p}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => openEditModal(staff)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Permissions</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStaffToDelete(staff)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Staff Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-white/20 shadow-2xl my-8 space-y-6 bg-[#070d1d]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-cyan-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingStaffId ? `Edit Admin Account: ${username}` : "Create New Admin Staff Account"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure custom username, password, and granular permissions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaff} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Username <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingStaffId)}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. order_manager"
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono disabled:opacity-50"
                  />
                  {editingStaffId && (
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Username cannot be changed after creation.
                    </span>
                  )}
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Staff Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. staff@premikeys.com"
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  {editingStaffId ? "Reset Password (leave empty to keep unchanged)" : "Account Password"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!editingStaffId}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingStaffId ? "Enter new password if resetting..." : "At least 6 characters"}
                    className="w-full glass-input pl-9 pr-10 py-2.5 rounded-xl text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Account Authority Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("ADMIN")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      role === "ADMIN"
                        ? "bg-blue-600/20 border-cyan-400 text-white"
                        : "glass-card text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="font-bold text-xs">Standard Staff (Granular)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Limited strictly to checked permissions below.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("SUPER_ADMIN")}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      role === "SUPER_ADMIN"
                        ? "bg-purple-600/20 border-purple-400 text-white"
                        : "glass-card text-slate-400 hover:text-white"
                    }`}
                  >
                    <div className="font-bold text-xs text-purple-300">Super Administrator</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Unrestricted access to all dashboard areas.
                    </div>
                  </button>
                </div>
              </div>

              {/* Granular Permissions Section */}
              {role === "ADMIN" && (
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-white uppercase tracking-wider block">
                        Assigned Section Permissions
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Check each dashboard area this staff account is authorized to view &amp; manage.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllPermissions}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={handleClearPermissions}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Checkbox Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const isChecked = selectedPermissions.includes(perm.key);
                      const Icon = perm.icon;

                      return (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() => handleTogglePermission(perm.key)}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                            isChecked
                              ? "bg-cyan-500/15 border-cyan-400/50 text-white shadow-md shadow-cyan-500/10"
                              : "glass-card border-white/5 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border ${
                              isChecked
                                ? "bg-cyan-500 border-cyan-400 text-slate-950 font-black"
                                : "border-white/20 bg-black/40"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold block">{perm.label}</span>
                            <span className="text-[10px] text-slate-400 block line-clamp-1">
                              {perm.description}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Direct Text Box for Custom Permissions */}
                  <div className="pt-2">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Direct Permissions String (Comma-Separated)
                    </label>
                    <input
                      type="text"
                      value={customPermissionsText}
                      onChange={(e) => handleCustomPermissionsTextChange(e.target.value)}
                      placeholder="e.g. orders, refunds, products"
                      className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono text-cyan-300"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Edit comma-separated keys directly if needed. Synced live with checkboxes above.
                    </span>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-2.5 pt-4 border-t border-white/10 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white btn-primary shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                  {submitting ? "Saving Staff..." : editingStaffId ? "Update Staff Account" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE STAFF CONFIRMATION MODAL */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1026] border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Admin Staff?</h3>
                <p className="text-xs text-rose-300 font-mono">{staffToDelete.username}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete administrator account <strong className="text-white font-mono">{staffToDelete.username}</strong> ({staffToDelete.role})?
            </p>
            <p className="text-[11px] text-slate-400 bg-white/[0.03] p-3 rounded-xl border border-white/5">
              ⚠️ This will immediately terminate all active sessions for this account. They will no longer be able to log in.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setStaffToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteStaff}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
