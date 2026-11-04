"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, ArrowRight, Eye, CheckCircle2, AlertCircle, Check } from "lucide-react";
import { Glass, Button, SegmentedControl } from "glisse";
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
      <Glass className="rounded-3xl overflow-hidden flex flex-col group relative border border-white/15 hover:border-cyan-400/50 transition-all duration-300 gpu-layer will-change-transform shadow-[0_14px_34px_-8px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_44px_-8px_rgba(0,140,255,0.3)] hover:-translate-y-1">
        {/* Image Showcase */}
        <Link
          href={`/products/${slug}`}
          className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950/60 flex items-center justify-center cursor-pointer block border-b border-white/10"
        >
          {/* Ambient Blurred Aura */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            <Image
              src={primaryImage}
              alt=""
              fill
              className="object-cover blur-2xl opacity-35 scale-125"
              unoptimized={primaryImage.startsWith("data:")}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-[#040814]/25" />
          </div>

          {/* Foreground Product Image */}
          <div className="relative w-full h-full p-2.5 sm:p-3 flex items-center justify-center">
            <Image
              src={primaryImage}
              alt={title}
              fill
              className="object-contain p-2 group-hover:scale-105 transition-transform duration-500 ease-out drop-shadow-2xl select-none"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              loading="lazy"
              unoptimized={primaryImage.startsWith("data:")}
            />
          </div>

          {/* Subtle Bottom Vignette */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#05091a]/80 to-transparent pointer-events-none" />

          {/* Badges on image */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
            {currentDiscountPercent > 0 && (
                <span className="badge-discount text-[11px] px-2.5 py-0.5 rounded-full uppercase font-extrabold shadow-md shadow-red-900/40 border border-white/25">
                  -{currentDiscountPercent}% OFF
                </span>
          )}
                {platform && (
                    <span className="glass-pill text-cyan-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                      {platform}
                    </span>
          )}
                  </div>

        {/* Quick View Icon */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hidden sm:block">
                    <span className="p-2 rounded-full glass-pill text-white hover:text-cyan-300 flex items-center justify-center shadow-lg">
                      <Eye className="w-4 h-4" />
                    </span>
                </div>
              </Link>

      {/* Body Details */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 sm:space-y-4">
              <div>
                {category && (
                    <span className="text-[10px] font-semibold tracking-wider text-cyan-300/80 uppercase">
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
                        <p className="text-xs text-slate-300/85 line-clamp-2 mt-1.5 leading-relaxed">
                          {shortDescription}
                        </p>
          )}
                      </div>

        {/* Configuration Selection Pills / Chips */}
                    {hasMultipleConfigs && (
                        <div className="pt-2.5 border-t border-white/10 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-300 font-medium">Edition:</span>
                            {activeConfig && (
                              <span className="text-cyan-300 font-bold truncate max-w-[140px] text-[10px]">
                                {activeConfig.name}
                              </span>
                            )}
                          </div>

                            {
                              availableConfigs.length <= 3 && availableConfigs.every((c) => c.name.length <= 14) ? (
                                <div className="flex justify-center w-full overflow-hidden">
                                  <SegmentedControl
                                    value={String(selectedConfigIdx)}
                                    onValueChange={(val) => setSelectedConfigIdx(Number(val))}
                                    style={
                                      {
                                        "--lg-tab-width": `${Math.floor(220 / availableConfigs.length)}px`,
                                        "--lg-tab-height": "28px",
                                      } as React.CSSProperties
                                    }
                                    items={availableConfigs.map((cfg, idx) => ({
                                      value: String(idx),
                                      label: cfg.name,
                                    }))}
                                  />
                                </div>
                              ) : availableConfigs.length <= 4 ? (
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
                                                ? "bg-cyan-500/25 text-white border-cyan-300/80 shadow-[0_0_14px_rgba(0,240,255,0.3)] scale-[1.02]"
                                                : "bg-white/[0.05] text-slate-300 border-white/15 hover:border-white/30 hover:text-white"
                                            }`}
                      title={`${cfg.name} - ${ cfg.salePrice.toLocaleString() } EGP`}
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
                className="w-full glass-input px-2.5 py-1.5 rounded-xl text-xs font-medium text-white border-white/20 focus:border-cyan-400"
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
        <div className="pt-2.5 border-t border-white/10 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-white tracking-tight">
                  {currentSalePrice.toLocaleString()}{" "}
                  <span className="text-xs text-cyan-300 font-semibold">EGP</span>
                </span>
                {currentDiscountPercent > 0 && (
                  <span className="text-xs text-slate-400 line-through">
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

          {/* Action Buttons: Glisse Liquid Glass Button + Details Link */}
          <div className="pt-1 flex items-center gap-2">
            {isOutOfStock ? (
              <Button
                variant="glass"
                disabled
                className="w-full justify-center text-xs font-semibold"
              >
                Out of Stock
              </Button>
            ) : (
              <>
                <Button
                  variant="filled"
                  tint={justAdded ? "#30d158" : "#0088ff"}
                  icon={
                    justAdded ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )
                  }
                  onClick={handleAddToCart}
                  className="flex-1 justify-center font-bold text-xs shadow-lg shadow-blue-500/20"
                  title={
                    activeConfig
                      ? `Add "${activeConfig.name}" to Cart`
                      : "Add to Cart"
                  }
                >
                  {justAdded ? "Added!" : "Add to Cart"}
                </Button>

                <Button
                  variant="glass"
                  icon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => router.push(`/ products / ${ slug } `)}
                  aria-label="View full specs and activation instructions"
                  title="View full specs and activation instructions"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </Glass>
  );
}

