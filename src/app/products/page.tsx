"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { Glass, SearchField, SegmentedControl, Button } from "glisse";
import {
  Search,
  RotateCcw,
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Page Header in Liquid Glass Panel */}
          <Glass className="rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-cyan-300 glass-pill uppercase tracking-widest mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Digital Catalog
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                  Browse All Keys &amp; Licenses
                </h1>
                <p className="text-xs sm:text-sm text-slate-200/85 mt-1.5 max-w-xl">
                  Genuine game activations, Windows 11 keys, and Microsoft Office with verified manual payment fulfillment.
                </p>
              </div>

                    {/* Glisse Liquid Glass SearchField */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
                    <SearchField
                      placeholder="Search games, software, platform..."
                      value={searchInput}
                      onValueChange={(val) => {
                        setSearchInput(val);
                        if (!val && currentSearch) {
                          updateQuery("search", null);
                        }
                      }}
                      className="w-full md:w-72"
                    />
            <Button
              type="submit"
              variant="filled"
              tint="#0088ff"
              className="shrink-0 font-bold text-xs shadow-lg shadow-blue-500/25"
            >
              Search
            </Button>
          </form>
        </div>
      </Glass>

            {/* Control Bar: Active Count & Glisse SegmentedControl Sort */}
            <Glass className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl border border-white/15 shadow-xl">
              <div className="flex items-center gap-3 px-2">
                <span className="text-xs text-slate-200">
                  Showing <strong className="text-white">{products.length}</strong> of{" "}
                  <strong className="text-cyan-300">{totalCount}</strong> products
                </span>
              </div>

                {/* Glisse SegmentedControl on Desktop + Fallback Select on Mobile */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 font-medium hidden lg:inline">Sort by:</span>
                  <div className="hidden md:block">
                    <SegmentedControl
                      value={currentSort}
                      onValueChange={(val) => updateQuery("sort", val)}
                      style={{ "--lg-tab-width": "104px", "--lg-tab-height": "34px" } as React.CSSProperties}
                      items={[
                        { value: "featured", label: "Featured" },
                        { value: "newest", label: "Newest" },
                        { value: "price-asc", label: "Price ↑" },
                        { value: "price-desc", label: "Price ↓" },
                        { value: "name", label: "Name A-Z" },
                      ]}
                    />
                  </div>
                  <select
                    value={currentSort}
                    onChange={(e) => updateQuery("sort", e.target.value)}
                    className="md:hidden w-full glass-input px-3.5 py-2 rounded-2xl text-xs font-semibold text-white cursor-pointer"
                  >
                    <option value="featured" className="bg-slate-900">Featured</option>
                    <option value="newest" className="bg-slate-900">Newest Added</option>
                    <option value="price-asc" className="bg-slate-900">Price: Low to High</option>
                    <option value="price-desc" className="bg-slate-900">Price: High to Low</option>
                    <option value="name" className="bg-slate-900">Alphabetical (A-Z)</option>
                  </select>
                </div>
            </Glass>

            {/* PRODUCTS CATALOG GRID - Full Width */}
            <div>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-3xl glass-card p-4 space-y-4 skeleton-shimmer h-80 gpu-layer"
                    >
                      <div className="h-44 bg-white/5 rounded-2xl" />
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                      <div className="h-4 bg-white/5 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                    <Glass className="p-12 text-center rounded-3xl space-y-4 border border-white/15">
                      <div className="w-16 h-16 rounded-2xl glass-pill text-cyan-300 mx-auto flex items-center justify-center">
                        <Search className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">No products found</h3>
                          <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                            Try adjusting your search terms to find what you need.
                          </p>
                      </div>
                  <div className="pt-1">
                    <Button
                      variant="glass"
                      icon={<RotateCcw className="w-4 h-4" />}
                      onClick={resetSearch}
                      className="text-xs font-semibold"
                    >
                      Clear Search
                    </Button>
                  </div>
                </Glass>
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
