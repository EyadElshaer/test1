"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  CreditCard,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  ArrowRight,
  Info,
  Smartphone,
  Copy,
  Check,
  Eye,
  EyeOff,
  User,
  Package,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { COUNTRY_CODES, CountryCode } from "@/lib/countryCodes";
import { compressImageForUpload } from "@/lib/imageCompression";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, promoDiscount, total, appliedPromo, clearCart } = useCart();
  const { user, refreshUser } = useAuth();

  // Customer Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]); // Egypt (+20)
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Auto Signup State
  const [autoSignup, setAutoSignup] = useState(false);
  const [autoSignupPassword, setAutoSignupPassword] = useState("");
  const [showAutoSignupPassword, setShowAutoSignupPassword] = useState(false);

  // Pre-fill user details if logged in
  useEffect(() => {
    if (user) {
      if (user.name && !customerName) setCustomerName(user.name);
      if (user.email && !customerEmail) setCustomerEmail(user.email);
      if (user.phone && !customerPhone) {
        const cleaned = user.phone.replace(/^\+2/, "");
        setCustomerPhone(cleaned);
      }
    }
  }, [user]);

  // Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState("");

  // Payment Screenshot State
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);

  // Status & Error
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Order Successful Pop-up Modal State
  const [orderSuccessModal, setOrderSuccessModal] = useState<{
    orderNumber: string;
    totalAmount: number;
    currency: string;
    customerName: string;
    customerPhone: string;
    paymentMethod: string;
  } | null>(null);
  const [copiedModalCode, setCopiedModalCode] = useState(false);

  const handleCopyAccount = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleCopyModalCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedModalCode(true);
    setTimeout(() => setCopiedModalCode(false), 2000);
  };

  // Redirect if cart is empty and no confirmation modal is open
  useEffect(() => {
    if (items.length === 0 && !orderSuccessModal) {
      router.push("/cart");
    }
  }, [items, orderSuccessModal, router]);

  // Load payment methods
  useEffect(() => {
    fetch("/api/payment-methods")
      .then((res) => res.json())
      .then((data) => {
        if (data.paymentMethods && data.paymentMethods.length > 0) {
          setPaymentMethods(data.paymentMethods);
          setSelectedMethodId(data.paymentMethods[0].id);
        }
      })
      .catch((err) => console.error("Error loading payment methods:", err));
  }, []);

  const selectedPaymentMethod = paymentMethods.find((m) => m.id === selectedMethodId);

  // Filter countries for dropdown
  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch)
  );

  // Handle Screenshot Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
    if (!allowed.includes(file.type)) {
      setErrorMessage("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage("File exceeds 20MB limit. Please select a smaller screenshot.");
      return;
    }

    setScreenshotFile(file);
    const objectUrl = URL.createObjectURL(file);
    setScreenshotPreview(objectUrl);

    // Compress client-side for ultra-fast, smooth upload that won't fail on any network or Vercel limit
    setIsUploadingScreenshot(true);

    try {
      const optimizedFile = await compressImageForUpload(file, 1600, 1600, 0.85);
      const formData = new FormData();
      formData.append("screenshot", optimizedFile);

      const res = await fetch("/api/checkout/upload-screenshot", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload screenshot.");
      }
      setScreenshotUrl(data.url);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload screenshot.");
      setScreenshotFile(null);
      setScreenshotPreview(null);
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
    setScreenshotUrl(null);
  };

  // Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 6) {
      setErrorMessage("Please enter a valid mobile number.");
      return;
    }

    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!selectedPaymentMethod) {
      setErrorMessage("Please select a payment method.");
      return;
    }

    if (!user && autoSignup) {
      if (!autoSignupPassword || autoSignupPassword.length < 6) {
        setErrorMessage("Please enter an account password of at least 6 characters.");
        return;
      }
    }

    if (selectedPaymentMethod.requireScreenshot && !screenshotUrl) {
      setErrorMessage(`Please upload proof of transfer for ${selectedPaymentMethod.name}.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        countryDialCode: selectedCountry.dialCode,
        countryCode: selectedCountry.code,
        customerEmail: customerEmail.trim().toLowerCase(),
        customerNotes: customerNotes.trim(),
        paymentMethodId: selectedPaymentMethod.id,
        paymentReference: paymentReference.trim(),
        paymentScreenshotUrl: screenshotUrl,
        promoCode: appliedPromo?.code || null,
        autoSignup: !user && autoSignup,
        password: autoSignupPassword,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      };

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process order.");
      }

      if (!user && autoSignup) {
        await refreshUser();
      }

      // Display Confirmation Popup Modal on Screen
      setOrderSuccessModal({
        orderNumber: data.orderNumber,
        totalAmount: data.order?.totalAmount || total,
        currency: data.order?.currency || "EGP",
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        paymentMethod: selectedPaymentMethod.name,
      });

      // Clear cart
      clearCart();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while creating your order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !orderSuccessModal) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Checkout Title */}
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-3xl font-black text-white">Checkout & Payment</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Complete your contact information and transfer payment using your preferred manual method.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT: Customer Info & Payment Method */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Customer Information Card */}
            <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-5">
              <div className="flex items-center gap-2 text-white font-bold text-base border-b border-white/10 pb-3">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
                  1
                </span>
                <span>Customer Information</span>
              </div>

              {/* Logged in indicator */}
              {user && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-cyan-200">
                      Signed in as <strong>{user.name}</strong> ({user.email || user.phone})
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded">
                    Linked to Account
                  </span>
                </div>
              )}

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                {/* International Phone Input */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Phone Number (for order notifications & license delivery) <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2 relative">
                    {/* Country Selector Trigger */}
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className="glass-input px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 hover:border-cyan-400/50"
                    >
                      <span className="text-base">{selectedCountry.flag}</span>
                      <span className="font-semibold text-white">{selectedCountry.dialCode}</span>
                    </button>

                    {/* Phone Number Field */}
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 01012345678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="flex-1 glass-input px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono"
                    />

                    {/* Country Selector Dropdown */}
                    {isCountryDropdownOpen && (
                      <div className="absolute top-12 left-0 w-72 max-h-64 bg-[#0a102b] border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-white/10">
                          <input
                            type="text"
                            placeholder="Search country or code..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs"
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-white/5">
                          {filteredCountries.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(c);
                                setIsCountryDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-white/10 text-slate-300 hover:text-white"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base">{c.flag}</span>
                                <span>{c.name}</span>
                              </div>
                              <span className="font-mono text-cyan-400 font-semibold">{c.dialCode}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Email Address (for order receipts & key backup) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="your-email@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs sm:text-sm"
                  />
                </div>

                {/* Order Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Special Instructions / Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any specific delivery or activation notes..."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>

                {/* Auto-Signup Checkbox & Password Field (if guest) */}
                {!user && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-black/40 border border-blue-500/30 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoSignup}
                        onChange={(e) => setAutoSignup(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-900 border-white/20 cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white block">
                          Create an account for me with these details
                        </span>
                        <span className="text-[11px] text-slate-300 block">
                          Access your digital keys anytime, track past orders, and stay signed in automatically.
                        </span>
                      </div>
                    </label>

                    {autoSignup && (
                      <div className="pt-3 border-t border-white/10 space-y-2 animate-in fade-in duration-200">
                        <label className="text-xs font-semibold text-slate-200 block">
                          Create Account Password <span className="text-cyan-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showAutoSignupPassword ? "text" : "password"}
                            required={autoSignup}
                            placeholder="Choose a password (minimum 6 characters)"
                            value={autoSignupPassword}
                            onChange={(e) => setAutoSignupPassword(e.target.value)}
                            className="w-full glass-input pr-10 px-3.5 py-2.5 rounded-xl text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAutoSignupPassword(!showAutoSignupPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            aria-label="Toggle password visibility"
                          >
                            {showAutoSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-cyan-300 flex items-center gap-1 font-mono">
                          <span>🔒</span>
                          <span>You will be kept securely signed in for 90 days with persistent cookies.</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Payment Method Selection & Instructions */}
            <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-5">
              <div className="flex items-center gap-2 text-white font-bold text-base border-b border-white/10 pb-3">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
                  2
                </span>
                <span>Select Manual Payment Method</span>
              </div>

              {/* Payment Method Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const isSelected = method.id === selectedMethodId;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? "bg-blue-600/20 border-cyan-400 shadow-[0_0_20px_rgba(0,102,255,0.25)] text-white"
                          : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-sm text-white">{method.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                      </div>
                      {method.description && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                          {method.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instructions for Selected Method */}
              {selectedPaymentMethod && (
                <div className="p-5 rounded-2xl bg-[#070d24] border border-cyan-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      Transfer Instructions: {selectedPaymentMethod.name}
                    </span>
                    {/* Deep link button if configured */}
                    {selectedPaymentMethod.deepLink && (
                      <a
                        href={selectedPaymentMethod.deepLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <span>Open {selectedPaymentMethod.name} App</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-black/40 p-4 rounded-xl border border-white/5 font-sans">
                    {selectedPaymentMethod.instructions}
                  </div>

                  {selectedPaymentMethod.accountDetails && (
                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-slate-400 block text-[11px]">Recipient / Account Information:</span>
                        <strong className="text-white font-mono text-sm block mt-0.5 select-all truncate">
                          {selectedPaymentMethod.accountDetails}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount(selectedPaymentMethod.accountDetails)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/30 hover:bg-blue-600 text-cyan-300 hover:text-white border border-blue-400/30 transition-all flex items-center gap-1.5 shrink-0 active:scale-95 shadow-sm"
                        title="Copy to clipboard"
                      >
                        {copiedAccount ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Transfer Reference Input */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      {selectedPaymentMethod.transferReferenceHint || "Transfer Reference / Sender Wallet Number"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Transaction Ref or Sender Number"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* 3. Payment Screenshot Upload */}
              {selectedPaymentMethod?.requireScreenshot && (
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <label className="text-xs font-bold text-white flex items-center justify-between">
                    <span>
                      Upload Payment Transfer Proof <span className="text-rose-400">*</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      JPEG, PNG, WebP (Max 8MB)
                    </span>
                  </label>

                  {screenshotPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-cyan-400/50 p-2 bg-slate-900 flex items-center gap-4">
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-white/10">
                        <Image
                          src={screenshotPreview}
                          alt="Payment Proof Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Screenshot Stored Securely
                        </span>
                        <p className="text-slate-400 text-[11px] mt-1 truncate">
                          {screenshotFile?.name}
                        </p>
                        <button
                          type="button"
                          onClick={removeScreenshot}
                          className="mt-2 text-xs text-rose-400 hover:underline flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Replace Screenshot</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-white/20 hover:border-cyan-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-white/[0.01] hover:bg-white/[0.03]">
                      <UploadCloud className="w-8 h-8 text-cyan-400 mb-2" />
                      <span className="text-xs font-semibold text-white">
                        {isUploadingScreenshot ? "Uploading screenshot..." : "Click or drag transfer screenshot here"}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Screenshot must clearly show transfer amount, timestamp, and recipient.
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFileChange}
                        disabled={isUploadingScreenshot}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Order Summary Snapshot */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6 sticky top-28">
              <h3 className="font-bold text-lg text-white">Order Summary</h3>

              {/* Items List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-white/5">
                {items.map((item) => (
                  <div key={item.productId} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                        <Image
                          src={item.image || "/images/premikeys-logo.png"}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-white line-clamp-1">{item.title}</span>
                        <span className="text-slate-400 text-[11px]">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-white shrink-0">
                      {(item.salePrice * item.quantity).toLocaleString()} EGP
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 text-xs text-slate-300 pt-4 border-t border-white/10">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-white font-medium">{subtotal.toLocaleString()} EGP</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({appliedPromo?.code})</span>
                    <span>-{promoDiscount.toLocaleString()} EGP</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Selected Payment</span>
                  <span className="text-cyan-400 font-semibold">{selectedPaymentMethod?.name || "Manual"}</span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-4 border-t border-white/10">
                  <span>Total Due</span>
                  <span className="text-cyan-300 text-xl font-mono">{total.toLocaleString()} EGP</span>
                </div>
              </div>

              {/* Submit Order Button */}
              <button
                type="submit"
                disabled={isSubmitting || isUploadingScreenshot}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm text-white btn-primary shadow-xl shadow-blue-500/30 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Verifying & Submitting Order...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Order for Verification</span>
                  </>
                )}
              </button>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Next Step After Submission</span>
                </div>
                <p>
                  You will receive a unique <code className="text-cyan-300 font-mono">#DN...</code> order number. Our verification team will review your payment transfer and unlock your activation key.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ORDER SUCCESSFUL CONFIRMATION POPUP MODAL */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="glass-card rounded-3xl p-6 sm:p-10 max-w-lg w-full border border-emerald-500/40 shadow-2xl shadow-emerald-950/50 space-y-6 text-center relative">
            {/* Success Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.35)]">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Order Successful! 🎉
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-mono">
                Order Received
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{orderSuccessModal.customerName}</strong>! Your order has been placed and is currently awaiting manual payment verification.
              </p>
            </div>

            {/* Prominent Order Code Box */}
            <div className="p-5 rounded-2xl bg-[#070e24] border-2 border-cyan-400/50 space-y-3 shadow-lg shadow-cyan-950/40">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                Your Order Reference Code
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-2xl sm:text-3xl font-black text-cyan-300 select-all tracking-wider">
                  {orderSuccessModal.orderNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyModalCode(orderSuccessModal.orderNumber)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                  title="Copy order code"
                >
                  {copiedModalCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Please save this code to check your order status or request customer support.
              </p>
            </div>

            {/* Summary Details */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-300 space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Channel:</span>
                <span className="font-semibold text-white">{orderSuccessModal.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Amount:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {orderSuccessModal.totalAmount.toLocaleString()} {orderSuccessModal.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Contact Mobile:</span>
                <span className="font-mono text-white">{orderSuccessModal.customerPhone}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => router.push(`/order-confirmation/${encodeURIComponent(orderSuccessModal.orderNumber)}`)}
                className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white btn-primary flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
              >
                <span>Track Order & View Confirmation</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {(user || autoSignup) && (
                <button
                  type="button"
                  onClick={() => router.push("/account/orders")}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  <span>View in My Account (Purchased Keys)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => router.push("/products")}
                className="w-full py-3 rounded-xl font-semibold text-xs text-slate-300 btn-secondary"
              >
                Continue Browsing Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
