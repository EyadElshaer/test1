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
  Send,
  Bell,
  ExternalLink,
  Key,
  RefreshCw,
  Zap,
  Link2,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestSuccess, setTelegramTestSuccess] = useState("");
  const [telegramTestError, setTelegramTestError] = useState("");
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);

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

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTelegramTestSuccess("");
    setTelegramTestError("");

    const botToken = settings.telegram_bot_token;
    const chatId = settings.telegram_chat_id;

    if (!botToken || !botToken.trim()) {
      setTelegramTestError("Please enter your Telegram Bot Token before testing.");
      setIsTestingTelegram(false);
      return;
    }

    if (!chatId || !chatId.trim()) {
      setTelegramTestError("Please enter your Telegram Chat ID before testing.");
      setIsTestingTelegram(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/telegram-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken, chatId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send test notification.");
      }

      setTelegramTestSuccess(data.message || "Test notification successfully delivered to your Telegram!");
      setTimeout(() => setTelegramTestSuccess(""), 6000);
    } catch (err: any) {
      setTelegramTestError(err.message || "Failed to connect to Telegram.");
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const checkWebhookStatus = async () => {
    try {
      const res = await fetch("/api/telegram/sync");
      const data = await res.json();
      if (data.success && data.webhookInfo) {
        setWebhookInfo(data.webhookInfo);
      }
    } catch {}
  };

  useEffect(() => {
    if (settings.telegram_bot_token) {
      checkWebhookStatus();
    }
  }, [settings.telegram_bot_token]);

  const handleRegisterWebhook = async () => {
    setIsRegisteringWebhook(true);
    setTelegramTestSuccess("");
    setTelegramTestError("");

    try {
      const siteUrl = (settings.site_url || window.location.origin).replace(/\/$/, "");
      const webhookUrl = `${siteUrl}/api/telegram/webhook`;

      const res = await fetch("/api/telegram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_webhook", webhookUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.description || data.error || "Failed to register webhook with Telegram.");
      }

      setTelegramTestSuccess(`Telegram Webhook active! URL: ${webhookUrl}`);
      checkWebhookStatus();
      setTimeout(() => setTelegramTestSuccess(""), 6000);
    } catch (err: any) {
      setTelegramTestError(err.message || "Failed to register webhook.");
    } finally {
      setIsRegisteringWebhook(false);
    }
  };

  const handleSyncUpdates = async () => {
    setIsPolling(true);
    setTelegramTestSuccess("");
    setTelegramTestError("");

    try {
      const res = await fetch("/api/telegram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "poll_now" }),
      });

      const data = await res.json();
      if (data.success) {
        setTelegramTestSuccess(
          data.processed > 0
            ? `Processed ${data.processed} actions from Telegram buttons!`
            : "No pending Telegram actions. All statuses are up to date."
        );
        setTimeout(() => setTelegramTestSuccess(""), 5000);
      } else {
        throw new Error(data.error || "Sync failed.");
      }
    } catch (err: any) {
      setTelegramTestError(err.message || "Failed to sync updates.");
    } finally {
      setIsPolling(false);
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

        {/* 4. Telegram Order Notifications & BotFather Setup */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-sky-400" />
                <span>Telegram Mobile Order Notifications</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Get an instant ping on your smartphone via Telegram every time a customer submits a new order.
              </p>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-2 rounded-xl border border-white/10 transition-colors">
              <input
                type="checkbox"
                checked={settings.telegram_enabled === "true" || settings.telegram_enabled === "1"}
                onChange={(e) =>
                  handleChange("telegram_enabled", e.target.checked ? "true" : "false")
                }
                className="rounded border-slate-700 text-sky-500 focus:ring-sky-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-semibold text-white">Enable Notifications</span>
            </label>
          </div>

          {/* Test alert banners */}
          {telegramTestSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{telegramTestSuccess}</span>
            </div>
          )}
          {telegramTestError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{telegramTestError}</span>
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Telegram Bot Token
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 748392019:AAHkYQ_82..."
                  value={settings.telegram_bot_token || ""}
                  onChange={(e) => handleChange("telegram_bot_token", e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono text-sky-300 placeholder:text-slate-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Generated by @BotFather when you create your bot.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Your Telegram Chat ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 123456789 or -100123456789"
                  value={settings.telegram_chat_id || ""}
                  onChange={(e) => handleChange("telegram_chat_id", e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono text-sky-300 placeholder:text-slate-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Your personal numeric ID or group chat ID where alerts will be sent.
              </p>
            </div>
          </div>

          {/* Webhook & Interactive Actions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Telegram Gateway:</span>
              {webhookInfo?.url ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Webhook Active ({webhookInfo.url.replace(/^https?:\/\//, "").slice(0, 30)}...)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span>Polling / Direct Mode Active</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncUpdates}
                disabled={isPolling}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Check for any actions clicked in Telegram"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? "animate-spin text-sky-400" : ""}`} />
                <span>{isPolling ? "Checking..." : "Sync Actions"}</span>
              </button>

              <button
                type="button"
                onClick={handleRegisterWebhook}
                disabled={isRegisteringWebhook}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Register webhook URL with Telegram for instant button callbacks"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{isRegisteringWebhook ? "Registering..." : "Connect Webhook"}</span>
              </button>

              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isTestingTelegram}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTestingTelegram ? "Sending Ping..." : "Send Test Ping"}</span>
              </button>
            </div>
          </div>

          {/* Capabilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <strong className="text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Payment Screenshot Photos Attached</span>
              </strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                When a customer uploads an InstaPay, Vodafone Cash, or wire transfer receipt, the actual screenshot image is attached to the notification for instant verification.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <strong className="text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interactive Approve / Reject Buttons</span>
              </strong>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Orders and refund requests arrive with interactive Telegram buttons. Tapping &quot;Approve&quot; or &quot;Reject&quot; instantly updates order and refund statuses on the live website.
              </p>
            </div>
          </div>

          {/* Step-by-Step BotFather Guide Card */}
          <div className="p-5 rounded-2xl bg-sky-950/20 border border-sky-500/20 space-y-4">
            <div className="flex items-center gap-2 text-sky-300 font-bold text-xs uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>How to Setup Your Telegram Bot with @BotFather (Takes 2 Minutes)</span>
            </div>

            <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li className="pl-1">
                <strong className="text-white">Open Telegram &amp; Find BotFather:</strong> Open Telegram on your phone or computer, search for{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 font-mono hover:underline inline-flex items-center gap-0.5"
                >
                  @BotFather <ExternalLink className="w-3 h-3 inline" />
                </a>{" "}
                (verified bot with a blue tick mark), and press <strong className="text-white">Start</strong>.
              </li>
              <li className="pl-1">
                <strong className="text-white">Create a New Bot:</strong> Send the command{" "}
                <code className="text-sky-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">/newbot</code>.
                When asked, give your bot a name (e.g. <em>PremiKeys Order Alerts</em>), and then choose a username ending in <code className="text-sky-300 font-mono">bot</code> (e.g. <em>premikeys_orders_bot</em>).
              </li>
              <li className="pl-1">
                <strong className="text-white">Copy the Bot Token:</strong> BotFather will send you a message with your <strong className="text-white">HTTP API Token</strong> (looks like <code className="text-sky-300 font-mono">712345678:ABCdefGHI...</code>). Copy it and paste it into the <strong className="text-white">Telegram Bot Token</strong> input above.
              </li>
              <li className="pl-1">
                <strong className="text-white">Start Your New Bot:</strong> Click on your bot&apos;s link (e.g. <code className="text-sky-300 font-mono">t.me/premikeys_orders_bot</code>) and press <strong className="text-white">START</strong>. This authorizes the bot to message you.
              </li>
              <li className="pl-1">
                <strong className="text-white">Get Your Chat ID:</strong> Search for the bot{" "}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 font-mono hover:underline inline-flex items-center gap-0.5"
                >
                  @userinfobot <ExternalLink className="w-3 h-3 inline" />
                </a>{" "}
                in Telegram and click <strong className="text-white">Start</strong>. It will immediately show your numeric <code className="text-sky-300 font-mono">Id</code> (e.g. <code className="text-sky-300 font-mono">123456789</code>). Copy and paste this into the <strong className="text-white">Your Telegram Chat ID</strong> field above.
              </li>
              <li className="pl-1">
                <strong className="text-white">Save and Test:</strong> Click <strong className="text-white">Save All Changes</strong> at the top, then press <strong className="text-white">Send Test Notification</strong>. You will immediately receive a test ping on your phone!
              </li>
            </ol>
          </div>
        </div>

        {/* 5. Google reCAPTCHA v3 Bot Protection */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Official Google reCAPTCHA v3 Protection</span>
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.recaptcha_enabled !== "false"}
                onChange={(e) => handleChange("recaptcha_enabled", e.target.checked ? "true" : "false")}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-300">Enabled</span>
            </label>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Google reCAPTCHA v3 provides invisible, non-intrusive bot defense for both Customer and Admin login portals without requiring checkboxes or puzzles. You can also configure keys in <code className="text-cyan-300">.env</code>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Google reCAPTCHA v3 Site Key (Client)
              </label>
              <input
                type="text"
                placeholder="e.g. 6Ld..."
                value={settings.recaptcha_site_key || ""}
                onChange={(e) => handleChange("recaptcha_site_key", e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Google reCAPTCHA v3 Secret Key (Server)
              </label>
              <input
                type="password"
                placeholder="e.g. 6Ld..."
                value={settings.recaptcha_secret_key || ""}
                onChange={(e) => handleChange("recaptcha_secret_key", e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              To generate your free keys, visit{" "}
              <a
                href="https://www.google.com/recaptcha/admin/create"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline hover:text-cyan-300 inline-flex items-center gap-0.5"
              >
                Google reCAPTCHA Console <ExternalLink className="w-3 h-3 inline" />
              </a>
              , select <strong>reCAPTCHA v3</strong>, and add your domains (e.g. <code className="text-slate-300 font-mono">localhost</code> and your production domain).
            </span>
          </div>
        </div>

        {/* 6. External Integrations Guide & Credentials Checklist */}
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
