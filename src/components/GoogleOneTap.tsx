"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Script from "next/script";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string; select_by?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            prompt_parent_id?: string;
            context?: "signin" | "signup" | "use";
            itp_support?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (
            notification?: (moment: {
              isDisplayed: () => boolean;
              isNotDisplayed: () => boolean;
              getNotDisplayedReason: () => string;
              isSkippedMoment: () => boolean;
              getSkippedReason: () => string;
              isDismissedMoment: () => boolean;
              getDismissedReason: () => string;
              getMomentType: () => string;
            }) => void
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface StatusToast {
  type: "loading" | "success" | "error";
  message: string;
}

export function GoogleOneTap() {
  const pathname = usePathname();
  const { user, loading: authLoading, loginWithGoogleCredential } = useAuth();

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [clientId, setClientId] = useState<string | null>(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null
  );
  const [statusToast, setStatusToast] = useState<StatusToast | null>(null);
  const [hostName, setHostName] = useState("premikeys.vercel.app");
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePromptVisible, setMobilePromptVisible] = useState(false);
  const isPromptingRef = useRef(false);

  // Do not prompt Google One Tap on admin dashboard routes
  const isAdminRoute = pathname?.startsWith("/admin");

  // Detect current domain and mobile viewport
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostName(window.location.host || "premikeys.vercel.app");
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 640);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  // Fetch client ID from server status if not available in client-side env
  useEffect(() => {
    if (!clientId) {
      let isMounted = true;
      fetch("/api/auth/google/status")
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data?.clientId) {
            setClientId(data.clientId);
          }
        })
        .catch((err) => {
          console.warn("[Google One Tap] Could not retrieve Google Client ID:", err);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [clientId]);

  // Handle GIS Credential response when user clicks "Continue as [Name]"
  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      if (!response?.credential) return;

      setStatusToast({
        type: "loading",
        message: "Signing you in with Google...",
      });

      try {
        const result = await loginWithGoogleCredential(response.credential);
        if (result.success) {
          setMobilePromptVisible(false);
          setStatusToast({
            type: "success",
            message: "Welcome! Signed in successfully with Google.",
          });
          setTimeout(() => setStatusToast(null), 4000);
        } else {
          setStatusToast({
            type: "error",
            message: result.error || "Failed to sign in with Google.",
          });
          setTimeout(() => setStatusToast(null), 5000);
        }
      } catch (err: any) {
        setStatusToast({
          type: "error",
          message: err?.message || "An unexpected error occurred during Google sign in.",
        });
        setTimeout(() => setStatusToast(null), 5000);
      }
    },
    [loginWithGoogleCredential]
  );

  // Check if GIS script was already loaded
  useEffect(() => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      setScriptLoaded(true);
    }
  }, []);

  // Manage Mobile Dark Pop-up Visibility
  useEffect(() => {
    if (user || authLoading || isAdminRoute) {
      setMobilePromptVisible(false);
      return;
    }

    if (isMobile) {
      // Check if dismissed in this session
      try {
        const dismissed = sessionStorage.getItem("premikeys_onetap_mobile_dismissed");
        if (!dismissed) {
          // Slight delay for smooth entrance
          const timer = setTimeout(() => {
            setMobilePromptVisible(true);
          }, 1200);
          return () => clearTimeout(timer);
        }
      } catch {
        setMobilePromptVisible(true);
      }
    } else {
      setMobilePromptVisible(false);
    }
  }, [user, authLoading, isAdminRoute, isMobile]);

  // Trigger Google GIS on Desktop
  useEffect(() => {
    if (
      isMobile ||
      !scriptLoaded ||
      !clientId ||
      user ||
      authLoading ||
      isAdminRoute ||
      !window.google?.accounts?.id
    ) {
      if (user && window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
      return;
    }

    if (isPromptingRef.current) return;

    try {
      isPromptingRef.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        use_fedcm_for_prompt: true,
        context: "signin",
      });

      window.google.accounts.id.prompt((notification) => {
        isPromptingRef.current = false;
        if (notification.isNotDisplayed()) {
          console.info("[Google One Tap] Desktop prompt not displayed:", notification.getNotDisplayedReason());
        }
      });
    } catch (err) {
      isPromptingRef.current = false;
      console.warn("[Google One Tap] Desktop GIS error:", err);
    }

    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, [
    isMobile,
    scriptLoaded,
    clientId,
    user,
    authLoading,
    isAdminRoute,
    handleCredentialResponse,
  ]);

  const handleDismissMobilePrompt = () => {
    try {
      sessionStorage.setItem("premikeys_onetap_mobile_dismissed", "true");
    } catch {}
    setMobilePromptVisible(false);
  };

  const handleMobileContinueGoogle = () => {
    // Initiate Google OAuth login
    const targetUrl = `/api/auth/google?redirect=${encodeURIComponent(pathname || "/account/orders")}`;
    window.location.href = targetUrl;
  };

  return (
    <>
      {/* Official Google Identity Services Client Library */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

      {/* CUSTOM DARK-THEMED MOBILE GOOGLE POP-UP (NO UGLY WHITE BACKGROUND) */}
      {mobilePromptVisible && !user && !authLoading && !isAdminRoute && (
        <div
          role="dialog"
          aria-label={`Sign in to ${hostName} with Google`}
          className="fixed bottom-3 left-3 right-3 sm:hidden z-50 animate-in fade-in slide-in-from-bottom-6 duration-300 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))]"
        >
          <div className="relative rounded-3xl p-5 bg-[#070d1e]/98 backdrop-blur-2xl border-2 border-cyan-500/30 shadow-[0_-10px_40px_rgba(0,102,255,0.35)] space-y-4 text-white">
            {/* Header: Close Button + Google Branding */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Official Google 'G' Logo SVG */}
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">
                    Sign in to <span className="text-cyan-300 font-mono">{hostName}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">with google.com</p>
                </div>
              </div>

              {/* Close 'X' Button */}
              <button
                type="button"
                onClick={handleDismissMobilePrompt}
                className="p-1.5 rounded-full text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors shrink-0"
                aria-label="Dismiss Sign in with Google"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              Sign in with your Google account for instant 1-click access to your genuine activation keys, past orders, and verified licenses.
            </p>

            {/* Primary Blue "Continue with Google" Action Button */}
            <button
              type="button"
              onClick={handleMobileContinueGoogle}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
              </div>
              <span>Continue with Google</span>
            </button>

            {/* Privacy & Terms disclaimer */}
            <p className="text-[10px] text-slate-400 text-center leading-normal">
              To continue, google.com will verify your profile with this site. See our{" "}
              <Link
                href="/privacy-policy"
                onClick={handleDismissMobilePrompt}
                className="text-cyan-400 hover:underline"
              >
                privacy policy
              </Link>{" "}
              and{" "}
              <Link
                href="/terms-of-service"
                onClick={handleDismissMobilePrompt}
                className="text-cyan-400 hover:underline"
              >
                terms
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {/* Floating Status Toast for Google Sign In interactions */}
      {statusToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-24 right-4 sm:right-6 z-[999999] max-w-sm w-auto px-4 py-3 rounded-2xl bg-[#070d1d]/95 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200"
        >
          {statusToast.type === "loading" && (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
          )}
          {statusToast.type === "success" && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          {statusToast.type === "error" && (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-medium text-white">
            {statusToast.message}
          </span>
        </div>
      )}
    </>
  );
}

export default GoogleOneTap;
