/**
 * ============================================================================
 * ROOT APPLICATION LAYOUT
 * ============================================================================
 * UI Element: Engine Root Shell & Font Provider
 * Screen / Scope: Global (All pages & editor workspaces)
 * Role: Loads Inter and JetBrains Mono fonts, establishes CSS variable bindings,
 *       and provides global HTML document shell.
 * 
 * CSS ISOLATION & STYLING NOTE:
 * Styles imported here:
 *   1. "@/editor/styles/globals.css" (contains reset, base fonts, scrollbars)
 *   2. "@/editor/styles/animations.css" (micro-interactions and keyframes)
 * No component-specific inline styles or classes should be attached to this root layout.
 * Individual screens/panels manage their own modular stylesheets.
 * ============================================================================
 */

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/editor/styles/globals.css";
import "@/editor/styles/animations.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Visual Web Application Engine | Unreal Engine for Web Applications",
  description:
    "Next-generation visual full-stack web application development studio with visual blueprints, C++ canvas physics, and reactive state management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
