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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.clerk.com https://clerk.barakfi.in https://*.clerk.accounts.dev https://cdn.jsdelivr.net https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://adservice.google.com https://www.googleadservices.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self'",
              "img-src 'self' data: blob: https: https://img.logo.dev https://*.clerk.com https://img.clerk.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://www.google.com https://www.google.co.in https://cdn.brandfetch.io https://t1.gstatic.com https://upload.wikimedia.org",
              "connect-src 'self' https://api.clerk.com https://*.clerk.com https://*.clerk.accounts.dev https://clerk.barakfi.in https://clerk-telemetry.com https://*.clerk-telemetry.com https://api.barakfi.in https://barakfi.com https://*.onrender.com https://query1.finance.yahoo.com https://www.nseindia.com https://accounts.google.com https://www.google-analytics.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://adservice.google.com https://*.posthog.com",
              "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.barakfi.in https://accounts.google.com https://challenges.cloudflare.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/.well-known/ai-plugin.json",
        destination: "/api/.well-known/ai-plugin",
      },
    ];
  },
};

export default nextConfig;
