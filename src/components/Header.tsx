"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  ShoppingBag,
  Menu,
  X,
  Search,
  User,
  ChevronDown,
  LogOut,
  Package,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const { itemCount, setIsCartOpen } = useCart();
  const { user, logout, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  // If in admin dashboard, we do not show the storefront customer header
  if (pathname.startsWith("/admin")) {
    return null;
  }

  // "My Orders" removed from here and relocated inside account per requirements
  const navLinks = [
    { name: "Browse Products", href: "/products" },
    { name: "FAQ", href: "/faq" },
  ];

  const isActive = (href: string) => {
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#030712]/85 border-b border-white/10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Transparent Logo (Acts as Home Button) */}
          <Link href="/" className="flex items-center group py-2" title="PremiKeys Home">
            <div className="relative h-12 w-28 sm:h-14 sm:w-32 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/images/premikeys-logo.png"
                alt="PremiKeys"
                fill
                sizes="(max-width: 640px) 112px, 128px"
                priority
                className="object-contain"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(link.href)
                    ? "text-cyan-300 bg-blue-500/15 border border-blue-500/30 shadow-[0_0_15px_rgba(0,102,255,0.2)]"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Catalog Button */}
            <Link
              href="/products"
              className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-blue-600/30 transition-all transform hover:-translate-y-0.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Shop Keys</span>
            </Link>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-cyan-400/50 hover:bg-slate-800 text-slate-200 hover:text-white transition-all shadow-inner group active:scale-95"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform text-cyan-400" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-red-600 to-rose-500 text-white text-[11px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow-md shadow-red-500/40 animate-pulse">
                  {itemCount}
                </span>
              )}
            </button>

            {/* User Account / Sign In at Top Right */}
            {!authLoading && (
              <div className="relative" ref={accountMenuRef}>
                {user ? (
                  <div>
                    <button
                      onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/10 border border-blue-500/30 hover:border-cyan-400/60 hover:bg-blue-600/20 text-slate-200 hover:text-white transition-all shadow-inner group text-xs font-semibold"
                      aria-label="Open Account Menu"
                    >
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold text-[11px] uppercase shadow-sm">
                        {user.name ? user.name.charAt(0) : "U"}
                      </div>
                      <span className="max-w-[110px] truncate text-cyan-200 group-hover:text-white">
                        {user.name.split(" ")[0]}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          accountMenuOpen ? "rotate-180 text-cyan-400" : ""
                        }`}
                      />
                    </button>

                    {/* Account Dropdown Menu */}
                    {accountMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#070d1d]/95 backdrop-blur-xl border border-white/15 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                        {/* User Identity Header */}
                        <div className="px-3 py-2.5 border-b border-white/10 mb-1">
                          <p className="text-xs font-bold text-white truncate">{user.name}</p>
                          <p className="text-[11px] text-slate-400 truncate font-mono mt-0.5">
                            {user.email || user.phone}
                          </p>
                        </div>

                        {/* Dropdown Links */}
                        <Link
                          href="/account/orders"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Package className="w-4 h-4 text-cyan-400" />
                          <span>My Orders &amp; Keys</span>
                        </Link>

                        <Link
                          href="/account"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          <span>Account Settings</span>
                        </Link>

                        <div className="border-t border-white/10 my-1 pt-1">
                          <button
                            onClick={() => {
                              setAccountMenuOpen(false);
                              logout();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900/90 border border-white/10 hover:border-cyan-400/50 hover:bg-slate-800 text-slate-200 hover:text-white transition-all shadow-inner group"
                  >
                    <User className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span>Sign In</span>
                  </Link>
                )}
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white active:scale-95 transition-all"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={`md:hidden border-t border-white/10 bg-[#070d1d]/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-2 transition-all duration-300 ease-out origin-top ${
          mobileMenuOpen
            ? "opacity-100 max-h-[28rem] scale-y-100"
            : "opacity-0 max-h-0 scale-y-95 pointer-events-none overflow-hidden"
        }`}
      >
        {user ? (
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-2 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{user.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">{user.email || user.phone}</p>
              </div>
              <button
                onClick={logout}
                className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
            <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2">
              <Link
                href="/account/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600/20 text-cyan-300 border border-blue-500/30 text-xs font-semibold"
              >
                <Package className="w-3.5 h-3.5" />
                <span>My Orders</span>
              </Link>
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/5 text-slate-200 border border-white/10 text-xs font-semibold"
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="pb-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-cyan-300 bg-blue-600/20 border border-blue-500/30"
            >
              <User className="w-4 h-4" />
              <span>Sign In or Register</span>
            </Link>
          </div>
        )}

        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              isActive(link.href)
                ? "bg-blue-600/20 text-cyan-300 border border-blue-500/30"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {link.name}
          </Link>
        ))}

        <div className="pt-2">
          <Link
            href="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 shadow-md shadow-blue-500/30"
          >
            <Search className="w-4 h-4" />
            <span>Browse All Products</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
