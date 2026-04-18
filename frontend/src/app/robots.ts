import type { MetadataRoute } from "next";

const CANONICAL_DOMAIN = "https://barakfi.in";

export default function robots(): MetadataRoute.Robots {
  const noindexPreview =
    process.env.VERCEL_ENV === "preview" || process.env.NEXT_PUBLIC_SITE_NOINDEX === "1";

  if (noindexPreview) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/workspace",
          "/account",
          "/governance",
          "/admin",
          "/onboarding",
          "/sign-in",
          "/sign-up",
          "/notifications",
          "/watchlist",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/", "/workspace", "/account", "/governance", "/admin", "/sign-in", "/sign-up"],
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
