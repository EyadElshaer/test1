"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Trash2, Plus, Minus, ArrowRight, Tag, ShoppingBag, ShieldCheck } from "lucide-react";
import { Glass, Button, Input } from "glisse";
import { useCart } from "@/context/CartContext";

export default function CartDrawer() {
  const router = useRouter();
  const {
    items,
    itemCount,
    subtotal,
    promoDiscount,
    total,
    appliedPromo,
    updateQuantity,
    removeItem,
    clearCart,
    applyPromo,
    removePromo,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  // Lock body scroll when drawer is open for smooth mobile experience
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCartOpen) {
        setIsCartOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCartOpen, setIsCartOpen]);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError("");
    setPromoSuccess("");
    if (!promoInput.trim()) return;

    setIsApplying(true);
    const res = await applyPromo(promoInput);
    setIsApplying(false);

    if (res.success) {
      setPromoSuccess(res.message);
      setPromoInput("");
    } else {
      setPromoError(res.message);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-visibility duration-300 ${
        isCartOpen ? "pointer-events-auto" : "pointer-events-none invisible"
      }`}
      aria-hidden={!isCartOpen}
    >
      {/* Backdrop with smooth opacity transition */}
      <div
        onClick={() => setIsCartOpen(false)}
        className={`absolute inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300 ease-out ${
          isCartOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Drawer Panel with hardware-accelerated slide-in */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 p-0 sm:p-3">
        <Glass
          className={`w-screen max-w-full sm:max-w-md sm:rounded-[32px] border-l sm:border border-white/20 text-white flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.75)] transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) transform-gpu overflow-hidden ${
            isCartOpen ? "translate-x-0" : "translate-x-full sm:translate-x-[110%]"
          }`}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl glass-pill text-cyan-300">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-white">Your Cart</h3>
                <span className="text-[11px] text-slate-300 block">{itemCount} items selected</span>
              </div>
            </div>
            <Button
              variant="glass"
              icon={<X className="w-4 h-4" />}
              onClick={() => setIsCartOpen(false)}
              aria-label="Close Cart"
            />
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-slate-300">Your cart is empty</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Explore our digital products catalog for genuine game keys and software licenses.
                  </p>
                </div>
                <Link
                  href="/products"
                  onClick={() => setIsCartOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30"
                >
                  Browse Catalog
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={`${item.productId}_${item.configurationId || "default"}`}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 flex gap-3.5 relative group hover:border-cyan-500/20 transition-all"
                >
                  {/* Thumbnail - Contained without cropping */}
                  <Link
                    href={`/products/${item.slug}`}
                    onClick={() => setIsCartOpen(false)}
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-950 border border-white/10 shrink-0 hover:border-cyan-400/50 transition-colors flex items-center justify-center p-1"
                  >
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      className="object-cover blur-sm opacity-25 scale-125 pointer-events-none"
                    />
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={() => setIsCartOpen(false)}
                          className="font-bold text-xs sm:text-sm text-white hover:text-cyan-300 transition-colors line-clamp-1 block"
                        >
                          {item.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {item.platform && (
                            <span className="text-[10px] text-cyan-400 font-semibold block">
                              {item.platform}
                            </span>
                          )}
                          {item.configurationName && (
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              {item.configurationName}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.productId, item.configurationId)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Price */}
                      <span className="font-bold text-xs sm:text-sm text-white font-mono">
                        {(item.salePrice * item.quantity).toLocaleString()}{" "}
                        <span className="text-[10px] text-cyan-400 font-sans">EGP</span>
                      </span>

                      {/* Quantity Controls with mobile-friendly touch targets */}
                      <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.configurationId)}
                          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 sm:w-6 text-center text-xs font-mono font-bold text-white select-none">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.configurationId)}
                          className="w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors active:scale-95"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-white/15 bg-black/30 backdrop-blur-xl space-y-4">
              {/* Promo Code Form */}
              <form onSubmit={handleApplyPromo} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    icon={<Tag className="w-4 h-4" />}
                    placeholder="Promo Code"
                    value={promoInput}
                    onValueChange={(val) => setPromoInput(val.toUpperCase())}
                    className="flex-1 text-xs font-mono uppercase"
                  />
                  <Button
                    type="submit"
                    variant="glass"
                    disabled={isApplying || !promoInput.trim()}
                    className="text-xs font-semibold shrink-0"
                  >
                    {isApplying ? "..." : "Apply"}
                  </Button>
                </div>

                {appliedPromo && (
                  <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-emerald-500/15 border border-emerald-400/30 rounded-xl text-emerald-300">
                    <span>Applied: <strong>{appliedPromo.code}</strong> (-{appliedPromo.discountAmount.toLocaleString()} EGP)</span>
                    <button
                      type="button"
                      onClick={removePromo}
                      className="text-slate-300 hover:text-red-400 underline text-[11px] ml-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
                {promoError && (
                  <p className="text-[11px] text-rose-400 px-1">{promoError}</p>
                )}
                {promoSuccess && (
                  <p className="text-[11px] text-emerald-400 px-1">{promoSuccess}</p>
                )}
              </form>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal</span>
                  <span className="font-mono text-white">{subtotal.toLocaleString()} EGP</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Promo Discount</span>
                    <span className="font-mono">-{promoDiscount.toLocaleString()} EGP</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/15">
                  <span>Total Amount</span>
                  <span className="font-mono text-cyan-300 text-lg">
                    {total.toLocaleString()} EGP
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
                <Button
                  variant="filled"
                  tint="#0088ff"
                  onClick={() => {
                    setIsCartOpen(false);
                    router.push("/checkout");
                  }}
                  className="w-full justify-center h-12 font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/30"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>

                <div className="flex items-center justify-between pt-1">
                  <Link
                    href="/cart"
                    onClick={() => setIsCartOpen(false)}
                    className="text-xs text-slate-300 hover:text-white underline"
                  >
                    View Full Cart Page
                  </Link>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>

              {/* Trust Tag */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-300 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                <span>Instant Digital Fulfillment • Manual Verification</span>
              </div>
            </div>
          )}
        </Glass>
      </div>
    </div>
  );
}
