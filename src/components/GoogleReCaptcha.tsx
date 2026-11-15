"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Check, Loader2 } from "lucide-react";

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
// Official Google reCAPTCHA v2 test Site Key for localhost / preview domains when production key is domain-locked
const LOCALHOST_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export const GoogleReCaptcha = forwardRef<GoogleReCaptchaRef, GoogleReCaptchaProps>(
  function GoogleReCaptcha({ onVerify, onExpire, className = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);
    const [isRendered, setIsRendered] = useState(false);
    const [fetchedSiteKey, setFetchedSiteKey] = useState<string>("");

    // Built-in interactive checkbox fallback if external Google script is blocked or slow
    const [useFallbackBox, setUseFallbackBox] = useState(false);
    const [fallbackChecking, setFallbackChecking] = useState(false);
    const [fallbackVerified, setFallbackVerified] = useState(false);
    const [fallbackToken, setFallbackToken] = useState("");

    // Keep callback refs up to date to prevent stale closures or unmount bugs
    const onVerifyRef = useRef(onVerify);
    onVerifyRef.current = onVerify;

    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    const envSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || "";
    const configuredKey = fetchedSiteKey || envSiteKey || DEFAULT_SITE_KEY;
    const isProdDomain =
      typeof window !== "undefined" &&
    window.location.hostname.toLowerCase().endsWith("premikeys.com");
    const siteKey =
      !isProdDomain && configuredKey === DEFAULT_SITE_KEY
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
        .catch(() => { });
      return () => {
        active = false;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      reset: () => {
        setFallbackChecking(false);
        setFallbackVerified(false);
        setFallbackToken("");
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
        if (fallbackToken) return fallbackToken;
        if (typeof window !== "undefined") {
          if ((window as any).grecaptcha && widgetIdRef.current !== null) {
            try {
              const res = (window as any).grecaptcha.getResponse(widgetIdRef.current);
              if (res) return res;
            } catch (e) { }
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

      // If external Google script does not render within 2.2 seconds (e.g. adblocker / network restriction),
      // activate the built-in interactive "I'm not a robot" checkbox so the user is never stuck.
      const fallbackTimer = setTimeout(() => {
        if (
          isMounted &&
          (!containerRef.current || containerRef.current.childElementCount === 0)
        ) {
          setUseFallbackBox(true);
          setIsRendered(true);
        }
      }, 2200);

      const renderWidget = () => {
        if (!isMounted || !containerRef.current) return false;
        const grecaptcha = (window as any).grecaptcha;

        if (!grecaptcha || typeof grecaptcha.render !== "function") return false;

        // If container already has the rendered iframe, mark as rendered
        if (containerRef.current.childElementCount > 0) {
          clearTimeout(fallbackTimer);
          if (isMounted) {
            setUseFallbackBox(false);
            setIsRendered(true);
          }
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
          clearTimeout(fallbackTimer);
          if (isMounted) {
            setUseFallbackBox(false);
            setIsRendered(true);
          }
          return true;
        } catch (err) {
          if (containerRef.current && containerRef.current.childElementCount > 0) {
            clearTimeout(fallbackTimer);
            if (isMounted) {
              setUseFallbackBox(false);
              setIsRendered(true);
            }
            return true;
          }
          return false;
        }
      };

      const attemptRender = () => {
        const grecaptcha = (window as any).grecaptcha;
          if (!grecaptcha) return false;

          if (typeof grecaptcha.render === "function") {
            if (renderWidget()) return true;
          }
            if (typeof grecaptcha.ready === "function") {
              try {
                grecaptcha.ready(() => {
                  renderWidget();
                });
              } catch { }
            }
            return false;
          };

          if (!attemptRender()) {
            const prevOnLoad = (window as any).onGoogleReCaptchaLoad;
            (window as any).onGoogleReCaptchaLoad = () => {
              if (typeof prevOnLoad === "function") {
                try {
                  prevOnLoad();
                } catch { }
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
              script.onerror = () => {
                const fallbackId = "google-recaptcha-v2-fallback-script";
                if (!document.getElementById(fallbackId)) {
                  const fb = document.createElement("script");
                  fb.id = fallbackId;
                  fb.src =
                    "https://www.recaptcha.net/recaptcha/api.js?onload=onGoogleReCaptchaLoad&render=explicit";
                  fb.async = true;
                  fb.defer = true;
                  fb.onerror = () => {
                    if (isMounted) {
                      setUseFallbackBox(true);
                      setIsRendered(true);
                    }
                  };
                  document.head.appendChild(fb);
                }
              };
              document.head.appendChild(script);
            }

            // Poll until grecaptcha.render finishes initializing
            pollInterval = setInterval(() => {
              if (attemptRender() && pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
              }
            }, 150);
          }

          return () => {
            isMounted = false;
            clearTimeout(fallbackTimer);
            if (pollInterval) {
              clearInterval(pollInterval);
            }
          };
        }, [siteKey]);

    const handleFallbackClick = async () => {
      if (fallbackChecking || fallbackVerified) return;
      setFallbackChecking(true);
      try {
        await new Promise((r) => setTimeout(r, 350));
        const res = await fetch("/api/auth/recaptcha-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verify_checkbox" }),
        });
        const data = await res.json();
        if (res.ok && data?.token) {
          setFallbackToken(data.token);
          setFallbackVerified(true);
          if (onVerifyRef.current) {
            onVerifyRef.current(data.token);
          }
        }
      } catch (e) {
        console.warn("Verification checkbox error:", e);
      } finally {
        setFallbackChecking(false);
      }
    };

    return (
      <div className={`flex flex-col items-center justify-center my-3 ${className}`}>
          <div
            ref={containerRef}
            className={useFallbackBox ? "hidden" : "min-h-[78px] flex items-center justify-center"}
          />

        {useFallbackBox && (
          <div
            onClick={handleFallbackClick}
            role="checkbox"
            aria-checked={fallbackVerified}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                handleFallbackClick();
              }
            }}
            className="w-[302px] h-[76px] rounded-[4px] bg-[#222222] border border-[#555555] px-3.5 flex items-center justify-between select-none cursor-pointer shadow-lg hover:border-[#777777] transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-7 h-7 rounded-[3px] flex items-center justify-center transition-all ${fallbackVerified
                    ? "bg-transparent"
                    : fallbackChecking
                      ? "bg-transparent"
                      : "bg-[#1a1a1a] border-2 border-[#c1c1c1] hover:border-white"
                  }`}
              >
                {fallbackChecking ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                ) : fallbackVerified ? (
                  <Check className="w-7 h-7 text-emerald-400 stroke-[3]" />
                ) : null}
              </div>
              <span className="text-[14px] font-normal text-white font-sans">
                I&apos;m not a robot
              </span>
            </div>

            <div className="flex flex-col items-center justify-center text-center leading-tight pr-1">
              <svg
                className="w-8 h-8 mb-0.5"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M32 8C18.745 8 8 18.745 8 32H16C16 23.163 23.163 16 32 16C36.418 16 40.418 17.791 43.314 20.686L37 27H54V10L48.971 15.029C44.627 10.686 38.627 8 32 8Z"
                  fill="#4285F4"
                />
                <path
                  d="M56 32H48C48 40.837 40.837 48 32 48C27.582 48 23.582 46.209 20.686 43.314L27 37H10V54L15.029 48.971C19.373 53.314 25.373 56 32 56C45.255 56 56 45.255 56 32Z"
                  fill="#9AA0A6"
                />
              </svg>
              <span className="text-[9px] text-[#9aa0a6] font-sans">reCAPTCHA</span>
              <span className="text-[8px] text-[#777777] font-sans">Privacy - Terms</span>
            </div>
          </div>
        )}

        {!isRendered && !useFallbackBox && (
          <div className="text-[11px] text-slate-500 font-mono py-2">
            Loading Google reCAPTCHA widget...
          </div>
        )}
      </div>
    );
  }
);
