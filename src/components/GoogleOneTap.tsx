"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

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

/**
 * Deletes Google Identity Services exponential cooldown cookie (g_state).
 * When a user dismisses Google One Tap, Google sets this cookie to suppress
 * the prompt for 2 hours to 1 week. Removing it allows the prompt to show.
 */
function clearGoogleCooldownCookie() {
  if (typeof document === "undefined") return;
  try {
    const expired = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
    const host = window.location.hostname;
    document.cookie = `g_state=; ${expired}; path=/`;
    document.cookie = `g_state=; ${expired}; path=/; domain=${host}`;
    document.cookie = `g_state=; ${expired}; path=/; domain=.${host}`;

    const parts = host.split(".");
    if (parts.length > 2) {
      const parentDomain = parts.slice(-2).join(".");
      document.cookie = `g_state=; ${expired}; path=/; domain=${parentDomain}`;
      document.cookie = `g_state=; ${expired}; path=/; domain=.${parentDomain}`;
    }
  } catch (err) {
    console.warn("[Google One Tap] Could not clear cooldown cookie:", err);
  }
}

export function GoogleOneTap() {
  const pathname = usePathname();
  const { user, loading: authLoading, loginWithGoogleCredential } = useAuth();

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [clientId, setClientId] = useState<string | null>(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null
  );
  const [statusToast, setStatusToast] = useState<StatusToast | null>(null);

  const isPromptingRef = useRef(false);
  const promptedOnceRef = useRef(false);

  // Do not prompt Google One Tap on admin dashboard routes
  const isAdminRoute = pathname?.startsWith("/admin");

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

  // Handle GIS Credential response when user clicks one-tap sign in
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

  // Poll for Google GSI script ready state (in addition to Script onLoad)
  useEffect(() => {
    const checkGoogle = () => {
      if (typeof window !== "undefined" && window.google?.accounts?.id) {
        setScriptLoaded(true);
        return true;
      }
      return false;
    };

    if (checkGoogle()) return;

    const interval = setInterval(() => {
      if (checkGoogle()) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Trigger Google Official One Tap prompt across desktop and mobile
  useEffect(() => {
    // If user is already logged in, auth is loading, or on admin route, cancel and skip
    if (user || authLoading || isAdminRoute) {
      if (user && window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
      return;
    }

    if (!scriptLoaded || !clientId || !window.google?.accounts?.id) {
      return;
    }

    if (isPromptingRef.current || promptedOnceRef.current) {
      return;
    }

    // Clear cooldown cookie so Google does not suppress the prompt
    clearGoogleCooldownCookie();

    const triggerPrompt = () => {
      if (!window.google?.accounts?.id) return;

      try {
        isPromptingRef.current = true;
        promptedOnceRef.current = true;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false, // Don't dismiss when user taps to scroll
          itp_support: true,
          use_fedcm_for_prompt: true,
          context: "signin",
        });

        window.google.accounts.id.prompt((notification) => {
          isPromptingRef.current = false;

          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            console.info("[Google One Tap] Prompt not displayed reason:", reason);

            if (reason === "suppressed_by_user") {
              // User had dismissed it previously; clear cookie for future visits
              clearGoogleCooldownCookie();
            }
          } else if (notification.isSkippedMoment()) {
            console.info(
              "[Google One Tap] Prompt skipped reason:",
              notification.getSkippedReason()
            );
          } else if (notification.isDismissedMoment()) {
            console.info(
              "[Google One Tap] Prompt dismissed reason:",
              notification.getDismissedReason()
            );
            // Clear cooldown so it shows again when navigating or reopening
            clearGoogleCooldownCookie();
          } else if (notification.isDisplayed()) {
            console.info("[Google One Tap] Official prompt displayed successfully!");
          }
        });
      } catch (err) {
        isPromptingRef.current = false;
        console.warn("[Google One Tap] Official GIS prompt error:", err);
      }
    };

    // Small delay ensures DOM and layout are settled
    const timer = setTimeout(triggerPrompt, 600);

    return () => {
      clearTimeout(timer);
    };
  }, [
    scriptLoaded,
    clientId,
    user,
    authLoading,
    isAdminRoute,
    handleCredentialResponse,
  ]);

  return (
    <>
      {/* Official Google Identity Services Client Library */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />

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
