import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NextAuthProvider from "@/provider/NextAuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LazyLayout – AI-Powered Website Template Generator",
  description:
    "Just type and watch it come to life. LazyLayout uses AI to generate stunning, production-ready website templates from plain English descriptions.",
  openGraph: {
    title: "LazyLayout – AI-Powered Website Template Generator",
    description:
      "Generate beautiful, production-ready website templates from a single text prompt. Powered by AI.",
    siteName: "LazyLayout",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LazyLayout – AI-Powered Website Template Generator",
    description:
      "Generate beautiful website templates from a single text prompt.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
