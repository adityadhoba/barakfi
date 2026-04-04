"""
Seed data for Halal / Shariah-compliant ETFs available globally.

This list covers the major Shariah ETFs across Indian, US, and UK
markets. Expense ratios and AUM figures are approximate and based on
publicly available fund factsheets.
"""

HALAL_ETFS: list[dict] = [
    # ------------------------------------------------------------------
    # Indian Shariah ETFs
    # ------------------------------------------------------------------
    {
        "symbol": "SHARIABES",
        "name": "Nippon India ETF Shariah BeES",
        "exchange": "NSE",
        "country": "India",
        "expense_ratio": 0.99,
        "aum_millions": 42.0,
        "description": (
            "India's first Shariah-compliant exchange-traded fund, tracking "
            "the Nifty50 Shariah Index. Provides diversified exposure to the "
            "top Shariah-screened large-cap stocks on the NSE with a single "
            "trade. Suitable for passive investors seeking halal equity "
            "participation in the Indian market."
        ),
        "provider": "Nippon India Mutual Fund",
        "is_shariah_certified": True,
    },
    {
        "symbol": "TATETF",
        "name": "Tata Ethical Fund",
        "exchange": "NSE",
        "country": "India",
        "expense_ratio": 1.86,
        "aum_millions": 220.0,
        "description": (
            "An open-ended equity scheme following Shariah investment principles. "
            "Managed by Tata Asset Management, the fund invests in a diversified "
            "portfolio of Shariah-compliant Indian equities across market caps. "
            "One of India's longest-running ethical investment options."
        ),
        "provider": "Tata Asset Management",
        "is_shariah_certified": True,
    },
    # ------------------------------------------------------------------
    # US-listed Shariah ETFs
    # ------------------------------------------------------------------
    {
        "symbol": "SPUS",
        "name": "SP Funds S&P 500 Sharia Industry Exclusions ETF",
        "exchange": "NYSE",
        "country": "United States",
        "expense_ratio": 0.49,
        "aum_millions": 680.0,
        "description": (
            "Tracks the S&P 500 Shariah Industry Exclusions Index, providing "
            "exposure to US large-cap equities that pass S&P's Shariah screening "
            "methodology. Excludes financials, alcohol, tobacco, weapons, and "
            "other non-permissible sectors while maintaining broad market "
            "diversification."
        ),
        "provider": "SP Funds",
        "is_shariah_certified": True,
    },
    {
        "symbol": "HLAL",
        "name": "Wahed FTSE USA Shariah ETF",
        "exchange": "NYSE",
        "country": "United States",
        "expense_ratio": 0.50,
        "aum_millions": 450.0,
        "description": (
            "Tracks the FTSE USA Shariah Index, offering Shariah-compliant "
            "exposure to US equities. The fund applies FTSE Russell's Islamic "
            "screening criteria covering business activity, debt ratios, and "
            "cash/interest thresholds. Popular among US-based Muslim investors "
            "seeking a core equity allocation."
        ),
        "provider": "Wahed Invest",
        "is_shariah_certified": True,
    },
    {
        "symbol": "UMMA",
        "name": "Wahed Dow Jones Islamic World ETF",
        "exchange": "NYSE",
        "country": "United States",
        "expense_ratio": 0.65,
        "aum_millions": 120.0,
        "description": (
            "Provides global equity exposure through the Dow Jones Islamic "
            "Market World Index. Invests in Shariah-compliant companies across "
            "developed and emerging markets outside the US, offering geographic "
            "diversification for halal portfolios."
        ),
        "provider": "Wahed Invest",
        "is_shariah_certified": True,
    },
    {
        "symbol": "SPRE",
        "name": "SP Funds S&P Global REIT Sharia ETF",
        "exchange": "NYSE",
        "country": "United States",
        "expense_ratio": 0.69,
        "aum_millions": 55.0,
        "description": (
            "Tracks the S&P Global REIT Shariah Liquid 35/20 Capped Index, "
            "providing exposure to Shariah-compliant real estate investment "
            "trusts worldwide. One of the few halal options for investors "
            "seeking real-estate exposure without conventional interest income."
        ),
        "provider": "SP Funds",
        "is_shariah_certified": True,
    },
    # ------------------------------------------------------------------
    # UK / Europe-listed Shariah ETFs
    # ------------------------------------------------------------------
    {
        "symbol": "ISWD.L",
        "name": "iShares MSCI World Islamic UCITS ETF",
        "exchange": "LSE",
        "country": "United Kingdom",
        "expense_ratio": 0.60,
        "aum_millions": 580.0,
        "description": (
            "Tracks the MSCI World Islamic Index, providing broad developed-"
            "market equity exposure screened according to MSCI's Islamic "
            "index methodology. Domiciled in Ireland, the ETF is UCITS-"
            "compliant and accessible to European and UK investors through "
            "the London Stock Exchange."
        ),
        "provider": "BlackRock (iShares)",
        "is_shariah_certified": True,
    },
    {
        "symbol": "ISDE.L",
        "name": "iShares MSCI EM Islamic UCITS ETF",
        "exchange": "LSE",
        "country": "United Kingdom",
        "expense_ratio": 0.85,
        "aum_millions": 180.0,
        "description": (
            "Tracks the MSCI Emerging Markets Islamic Index, offering "
            "Shariah-compliant exposure to large- and mid-cap equities "
            "across emerging markets. Covers key growth economies including "
            "China, India, Brazil, and South Korea while excluding sectors "
            "and companies that fail Islamic screening criteria."
        ),
        "provider": "BlackRock (iShares)",
        "is_shariah_certified": True,
    },
    {
        "symbol": "APTS",
        "name": "Saturna Al-Kawthar Global Focused Equity ETF",
        "exchange": "NYSE",
        "country": "United States",
        "expense_ratio": 0.75,
        "aum_millions": 35.0,
        "description": (
            "An actively managed ETF from Saturna Capital that invests in a "
            "concentrated portfolio of global equities screened for Shariah "
            "compliance. The fund applies both quantitative Islamic screens "
            "and qualitative ESG overlays, targeting quality companies with "
            "sustainable competitive advantages."
        ),
        "provider": "Saturna Capital",
        "is_shariah_certified": True,
    },
]
