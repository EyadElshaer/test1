"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag,
  Menu as MenuIcon,
  X,
  Search,
  User,
  LogOut,
  Package,
  Home,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { Glass, TabBar, Button, Menu } from "glisse";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount, setIsCartOpen } = useCart();
  const { user, logout, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menus on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // If in admin dashboard, we do not show the storefront customer header
  if (pathname.startsWith("/admin")) {
    return null;
  }

  // Determine current active value for the iOS Liquid Glass TabBar
  const activeNavValue =
    pathname === "/"
      ? "home"
      : pathname.startsWith("/products")
        ? "products"
        : pathname.startsWith("/my-orders")
          ? "orders"
          : pathname.startsWith("/contact")
            ? "contact"
            : pathname.startsWith("/faq")
              ? "faq"
              : null;

  // Header navigation links for mobile
  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Browse Products", href: "/products" },
    { name: "Track Order", href: "/my-orders" },
    { name: "Contact Us", href: "/contact" },
    { name: "FAQ", href: "/faq" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full px-3 sm:px-6 lg:px-8 pt-3 pb-2 pointer-events-none">
                <div className="max-w-7xl mx-auto pointer-events-auto">
                  <Glass className="rounded-[26px] px-4 sm:px-6 border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
                    <div className="flex items-center justify-between h-16 sm:h-[72px]">
                      {/* Transparent Logo (Acts as Home Button) */}
                      <Link href="/" className="flex items-center group py-1.5 shrink-0" title="PremiKeys Home">
                        <div className="relative h-11 w-26 sm:h-13 sm:w-32 transition-transform duration-300 group-hover:scale-105">
                          <Image
                            src="/images/premikeys-logo.png"
                            alt="PremiKeys"
                            fill
                            sizes="(max-width: 640px) 104px, 128px"
                            priority
                            className="object-contain drop-shadow-[0_2px_10px_rgba(0,229,255,0.2)]"
                          />
                        </div>
                      </Link>

                      {/* Desktop iOS 26 Liquid Glass TabBar */}
                      <div className="hidden md:flex items-center justify-center">
                        <TabBar
                          link={Link}
                          value={activeNavValue}
                          style={{ "--lg-tab-width": "104px", "--lg-tab-height": "36px" } as React.CSSProperties}
                          items={[
                            { value: "home", label: "Home", href: "/" },
                            { value: "products", label: "Catalog", href: "/products" },
                            { value: "orders", label: "Track Key", href: "/my-orders" },
                            { value: "contact", label: "Support", href: "/contact" },
                            { value: "faq", label: "FAQ", href: "/faq" },
                          ]}
                        />
                      </div>

                    {/* Right Action Buttons (Glisse Liquid Glass Buttons & Morphing Menu) */}
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      {/* Quick Catalog Button */}
                      <div className="hidden lg:block">
                        <Button
                          variant="filled"
                          tint="#0088ff"
                          icon={<Search className="w-4 h-4" />}
                          onClick={() => router.push("/products")}
                          className="font-semibold text-xs tracking-wide shadow-lg shadow-blue-500/25"
                        >
                          Shop Keys
                        </Button>
                      </div>

                        {/* Shopping Cart Liquid Glass Button */}
                        <div className="relative">
                          <Button
                            variant="glass"
                            icon={<ShoppingBag className="w-4 h-4 text-cyan-300" />}
                            onClick={() => setIsCartOpen(true)}
                            aria-label="View Shopping Cart"
                          />
                          {itemCount > 0 && (
                            <span className="pointer-events-none absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-black h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 border border-white/30 z-10">
                              {itemCount}
                            </span>
                          )}
                        </div>

              {/* User Account / Sign In at Top Right */}
                          {!authLoading && (
                            <div className="relative flex items-center">
                              {user ? (
                                <Menu
                                  aria-label={`Account menu for ${user.name}`}
                                  align="end"
                                  icon={
                                    user.avatar ? (
                                      <img
                                        src={user.avatar}
                                        alt={user.name || "User"}
                                        className="w-5 h-5 rounded-full object-cover border border-white/30"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <User className="w-4 h-4 text-cyan-300" />
                                    )
                                  }
                                  items={[
                                    {
                                      label: "My Orders & Keys",
                                      icon: <Package className="w-4 h-4 text-cyan-400" />,
                                      onSelect: () => router.push("/account/orders"),
                                    },
                                    {
                                      label: "Account Settings",
                                      icon: <User className="w-4 h-4 text-slate-300" />,
                                      onSelect: () => router.push("/account"),
                                    },
                                    "separator",
                                    {
                                      label: "Sign Out",
                                      icon: <LogOut className="w-4 h-4" />,
                                      destructive: true,
                                      onSelect: () => logout(),
                                    },
                                  ]}
                                />
                              ) : (
                                <Button
                                  variant="glass"
                                  icon={<User className="w-4 h-4 text-cyan-300" />}
                                  onClick={() => router.push("/login")}
                                  className="text-xs font-semibold"
                                >
                                  <span className="hidden sm:inline">Sign In</span>
                                </Button>
                              )}
                            </div>
                          )}

                              {/* Mobile Menu Toggle */ }
                              < div className="md:hidden">
                            <Button
                              variant="glass"
                              icon={mobileMenuOpen ? <X className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
                              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                              aria-label="Toggle Navigation Menu"
                            />
                          </div>
            </div>
                    </div>
                  </Glass>

                  {/* Mobile Navigation Liquid Glass Drawer */}
                  <div
                    className={`md:hidden mt-2 transition-all duration-300 ease-out origin-top ${mobileMenuOpen
                        ? "opacity-100 max-h-[32rem] scale-y-100"
                        : "opacity-0 max-h-0 scale-y-95 pointer-events-none overflow-hidden"
                      }`}
                  >
                    <Glass className="rounded-3xl p-4 space-y-2.5 border border-white/15 shadow-2xl">
                      {user ? (
                        <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/15 mb-2 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-white">{user.name}</p>
                              <p className="text-[11px] text-slate-300 font-mono">{user.email || user.phone}</p>
                            </div>
                            <button
                              onClick={logout}
                              className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              Sign Out
                            </button>
                          </div>
                          <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
                            <Link
                              href="/account/orders"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-500/20 text-cyan-200 border border-cyan-400/30 text-xs font-semibold"
                            >
                              <Package className="w-3.5 h-3.5" />
                              <span>My Orders</span>
                            </Link>
                            <Link
                              href="/account"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 text-slate-100 border border-white/15 text-xs font-semibold"
                            >
                              <User className="w-3.5 h-3.5" />
                              <span>Profile</span>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="pb-1">
                          <Link
                            href="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-cyan-200 glass-pill"
                          >
                            <User className="w-4 h-4 text-cyan-300" />
                            <span>Sign In or Create Account</span>
                          </Link>
                        </div>
                      )}

            <div className="grid grid-cols-1 gap-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${isActive(link.href)
                      ? "bg-white/15 text-white border border-white/25 shadow-inner"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                    }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

                    <div className="pt-1">
                      <Link
                        href="/products"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-white btn-primary"
                      >
                        <Search className="w-4 h-4" />
                        <span>Explore Full Catalog</span>
                      </Link>
                    </div>
                  </Glass>
                </div>
      </div>
          </header>
          );
}
