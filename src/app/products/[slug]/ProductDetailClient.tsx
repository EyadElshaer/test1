"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Zap,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Cpu,
  Layers,
  Globe2,
  KeyRound,
  Minus,
  Plus,
  Check,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function ProductDetailClient({ product }: { product: any }) {
  const router = useRouter();
  const { addItem, setIsCartOpen } = useCart();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"overview" | "activation" | "specs">("overview");
  const [justAdded, setJustAdded] = useState(false);

  const images = product.images.length > 0 ? product.images : [{ url: "/images/premikeys-logo.png", altText: product.title }];
  const currentImage = images[activeImageIndex] || images[0];

  const isOutOfStock = product.availability === "OUT_OF_STOCK";

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(
      {
        productId: product.id,
        title: product.title,
        slug: product.slug,
        image: currentImage.url,
        originalPrice: product.originalPrice,
        salePrice: product.salePrice,
        discountPercent: product.discountPercent,
        platform: product.platform || undefined,
        productType: product.productType || undefined,
      },
      quantity
    );

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addItem(
      {
        productId: product.id,
        title: product.title,
        slug: product.slug,
        image: currentImage.url,
        originalPrice: product.originalPrice,
        salePrice: product.salePrice,
        discountPercent: product.discountPercent,
        platform: product.platform || undefined,
        productType: product.productType || undefined,
      },
      quantity
    );
    router.push("/checkout");
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* LEFT: Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Preview with hardware acceleration */}
          <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl gpu-layer">
            <Image
              src={currentImage.url}
              alt={currentImage.altText || product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover transition-all duration-300 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Floating Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
              {product.discountPercent > 0 && (
                <span className="badge-discount text-xs px-3 py-1 rounded-lg uppercase font-black shadow-lg">
                  SAVE {product.discountPercent}%
                </span>
              )}
              {product.platform && (
                <span className="badge-platform text-xs px-2.5 py-1 rounded-lg font-bold backdrop-blur-md">
                  {product.platform}
                </span>
              )}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {images.map((img: any, idx: number) => (
                <button
                  key={img.id || idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 active:scale-95 ${
                    activeImageIndex === idx
                      ? "border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                      : "border-white/10 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.altText || "Thumbnail"}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Trust Points */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">Official Genuine License</span>
                <span className="text-slate-400 text-[11px]">Direct publisher activation</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">Track in My Orders</span>
                <span className="text-slate-400 text-[11px]">Instant status tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Product Info & Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            {product.category && (
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
                {product.category.name}
              </span>
            )}
            <h1 className="text-2xl sm:text-4xl font-black text-white mt-1 leading-tight">
              {product.title}
            </h1>
            {product.shortDescription && (
              <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                {product.shortDescription}
              </p>
            )}
          </div>

          {/* Attributes Pill Row */}
          <div className="flex flex-wrap gap-2 text-xs">
            {product.platform && (
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>Platform: <strong className="text-white">{product.platform}</strong></span>
              </div>
            )}
            {product.productType && (
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Type: <strong className="text-white">{product.productType}</strong></span>
              </div>
            )}
            {product.compatibility && (
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Region: <strong className="text-white">{product.compatibility}</strong></span>
              </div>
            )}
          </div>

          {/* Pricing Card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Digital Product Price</div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {product.salePrice.toLocaleString()} <span className="text-base text-cyan-400 font-bold">EGP</span>
                  </span>
                  {product.discountPercent > 0 && (
                    <span className="text-base text-slate-500 line-through">
                      {product.originalPrice.toLocaleString()} EGP
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                    <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> In Stock & Ready
                  </span>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <span className="text-xs font-medium text-slate-300">Quantity</span>
                <div className="flex items-center border border-white/10 rounded-xl bg-black/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 text-slate-400 hover:text-white transition-colors active:scale-95"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 font-mono font-bold text-sm text-white select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 text-slate-400 hover:text-white transition-colors active:scale-95"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-40 ${
                  justAdded
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border border-emerald-400"
                    : "btn-secondary"
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 text-cyan-400" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm btn-primary disabled:opacity-40"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Buy Now</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center pt-1">
              Manual transfer via InstaPay / Vodafone Cash verified before key dispatch.
            </p>
          </div>

          {/* Content Tabs (Overview, Activation, Specs) */}
          <div className="space-y-4 pt-4">
            <div className="flex border-b border-white/10 text-xs font-bold gap-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-3 px-4 transition-colors relative ${
                  activeTab === "overview"
                    ? "text-cyan-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Overview & Details
              </button>
              <button
                onClick={() => setActiveTab("activation")}
                className={`pb-3 px-4 transition-colors relative ${
                  activeTab === "activation"
                    ? "text-cyan-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Activation Guide
              </button>
              <button
                onClick={() => setActiveTab("specs")}
                className={`pb-3 px-4 transition-colors relative ${
                  activeTab === "specs"
                    ? "text-cyan-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-cyan-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Specifications
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed space-y-3 pt-2">
              {activeTab === "overview" && (
                <div className="prose prose-invert text-xs max-w-none whitespace-pre-line leading-relaxed">
                  {product.description}
                </div>
              )}

              {activeTab === "activation" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-cyan-200">
                    <h4 className="font-bold text-sm text-white mb-1">Official Activation Steps</h4>
                    <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                      {product.deliveryInstructions ||
                        "Upon order payment verification by our team, your 25-character activation key will appear on your order confirmation and My Orders tracking screen. Redeem directly on the official publisher client or platform settings."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "specs" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">Publisher / Platform</span>
                      <span className="font-semibold text-white">{product.platform || "PC / Multiplatform"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">License Type</span>
                      <span className="font-semibold text-white">{product.productType || "Digital Product"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">Region Compatibility</span>
                      <span className="font-semibold text-white">{product.compatibility || "Global"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-slate-400 block text-[10px]">Delivery Method</span>
                      <span className="font-semibold text-white">Manual Verified Order Tracking</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Buy Bar for effortless thumb shopping on phones */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#060a18]/95 backdrop-blur-xl border-t border-white/10 p-3 sm:hidden flex items-center justify-between gap-3 shadow-2xl">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] text-slate-400 line-clamp-1 font-medium">{product.title}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-black text-white font-mono">
              {product.salePrice.toLocaleString()} <span className="text-[10px] text-cyan-400 font-sans">EGP</span>
            </span>
            {product.discountPercent > 0 && (
              <span className="text-[10px] text-slate-500 line-through">
                {product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`p-2.5 rounded-xl font-bold text-xs transition-all duration-200 ${
              justAdded
                ? "bg-emerald-500 text-white border border-emerald-400"
                : "btn-secondary text-white"
            }`}
            aria-label="Add to cart"
          >
            {justAdded ? <Check className="w-4 h-4 stroke-[3]" /> : <ShoppingCart className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="px-4 py-2.5 rounded-xl font-bold text-xs btn-primary flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    </>
  );
}
