"use client";

import React from "react";

interface BrandLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg" | "fullscreen";
}

export default function BrandLoader({
  message = "Loading Sri Sai Balaji...",
  size = "md",
}: BrandLoaderProps) {
  const isFullscreen = size === "fullscreen";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-6 ${
        isFullscreen ? "fixed inset-0 z-50 bg-[#0B1320]/95 backdrop-blur-md" : "min-h-[220px] w-full"
      }`}
    >
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-[#DFB76C]/30 via-[#E5C378]/20 to-[#B8860B]/30 blur-md animate-pulse" />

        {/* Outer rotating gold dashed ring */}
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#DFB76C]/60 animate-spin [animation-duration:8s]" />

        {/* Inner reverse-spinning thin accent ring */}
        <div className="absolute w-16 h-16 rounded-full border border-t-amber-300 border-r-transparent border-b-amber-500 border-l-transparent animate-spin [animation-duration:2.5s]" />

        {/* Central Brand Logo Mark with subtle heartbeat */}
        <div className="absolute w-12 h-12 rounded-full bg-[#0B1320] border border-[#DFB76C]/40 flex items-center justify-center shadow-lg shadow-amber-900/20 overflow-hidden">
          <img
            src="/shop-logo-mark.png"
            alt="Sri Sai Balaji Logo"
            className="w-9 h-9 object-contain drop-shadow-sm animate-pulse [animation-duration:2s]"
            loading="eager"
          />
        </div>
      </div>

      {/* Brand caption */}
      <div className="mt-4 text-center">
        <p className="font-serif text-xs font-semibold tracking-wider text-[#DFB76C] uppercase">
          Sri Sai Balaji
        </p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">
          {message}
        </p>
      </div>
    </div>
  );
}
