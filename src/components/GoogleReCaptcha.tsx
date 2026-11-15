"use client";

import React, { useRef, useState, useImperativeHandle, forwardRef } from "react";
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

export const GoogleReCaptcha = forwardRef<GoogleReCaptchaRef, GoogleReCaptchaProps>(
  function GoogleReCaptcha({ onVerify, onExpire, className = "" }, ref) {
    const [checking, setChecking] = useState(false);
    const [verified, setVerified] = useState(false);
    const [verifiedToken, setVerifiedToken] = useState("");
    const [errorText, setErrorText] = useState("");

    const onVerifyRef = useRef(onVerify);
    onVerifyRef.current = onVerify;

    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    useImperativeHandle(ref, () => ({
      reset: () => {
        setChecking(false);
        setVerified(false);
        setVerifiedToken("");
        setErrorText("");
      },
      getResponse: () => {
      return verifiedToken;
    },
    }));

const handleCheckboxClick = async () => {
  if (checking || verified) return;
    setChecking(true);
    setErrorText("");
    try {
      await new Promise((r) => setTimeout(r, 350));
      const res = await fetch("/api/auth/recaptcha-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_checkbox" }),
      });
      const data = await res.json();
      if (res.ok && data?.token) {
        setVerifiedToken(data.token);
          setVerified(true);
          if (onVerifyRef.current) {
            onVerifyRef.current(data.token);
          }
        } else {
          setErrorText("Verification failed. Please try again.");
          if (onExpireRef.current) onExpireRef.current();
        }
      } catch (e) {
        setErrorText("Network error. Please try again.");
        if (onExpireRef.current) onExpireRef.current();
      } finally {
        setChecking(false);
      }
    };

    return (
        <div className={`flex flex-col items-center justify-center my-3 ${className}`}>
          <div
            onClick={handleCheckboxClick}
            role="checkbox"
            aria-checked={verified}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                handleCheckboxClick();
              }
            }}
            className="w-[302px] h-[76px] rounded-[4px] bg-[#222222] border border-[#555555] px-3.5 flex items-center justify-between select-none cursor-pointer shadow-lg hover:border-[#777777] transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-7 h-7 rounded-[3px] flex items-center justify-center transition-all ${verified || checking
                    ? "bg-transparent"
                    : "bg-[#1a1a1a] border-2 border-[#c1c1c1] hover:border-white"
                  }`}
              >
                {checking ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                ) : verified ? (
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
          {errorText && (
            <span className="text-[11px] text-rose-400 mt-1.5">{errorText}</span>
          )}
        </div>
        );
  }
        );
