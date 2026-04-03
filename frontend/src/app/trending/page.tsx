import type { Metadata } from "next";
import { getTrending } from "@/lib/api";
import { TrendingCard } from "@/components/trending-card";
import { CountryBadge } from "@/components/country-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trending Halal Stocks — Top Gainers, Losers & Most Active | Barakfi",
  description:
    "Track trending Shariah-compliant stocks worldwide. See top gainers, losers, most active, 52-week highs and lows screened for halal compliance.",
  keywords: [
    "trending halal stocks", "halal stock gainers", "shariah compliant trending",
    "islamic stock market", "halal investing trends", "muslim stock picks",
  ],
};

const TABS = [
  { key: "gainers", label: "Top Gainers", icon: "📈" },
  { key: "losers", label: "Top Losers", icon: "📉" },
  { key: "most-active", label: "Most Active", icon: "🔥" },
  { key: "52w-high", label: "52W High", icon: "🏔️" },
  { key: "52w-low", label: "52W Low", icon: "🏜️" },
  { key: "popular", label: "Most Popular", icon: "⭐" },
];

export default async function TrendingPage() {
  const results = await Promise.all(
    TABS.map((tab) => getTrending(tab.key, undefined, 20))
  );

  const tabData: Record<string, typeof results[0]> = {};
  TABS.forEach((tab, i) => {
    tabData[tab.key] = results[i];
  });

  return (
    <main className="shellPage">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 64px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 800, marginBottom: 6 }}>
            Trending Stocks
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 600 }}>
            Track the most active Shariah-compliant stocks across global exchanges. Updated with live market data.
          </p>
        </div>

        {TABS.map((tab) => {
          const stocks = tabData[tab.key] || [];
          return (
            <section key={tab.key} style={{ marginBottom: 40 }}>
              <h2 style={{
                fontSize: "1.1rem", fontWeight: 700, marginBottom: 16,
                display: "flex", alignItems: "center", gap: 8,
                fontFamily: "var(--font-display)",
              }}>
                <span>{tab.icon}</span> {tab.label}
              </h2>
              {stocks.length === 0 ? (
                <div style={{
                  padding: "32px 24px", textAlign: "center",
                  background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--line)", color: "var(--text-tertiary)",
                  fontSize: "0.85rem",
                }}>
                  No data available yet. Stocks will appear once market data is fetched.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
                  {stocks.map((s) => (
                    <div key={s.symbol} style={{ position: "relative" }}>
                      <TrendingCard
                        symbol={s.symbol}
                        name={s.name}
                        price={s.price}
                        priceChangePct={s.price_change_pct}
                        complianceStatus={s.compliance_status}
                        complianceRating={s.compliance_rating}
                        exchange={s.exchange}
                      />
                      <div style={{ position: "absolute", top: 8, right: 8 }}>
                        <CountryBadge exchange={s.exchange} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
