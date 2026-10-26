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

export function GoogleOneTap() {
  const pathname = usePathname();
  const { user, loading: authLoading, loginWithGoogleCredential } = useAuth();

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [clientId, setClientId] = useState<string | null>(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null
  );
  const [statusToast, setStatusToast] = useState<StatusToast | null>(null);
  const isPromptingRef = useRef(false);
  const promptAttemptedRef = useRef(false);

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

  // Check if GIS script was already loaded by another component or page
  useEffect(() => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      setScriptLoaded(true);
    }
  }, []);

  // Initialize and trigger Google One Tap
  useEffect(() => {
    // Conditions to display One Tap:
    // 1. Script is loaded
    // 2. Client ID is available
    // 3. User is not logged in
    // 4. Auth is not loading
    // 5. Not on admin pages
    if (
      !scriptLoaded ||
      !clientId ||
      user ||
      authLoading ||
      isAdminRoute ||
      !window.google?.accounts?.id
    ) {
      // If user logged in or navigated to admin, dismiss any pending prompt
      if (user && window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
      return;
    }

    // Avoid double prompting in the same session lifecycle
    if (isPromptingRef.current || promptAttemptedRef.current) {
      return;
    }

    try {
      isPromptingRef.current = true;
      promptAttemptedRef.current = true;

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
          const reason = notification.getNotDisplayedReason();
          console.info("[Google One Tap] Prompt not displayed. Reason:", reason);
          // Common reasons:
          // - 'opt_out_or_no_session': User is signed out of Google or opted out
          // - 'suppressed_by_user': Exponential cooldown after user closed prompt
          // - 'origin_mismatch': Current URL origin not added in Google Cloud Console
        } else if (notification.isSkippedMoment()) {
          console.info(
            "[Google One Tap] Prompt skipped. Reason:",
            notification.getSkippedReason()
          );
        } else if (notification.isDismissedMoment()) {
          console.info(
            "[Google One Tap] Prompt dismissed by user. Reason:",
            notification.getDismissedReason()
          );
        } else if (notification.isDisplayed()) {
          console.info("[Google One Tap] Prompt displayed successfully!");
        }
      });
    } catch (err) {
      isPromptingRef.current = false;
      console.warn("[Google One Tap] Initialization error:", err);
    }

    return () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
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

      {/* Floating Status Toast for One Tap interactions */}
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
