"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, User, KeyRound, AlertCircle, ShieldCheck, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Check if already authenticated
  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace("/admin/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed.");
      }

      // Check if password change is mandatory
      if (data.admin?.mustChangePassword) {
        router.push("/admin/dashboard?forcePasswordChange=true");
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to authenticate.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#030712] relative overflow-hidden">
      {/* Cinematic Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-cyan-500/10 to-rose-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full glass-card rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl relative z-10 space-y-8">
        {/* Logo & Header */}
        <div className="text-center space-y-3">
          <div className="relative h-14 w-32 mx-auto">
            <Image
              src="/images/premikeys-logo.png"
              alt="PremiKeys"
              fill
              priority
              sizes="128px"
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-mono tracking-wider">
              ADMIN CENTER
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Secure Staff & Operations Management Portal
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-10 pr-4 py-3 rounded-xl text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white btn-primary shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Log In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-500 text-center leading-relaxed">
          Authorized personnel only. Sessions are encrypted and administrative actions are logged for audit compliance.
        </div>
      </div>
    </div>
  );
}
