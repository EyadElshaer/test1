"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";

export interface GoogleReCaptchaRef {
  reset: () => void;
  getResponse: () => string;
}

interface GoogleReCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

// Default Google reCAPTCHA v2 Site Key fallback (Production: premikeys.com)
const DEFAULT_SITE_KEY = "6LdWVf8tAAAAABypkK7B_ChiPGK9jCvTpoZh1rZv";
// Official Google reCAPTCHA v2 test Site Key for localhost / 127.0.0.1 when production key does not allow localhost
const LOCALHOST_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export const GoogleReCaptcha = forwardRef<GoogleReCaptchaRef, GoogleReCaptchaProps>(
  function GoogleReCaptcha({ onVerify, onExpire, className = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);
    const [isRendered, setIsRendered] = useState(false);
    const [fetchedSiteKey, setFetchedSiteKey] = useState<string>("");

    // Keep callback refs up to date to prevent stale closures or unmount bugs
    const onVerifyRef = useRef(onVerify);
    onVerifyRef.current = onVerify;

    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    const envSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || "";
    const configuredKey = fetchedSiteKey || envSiteKey || DEFAULT_SITE_KEY;
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]");
    const siteKey =
      isLocalhost && configuredKey === DEFAULT_SITE_KEY
        ? LOCALHOST_TEST_SITE_KEY
        : configuredKey;

    useEffect(() => {
      let active = true;
      fetch("/api/auth/recaptcha-config")
        .then((res) => res.json())
        .then((data) => {
          if (active && data?.siteKey && String(data.siteKey).trim()) {
            setFetchedSiteKey(String(data.siteKey).trim());
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (
          typeof window !== "undefined" &&
          (window as any).grecaptcha &&
          widgetIdRef.current !== null
        ) {
          try {
            (window as any).grecaptcha.reset(widgetIdRef.current);
          } catch (e) {
            console.warn("reCAPTCHA reset error:", e);
          }
        }
      },
      getResponse: () => {
        if (typeof window !== "undefined") {
          if ((window as any).grecaptcha && widgetIdRef.current !== null) {
            try {
              const res = (window as any).grecaptcha.getResponse(widgetIdRef.current);
              if (res) return res;
            } catch (e) {}
          }
          // Fallback check directly in DOM textarea created by Google
          const textarea = containerRef.current?.querySelector<HTMLTextAreaElement>(
            'textarea[name="g-recaptcha-response"]'
          );
          if (textarea && textarea.value) {
            return textarea.value;
          }
        }
        return "";
      },
    }));

    useEffect(() => {
      if (!siteKey || typeof window === "undefined") return;

      let isMounted = true;
      let pollInterval: ReturnType<typeof setInterval> | null = null;

      const renderWidget = () => {
        if (!isMounted || !containerRef.current) return false;
        const grecaptcha = (window as any).grecaptcha;

        if (!grecaptcha || typeof grecaptcha.render !== "function") return false;

        // If container already has the rendered iframe, mark as rendered
        if (containerRef.current.childElementCount > 0) {
          if (isMounted) setIsRendered(true);
          return true;
        }

        // Reset stale widgetIdRef if container is empty (e.g. after remount)
        widgetIdRef.current = null;

        try {
          const id = grecaptcha.render(containerRef.current, {
            sitekey: siteKey,
            theme: "dark",
            callback: (token: string) => {
              if (onVerifyRef.current) {
                onVerifyRef.current(token);
              }
            },
            "expired-callback": () => {
              if (onExpireRef.current) {
                onExpireRef.current();
              }
            },
            "error-callback": () => {
              if (onExpireRef.current) {
                onExpireRef.current();
              }
            },
          });
          widgetIdRef.current = id;
          if (isMounted) setIsRendered(true);
          return true;
        } catch (err) {
          if (containerRef.current && containerRef.current.childElementCount > 0) {
            if (isMounted) setIsRendered(true);
            return true;
          }
          return false;
        }
      };

      const attemptRender = () => {
        const grecaptcha = (window as any).grecaptcha;
        if (grecaptcha && typeof grecaptcha.render === "function") {
          return renderWidget();
        }
        if (grecaptcha && typeof grecaptcha.ready === "function") {
          try {
            grecaptcha.ready(() => {
              renderWidget();
            });
          } catch {}
        }
        return false;
      };

      if (!attemptRender()) {
        const prevOnLoad = (window as any).onGoogleReCaptchaLoad;
        (window as any).onGoogleReCaptchaLoad = () => {
          if (typeof prevOnLoad === "function") {
            try {
              prevOnLoad();
            } catch {}
          }
          attemptRender();
        };

        const scriptId = "google-recaptcha-v2-script";
        let script = document.getElementById(scriptId) as HTMLScriptElement | null;

        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.src =
            "https://www.google.com/recaptcha/api.js?onload=onGoogleReCaptchaLoad&render=explicit";
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        }

        // Poll until grecaptcha.render finishes initializing (handles script already in DOM or StrictMode remounts)
        pollInterval = setInterval(() => {
          if (attemptRender() && pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }, 150);
      }

      return () => {
        isMounted = false;
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }, [siteKey]);

    return (
      <div className={`flex flex-col items-center justify-center my-3 ${className}`}>
        <div ref={containerRef} className="min-h-[78px] flex items-center justify-center" />
        {!isRendered && (
          <div className="text-[11px] text-slate-500 font-mono py-2">
            Loading Google reCAPTCHA widget...
          </div>
        )}
      </div>
    );
  }
);
