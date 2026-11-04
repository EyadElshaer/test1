"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  Send,
  ExternalLink,
  HelpCircle,
  Package,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function ContactPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [selectedTopic, setSelectedTopic] = useState("general");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
      })
      .catch(() => {});
  }, []);

  const rawPhone = settings.contact_whatsapp || "+20 100 000 0000";
  const cleanPhone = rawPhone.replace(/\D/g, ""); // e.g. 201000000000
  const contactEmail = settings.contact_email || "support@premikeys.com";
  const storeName = settings.store_name || "PremiKeys";

  // Pre-filled WhatsApp message based on selected topic
  const getWhatsAppMessage = (topic: string) => {
    switch (topic) {
      case "activation":
        return `Hello ${storeName} Support! I need help activating a software license key I purchased.`;
      case "order_status":
        return `Hello ${storeName} Support! I would like to check the status of my order payment verification.`;
      case "pre_sale":
        return `Hello ${storeName} Support! I have a question about a product license before placing an order.`;
      default:
        return `Hello ${storeName} Support! I need assistance with an order or product key.`;
    }
  };

  const whatsappHref = `https://wa.me/${cleanPhone || "201000000000"}?text=${encodeURIComponent(
    getWhatsAppMessage(selectedTopic)
  )}`;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Support Desk Online • Typical Reply: Under 15 Mins</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          How Can We <span className="text-gradient">Help You Today?</span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Need help choosing a genuine license, verifying your payment, or activating Windows and Office? Our team is available directly on WhatsApp and across our channels.
        </p>
      </div>

      {/* Featured WhatsApp Direct Hero Card */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-black/80 shadow-2xl shadow-emerald-950/50">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <MessageSquare className="w-4 h-4" />
              <span>Recommended Direct Channel</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Instant WhatsApp Support
            </h2>

            <p className="text-slate-300 text-sm leading-relaxed">
              Chat directly with our support specialists. Click below to automatically open WhatsApp with your chosen inquiry pre-filled and get prompt help.
            </p>

            {/* Quick Topic Selector */}
            <div className="pt-2 space-y-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Select your inquiry topic:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "general", label: "General Support" },
                  { id: "activation", label: "License Activation Help" },
                  { id: "order_status", label: "Track Order Status" },
                  { id: "pre_sale", label: "Product Inquiries" },
                ].map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedTopic === topic.id
                        ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                        : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/5"
                    }`}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile / Direct Action */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-500/25"
              >
                <MessageSquare className="w-5 h-5 fill-current" />
                <span>Open WhatsApp &amp; Chat Now</span>
                <ExternalLink className="w-4 h-4 opacity-75" />
              </a>

              <button
                onClick={() => handleCopy(rawPhone, "phone")}
                className="px-5 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all"
                title="Copy phone number"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{rawPhone}</span>
                {copied === "phone" && (
                  <span className="text-[10px] text-emerald-400 font-sans font-normal ml-1">
                    Copied!
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Right Support Hours & Perks */}
          <div className="lg:col-span-5 rounded-2xl bg-black/40 border border-white/10 p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Working Hours &amp; Guarantee</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between border-b border-white/5 pb-2.5">
                <span className="text-slate-400">Daily Working Hours:</span>
                <span className="font-semibold text-white font-mono">10:00 AM – 11:00 PM</span>
              </div>
              <div className="flex items-start justify-between border-b border-white/5 pb-2.5">
                <span className="text-slate-400">Time Zone:</span>
                <span className="font-semibold text-white">Cairo / GMT+2</span>
              </div>
              <div className="flex items-start justify-between border-b border-white/5 pb-2.5">
                <span className="text-slate-400">Manual Payment Verification:</span>
                <span className="font-semibold text-emerald-400">Instant (Within Minutes)</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-slate-400">License Replacement:</span>
                <span className="font-semibold text-cyan-400">100% Genuine Guarantee</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>All licenses are delivered with step-by-step activation instructions.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Other Channels & Socials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Email Support */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-cyan-400">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Email Support</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Prefer formal correspondence, invoice requests, or bulk corporate licensing inquiries? Email our support desk anytime.
            </p>
          </div>

          <div className="pt-2">
            <a
              href={`mailto:${contactEmail}`}
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <span>{contactEmail}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Telegram Updates & Alerts */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Telegram Channel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Follow our official Telegram community for flash license giveaways, new product drops, and instant status announcements.
            </p>
          </div>

          <div className="pt-2">
            <a
              href="https://t.me/premikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <span>Join @premikeys on Telegram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Self-Service Tracking & FAQ */}
        <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Track Your Order</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Already purchased a key? Track your verification progress or retrieve your digital license keys instantly.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Link
              href="/my-orders"
              className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Track Order</span>
            </Link>
            <Link
              href="/faq"
              className="py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors"
            >
              <span>FAQ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Social Accounts & Community */}
      <div className="glass-card rounded-3xl p-8 border border-white/10 text-center space-y-6">
        <div className="space-y-2 max-w-xl mx-auto">
          <h3 className="text-xl font-bold text-white">Join Our Community &amp; Social Channels</h3>
          <p className="text-xs text-slate-400">
            Connect with thousands of gamers, IT professionals, and software power users across the region.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp Community</span>
          </a>

          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-blue-500/20 text-slate-300 hover:text-blue-300 border border-white/10 hover:border-blue-500/30 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <span>Facebook Page</span>
          </a>

          <a
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <span>Discord Server</span>
          </a>

          <a
            href="https://t.me/premikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-white/10 hover:border-sky-500/30 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <Send className="w-4 h-4 text-sky-400" />
            <span>Telegram Channel</span>
          </a>
        </div>
      </div>
    </div>
  );
}
