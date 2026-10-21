"use client";

import React, { useState, Suspense } from "react";
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
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/account/orders";
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";

  const { login, register, user } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [identifierType, setIdentifierType] = useState<"phone" | "email">("phone");

  // Form fields
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      router.replace(redirectUrl);
    }
  }, [user, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!identifier.trim()) {
      setErrorMessage(
        identifierType === "phone"
          ? "Please enter your phone number."
          : "Please enter your email address."
      );
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
        identifier: identifier.trim(),
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
      const res = await login(identifier.trim(), password);

      if (!res.success) {
        setErrorMessage(res.error || "Login failed. Please check your credentials.");
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
          {errorMessage && (
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
                    setIdentifier("");
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

              <div className="relative">
                {identifierType === "phone" ? (
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                ) : (
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                )}
                <input
                  type={identifierType === "phone" ? "tel" : "email"}
                  required
                  placeholder={
                    identifierType === "phone"
                      ? "e.g. 01012345678 or +201012345678"
                      : "e.g. ahmed@gmail.com"
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono"
                />
              </div>
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
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
            >
              <span>{isLoading ? "Please wait..." : activeTab === "login" ? "Sign In to Account" : "Create My Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Privacy & Security reassurance */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure 256-bit encrypted authentication</span>
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
