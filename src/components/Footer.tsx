"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ShieldCheck, Mail, Phone, Lock, ExternalLink, HelpCircle } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) setSettings(data.settings);
      })
      .catch(() => {});
  }, []);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const storeName = settings.store_name || "PremiKeys";
  const contactEmail = settings.contact_email || "support@premikeys.com";
  const contactPhone = settings.contact_whatsapp || "+20 100 000 0000";

  return (
    <footer className="w-full bg-[#02050e] border-t border-white/10 text-slate-400 text-sm mt-24">
      {/* Upper Footer: Value Props */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="p-3 rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">100% Genuine Digital Keys</h4>
              <p className="text-xs text-slate-400 mt-1">
                Authentic licenses with lifetime support and direct publisher activation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="p-3 rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Manual Payment Verification</h4>
              <p className="text-xs text-slate-400 mt-1">
                Pay safely via InstaPay, Vodafone Cash, or Wire. Every order is verified by our team.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="p-3 rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Direct Order Tracking</h4>
              <p className="text-xs text-slate-400 mt-1">
                Lookup your order anytime via your unique order number or phone without forced account signup.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="inline-block" title="PremiKeys Home">
              <div className="relative h-12 w-28">
                <Image
                  src="/images/premikeys-logo.png"
                  alt="PremiKeys"
                  fill
                  sizes="112px"
                  className="object-contain"
                />
              </div>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              {settings.footer_text ||
                "Your trusted store for genuine Windows activation keys, Microsoft Office suites, and verified software licenses."}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Store Systems Online
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Catalog & Account</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/products" className="hover:text-cyan-300 transition-colors">
                  All Digital Products
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="hover:text-cyan-300 transition-colors">
                  My Orders &amp; Purchased Keys
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-cyan-300 transition-colors">
                  Customer Sign In / Register
                </Link>
              </li>
              <li>
                <Link href="/my-orders" className="hover:text-cyan-300 transition-colors">
                  Track Order with Code (#DN...)
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-cyan-300 transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Policies */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Policies & Terms</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/cookie-policy" className="hover:text-cyan-300 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-cyan-300 transition-colors">
                  Refund & Return Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="hover:text-cyan-300 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-cyan-300 transition-colors">
                  Customer Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                  <span>Staff Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Support */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">Customer Support</h5>
            <ul className="space-y-3 text-xs">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors">
                  {contactEmail}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">{contactPhone}</span>
              </li>
              <li className="text-[11px] text-slate-400 pt-2">
                Operating Hours: 10:00 AM – 11:00 PM (Cairo Time). Orders submitted after hours are processed the next morning.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright & Disclaimer Bar */}
      <div className="border-t border-white/5 bg-black/60 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-4 text-center">
          {/* Top Line: Created by Nexifing in larger font with transparent logo & no background */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-base sm:text-lg font-medium text-slate-300 tracking-wide">
              Created by
            </span>
            <div className="relative h-8 sm:h-9 w-28 sm:w-32 transition-transform duration-200 hover:scale-105">
              <Image
                src="/images/nexifing-logo.png"
                alt="Nexifing"
                fill
                sizes="144px"
                className="object-contain"
              />
            </div>
          </div>

          {/* Copyright & Disclaimer Line Below */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-slate-400 pt-1">
            <p className="font-medium text-slate-400">
              © {new Date().getFullYear()} PremiKeys. All rights reserved.
            </p>
            <span className="hidden sm:inline text-white/20">•</span>
            <p className="text-[11px] text-slate-500">
              All product names, trademarks, and registered trademarks are property of their respective owners.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
