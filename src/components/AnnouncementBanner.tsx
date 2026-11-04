"use client";

import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

export default function AnnouncementBanner() {
  const pathname = usePathname();
  const [bannerText, setBannerText] = useState("⚡ FLASH SALE: Use code PREMI10 for 10% off your digital game & software keys!");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.announcement_banner) {
          setBannerText(data.settings.announcement_banner);
        }
      })
      .catch(() => { });
  }, []);

  if (pathname.startsWith("/admin") || !bannerText) {
    return null;
  }

  return (
      <div className="relative z-40 px-3 sm:px-6 lg:px-8 pt-2">
        <div className="max-w-7xl mx-auto">
          <div className="glass-pill rounded-2xl py-1.5 sm:py-2 px-3 sm:px-4 text-center text-[11px] sm:text-xs font-medium text-cyan-100 flex items-center justify-center gap-1.5 sm:gap-2 overflow-hidden leading-snug">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0 animate-pulse" />
            <span className="line-clamp-2 sm:line-clamp-none">{bannerText}</span>
          </div>
        </div>
      </div>
      );
}
