"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, ArrowRight, Eye, CheckCircle2, AlertCircle, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { extractConfigurations, ProductConfiguration } from "@/lib/configurations";

export interface ProductCardProps {
  id: string;
  title: string;
  slug: string;
  shortDescription?: string | null;
  salePrice: number;
  originalPrice: number;
  discountPercent: number;
  platform?: string | null;
  productType?: string | null;
  availability: string;
  category?: { name: string; slug: string } | null;
  images: { url: string; altText?: string | null }[];
  attributeValues?: { attributeKey: string; value: string }[];
  configurations?: ProductConfiguration[];
}

export default function ProductCard({
  id,
  title,
  slug,
  shortDescription,
  salePrice,
  originalPrice,
  discountPercent,
  platform,
  productType,
  availability,
  category,
  images,
  attributeValues,
  configurations: propConfigs,
}: ProductCardProps) {
  const router = useRouter();
  const { addItem, setIsCartOpen } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  // Extract configurations if available
  const availableConfigs: ProductConfiguration[] =
    propConfigs && propConfigs.length > 0
      ? propConfigs
      : extractConfigurations({ attributeValues });

  const hasMultipleConfigs = availableConfigs.length > 1;
  const [selectedConfigIdx, setSelectedConfigIdx] = useState(0);

  const activeConfig: ProductConfiguration | null =
    availableConfigs.length > 0
      ? availableConfigs[selectedConfigIdx] || availableConfigs[0]
      : null;

  // Active prices and availability
  const currentSalePrice = activeConfig ? activeConfig.salePrice : salePrice;
  const currentOriginalPrice = activeConfig ? activeConfig.originalPrice : originalPrice;
  const currentDiscountPercent = activeConfig ? activeConfig.discountPercent : discountPercent;

  const isConfigOutOfStock =
    activeConfig?.isAvailable === false ||
    (activeConfig?.stockQuantity !== undefined && activeConfig.stockQuantity <= 0);
  const isOutOfStock = isConfigOutOfStock || availability === "OUT_OF_STOCK";

  const primaryImage =
    images && images.length > 0 && images[0]?.url
      ? images[0].url
      : "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    addItem(
      {
        productId: id,
        title: title,
        slug: slug,
        image: primaryImage,
        originalPrice: currentOriginalPrice,
        salePrice: currentSalePrice,
        discountPercent: currentDiscountPercent,
        platform: platform || undefined,
        productType: productType || undefined,
        configurationId: activeConfig?.id,
        configurationName: activeConfig ? activeConfig.name : undefined,
      },
      1
    );

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col group relative border border-white/10 hover:border-cyan-400/50 transition-all duration-300 gpu-layer will-change-transform">
      {/* Image Showcase */}
      <Link
        href={`/products/${slug}`}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#060a17] flex items-center justify-center cursor-pointer block border-b border-white/5"
      >
        {/* Ambient Blurred Aura */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <Image
            src={primaryImage}
            alt=""
            fill
            className="object-cover blur-xl opacity-30 scale-125"
            unoptimized={primaryImage.startsWith("data:")}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#060a17]/20" />
        </div>

        {/* Foreground Product Image */}
        <div className="relative w-full h-full p-2.5 sm:p-3 flex items-center justify-center">
          <Image
            src={primaryImage}
            alt={title}
            fill
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-500 ease-out drop-shadow-lg select-none"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            loading="lazy"
            unoptimized={primaryImage.startsWith("data:")}
          />
        </div>

        {/* Subtle Bottom Vignette */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0a0f24]/80 to-transparent pointer-events-none" />

        {/* Badges on image */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
          {currentDiscountPercent > 0 && (
            <span className="badge-discount text-[11px] px-2 py-0.5 rounded-md uppercase font-extrabold shadow-md shadow-red-900/40">
              -{currentDiscountPercent}% OFF
            </span>
          )}
          {platform && (
            <span className="badge-platform text-[10px] px-2 py-0.5 rounded-md font-semibold backdrop-blur-md">
              {platform}
            </span>
          )}
        </div>

        {/* Quick View Icon */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hidden sm:block">
          <span className="p-2 rounded-xl bg-black/60 backdrop-blur-md text-white hover:text-cyan-400 flex items-center justify-center border border-white/20 shadow-md">
            <Eye className="w-4 h-4" />
          </span>
        </div>
      </Link>

      {/* Body Details */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
        <div>
          {category && (
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              {category.name}
            </span>
          )}
          {/* Product Name / Title */}
          <Link href={`/products/${slug}`} className="block mt-1">
            <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
              {title}
            </h3>
          </Link>
          {shortDescription && (
            <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
              {shortDescription}
            </p>
          )}
        </div>

        {/* Configuration Selection Pills / Chips */}
        {hasMultipleConfigs && (
          <div className="pt-2 border-t border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Select Option:</span>
              {activeConfig && (
                <span className="text-cyan-300 font-bold truncate max-w-[140px] text-[10px]">
                  {activeConfig.name}
                </span>
              )}
            </div>

            {availableConfigs.length <= 4 ? (
              <div className="flex flex-wrap gap-1.5">
                {availableConfigs.map((cfg, idx) => {
                  const isSelected = selectedConfigIdx === idx;
                  return (
                    <button
                      key={cfg.id || idx}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedConfigIdx(idx);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 border cursor-pointer select-none ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/80 shadow-[0_0_12px_rgba(0,240,255,0.25)] scale-[1.02]"
                          : "bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20 hover:text-white"
                      }`}
                      title={`${cfg.name} - ${cfg.salePrice.toLocaleString()} EGP`}
                    >
                      {cfg.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <select
                value={selectedConfigIdx}
                onChange={(e) => setSelectedConfigIdx(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs font-medium text-white border-white/15 focus:border-cyan-400"
              >
                {availableConfigs.map((cfg, idx) => (
                  <option key={cfg.id || idx} value={idx} className="bg-slate-900 text-white">
                    {cfg.name} — {cfg.salePrice.toLocaleString()} EGP
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Pricing & Stock Status */}
        <div className="pt-2 border-t border-white/5 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-white tracking-tight">
                  {currentSalePrice.toLocaleString()}{" "}
                  <span className="text-xs text-cyan-400 font-semibold">EGP</span>
                </span>
                {currentDiscountPercent > 0 && (
                  <span className="text-xs text-slate-500 line-through">
                    {currentOriginalPrice.toLocaleString()} EGP
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center text-[10px] font-medium">
              {isOutOfStock ? (
                <span className="text-red-400 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" /> Out of stock
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> In Stock
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons: Direct Add to Cart + Details Link */}
          <div className="pt-1 flex items-center gap-2">
            {isOutOfStock ? (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
              >
                Out of Stock
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-md ${
                    justAdded
                      ? "bg-emerald-500 text-white shadow-emerald-500/30 border border-emerald-400 scale-[1.02]"
                      : "btn-primary"
                  }`}
                  title={
                    activeConfig
                      ? `Add "${activeConfig.name}" to Cart`
                      : "Add to Cart"
                  }
                >
                  {justAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Added!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-3.5 h-3.5 text-cyan-200" />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>

                <Link
                  href={`/products/${slug}`}
                  className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-cyan-400/50 text-slate-400 hover:text-white transition-all flex items-center justify-center shrink-0"
                  title="View full specs and activation instructions"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

