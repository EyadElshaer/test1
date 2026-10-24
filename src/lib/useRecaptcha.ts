"use client";

import { useEffect, useState, useCallback } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

/**
 * Custom React hook for Google reCAPTCHA v3 invisible execution
 */
export function useRecaptcha() {
  const [siteKey, setSiteKey] = useState<string>(
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // If not in env, fetch from server config
  useEffect(() => {
    if (!siteKey) {
      fetch("/api/auth/recaptcha-config")
        .then((res) => res.json())
        .then((data) => {
          if (data.siteKey) {
            setSiteKey(data.siteKey);
          }
        })
        .catch(() => {});
    }
  }, [siteKey]);

  // Load Google reCAPTCHA v3 script dynamically
  useEffect(() => {
    if (!siteKey) return;

    const scriptId = "google-recaptcha-v3-script";
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      if (window.grecaptcha) {
        setIsLoaded(true);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setIsLoaded(true);
        });
      }
    };
    script.onerror = () => {
      console.warn("Failed to load Google reCAPTCHA script.");
    };

    document.head.appendChild(script);
  }, [siteKey]);

  /**
   * Execute Google reCAPTCHA v3 to obtain a token for server verification
   */
  const executeRecaptcha = useCallback(
    async (action: string = "login"): Promise<string | null> => {
      if (!siteKey) {
        // No key configured, allow request to proceed without client token
        return null;
      }

      try {
        if (!window.grecaptcha) {
          // If script still loading, give a brief 500ms window
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        if (!window.grecaptcha) {
          console.warn("Google reCAPTCHA is not yet loaded.");
          return null;
        }

        return new Promise<string>((resolve, reject) => {
          window.grecaptcha!.ready(() => {
            window.grecaptcha!
              .execute(siteKey, { action })
              .then((token) => resolve(token))
              .catch((err) => {
                console.error("reCAPTCHA execute failed:", err);
                resolve("");
              });
          });
        });
      } catch (err) {
        console.error("Error executing reCAPTCHA:", err);
        return null;
      }
    },
    [siteKey]
  );

  return {
    siteKey,
    isLoaded,
    executeRecaptcha,
  };
}
