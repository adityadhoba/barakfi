import type { MetadataRoute } from "next";

const CANONICAL_DOMAIN = "https://barakfi.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/workspace", "/account", "/governance", "/admin", "/onboarding"],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/", "/workspace", "/account", "/governance", "/admin"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
      {
        userAgent: "Anthropic-AI",
        allow: "/",
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
      },
    ],
    sitemap: `${CANONICAL_DOMAIN}/sitemap.xml`,
  };
}
