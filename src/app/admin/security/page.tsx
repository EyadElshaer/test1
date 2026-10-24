"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Server,
  Filter,
} from "lucide-react";

interface LockoutItem {
  ip: string;
  scope: "customer" | "admin";
  target?: string;
  failedAttempts: number;
  remainingSeconds: number;
  lockedUntil: string;
}

export default function SecurityCenterPage() {
  const [lockouts, setLockouts] = useState<LockoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filterScope, setFilterScope] = useState<"ALL" | "customer" | "admin">("ALL");

  const fetchSecurityStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security");
      const data = await res.json();
      if (data.success) {
        setLockouts(data.activeLockouts || []);
      }
    } catch (err) {
      console.error("Failed to load security state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
    const interval = setInterval(fetchSecurityStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleUnblock = async (ip: string) => {
    setActionLoading(ip);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock", ip }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: "success", text: data.message });
        setLockouts((prev) => prev.filter((item) => item.ip !== ip));
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to unblock IP." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Network error" });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredLockouts = lockouts.filter((item) => {
    if (filterScope === "ALL") return true;
    return item.scope === filterScope;
  });

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-cyan-400" />
            <span>Security Center & Anti-Brute Force</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time IP restriction monitoring, active brute-force mitigations, and account defense.
          </p>
        </div>

        <button
          onClick={fetchSecurityStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Security Policies Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10 bg-[#070d1d]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Customer Login Policy
            </span>
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-white">10 Attempts Max</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Locked for 15 minutes after 10 failed passwords. Interactive cryptographic CAPTCHA required after 3 failed attempts.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 bg-[#070d1d]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Admin Portal Policy
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-black text-white">5 Attempts Max</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Locked for 30 minutes after 5 failed admin logins. CAPTCHA triggered after 2 failed attempts. All security events logged to audit ledger.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 bg-[#070d1d]/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Injection Defenses
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white">Active & Enforced</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Magic-byte file signatures check, XSS text sanitization, parameterized queries, and strict HTTP security headers enabled.
          </p>
        </div>
      </div>

      {/* Active IP Lockouts Table */}
      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden bg-[#070d1d]/90 shadow-2xl">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Currently Restricted IP Addresses ({lockouts.length})
            </h2>
          </div>

          {/* Scope Filter */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
            <button
              onClick={() => setFilterScope("ALL")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                filterScope === "ALL" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterScope("customer")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                filterScope === "customer" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Customer
            </button>
            <button
              onClick={() => setFilterScope("admin")}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                filterScope === "admin" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {loading && lockouts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-mono">
            Loading active security lockouts...
          </div>
        ) : filteredLockouts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Active IP Lockouts</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              System is healthy. No IP addresses or accounts are currently restricted by brute-force triggers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4 font-semibold">IP Address</th>
                  <th className="py-3 px-4 font-semibold">Scope</th>
                  <th className="py-3 px-4 font-semibold">Target Account</th>
                  <th className="py-3 px-4 font-semibold">Failed Strikes</th>
                  <th className="py-3 px-4 font-semibold">Lockout Remaining</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLockouts.map((item) => (
                  <tr key={item.ip} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span>{item.ip}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.scope === "admin"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        }`}
                      >
                        {item.scope}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {item.target || "N/A"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-rose-400">{item.failedAttempts} attempts</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatSeconds(item.remainingSeconds)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleUnblock(item.ip)}
                        disabled={actionLoading === item.ip}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>{actionLoading === item.ip ? "Unlocking..." : "Unblock"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
