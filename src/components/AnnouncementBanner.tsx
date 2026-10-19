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
      .catch(() => {});
  }, []);

  if (pathname.startsWith("/admin") || !bannerText) {
    return null;
  }

  return (
    <div className="relative z-30 bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-blue-900/90 border-b border-blue-500/20 py-2 px-4 text-center text-xs sm:text-sm font-medium text-cyan-200 flex items-center justify-center gap-2 overflow-hidden shadow-inner">
      <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
      <span>{bannerText}</span>
    </div>
  );
}
