import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          /* ── Security ── */
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.barakfi.in https://*.clerk.accounts.dev https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com https://www.googletagmanager.com",
              "connect-src 'self' https://*.clerk.accounts.dev https://clerk.barakfi.in https://api.barakfi.in https://barakfi.com https://*.onrender.com https://query1.finance.yahoo.com https://www.nseindia.com https://www.google-analytics.com https://www.googletagmanager.com https://pagead2.googlesyndication.com",
              "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
