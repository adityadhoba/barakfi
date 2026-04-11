"""
Curated SEO copy for the first batch of high-intent stock pages.
Merged into API `seo` when symbol matches; no impact on screening logic.
"""

from __future__ import annotations

from typing import Any

# Keys are upper-case symbols as stored in `stocks.symbol` (verify in DB for US names).
SEO_BATCH: dict[str, dict[str, Any]] = {
    "RELIANCE": {
        "title": "Is Reliance Industries Halal? Shariah Status Explained (2026)",
        "description": "Reliance Industries halal stock check using AAOIFI, S&P Shariah, and FTSE-style screens—see consensus, debt, and income purity at a glance.",
        "content": (
            "Reliance Industries is one of India’s largest conglomerates, so its Shariah profile depends on debt, "
            "non-permissible income, and balance-sheet ratios across several published standards. "
            "Our tool compares multiple methodologies side by side so you can see where they agree or diverge. "
            "Use this page as a starting point, then confirm any investment decision with a qualified advisor."
        ),
        "faq": [
            {
                "question": "Is Reliance halal?",
                "answer": (
                    "We do not issue fatwas. Barakfi runs an automated multi-methodology screen using public "
                    "financial data; the status shown reflects those rules, not a personal religious ruling."
                ),
            },
            {
                "question": "Why might Reliance be halal or not?",
                "answer": (
                    "Screens look at interest-bearing debt versus market cap, impure income as a share of revenue, "
                    "receivables, and sector rules. Different standards use slightly different thresholds, which is "
                    "why consensus matters."
                ),
            },
            {
                "question": "Can Muslims invest in Reliance?",
                "answer": (
                    "Many Muslims follow a scholar or board for final guidance. Use Barakfi to understand the "
                    "financial picture, then decide with someone you trust on fiqh and your own circumstances."
                ),
            },
        ],
    },
    "TCS": {
        "title": "Is TCS Halal? Shariah Status Explained (2026)",
        "description": "Tata Consultancy Services (TCS) automated Shariah screening: methodology consensus, score, and plain-English highlights for Muslim investors.",
        "content": (
            "TCS is a large-cap IT services firm, and Islamic equity screens usually focus on balance-sheet leverage, "
            "liquidity-like receivables, and any non-halal revenue lines. "
            "We summarize several mainstream screening approaches so you are not relying on a single headline number. "
            "Markets move—re-screen after major results or acquisitions."
        ),
        "faq": [
            {
                "question": "Is TCS halal?",
                "answer": "The label on this page comes from automated rules on public data, not a fatwa. Check the consensus and details, then consult a scholar if needed.",
            },
            {
                "question": "Why is TCS halal or not under these screens?",
                "answer": "Typical drivers are debt-to-market-cap, non-permissible income ratio, and receivables vs assets. Each methodology weights these slightly differently.",
            },
            {
                "question": "Can Muslims invest in TCS?",
                "answer": "That is a personal religious and financial choice. Barakfi helps you see the compliance signals; a qualified advisor can help you apply them to your situation.",
            },
        ],
    },
    "INFY": {
        "title": "Is Infosys Halal? Shariah Status Explained (2026)",
        "description": "Infosys (INFY) halal stock analysis based on AAOIFI, S&P Shariah, and related standards—summary, score, and FAQ for 2026.",
        "content": (
            "Infosys is among the most screened Indian large caps for Shariah-compliant portfolios. "
            "Our page shows how several published methodologies score the same filings, so you can spot agreement "
            "or tension between standards. "
            "This is educational only—always pair tools with scholar guidance when you are unsure."
        ),
        "faq": [
            {"question": "Is Infosys halal?", "answer": "See the automated status and methodology breakdown above. It is a screen, not a substitute for fiqh advice."},
            {"question": "Why is Infosys halal or not?", "answer": "Screens stress interest-bearing debt, impure income, and certain balance-sheet ratios. Small differences in data or rules can change the outcome."},
            {"question": "Can Muslims invest in Infosys?", "answer": "Many do after their own diligence. Use the consensus block to understand risk, then decide with your advisor or board."},
        ],
    },
    "WIPRO": {
        "title": "Is Wipro Halal? Shariah Status Explained (2026)",
        "description": "Wipro Shariah screening snapshot: multi-standard consensus, trust score, and short highlights for halal-conscious investors.",
        "content": (
            "Wipro is an IT and consulting name often compared with larger Indian peers on Shariah screens. "
            "We highlight where major methodologies align and where they split, using the same public fundamentals. "
            "Revisit after big M&A or if non-operating income becomes material."
        ),
        "faq": [
            {"question": "Is Wipro halal?", "answer": "The page shows an automated multi-methodology label. Confirm with your own process and a scholar if you require certainty."},
            {"question": "Why is Wipro halal or not?", "answer": "Debt, non-permissible income, receivables, and sector filters drive most outcomes. Open the details section for the exact drivers on this data."},
            {"question": "Can Muslims invest in Wipro?", "answer": "Only you and your advisors can answer that for your situation; we provide transparent ratios and methodology votes."},
        ],
    },
    "HDFCBANK": {
        "title": "Is HDFC Bank Halal? Shariah Status Explained (2026)",
        "description": "HDFC Bank Shariah compliance overview for 2026—why banks often fail conventional screens and how to read the methodology split.",
        "content": (
            "Banks usually face stricter treatment on Islamic equity screens because of interest-based core income. "
            "That often produces non-compliant or cautious labels even when the franchise is strong. "
            "Read the methodology table to see which tests triggered and whether any standard still passes. "
            "This page is informational, not investment advice."
        ),
        "faq": [
            {"question": "Is HDFC Bank halal?", "answer": "Check the automated status—many screens treat conventional banking income as non-permissible, which commonly leads to a fail or cautious label."},
            {"question": "Why is HDFC Bank halal or not?", "answer": "Primary reasons are usually interest income share, debt structure, and sometimes receivables versus assets under specific rules."},
            {"question": "Can Muslims invest in HDFC Bank?", "answer": "Opinions differ by school and portfolio policy. Use the data here to inform a conversation with a qualified advisor."},
        ],
    },
    "ICICIBANK": {
        "title": "Is ICICI Bank Halal? Shariah Status Explained (2026)",
        "description": "ICICI Bank automated Shariah screen: consensus, score, and plain-language notes for Muslims comparing large Indian banks.",
        "content": (
            "ICICI Bank, like other full-service banks, is heavily weighted toward interest-based activities in standard accounting. "
            "Islamic stock screens therefore often flag it. "
            "Our tool shows how each methodology treats the same reported numbers so you can compare apples to apples. "
            "Nothing here replaces personalized religious or financial advice."
        ),
        "faq": [
            {"question": "Is ICICI Bank halal?", "answer": "See the multi-methodology result—banking names frequently score as non-compliant on automated retail screens."},
            {"question": "Why is ICICI Bank halal or not?", "answer": "Interest income and leverage ratios dominate; each standard uses its own thresholds and definitions."},
            {"question": "Can Muslims invest in ICICI Bank?", "answer": "That depends on your madhhab guidance and portfolio rules. Barakfi clarifies the financial signals only."},
        ],
    },
    "TSLA": {
        "title": "Is Tesla Halal? Shariah Status Explained (2026)",
        "description": "Tesla (TSLA) Shariah stock screen: methodology consensus and simple FAQ for Muslim investors researching US names.",
        "content": (
            "Tesla is a global mega-cap with volatile earnings and evolving revenue lines, which can move Islamic screen outcomes over time. "
            "We apply the same published ratio logic we use for other names so you can compare Tesla with Indian holdings fairly. "
            "Always re-check after major debt raises or new business segments."
        ),
        "faq": [
            {"question": "Is Tesla halal?", "answer": "Use the automated label as a starting point; US GAAP lines can look different from Indian issuers, so read the methodology breakdown."},
            {"question": "Why is Tesla halal or not?", "answer": "Typical factors include debt-to-market-cap, impure income, and asset composition. Volatile market cap can swing ratio-based results."},
            {"question": "Can Muslims invest in Tesla?", "answer": "Many scholars and funds have different policies on US growth names. Pair this screen with guidance you trust."},
        ],
    },
    "AAPL": {
        "title": "Is Apple Halal? Shariah Status Explained (2026)",
        "description": "Apple (AAPL) Shariah screening summary: multi-standard view, score, and short FAQ for halal-conscious portfolios.",
        "content": (
            "Apple is primarily a consumer technology and services business; Islamic screens still examine debt, "
            "non-operating income, and balance-sheet quality. "
            "Barakfi aggregates several methodology outcomes so one outlier rule does not dominate your reading. "
            "Update your view when filings materially change."
        ),
        "faq": [
            {"question": "Is Apple halal?", "answer": "The status reflects automated rules on public data, not a fatwa. Review consensus and each methodology’s reasons."},
            {"question": "Why is Apple halal or not?", "answer": "Screens focus on permissible revenue share, interest-bearing debt, and sometimes cash and investments versus market cap."},
            {"question": "Can Muslims invest in Apple?", "answer": "That is for you and your advisor; we aim to make the financial compliance signals transparent."},
        ],
    },
    "MSFT": {
        "title": "Is Microsoft Halal? Shariah Status Explained (2026)",
        "description": "Microsoft (MSFT) automated Islamic equity screen—consensus, highlights, and readable FAQ.",
        "content": (
            "Microsoft mixes software, cloud, and small ancillary revenue streams that screens parse differently. "
            "Debt and cash positions also matter for leverage-style tests. "
            "Use the consensus section to see agreement across standards before making a decision. "
            "We keep explanations short so you can scan quickly on mobile."
        ),
        "faq": [
            {"question": "Is Microsoft halal?", "answer": "Check the automated multi-methodology label and the confidence note—both summarize breadth of agreement."},
            {"question": "Why is Microsoft halal or not?", "answer": "Debt-to-market-cap and non-permissible income are common swing factors; cloud economics can shift ratios year to year."},
            {"question": "Can Muslims invest in Microsoft?", "answer": "Policies differ; use this page to prepare questions for a scholar or fund compliance team."},
        ],
    },
    "GOOGL": {
        "title": "Is Google (Alphabet) Halal? Shariah Status Explained (2026)",
        "description": "Alphabet / Google (GOOGL) Shariah stock check: methodology votes, score, and plain-English FAQ.",
        "content": (
            "Alphabet earns most revenue from advertising and cloud services; Islamic screens still test debt, "
            "liquidity-like assets, and any flagged non-core income. "
            "We surface where methodologies agree so you are not guessing from a single headline. "
            "Re-screen after large buybacks or debt-funded acquisitions."
        ),
        "faq": [
            {"question": "Is Google halal?", "answer": "See the automated status for GOOGL using multiple standards; confirm personally if you need a ruling."},
            {"question": "Why is Google halal or not?", "answer": "Leverage, cash versus market cap, and non-permissible income lines are the usual discussion points on tech giants."},
            {"question": "Can Muslims invest in Google?", "answer": "Many investors ask a board or advisor; Barakfi speeds up the financial leg of that research."},
        ],
    },
    "AMZN": {
        "title": "Is Amazon Halal? Shariah Status Explained (2026)",
        "description": "Amazon (AMZN) Shariah screening page: consensus, score, highlights, and three quick FAQs.",
        "content": (
            "Amazon spans e-commerce, cloud, and advertising—screens look for impermissible revenue, debt load, and "
            "receivables-style balances relative to assets. "
            "Our consensus view helps you see if standards disagree because of data classification or true economic differences. "
            "This is a research aid, not a recommendation to buy or sell."
        ),
        "faq": [
            {"question": "Is Amazon halal?", "answer": "Read the automated label plus methodology detail; retail screens can diverge on diversified conglomerates."},
            {"question": "Why is Amazon halal or not?", "answer": "Interest-bearing debt, non-permissible income, and asset ratios are the main mechanical drivers."},
            {"question": "Can Muslims invest in Amazon?", "answer": "Use the page to align your notes with a scholar or fund policy you follow."},
        ],
    },
    "META": {
        "title": "Is Meta (Facebook) Halal? Shariah Status Explained (2026)",
        "description": "Meta Platforms (META) Shariah compliance snapshot for 2026—multi-methodology summary and FAQ.",
        "content": (
            "Meta is largely digital advertising with growing AI infrastructure spend; Islamic screens still evaluate "
            "debt, cash, and any non-permissible revenue buckets reported in filings. "
            "We keep the narrative short and link the numbers to methodology outcomes. "
            "Large buybacks can change market-cap-based ratios quickly."
        ),
        "faq": [
            {"question": "Is Meta halal?", "answer": "Check the automated consensus; social/ad-tech names are screened like other US large caps on financial ratios."},
            {"question": "Why is Meta halal or not?", "answer": "Debt and impure income tests dominate; read each methodology’s pass/fail in the details block."},
            {"question": "Can Muslims invest in Meta?", "answer": "That is a personal decision with ethical and financial dimensions beyond this tool."},
        ],
    },
    "NVDA": {
        "title": "Is Nvidia Halal? Shariah Status Explained (2026)",
        "description": "Nvidia (NVDA) Shariah stock screen: fast consensus readout, score, and simple FAQ for Muslim investors.",
        "content": (
            "Nvidia’s rapid growth has moved market cap and debt ratios quickly, which affects screen outcomes quarter to quarter. "
            "We anchor on the same published methodologies regardless of hype cycles. "
            "Use highlights to see the clearest financial drivers, then drill into ratios if you need depth."
        ),
        "faq": [
            {"question": "Is Nvidia halal?", "answer": "See the automated multi-methodology status; high volatility means you should re-run screens after earnings."},
            {"question": "Why is Nvidia halal or not?", "answer": "Most outcomes hinge on debt, permissible revenue share, and balance-sheet composition under each standard."},
            {"question": "Can Muslims invest in Nvidia?", "answer": "Bring these results to someone you trust for fiqh and risk guidance."},
        ],
    },
    "TATAMOTORS": {
        "title": "Is Tata Motors Halal? Shariah Status Explained (2026)",
        "description": "Tata Motors Shariah screening for 2026—methodology consensus, automotive sector context, and FAQ.",
        "content": (
            "Tata Motors is a cyclical auto OEM; Shariah screens focus on leverage, interest costs, and non-core income. "
            "We show how multiple standards read the same statements so you can understand disagreements. "
            "Earnings swings can flip ratio-based outcomes—bookmark for quarterly updates."
        ),
        "faq": [
            {"question": "Is Tata Motors halal?", "answer": "Use the automated label as a first pass; autos can move between cautious and pass/fail as debt and income mix shift."},
            {"question": "Why is Tata Motors halal or not?", "answer": "Debt-to-market-cap and impure income are common reasons; sector screens may add nuance."},
            {"question": "Can Muslims invest in Tata Motors?", "answer": "Pair this data with your scholar or fund rules before sizing a position."},
        ],
    },
    "ADANIENT": {
        "title": "Is Adani Enterprises Halal? Shariah Status Explained (2026)",
        "description": "Adani Enterprises multi-methodology Shariah check—score, consensus, and concise FAQ.",
        "content": (
            "Adani Enterprises sits in a capital-intensive part of the market, so debt and receivables metrics matter a lot on Islamic screens. "
            "Our page highlights where methodologies align on those fundamentals. "
            "News-driven volatility can outpace filings—always prefer the latest reported numbers."
        ),
        "faq": [
            {"question": "Is Adani Enterprises halal?", "answer": "Check the automated consensus; infrastructure-heavy names often hinge on leverage and receivable tests."},
            {"question": "Why is Adani Enterprises halal or not?", "answer": "Screens weigh interest-bearing obligations and asset quality ratios; each methodology sets its own limits."},
            {"question": "Can Muslims invest in Adani Enterprises?", "answer": "Use Barakfi to prepare questions for advisors who know your risk tolerance and religious framework."},
        ],
    },
    "ITC": {
        "title": "Is ITC Halal? Shariah Status Explained (2026)",
        "description": "ITC Shariah stock analysis for 2026—multi-standard consensus, highlights, and three FAQs.",
        "content": (
            "ITC mixes FMCG with other segments; Islamic screens look for non-permissible revenue, debt, and balance-sheet red flags. "
            "We summarize several methodologies so you can see if disagreement comes from revenue classification or leverage. "
            "Segment disclosures matter—read the details tab for drivers."
        ),
        "faq": [
            {"question": "Is ITC halal?", "answer": "See the automated status; diversified names can be cautious if any segment or ratio trips a rule."},
            {"question": "Why is ITC halal or not?", "answer": "Non-permissible income share and debt metrics are typical focal points across standards."},
            {"question": "Can Muslims invest in ITC?", "answer": "Many investors seek explicit guidance on conglomerates; use this screen to speed research."},
        ],
    },
    "SBIN": {
        "title": "Is SBI Halal? Shariah Status Explained (2026)",
        "description": "State Bank of India (SBIN) Shariah screening overview—why banks often screen as non-compliant and how to read results.",
        "content": (
            "SBI is a large state-backed bank; conventional interest income usually dominates automated Islamic screens. "
            "Expect cautious or non-compliant labels unless your methodology explicitly handles bank equities differently. "
            "We still show each standard’s breakdown for transparency."
        ),
        "faq": [
            {"question": "Is SBI halal?", "answer": "Check the automated label—interest-heavy banks frequently fail generic retail Shariah screens."},
            {"question": "Why is SBI halal or not?", "answer": "Core banking revenue and leverage ratios are the mechanical reasons most cited by standards."},
            {"question": "Can Muslims invest in SBI?", "answer": "That depends on personal and institutional policies; Barakfi clarifies the automated financial view."},
        ],
    },
    "BHARTIARTL": {
        "title": "Is Bharti Airtel Halal? Shariah Status Explained (2026)",
        "description": "Bharti Airtel Shariah compliance snapshot—consensus, score, and short FAQ for 2026.",
        "content": (
            "Bharti Airtel is a telecom leader; screens emphasize debt, lease-like obligations where captured, and any non-core income. "
            "Our consensus block shows how similar rules land on the same filing line items. "
            "Capex cycles can move debt ratios—revisit after major spectrum events."
        ),
        "faq": [
            {"question": "Is Bharti Airtel halal?", "answer": "Use the automated multi-methodology result as a starting point for deeper research."},
            {"question": "Why is Bharti Airtel halal or not?", "answer": "Leverage and permissible revenue share are the usual drivers; open methodology details for specifics."},
            {"question": "Can Muslims invest in Bharti Airtel?", "answer": "Consult your advisor or board; we surface the quantitative compliance signals."},
        ],
    },
    "ASIANPAINT": {
        "title": "Is Asian Paints Halal? Shariah Status Explained (2026)",
        "description": "Asian Paints Shariah stock screen—methodology votes, highlights, and readable FAQ.",
        "content": (
            "Asian Paints is a consumer-industrial name where Islamic screens focus on debt, receivables, and any non-permissible income. "
            "We aggregate several methodologies so you can see if the picture is stable across standards. "
            "Seasonal working capital swings can nudge ratio-based outcomes."
        ),
        "faq": [
            {"question": "Is Asian Paints halal?", "answer": "See the automated consensus; paints and chemicals names still pass through generic financial tests."},
            {"question": "Why is Asian Paints halal or not?", "answer": "Debt-to-market-cap and impure income thresholds are the common reasons for pass or fail."},
            {"question": "Can Muslims invest in Asian Paints?", "answer": "Use this page to document your research before speaking with a scholar."},
        ],
    },
    "LT": {
        "title": "Is L&T Halal? Shariah Status Explained (2026)",
        "description": "Larsen & Toubro (L&T) Shariah screening for 2026—multi-standard summary and FAQ.",
        "content": (
            "L&T is diversified across engineering and services; Islamic screens look at consolidated leverage, "
            "non-permissible revenue lines, and receivables. "
            "Our tool highlights agreement across methodologies so you can spot fragile consensus. "
            "Project cycles can change reported debt—re-screen periodically."
        ),
        "faq": [
            {"question": "Is L&T halal?", "answer": "Check the automated label and methodology table; conglomerates can be borderline when any segment trips a rule."},
            {"question": "Why is L&T halal or not?", "answer": "Interest-bearing debt and impure income are typical swing factors; asset-heavy models affect receivable tests."},
            {"question": "Can Muslims invest in L&T?", "answer": "Pair these results with personal fiqh guidance and portfolio constraints."},
        ],
    },
}


def get_seo_batch_override(symbol: str) -> dict[str, Any] | None:
    """Return curated SEO fields for known symbols, else None."""
    if not symbol:
        return None
    return SEO_BATCH.get(symbol.strip().upper())
