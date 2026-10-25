"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, X, ExternalLink, Key, Copy, Check } from "lucide-react";

interface GoogleSignInButtonProps {
  redirectUrl?: string;
  text?: string;
  className?: string;
  disabled?: boolean;
}

export function GoogleSignInButton({
  redirectUrl = "/account/orders",
  text = "Continue with Google",
  className = "",
  disabled = false,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Check if Google OAuth credentials have been added to .env
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/google/status")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setIsConfigured(Boolean(data.configured));
        }
      })
      .catch(() => {
        if (isMounted) setIsConfigured(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled || isLoading) return;

    // If server reports Google credentials are not yet configured in .env, display the setup guide modal
    if (isConfigured === false) {
      setShowConfigModal(true);
      return;
    }

    setIsLoading(true);
    const targetUrl = `/api/auth/google?redirect=${encodeURIComponent(redirectUrl)}`;
    window.location.href = targetUrl;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`w-full relative group py-3 px-4 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.09] active:scale-[0.985] text-white font-medium text-xs shadow-md transition-all duration-200 flex items-center justify-center gap-3 select-none backdrop-blur-md overflow-hidden ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } ${className}`}
        aria-label={text}
      >
        {/* Subtle hover gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span className="text-slate-200">Connecting to Google...</span>
          </>
        ) : (
          <>
            {/* Official Google 'G' Logo SVG */}
            <svg
              className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110 duration-200"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span className="font-semibold tracking-wide text-slate-100 group-hover:text-white">
              {text}
            </span>
          </>
        )}
      </button>

      {/* Setup Required Modal (Shown if credentials are not yet configured in .env) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#0c1427] border border-cyan-500/30 p-6 sm:p-7 shadow-2xl space-y-5 text-left text-slate-200">
            {/* Close button */}
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Google OAuth Setup Required</h3>
                <p className="text-xs text-slate-400">
                  Enable one-click Google Sign-In by adding your Google Cloud keys.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 bg-black/40 rounded-2xl p-4 border border-white/10">
              <p className="font-semibold text-white">
                1. Add these 2 variables to your <code className="text-cyan-400 font-mono">.env</code> file:
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-white/5 font-mono text-[11px]">
                  <span className="text-slate-300 truncate">
                    GOOGLE_CLIENT_ID=&quot;your_google_client_id.apps.googleusercontent.com&quot;
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"',
                        "id"
                      )
                    }
                    className="ml-2 text-cyan-400 hover:text-cyan-300 shrink-0"
                    title="Copy"
                  >
                    {copiedKey === "id" ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-white/5 font-mono text-[11px]">
                  <span className="text-slate-300 truncate">
                    GOOGLE_CLIENT_SECRET=&quot;your_google_client_secret&quot;
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        'GOOGLE_CLIENT_SECRET="your_google_client_secret"',
                        "secret"
                      )
                    }
                    className="ml-2 text-cyan-400 hover:text-cyan-300 shrink-0"
                    title="Copy"
                  >
                    {copiedKey === "secret" ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <p className="font-semibold text-white">
                2. In Google Cloud Console &gt; Credentials &gt; OAuth 2.0 Client ID:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>
                  <strong>Authorized JavaScript origins:</strong>{" "}
                  <code className="text-cyan-400 font-mono">http://localhost:3000</code>
                </li>
                <li>
                  <strong>Authorized redirect URIs:</strong>{" "}
                  <code className="text-cyan-400 font-mono">
                    http://localhost:3000/api/auth/google/callback
                  </code>
                </li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5"
              >
                <span>Open Google Cloud Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
