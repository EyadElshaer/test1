"use client";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Mail,
  Smartphone,
  CreditCard,
  Globe2,
  HelpCircle,
  FileCode,
  Info,
  ShieldCheck,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess("");
    setSaveError("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save settings.");
      }

      setSaveSuccess("Store settings updated successfully!");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="text-xs text-slate-500 py-12 text-center">Loading settings...</div>;
  }

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Store Settings & Integrations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Brand identity, storefront copy, contact numbers, and external provider integration guides.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl text-xs font-bold btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/25 shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save All Changes"}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. General Branding */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-white/10 pb-3">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <span>Store Identity & URLs</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Store Name
              </label>
              <input
                type="text"
                value={settings.store_name || "PremiKeys"}
                onChange={(e) => handleChange("store_name", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Website Public URL
              </label>
              <input
                type="text"
                value={settings.site_url || "https://premikeys.com"}
                onChange={(e) => handleChange("site_url", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Store Base Currency
              </label>
              <input
                type="text"
                value={settings.currency || "EGP"}
                onChange={(e) => handleChange("currency", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Contact & Support Email
              </label>
              <input
                type="email"
                value={settings.contact_email || "support@premikeys.com"}
                onChange={(e) => handleChange("contact_email", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                WhatsApp / Support Mobile
              </label>
              <input
                type="text"
                value={settings.contact_whatsapp || "+20 100 000 0000"}
                onChange={(e) => handleChange("contact_whatsapp", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2. Homepage Copy & Announcement Ticker */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-white/10 pb-3">
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>Storefront Copy & Promotional Banner</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Top Announcement Ticker Banner
              </label>
              <input
                type="text"
                value={settings.announcement_banner || ""}
                onChange={(e) => handleChange("announcement_banner", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Homepage Hero Headline
              </label>
              <input
                type="text"
                value={settings.hero_heading || "Unleash Pure Gaming & Pro Software"}
                onChange={(e) => handleChange("hero_heading", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Homepage Hero Subheading
              </label>
              <textarea
                rows={2}
                value={settings.hero_subheading || ""}
                onChange={(e) => handleChange("hero_subheading", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Footer Brand Summary Text
              </label>
              <textarea
                rows={2}
                value={settings.footer_text || ""}
                onChange={(e) => handleChange("footer_text", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* 3. Customer Status Descriptions */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2 border-b border-white/10 pb-3">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Customer-Facing Order Status Messages</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-xs font-semibold text-amber-300 block mb-1">
                PENDING (When order and proof are submitted)
              </label>
              <input
                type="text"
                value={settings.status_desc_pending || ""}
                onChange={(e) => handleChange("status_desc_pending", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-blue-400 block mb-1">
                APPROVED (When manual payment is verified)
              </label>
              <input
                type="text"
                value={settings.status_desc_approved || ""}
                onChange={(e) => handleChange("status_desc_approved", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-emerald-400 block mb-1">
                DONE (When key is delivered and order complete)
              </label>
              <input
                type="text"
                value={settings.status_desc_done || ""}
                onChange={(e) => handleChange("status_desc_done", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-rose-400 block mb-1">
                REJECTED (When transfer proof is invalid)
              </label>
              <input
                type="text"
                value={settings.status_desc_rejected || ""}
                onChange={(e) => handleChange("status_desc_rejected", e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* 4. External Integrations Guide & Credentials Checklist */}
        <div className="p-6 rounded-3xl bg-blue-950/30 border border-blue-500/30 space-y-4 text-xs">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>External Credentials & Third-Party Service Checklist</span>
          </div>

          <p className="text-slate-300 leading-relaxed">
            PremiKeys functions completely out-of-the-box with full database persistence, manual payment verification, screenshot storage, customer order tracking, and refund workflows. If you wish to enable automated transactional emails or live SMS gateways, configure the following environment variables in <code className="text-cyan-300">.env</code>:
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <strong className="text-white block">Email Dispatch Integration (SMTP / Resend / SendGrid):</strong>
              <p className="text-slate-400">
                To send automated receipt emails on status change, set <code className="text-cyan-400">EMAIL_SERVER_HOST</code>, <code className="text-cyan-400">EMAIL_SERVER_USER</code>, and <code className="text-cyan-400">EMAIL_SERVER_PASSWORD</code> in <code className="text-cyan-400">.env</code>. Until set, order updates remain safely tracked via My Orders.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <strong className="text-white block">SMS OTP Integration (Twilio / Unifonic):</strong>
              <p className="text-slate-400">
                For live SMS one-time codes on phone lookups, set <code className="text-cyan-400">SMS_API_KEY</code> and <code className="text-cyan-400">SMS_SENDER_ID</code>. In local/testing mode without an active key, the verification OTP is provided in the development response to enable instant verification testing.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <strong className="text-white block">Production Database Connection (Supabase / PostgreSQL):</strong>
              <p className="text-slate-400">
                For production deployments on Vercel / Railway / VPS, replace <code className="text-cyan-400">DATABASE_URL=&quot;file:./dev.db&quot;</code> with your PostgreSQL / Supabase connection pool string.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 rounded-xl text-xs font-bold btn-primary shadow-xl shadow-blue-500/30"
          >
            {isSaving ? "Saving Settings..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
