"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, ArrowRight, Eye, CheckCircle2, AlertCircle } from "lucide-react";

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
}: ProductCardProps) {
  const router = useRouter();
  const primaryImage =
    images && images.length > 0 && images[0]?.url
      ? images[0].url
      : "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80";

  const isOutOfStock = availability === "OUT_OF_STOCK";

  const handleNavigateToProduct = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/products/${slug}`);
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col group relative border border-white/10 hover:border-cyan-400/50 transition-all duration-300 gpu-layer will-change-transform">
      {/* Image Showcase - Auto-fits image ratio cleanly without cut off */}
      <Link
        href={`/products/${slug}`}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#060a17] flex items-center justify-center cursor-pointer block border-b border-white/5"
      >
        {/* Ambient Blurred Aura (fills letterbox space with native image tones) */}
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

        {/* Foreground Product Image (Preserves natural aspect ratio, never cut off) */}
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
          {discountPercent > 0 && (
            <span className="badge-discount text-[11px] px-2 py-0.5 rounded-md uppercase font-extrabold shadow-md shadow-red-900/40">
              -{discountPercent}% OFF
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
          {/* Product Name / Title - Clicking navigates to product details */}
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

        {/* Pricing & Stock Status */}
        <div className="pt-2 border-t border-white/5 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-white tracking-tight">
                  {salePrice.toLocaleString()} <span className="text-xs text-cyan-400 font-semibold">EGP</span>
                </span>
                {discountPercent > 0 && (
                  <span className="text-xs text-slate-500 line-through">
                    {originalPrice.toLocaleString()} EGP
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

          {/* Action Button: Pressing Add to Cart takes customer to actual product details */}
          <div className="pt-1">
            {isOutOfStock ? (
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
              >
                Out of Stock
              </button>
            ) : (
              <Link
                href={`/products/${slug}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold btn-primary transition-all duration-200 group/btn"
                title="View Product Details and Add to Cart"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-cyan-200" />
                <span>Add to Cart • View Details</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
