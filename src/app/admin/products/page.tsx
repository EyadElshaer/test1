"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  X,
  Sparkles,
  Tag,
} from "lucide-react";
import { compressImageForUpload } from "@/lib/imageCompression";


export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [originalPrice, setOriginalPrice] = useState<number | "">("");
  const [salePrice, setSalePrice] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [platform, setPlatform] = useState("Windows");
  const [productType, setProductType] = useState("License");
  const [compatibility, setCompatibility] = useState("Global");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [availability, setAvailability] = useState("IN_STOCK");
  const [stockQuantity, setStockQuantity] = useState(999);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Live Auto-calculated Discount Percentage
  const origNum = Number(originalPrice) || 0;
  const saleNum = Number(salePrice) || 0;
  const calculatedDiscount =
    origNum > 0 && saleNum < origNum ? Math.round(((origNum - saleNum) / origNum) * 100) : 0;

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/admin/products?search=${encodeURIComponent(search)}&categoryId=${categoryFilter}&status=${statusFilter}`),
        fetch("/api/admin/categories"),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();

      if (prodData.success) setProducts(prodData.products || []);
      if (catData.success) {
        setCategories(catData.categories || []);
        if (catData.categories?.length > 0 && !categoryId) {
          setCategoryId(catData.categories[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openCreateModal = () => {
    setEditingProductId(null);
    setTitle("");
    setSlug("");
    setShortDescription("");
    setDescription("");
    setOriginalPrice("");
    setSalePrice("");
    if (categories.length > 0) setCategoryId(categories[0].id);
    setPlatform("Windows");
    setProductType("License");
    setCompatibility("Global");
    setDeliveryInstructions("");
    setAvailability("IN_STOCK");
    setStockQuantity(999);
    setIsFeatured(false);
    setIsPublished(true);
    setImages([]);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingProductId(p.id);
    setTitle(p.title);
    setSlug(p.slug);
    setShortDescription(p.shortDescription || "");
    setDescription(p.description);
    setOriginalPrice(p.originalPrice);
    setSalePrice(p.salePrice);
    setCategoryId(p.categoryId);
    setPlatform(p.platform || "Windows");
    setProductType(p.productType || "License");
    setCompatibility(p.compatibility || "Global");
    setDeliveryInstructions(p.deliveryInstructions || "");
    setAvailability(p.availability);
    setStockQuantity(p.stockQuantity);
    setIsFeatured(p.isFeatured);
    setIsPublished(p.isPublished);
    setImages(p.images?.map((img: any) => img.url) || []);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleDuplicateProduct = (p: any) => {
    setEditingProductId(null);
    setTitle(`${p.title} (Copy)`);
    setSlug(`${p.slug}-copy`);
    setShortDescription(p.shortDescription || "");
    setDescription(p.description);
    setOriginalPrice(p.originalPrice);
    setSalePrice(p.salePrice);
    setCategoryId(p.categoryId);
    setPlatform(p.platform || "Windows");
    setProductType(p.productType || "License");
    setCompatibility(p.compatibility || "Global");
    setDeliveryInstructions(p.deliveryInstructions || "");
    setAvailability(p.availability);
    setStockQuantity(p.stockQuantity);
    setIsFeatured(false);
    setIsPublished(false); // Default duplicated product to unreleased
    setImages(p.images?.map((img: any) => img.url) || []);
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete or archive '${name}'?`)) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to remove product.");
        return;
      }
      alert(data.message || "Product removed.");
      loadData();
    } catch (e) {
      alert("Error deleting product.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);

    try {
      // Compress image client-side for fast, seamless upload and reduced payload
      const optimizedFile = await compressImageForUpload(file, 1600, 1600, 0.85);
      const formData = new FormData();
      formData.append("image", optimizedFile);

      const res = await fetch("/api/admin/upload-product-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Upload failed.");
      }
      setImages((prev) => [...prev, data.url]);
    } catch (err: any) {
      alert(err.message || "Upload failed.");
    } finally {
      setIsUploadingImage(false);
      // Reset input value so same file can be selected again if needed
      e.target.value = "";
    }
  };

  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      setImages((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!title.trim() || !description.trim() || !categoryId) {
      setFormError("Title, description, and category are required.");
      return;
    }

    if (origNum < 0 || saleNum < 0) {
      setFormError("Prices cannot be negative.");
      return;
    }

    if (saleNum > origNum) {
      setFormError("Sale price cannot exceed the original regular price.");
      return;
    }

    setIsSaving(true);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      originalPrice: origNum,
      salePrice: saleNum,
      categoryId,
      platform,
      productType,
      compatibility,
      deliveryInstructions: deliveryInstructions.trim(),
      availability,
      stockQuantity: Number(stockQuantity) || 999,
      isFeatured,
      isPublished,
      images,
    };

    try {
      const url = editingProductId
        ? `/api/admin/products/${editingProductId}`
        : "/api/admin/products";
      const method = editingProductId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save product.");
      }

      setFormSuccess("Product saved successfully!");
      setTimeout(() => {
        setIsModalOpen(false);
        loadData();
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || "Error saving product.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono">
            Product Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, duplicate, publish, manage inventory, and configure dynamic discounts.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="glass-input px-3 py-1.5 rounded-xl text-xs"
          >
            <option value="ALL" className="bg-slate-900">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input px-3 py-1.5 rounded-xl text-xs"
          >
            <option value="ALL" className="bg-slate-900">All Statuses</option>
            <option value="PUBLISHED" className="bg-slate-900">Published Only</option>
            <option value="UNPUBLISHED" className="bg-slate-900">Unpublished</option>
            <option value="ARCHIVED" className="bg-slate-900">Archived</option>
          </select>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-72">
          <input
            type="text"
            placeholder="Search product title, slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input px-3 py-1.5 rounded-xl text-xs"
          />
          <button type="submit" className="px-3 py-1.5 rounded-xl text-xs font-bold btn-secondary">
            Filter
          </button>
        </form>
      </div>

      {/* Products Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 font-semibold">Product</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Platform</th>
                <th className="py-3.5 px-4 font-semibold">Original Price</th>
                <th className="py-3.5 px-4 font-semibold">Sale Price</th>
                <th className="py-3.5 px-4 font-semibold">Discount</th>
                <th className="py-3.5 px-4 font-semibold">Stock Status</th>
                <th className="py-3.5 px-4 font-semibold">Published</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Title + Thumbnail */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                          <Image
                            src={prod.images?.[0]?.url || "/images/premikeys-logo.png"}
                            alt={prod.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <span className="font-bold text-white block line-clamp-1">{prod.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">/{prod.slug}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 text-slate-300">
                      {prod.category?.name || "None"}
                    </td>

                    {/* Platform */}
                    <td className="py-3 px-4 text-cyan-400 font-semibold">
                      {prod.platform || "PC"}
                    </td>

                    {/* Original Price */}
                    <td className="py-3 px-4 text-slate-400 line-through font-mono">
                      {prod.originalPrice.toLocaleString()} EGP
                    </td>

                    {/* Sale Price */}
                    <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                      {prod.salePrice.toLocaleString()} EGP
                    </td>

                    {/* Discount */}
                    <td className="py-3 px-4">
                      {prod.discountPercent > 0 ? (
                        <span className="badge-discount text-[10px] px-2 py-0.5 rounded-md font-bold">
                          -{prod.discountPercent}%
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">None</span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          prod.availability === "IN_STOCK"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/10 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {prod.availability} ({prod.stockQuantity})
                      </span>
                    </td>

                    {/* Published */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          prod.isPublished
                            ? "bg-blue-500/10 text-cyan-300 border border-blue-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {prod.isPublished ? "Live" : "Draft"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/products/${prod.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                          title="Preview on Store"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDuplicateProduct(prod)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id, prod.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5"
                          title="Delete / Archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-3xl w-full border border-white/20 shadow-2xl my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-lg text-white font-mono">
                {editingProductId ? "Edit Product" : "Create New Product"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}
            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Product Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Windows 11 Pro Retail License"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    URL Slug (auto-generated if empty)
                  </label>
                  <input
                    type="text"
                    placeholder="windows-11-pro-license"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Category, Platform, Product Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Platform
                  </label>
                  <input
                    type="text"
                    placeholder="Steam, Windows, EA App..."
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Product Type
                  </label>
                  <input
                    type="text"
                    placeholder="Key, License, Activation..."
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Pricing & Automatic Discount Calculation */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  Pricing & Automatic Discount Engine
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Original Regular Price (EGP) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="650"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value ? Number(e.target.value) : "")}
                      className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Sale Discounted Price (EGP) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="380"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : "")}
                      className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs">
                    <span className="text-[10px] text-slate-400 block">Auto-Calculated Discount:</span>
                    <strong className="text-emerald-400 text-sm font-bold">
                      {calculatedDiscount > 0 ? `-${calculatedDiscount}% OFF` : "No Discount"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Stock & Availability */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Availability Status
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  >
                    <option value="IN_STOCK" className="bg-slate-900">IN STOCK</option>
                    <option value="OUT_OF_STOCK" className="bg-slate-900">OUT OF STOCK</option>
                    <option value="PREORDER" className="bg-slate-900">PREORDER</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Short & Detailed Description */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="Summary for catalog card..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Full Detailed Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Comprehensive description, features, and requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              {/* Delivery Instructions */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Activation / Delivery Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Step-by-step guide for redeeming this key..."
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              {/* Product Images */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <label className="text-xs font-bold text-white block">
                  Product Images
                </label>

                {/* Upload or Add URL */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste image URL..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 glass-input px-3 py-1.5 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={addImageUrl}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-secondary"
                  >
                    Add URL
                  </button>
                  <label className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploadingImage ? "..." : "Upload File"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Images Preview Grid */}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/20 bg-slate-900 group"
                      >
                        <Image src={img} alt="Product image" fill className="object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 bg-blue-600 text-[9px] font-bold px-1 rounded text-white">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-600/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggles: Featured & Published */}
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded bg-slate-900 text-blue-600 cursor-pointer"
                  />
                  <span>Mark as Featured (Shown on Homepage)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="rounded bg-slate-900 text-blue-600 cursor-pointer"
                  />
                  <span>Publish to Storefront Catalog</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-7 py-2.5 rounded-xl text-xs font-bold btn-primary disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
