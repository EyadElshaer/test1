"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  Check,
  ChevronDown,
  X,
  Sparkles,
} from "lucide-react";

interface FilterOption {
  id: string;
  label: string;
  value: string;
}

interface FilterGroup {
  id: string;
  label: string;
  attributeKey: string;
  filterType: string;
  options: FilterOption[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  _count?: { products: number };
}

function ProductsCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Search & Filter State from URL
  const currentSearch = searchParams.get("search") || "";
  const currentCategory = searchParams.get("category") || "ALL";
  const currentSort = searchParams.get("sort") || "featured";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const currentDiscounted = searchParams.get("discounted") === "true";
  const currentAvailability = searchParams.get("availability") || "ALL";

  // Data State
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Mobile Filter Drawer Toggle
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Lock body scroll when mobile filter is open
  useEffect(() => {
    if (mobileFilterOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileFilterOpen]);

  // Local Search Input
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Load Categories & Dynamic Admin Filter Groups
  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/filters").then((r) => r.json()),
    ])
      .then(([catsData, filtersData]) => {
        if (catsData.categories) setCategories(catsData.categories);
        if (filtersData.filterGroups) setFilterGroups(filtersData.filterGroups);
      })
      .catch((err) => console.error("Filter loading error:", err));
  }, []);

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

  const resetAllFilters = () => {
    setSearchInput("");
    router.push("/products");
  };

  const isFilterActive = (key: string, value: string) => {
    return searchParams.get(key) === value;
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

      {/* Control Bar: Active Count, Sort Dropdown & Mobile Filter Button */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/60 p-3.5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 text-white"
          >
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Filters</span>
          </button>
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

      {/* Main Grid: Sidebar Filters + Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* SIDEBAR FILTERS (Desktop & Mobile Drawer) */}
        <aside
          className={`${
            mobileFilterOpen ? "fixed inset-0 z-50 p-6 bg-[#030712]/95 overflow-y-auto block" : "hidden"
          } lg:block lg:sticky lg:top-28 space-y-6 glass-panel rounded-2xl p-6 border border-white/10`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span>Catalog Filters</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetAllFilters}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                title="Clear all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              {mobileFilterOpen && (
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="lg:hidden p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Categories Filter */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Category</h4>
            <div className="space-y-1">
              <button
                onClick={() => updateQuery("category", "ALL")}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                  currentCategory === "ALL"
                    ? "bg-blue-600/20 text-cyan-300 border border-blue-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>All Categories</span>
                {currentCategory === "ALL" && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updateQuery("category", cat.slug)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                    currentCategory === cat.slug
                      ? "bg-blue-600/20 text-cyan-300 border border-blue-500/30"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="line-clamp-1">{cat.name}</span>
                  {currentCategory === cat.slug && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Discounted Only Toggle */}
          <div className="pt-4 border-t border-white/5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={currentDiscounted}
                onChange={(e) => updateQuery("discounted", e.target.checked ? "true" : null)}
                className="w-4 h-4 rounded bg-slate-900 border-white/20 text-blue-600 focus:ring-cyan-400 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-300 group-hover:text-white flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-rose-400" />
                <span>On Sale / Discounted</span>
              </span>
            </label>
          </div>

          {/* Stock Availability Filter */}
          <div className="pt-4 border-t border-white/5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Availability</h4>
            <div className="flex gap-2">
              <button
                onClick={() => updateQuery("availability", "ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  currentAvailability === "ALL"
                    ? "bg-blue-600/30 text-cyan-300 border border-blue-500/40"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => updateQuery("availability", "IN_STOCK")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  currentAvailability === "IN_STOCK"
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                In Stock Only
              </button>
            </div>
          </div>

          {/* Dynamic Admin Filter Groups */}
          {filterGroups.map((group) => {
            const queryKey = group.attributeKey;
            const activeVal = searchParams.get(queryKey) || "ALL";

            return (
              <div key={group.id} className="pt-4 border-t border-white/5 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {group.label}
                </h4>
                <div className="space-y-1">
                  <button
                    onClick={() => updateQuery(queryKey, "ALL")}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                      activeVal === "ALL"
                        ? "bg-blue-600/20 text-cyan-300 border border-blue-500/30"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>All {group.label}s</span>
                    {activeVal === "ALL" && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                  {group.options.map((opt) => {
                    const isSelected = activeVal === opt.value;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => updateQuery(queryKey, isSelected ? "ALL" : opt.value)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-600/20 text-cyan-300 border border-blue-500/30"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Price Range Filter */}
          <div className="pt-4 border-t border-white/5 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Price (EGP)</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={currentMinPrice}
                onChange={(e) => updateQuery("minPrice", e.target.value)}
                className="w-1/2 glass-input px-2.5 py-1.5 rounded-lg text-xs"
              />
              <span className="text-slate-500 text-xs">-</span>
              <input
                type="number"
                placeholder="Max"
                value={currentMaxPrice}
                onChange={(e) => updateQuery("maxPrice", e.target.value)}
                className="w-1/2 glass-input px-2.5 py-1.5 rounded-lg text-xs"
              />
            </div>
          </div>

          {mobileFilterOpen && (
            <div className="sticky bottom-0 -mx-6 -mb-6 p-4 bg-[#030712]/95 border-t border-white/10 backdrop-blur-xl pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="w-full py-3.5 rounded-xl btn-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
              >
                <span>View Results ({totalCount} Products)</span>
              </button>
            </div>
          )}
        </aside>

        {/* PRODUCTS GRID */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
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
                  Try adjusting your search terms or clearing filter selections to find what you need.
                </p>
              </div>
              <button
                onClick={resetAllFilters}
                className="px-6 py-2.5 rounded-xl btn-secondary text-xs font-semibold inline-flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
