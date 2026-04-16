# BarakFi Market Readiness Checklist

This checklist maps audit gaps to concrete PR batches and owner surfaces.

| Area | Gap | PR | Owner Surface |
|---|---|---|---|
| Product boundary and legal-safe wording | Marketing copy is stronger than legal hedging in a few entry surfaces | PR0, PR4 | `frontend/src/components/home-dashboard.tsx`, `frontend/src/app/sign-in/[[...sign-in]]/page.tsx`, `frontend/src/app/sign-up/[[...sign-up]]/page.tsx` |
| Page architecture and user flows | Compare empty state creates off-ramp to screener | PR3 | `frontend/src/components/compare-table.tsx`, `frontend/src/components/compare-table.module.css` |
| Backend reliability and data model | Internal token fallback and internal-actor auth need production guardrails | PR5 | `app/config.py`, `app/services/auth_service.py` |
| Screening explainability | Ratio explanation is truncated; no progressive disclosure | PR1 | `frontend/src/app/stocks/[symbol]/page.tsx`, new slide-over component |
| Frontend UX consistency | Home hero and auth experience need stronger financial UX and responsive parity | PR0, PR4 | `frontend/src/components/home-dashboard.tsx`, `frontend/src/components/home-hero-search.tsx`, `frontend/src/app/globals.css` |
| SEO/indexing correctness | Canonical strategy and sitemap coverage are incomplete on dynamic detail pages | PR5 | `frontend/src/app/layout.tsx`, `frontend/src/app/sitemap.ts`, `frontend/src/app/academy/[slug]/page.tsx`, `frontend/src/app/collections/[slug]/page.tsx`, `frontend/src/app/super-investors/[slug]/page.tsx` |
| Quotas and monetization | Monetization should follow explanation-first experience | PR2, PR3 | `frontend/src/app/stocks/[symbol]/page.tsx`, `frontend/src/components/stock-upsell-card.tsx`, `frontend/src/components/compare-table.tsx` |
| Admin and ops | Governance and ops are present but need safer defaults for production | PR5 | `app/api/routes.py`, `app/services/auth_service.py`, `app/config.py` |
| Testing and production readiness | Search latency and UX regressions need measurable signal | PR6 | `frontend/src/components/home-hero-search.tsx`, `frontend/src/lib/track-event.ts`, `frontend/src/app/api/stocks/route.ts` |

## Execution Order
1. PR0: Home hero/search trust rewrite + light mode fix.
2. PR1: Stock detail Read more drawer.
3. PR2: Remove stock detail ad + screening rules block.
4. PR3: Compare off-ramp removal.
5. PR4: Auth branding/responsive polish and logo presence.
6. PR5: SEO + backend hardening.
7. PR6: Search latency optimization + instrumentation.
