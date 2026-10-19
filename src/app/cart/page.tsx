"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Tag,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
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
  } = useCart();

  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError("");
    setPromoSuccess("");
    if (!promoCodeInput.trim()) return;

    setIsApplying(true);
    const res = await applyPromo(promoCodeInput.trim());
    setIsApplying(false);

    if (res.success) {
      setPromoSuccess(res.message);
      setPromoCodeInput("");
    } else {
      setPromoError(res.message);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-cyan-400 mx-auto flex items-center justify-center">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white">Your Cart is Empty</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            You don't have any digital keys or software licenses in your cart yet. Browse our catalog to explore current deals.
          </p>
        </div>
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white btn-primary shadow-lg shadow-blue-500/30"
          >
            <span>Explore Products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Shopping Cart</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review your digital activations before proceeding to manual payment checkout.
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All Items</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Cart Items Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 divide-y divide-white/5">
            {items.map((item) => (
              <div
                key={item.productId}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-white/[0.01] transition-colors"
              >
                {/* Product Thumbnail & Title */}
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                    <Image
                      src={item.image || "/images/premikeys-logo.png"}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    {item.platform && (
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                        {item.platform}
                      </span>
                    )}
                    <Link
                      href={`/products/${item.slug}`}
                      className="font-bold text-sm sm:text-base text-white hover:text-cyan-300 transition-colors line-clamp-1"
                    >
                      {item.title}
                    </Link>
                    <div className="text-xs text-slate-400 mt-1">
                      Unit Price: <span className="text-white font-semibold">{item.salePrice.toLocaleString()} EGP</span>
                      {item.discountPercent > 0 && (
                        <span className="ml-2 text-slate-500 line-through">
                          {item.originalPrice.toLocaleString()} EGP
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity Controls & Line Total */}
                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="flex items-center border border-white/10 rounded-xl bg-black/40 overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 font-mono font-bold text-xs text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-[90px]">
                    <div className="text-base font-black text-white">
                      {(item.salePrice * item.quantity).toLocaleString()} <span className="text-xs text-cyan-400">EGP</span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Link
              href="/products"
              className="text-xs font-semibold text-cyan-400 hover:underline inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* Order Summary & Checkout Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
            <h3 className="font-bold text-lg text-white">Order Summary</h3>

            {/* Promo Code Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Have a Promo Code?
              </label>
              {appliedPromo ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-400">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <div>
                      <span className="font-bold">{appliedPromo.code}</span> (-{promoDiscount} EGP)
                    </div>
                  </div>
                  <button
                    onClick={removePromo}
                    className="text-slate-400 hover:text-white text-xs underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. PREMI10"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 glass-input px-3 py-2 rounded-xl text-xs uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isApplying || !promoCodeInput.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      {isApplying ? "..." : "Apply"}
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-[11px] text-red-400 pl-1">{promoError}</p>
                  )}
                  {promoSuccess && (
                    <p className="text-[11px] text-emerald-400 pl-1">{promoSuccess}</p>
                  )}
                </form>
              )}
            </div>

            {/* Totals Breakdown */}
            <div className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-white/10">
              <div className="flex justify-between">
                <span>Items Subtotal ({itemCount})</span>
                <span className="text-white font-medium">{subtotal.toLocaleString()} EGP</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Promo Discount ({appliedPromo?.code})</span>
                  <span>-{promoDiscount.toLocaleString()} EGP</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Delivery</span>
                <span className="text-emerald-400 font-semibold">Instant Manual / 0 EGP</span>
              </div>

              <div className="flex justify-between text-base font-black text-white pt-4 border-t border-white/10">
                <span>Final Total Due</span>
                <span className="text-cyan-300 text-lg">{total.toLocaleString()} EGP</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Link
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white btn-primary shadow-xl shadow-blue-500/25"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Manual Payment Verification</span>
              </div>
              <p>
                Transfer via InstaPay, Vodafone Cash, or Wire. Prices and discounts are re-verified on our server before order creation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
