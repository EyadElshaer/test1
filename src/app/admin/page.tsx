"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  AlertCircle,
  ShieldCheck,
  RotateCw,
  ShieldAlert,
  Clock,
  KeyRound,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Security & Bot Defense state
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

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

  const formatLockoutTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const fetchNewCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch("/api/auth/captcha?scope=admin");
      const data = await res.json();
      if (data.success) {
        setCaptchaToken(data.captchaToken);
        setCaptchaSvg(data.captchaSvg);
        setCaptchaAnswer("");
      }
    } catch (err) {
      console.error("Failed to load admin captcha:", err);
    } finally {
      setCaptchaLoading(false);
    }
  };

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

    if (isLocked) {
      setErrorMessage(`IP temporarily restricted. Please wait ${formatLockoutTimer(lockoutRemainingSeconds)}.`);
      return;
    }

    if (requiresCaptcha && !captchaAnswer.trim()) {
      setErrorMessage("Please enter the security verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          captchaToken: requiresCaptcha ? captchaToken : undefined,
          captchaAnswer: requiresCaptcha ? captchaAnswer.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Login failed.");

        if (data.isLocked && data.retryAfterSeconds) {
          setIsLocked(true);
          setLockoutRemainingSeconds(data.retryAfterSeconds);
        }

        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }

        if (data.requiresCaptcha) {
          setRequiresCaptcha(true);
          if (data.captchaToken && data.captchaSvg) {
            setCaptchaToken(data.captchaToken);
            setCaptchaSvg(data.captchaSvg);
            setCaptchaAnswer("");
          } else {
            fetchNewCaptcha();
          }
        }

        return;
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

      <div className="max-w-md w-full glass-card rounded-3xl p-8 sm:p-10 border border-white/10 shadow-2xl relative z-10 space-y-7">
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

        {/* Lockout Warning Banner */}
        {isLocked && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-rose-200">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <span>Security Lockout: Admin IP Restricted</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-300/90">
              Maximum failed login attempts reached. For operations security, authentication requests from this IP address are locked.
            </p>
            <div className="flex items-center gap-2 pt-1 font-mono text-xs font-semibold text-rose-200">
              <Clock className="w-4 h-4 text-rose-400" />
              <span>Lockout active: {formatLockoutTimer(lockoutRemainingSeconds)}</span>
            </div>
          </div>
        )}

        {/* Warning if attempts <= 3 */}
        {!isLocked && remainingAttempts !== null && remainingAttempts <= 3 && remainingAttempts > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {remainingAttempts} attempt{remainingAttempts === 1 ? "" : "s"} left before 30-minute IP lockout.
            </span>
          </div>
        )}

        {errorMessage && !isLocked && (
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

          {/* CAPTCHA Challenge for Admin */}
          {requiresCaptcha && (
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Security Challenge</span>
                </label>
                <button
                  type="button"
                  onClick={fetchNewCaptcha}
                  disabled={captchaLoading}
                  className="text-[11px] text-cyan-400 hover:text-cyan-200 transition-colors flex items-center gap-1"
                  title="Refresh Code"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${captchaLoading ? "animate-spin" : ""}`} />
                  <span>Refresh Code</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black/40 shadow-inner flex items-center justify-center p-1">
                  {captchaSvg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={captchaSvg}
                      alt="Security challenge"
                      className="h-12 w-auto select-none"
                    />
                  ) : (
                    <div className="h-12 w-44 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                      Loading code...
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  required
                  maxLength={6}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  placeholder="5 characters"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value.toUpperCase())}
                  className="flex-1 w-full glass-input px-3.5 py-3 rounded-xl text-center text-sm font-mono tracking-widest uppercase font-bold text-cyan-200"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isLocked || !username || !password}
            className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white btn-primary shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLocked ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Locked Out ({formatLockoutTimer(lockoutRemainingSeconds)})</span>
              </>
            ) : isLoading ? (
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
          Authorized personnel only. Protected by 256-bit encryption, strict IP lockout rate limiting, and real-time security auditing.
        </div>
      </div>
    </div>
  );
}
