"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import {
  Search,
  RotateCcw,
  X,
  Sparkles,
} from "lucide-react";

function ProductsCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Search & Sort State from URL
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "featured";

  // Data State
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Local Search Input
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Fetch Products whenever searchParams change
  useEffect(() => {
    setIsLoading(true);
    const query = new URLSearchParams(searchParams.toString());
    fetch(`/api/products?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.products || []);
          setTotalCount(data.pagination?.total || 0);
        }
      })
      .catch((err) => console.error("Error loading products:", err))
      .finally(() => setIsLoading(false));
  }, [searchParams]);

  // Update URL helper
  const updateQuery = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    // reset to page 1
    params.delete("page");
    startTransition(() => {
      router.push(`/products?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery("search", searchInput.trim());
  };

  const resetSearch = () => {
    setSearchInput("");
    router.push("/products");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Digital Catalog
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
            Browse All Keys & Licenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Genuine game activations, Windows 11 keys, and Microsoft Office with verified manual payment fulfillment.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search games, software, platform..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-slate-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  updateQuery("search", null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-bold btn-primary shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      {/* Control Bar: Active Count & Sort Dropdown */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/60 p-3.5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300">
            Showing <strong className="text-white">{products.length}</strong> of{" "}
            <strong className="text-cyan-400">{totalCount}</strong> products
          </span>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Sort by:</span>
          <select
            value={currentSort}
            onChange={(e) => updateQuery("sort", e.target.value)}
            className="glass-input px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer"
          >
            <option value="featured" className="bg-slate-900">Featured</option>
            <option value="newest" className="bg-slate-900">Newest Added</option>
            <option value="price-asc" className="bg-slate-900">Price: Low to High</option>
            <option value="price-desc" className="bg-slate-900">Price: High to Low</option>
            <option value="name" className="bg-slate-900">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>

      {/* PRODUCTS CATALOG GRID - Full Width */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-slate-900/60 border border-white/5 p-4 space-y-4 skeleton-shimmer h-80 gpu-layer"
              >
                <div className="h-44 bg-slate-800/50 rounded-xl" />
                <div className="h-4 bg-slate-800/50 rounded w-3/4" />
                <div className="h-4 bg-slate-800/50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center rounded-2xl glass-card space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-cyan-400 mx-auto flex items-center justify-center">
              <Search className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No products found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try adjusting your search terms to find what you need.
              </p>
            </div>
            <button
              onClick={resetSearch}
              className="px-6 py-2.5 rounded-xl btn-secondary text-xs font-semibold inline-flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Search</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                slug={product.slug}
                shortDescription={product.shortDescription}
                salePrice={product.salePrice}
                originalPrice={product.originalPrice}
                discountPercent={product.discountPercent}
                platform={product.platform}
                productType={product.productType}
                availability={product.availability}
                category={product.category}
                images={product.images}
                attributeValues={product.attributeValues}
                configurations={product.configurations}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
          Loading catalog...
        </div>
      }
    >
      <ProductsCatalogContent />
    </Suspense>
  );
}
