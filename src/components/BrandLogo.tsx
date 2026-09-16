import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  variant?: "light" | "dark";
}

export default function BrandLogo({
  size = "md",
  showText = false,
  className = "",
  variant = "dark"
}: BrandLogoProps) {
  // Dimensions
  const dimensions = {
    sm: { box: "w-8 h-8", svg: 32, text: "text-base", sub: "text-[9px]" },
    md: { box: "w-10 h-10", svg: 40, text: "text-lg", sub: "text-[10px]" },
    lg: { box: "w-14 h-14", svg: 56, text: "text-2xl", sub: "text-xs" },
    xl: { box: "w-16 h-16", svg: 64, text: "text-3xl", sub: "text-sm" },
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Geometric Shield with "A" Monogram */}
      <div className={`relative ${dimensions.box} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_8px_16px_rgba(37,99,235,0.3)] transition-transform duration-300 hover:scale-105"
        >
          <defs>
            {/* Primary Shield Gradient: Deep Burgundy & Rich Maroon */}
            <linearGradient id="addimsShieldGrad" x1="6" y1="6" x2="58" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4A0000" />
              <stop offset="45%" stopColor="#660000" />
              <stop offset="80%" stopColor="#7A1111" />
              <stop offset="100%" stopColor="#931A1A" />
            </linearGradient>

            {/* Inner "A" Monogram Gradient: Crisp White to Champagne Rose */}
            <linearGradient id="addimsMonogramGrad" x1="32" y1="14" x2="32" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#DFBFBA" />
            </linearGradient>

            {/* Glow / Specular Reflection Gradient */}
            <linearGradient id="addimsGlowGrad" x1="20" y1="8" x2="48" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Outer Rounded Shield Frame */}
          <path
            d="M32 4L11 13.5C11 28.5 19.5 47.5 32 58C44.5 47.5 53 28.5 53 13.5L32 4Z"
            fill="url(#addimsShieldGrad)"
          />

          {/* Subtle Glass Top Highlight */}
          <path
            d="M32 6L13.5 14.5C14 26 19.5 39 27 46.5C30 33 34 20 48 16L32 6Z"
            fill="url(#addimsGlowGrad)"
          />

          {/* Architectural "A" Monogram (Addims Core) */}
          {/* Left Leg of A */}
          <path
            d="M32 15L20 45H26L29 37H35L38 45H44L32 15ZM30.8 32L32 24.5L33.2 32H30.8Z"
            fill="url(#addimsMonogramGrad)"
            filter="drop-shadow(0 2px 4px rgba(15,23,42,0.25))"
          />

          {/* Precision Inward Apex Accent (InSure Protection Point) */}
          <circle cx="32" cy="11" r="2" fill="#38BDF8" />
        </svg>
      </div>

      {/* Optional Typography Branding */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <span
            className={`font-black tracking-tight leading-none ${dimensions.text} ${
              variant === "light" ? "text-white" : "text-slate-900"
            }`}
          >
            Addims <span className="text-blue-600">InSure</span>
          </span>
          <span
            className={`font-medium tracking-tight mt-0.5 ${dimensions.sub} ${
              variant === "light" ? "text-blue-200" : "text-slate-500"
            }`}
          >
            Smart Insurance CRM
          </span>
        </div>
      )}
    </div>
  );
}
