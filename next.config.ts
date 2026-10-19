import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
      {
        // The stage frame's document (Phase 18, decision record 0009): no script may run in it, whatever is drawn
        // into it. A CSP rather than `sandbox`, because WebKit drops all event delivery to a script-disabled
        // sandboxed frame, even to listeners added from outside, so the stage could not be clicked or typed into.
        source: "/stage-frame.html",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
