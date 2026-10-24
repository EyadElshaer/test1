"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { COUNTRY_CODES, CountryCode } from "@/lib/countryCodes";
import { useRecaptcha } from "@/lib/useRecaptcha";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/account/orders";
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";

  const { login, register, user } = useAuth();
  const { executeRecaptcha } = useRecaptcha();

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [identifierType, setIdentifierType] = useState<"phone" | "email">("phone");

  // Country Code selector for phone
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]); // Default Egypt (+20)
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Security & IP Lockout state
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemainingSeconds <= 0) {
      if (isLocked) {
        setIsLocked(false);
        setErrorMessage("");
      }
      return;
    }

    const timer = setInterval(() => {
      setLockoutRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsLocked(false);
          setErrorMessage("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutRemainingSeconds, isLocked]);

  // Format lockout timer as MM:SS
  const formatLockoutTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Filter countries
  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.dialCode.includes(countrySearch)
  );

  // Handle phone input with automatic leading zero(s) removal
  const handlePhoneChange = (val: string) => {
    let raw = val.trim();
    if (raw.startsWith("+")) {
      const match = COUNTRY_CODES.find((c) => raw.startsWith(c.dialCode));
      if (match) {
        setSelectedCountry(match);
        raw = raw.slice(match.dialCode.length);
      }
    }
    let digits = raw.replace(/\D/g, "");
    digits = digits.replace(/^0+/, "");
    setPhoneInput(digits);
  };

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      router.replace(redirectUrl);
    }
  }, [user, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (isLocked) {
      setErrorMessage(`IP temporarily restricted. Please wait ${formatLockoutTimer(lockoutRemainingSeconds)}.`);
      return;
    }

    const finalIdentifier =
      identifierType === "phone"
        ? `${selectedCountry.dialCode}${phoneInput}`
        : emailInput.trim();

    if (identifierType === "phone" && !phoneInput.trim()) {
      setErrorMessage("Please enter your mobile phone number.");
      return;
    }

    if (identifierType === "email" && !emailInput.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    if (activeTab === "register") {
      if (!name.trim()) {
        setErrorMessage("Please enter your full name.");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
        return;
      }

      setIsLoading(true);
      const res = await register({
        name: name.trim(),
        identifier: finalIdentifier,
        password,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create account.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Account created successfully! Redirecting...");
      setTimeout(() => {
        router.push(redirectUrl);
      }, 700);
    } else {
      setIsLoading(true);

      // Execute Google reCAPTCHA v3 invisibly
      const recaptchaToken = await executeRecaptcha("customer_login");

      const res = await login(finalIdentifier, password, recaptchaToken || undefined);

      if (!res.success) {
        setErrorMessage(res.error || "Login failed. Please check your credentials.");

        // Check if locked out
        if (res.isLocked && res.retryAfterSeconds) {
          setIsLocked(true);
          setLockoutRemainingSeconds(res.retryAfterSeconds);
        }

        // Update remaining attempts
        if (res.remainingAttempts !== undefined) {
          setRemainingAttempts(res.remainingAttempts);
        }

        setIsLoading(false);
        return;
      }

      setSuccessMessage("Logged in successfully! Redirecting...");
      setTimeout(() => {
        router.push(redirectUrl);
      }, 700);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block transition-transform hover:scale-105">
            <div className="relative h-14 w-36 mx-auto">
              <Image
                src="/images/premikeys-logo.png"
                alt="PremiKeys"
                fill
                priority
                className="object-contain"
              />
            </div>
          </Link>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {activeTab === "login" ? "Welcome Back to PremiKeys" : "Create Your Customer Account"}
          </h1>
          <p className="text-xs text-slate-400">
            {activeTab === "login"
              ? "Access your purchased license keys, invoices, and active orders."
              : "Track your license keys anytime, enjoy instant checkouts, and manage order history."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="glass-card p-1 rounded-2xl border border-white/10 grid grid-cols-2 gap-1 bg-black/40">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setErrorMessage("");
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "login"
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setErrorMessage("");
            }}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "register"
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Auth Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 bg-[#070d1d]/90 shadow-2xl relative">
          {/* Lockout Warning Banner */}
          {isLocked && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 space-y-2">
              <div className="flex items-center gap-2.5 font-bold text-xs text-rose-200">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>Security Lockout: IP Restricted</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-300/90">
                10 incorrect password attempts detected. To safeguard accounts against unauthorized access, logins from your IP have been temporarily restricted.
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-xs font-semibold text-rose-200">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>Lockout expires in: {formatLockoutTimer(lockoutRemainingSeconds)}</span>
              </div>
            </div>
          )}

          {/* Remaining Attempts Warning */}
          {!isLocked && remainingAttempts !== null && remainingAttempts <= 5 && remainingAttempts > 0 && activeTab === "login" && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} remaining before your IP is restricted for 15 minutes.
              </span>
            </div>
          )}

          {errorMessage && !isLocked && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (for Register only) */}
            {activeTab === "register" && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ahmed Hassan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            {/* Identifier Type Selector: Phone Number or Email */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {identifierType === "phone" ? "Mobile Phone Number" : "Email Address"}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifierType(identifierType === "phone" ? "email" : "phone");
                    setErrorMessage("");
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-medium"
                >
                  {identifierType === "phone" ? (
                    <>
                      <Mail className="w-3 h-3" />
                      <span>Use Email instead</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-3 h-3" />
                      <span>Use Phone instead</span>
                    </>
                  )}
                </button>
              </div>

              {identifierType === "phone" ? (
                <div className="space-y-1.5">
                  <div className="relative flex items-center gap-2">
                    {/* Country Code Trigger */}
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className="glass-input px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shrink-0 hover:border-cyan-400/50 transition-colors"
                    >
                      <span className="text-base">{selectedCountry.flag}</span>
                      <span className="font-semibold text-white font-mono">{selectedCountry.dialCode}</span>
                    </button>

                    {/* Phone Input */}
                    <div className="relative flex-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 1012345678"
                        value={phoneInput}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full glass-input pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono"
                      />
                    </div>

                    {/* Country Selector Dropdown */}
                    {isCountryDropdownOpen && (
                      <div className="absolute top-12 left-0 w-72 max-h-64 bg-[#0a102b] border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-white/10">
                          <input
                            type="text"
                            placeholder="Search country or dial code..."
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
                  {phoneInput && (
                    <span className="text-[10px] text-cyan-400/90 font-mono block pl-1">
                      Full International: {selectedCountry.dialCode}{phoneInput}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 block pl-1">
                    Leading 0 is automatically removed for international accuracy.
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. ahmed@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder={
                    activeTab === "register" ? "At least 6 characters" : "Enter your account password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pl-10 pr-10 py-2.5 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (for Register only) */}
            {activeTab === "register" && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full mt-2 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
            >
              {isLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>IP Restricted ({formatLockoutTimer(lockoutRemainingSeconds)})</span>
                </>
              ) : (
                <>
                  <span>
                    {isLoading
                      ? "Verifying with Google reCAPTCHA..."
                      : activeTab === "login"
                      ? "Sign In to Account"
                      : "Create My Account"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Google reCAPTCHA reassurance */}
          <div className="mt-6 pt-5 border-t border-white/10 space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Protected by Google reCAPTCHA & PremiKeys Anti-Brute Force</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              This site is protected by reCAPTCHA and the Google{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-cyan-400 underline underline-offset-2"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="https://policies.google.com/terms"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-cyan-400 underline underline-offset-2"
              >
                Terms of Service
              </a>{" "}
              apply.
            </p>
          </div>
        </div>

        {/* Guest Order Lookup Helper */}
        <div className="text-center">
          <p className="text-xs text-slate-400">
            Have an existing order number from guest checkout?{" "}
            <Link
              href="/my-orders"
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2"
            >
              Track guest order with order #
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-slate-400 text-xs font-mono">
          Loading authentication...
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
