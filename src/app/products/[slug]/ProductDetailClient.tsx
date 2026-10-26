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
  Maximize2,
  X,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { extractConfigurations, ProductConfiguration } from "@/lib/configurations";

export default function ProductDetailClient({ product }: { product: any }) {
  const router = useRouter();
  const { addItem, setIsCartOpen } = useCart();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"overview" | "activation" | "specs">("overview");
  const [justAdded, setJustAdded] = useState(false);
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Configurations
  const configs: ProductConfiguration[] = extractConfigurations(product);
  const hasConfigs = configs.length > 0;
  const [selectedConfigIdx, setSelectedConfigIdx] = useState(0);
  const activeConfig = hasConfigs ? configs[selectedConfigIdx] || configs[0] : null;

  const activeSalePrice = activeConfig ? activeConfig.salePrice : product.salePrice;
  const activeOriginalPrice = activeConfig ? activeConfig.originalPrice : product.originalPrice;
  const activeDiscountPercent = activeConfig ? activeConfig.discountPercent : product.discountPercent;

  const isConfigOutOfStock =
    activeConfig?.isAvailable === false ||
    (activeConfig?.stockQuantity !== undefined && activeConfig.stockQuantity <= 0);
  const isOutOfStock = isConfigOutOfStock || product.availability === "OUT_OF_STOCK";

  const images = product.images.length > 0 ? product.images : [{ url: "/images/premikeys-logo.png", altText: product.title }];
  const currentImage = images[activeImageIndex] || images[0];

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      // Balance between 0.65 (vertical software box art) and 2.2 (ultra-wide banner)
      const clampedRatio = Math.max(0.65, Math.min(2.2, ratio));
      setImageRatio(clampedRatio);
    }
  };

  const handleSelectImage = (idx: number) => {
    setActiveImageIndex(idx);
    setImageRatio(null); // allow re-measuring natural ratio for the selected image
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(
      {
        productId: product.id,
        title: product.title,
        slug: product.slug,
        image: currentImage.url,
        originalPrice: activeOriginalPrice,
        salePrice: activeSalePrice,
        discountPercent: activeDiscountPercent,
        platform: product.platform || undefined,
        productType: product.productType || undefined,
        configurationId: activeConfig?.id,
        configurationName: activeConfig ? activeConfig.name : undefined,
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
        originalPrice: activeOriginalPrice,
        salePrice: activeSalePrice,
        discountPercent: activeDiscountPercent,
        platform: product.platform || undefined,
        productType: product.productType || undefined,
        configurationId: activeConfig?.id,
        configurationName: activeConfig ? activeConfig.name : undefined,
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
          {/* Main Preview with dynamic auto-adjusting aspect ratio & ambient lighting */}
          <div
            className="relative w-full rounded-3xl overflow-hidden bg-[#070b19] border border-white/10 shadow-2xl gpu-layer flex items-center justify-center transition-[aspect-ratio] duration-300 min-h-[300px] max-h-[560px]"
            style={{
              aspectRatio: imageRatio ? `${imageRatio}` : "4/3",
            }}
          >
            {/* Ambient Blurred Aura (fills letterbox space with native image tones) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
              <Image
                src={currentImage.url}
                alt=""
                fill
                className="object-cover blur-2xl opacity-35 scale-110"
                unoptimized={currentImage.url.startsWith("data:")}
                priority
              />
              <div className="absolute inset-0 bg-[#070b19]/35" />
            </div>

            {/* Sharp Foreground Image - Contained & Automatically Proportioned */}
            <Image
              src={currentImage.url}
              alt={currentImage.altText || product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              onLoad={handleImageLoad}
              className="object-contain p-4 sm:p-6 transition-all duration-300 ease-out drop-shadow-2xl select-none"
              unoptimized={currentImage.url.startsWith("data:")}
            />

            {/* Floating Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10 pointer-events-none">
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

            {/* Full-view Zoom Button */}
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              className="absolute top-4 right-4 p-2.5 rounded-xl bg-black/60 hover:bg-black/80 text-white hover:text-cyan-400 border border-white/20 backdrop-blur-md transition-all z-10 shadow-lg cursor-pointer"
              title="View Full Resolution Image"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Thumbnails - Uncropped with Ambient Letterboxing */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {images.map((img: any, idx: number) => (
                <button
                  key={img.id || idx}
                  onClick={() => handleSelectImage(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200 active:scale-95 bg-[#070b19] flex items-center justify-center p-1 ${
                    activeImageIndex === idx
                      ? "border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                      : "border-white/10 opacity-70 hover:opacity-100"
                  }`}
                  title={img.altText || `View image ${idx + 1}`}
                >
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    className="object-cover blur-sm opacity-25 scale-125 pointer-events-none"
                    unoptimized={img.url.startsWith("data:")}
                  />
                  <Image
                    src={img.url}
                    alt={img.altText || "Thumbnail"}
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                    unoptimized={img.url.startsWith("data:")}
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

          {/* Configuration Selector */}
          {hasConfigs && (
            <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Select Configuration / Edition
                </span>
                {activeConfig && (
                  <span className="text-xs text-slate-400">
                    Selected: <strong className="text-white">{activeConfig.name}</strong>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {configs.map((cfg, idx) => {
                  const isSelected = selectedConfigIdx === idx;
                  return (
                    <button
                      key={cfg.id || idx}
                      type="button"
                      onClick={() => setSelectedConfigIdx(idx)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)] scale-[1.01]"
                          : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs sm:text-sm text-white">{cfg.name}</span>
                        {cfg.discountPercent > 0 && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            -{cfg.discountPercent}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-sm sm:text-base font-black text-cyan-300">
                          {cfg.salePrice.toLocaleString()} EGP
                        </span>
                        {cfg.discountPercent > 0 && (
                          <span className="text-xs text-slate-500 line-through">
                            {cfg.originalPrice.toLocaleString()} EGP
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing Card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-white/10 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Digital Product Price</div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {activeSalePrice.toLocaleString()} <span className="text-base text-cyan-400 font-bold">EGP</span>
                  </span>
                  {activeDiscountPercent > 0 && (
                    <span className="text-base text-slate-500 line-through">
                      {activeOriginalPrice.toLocaleString()} EGP
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
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#060a18]/95 backdrop-blur-xl border-t border-white/10 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:hidden flex items-center justify-between gap-3 shadow-2xl">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-300 line-clamp-1 font-semibold">{product.title}</span>
            {activeConfig && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 truncate max-w-[80px]">
                {activeConfig.name}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-black text-white font-mono">
              {activeSalePrice.toLocaleString()} <span className="text-[10px] text-cyan-400 font-sans">EGP</span>
            </span>
            {activeDiscountPercent > 0 && (
              <span className="text-[10px] text-slate-500 line-through">
                {activeOriginalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`p-3 rounded-xl font-bold text-xs transition-all duration-200 active:scale-95 ${
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
            className="px-4 py-3 rounded-xl font-bold text-xs btn-primary flex items-center gap-1.5 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Buy Now</span>
          </button>
        </div>
      </div>

      {/* Full-Screen Image Lightbox Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsZoomOpen(false)}
              className="absolute -top-12 right-0 sm:top-2 sm:right-2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all z-20 cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative w-full h-[75vh] flex items-center justify-center p-2">
              <img
                src={currentImage.url}
                alt={currentImage.altText || product.title}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl select-none"
              />
            </div>

            <div className="flex items-center justify-between w-full max-w-md px-4 mt-2 text-xs text-slate-300">
              <span className="font-semibold truncate mr-2">{product.title}</span>
              <span className="text-cyan-400 font-mono shrink-0">
                {activeImageIndex + 1} / {images.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
