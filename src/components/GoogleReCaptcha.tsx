"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";

export interface GoogleReCaptchaRef {
  reset: () => void;
}

interface GoogleReCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

// User's Google reCAPTCHA v2 Site Key
const DEFAULT_SITE_KEY = "6LdWVf8tAAAAABypkK7B_ChiPGK9jCvTpoZh1rZv";

export const GoogleReCaptcha = forwardRef<GoogleReCaptchaRef, GoogleReCaptchaProps>(
  function GoogleReCaptcha({ onVerify, onExpire, className = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);
    const [isRendered, setIsRendered] = useState(false);

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || DEFAULT_SITE_KEY;

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
    }));

    useEffect(() => {
      let isMounted = true;

      const renderWidget = () => {
        if (!isMounted || !containerRef.current) return;
        const grecaptcha = (window as any).grecaptcha;

        if (!grecaptcha || typeof grecaptcha.render !== "function") return;

        // Prevent duplicate rendering in the same container
        if (widgetIdRef.current !== null || containerRef.current.hasChildNodes()) {
          return;
        }

        try {
          const id = grecaptcha.render(containerRef.current, {
            sitekey: siteKey,
            theme: "dark",
            callback: (token: string) => {
              if (isMounted) onVerify(token);
            },
            "expired-callback": () => {
              if (isMounted && onExpire) onExpire();
            },
          });
          widgetIdRef.current = id;
          if (isMounted) setIsRendered(true);
        } catch (err) {
          // Ignore React 18/19 duplicate mount attempts in dev
        }
      };

      if (typeof window === "undefined") return;

      const grecaptcha = (window as any).grecaptcha;
      if (grecaptcha && grecaptcha.render) {
        renderWidget();
      } else {
        // Set global callback for when the script finishes loading
        (window as any).onGoogleReCaptchaLoad = () => {
          renderWidget();
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
      }

      return () => {
        isMounted = false;
      };
    }, [siteKey, onVerify, onExpire]);

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
