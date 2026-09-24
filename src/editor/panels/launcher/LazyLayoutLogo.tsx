"use client";

/**
 * ============================================================================
 * LAZYLAYOUT BRAND LOGO (FOLDED RIBBON 'L')
 * ============================================================================
 * Visual identity component for LazyLayout Studio.
 * Renders the two-tone folded pine-green and mint-green ribbon 'L' mark.
 * ============================================================================
 */

import React from "react";

export interface LazyLayoutLogoProps {
  size?: number;
  className?: string;
}

export const LazyLayoutLogo: React.FC<LazyLayoutLogoProps> = ({
  size = 28,
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LazyLayout Logo"
    >
      {/* Background Vertical Stem */}
      <rect
        x="5"
        y="4"
        width="6.5"
        height="24"
        rx="3.25"
        fill="#184e43"
      />
      {/* Top Fold / Diagonal Shade */}
      <path
        d="M5 7.25C5 5.45507 6.45507 4 8.25 4C10.0449 4 11.5 5.45507 11.5 7.25V18.5H5V7.25Z"
        fill="#10B981"
      />
      {/* Horizontal Folded Ribbon Arm */}
      <rect
        x="5"
        y="21.5"
        width="22"
        height="6.5"
        rx="3.25"
        fill="#206859"
      />
      {/* Accent Tip Highlight */}
      <path
        d="M20.5 21.5H23.75C25.5449 21.5 27 22.9551 27 24.75C27 26.5449 25.5449 28 23.75 28H20.5V21.5Z"
        fill="#34D399"
      />
      {/* Subtle Inner Overlap Line */}
      <path
        d="M11.5 21.5V28"
        stroke="#0f372f"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
};
