"""
Seed data for super-investor profiles and their notable holdings.

Each investor maps to a SuperInvestor row; holdings resolve to
SuperInvestorHolding rows via the stocks table at seed time.
Weight percentages are approximate and based on publicly available
portfolio disclosures.
"""

SUPER_INVESTORS: list[dict] = [
    # ------------------------------------------------------------------
    # Indian super investors
    # ------------------------------------------------------------------
    {
        "name": "Rakesh Jhunjhunwala",
        "slug": "rakesh-jhunjhunwala",
        "title": "The Big Bull of India",
        "bio": (
            "Legendary Indian investor and trader whose bold bets on Indian "
            "equities earned him the moniker 'The Big Bull'. Rakesh built a "
            "multi-billion-dollar portfolio from modest beginnings, championing "
            "long-term conviction investing in quality businesses. His legacy "
            "portfolio continues to be closely tracked by the market."
        ),
        "country": "India",
        "investment_style": "Value Investing",
        "holdings": [
            {"symbol": "TITAN", "weight_pct": 32.0},
            {"symbol": "TRENT", "weight_pct": 18.5},
            {"symbol": "CRISIL", "weight_pct": 8.2},
            {"symbol": "FORTIS", "weight_pct": 7.1},
            {"symbol": "METROPOLIS", "weight_pct": 5.4},
            {"symbol": "TATAMOTORS", "weight_pct": 4.8},
            {"symbol": "NAZARA", "weight_pct": 3.9},
            {"symbol": "CANFINHOME", "weight_pct": 3.2},
        ],
    },
    {
        "name": "Radhakishan Damani",
        "slug": "radhakishan-damani",
        "title": "Founder of DMart",
        "bio": (
            "Reclusive billionaire and founder of Avenue Supermarts (DMart), "
            "India's most profitable hypermarket chain. Known for his patient, "
            "long-horizon approach, Damani favours consumer-facing businesses "
            "with durable moats and low debt. His personal portfolio reflects "
            "a deep conviction in India's consumption story."
        ),
        "country": "India",
        "investment_style": "Value + Retail Focus",
        "holdings": [
            {"symbol": "DMART", "weight_pct": 52.0},
            {"symbol": "TRENT", "weight_pct": 12.5},
            {"symbol": "ITC", "weight_pct": 8.0},
            {"symbol": "INDIAMART", "weight_pct": 5.6},
            {"symbol": "BRITANNIA", "weight_pct": 4.3},
            {"symbol": "NESTLEIND", "weight_pct": 3.8},
        ],
    },
    {
        "name": "Dolly Khanna",
        "slug": "dolly-khanna",
        "title": "Small & Mid Cap Queen",
        "bio": (
            "Chennai-based investor renowned for uncovering hidden gems in "
            "India's small- and mid-cap universe. Dolly Khanna's portfolio, "
            "managed alongside her husband Rajiv Khanna, has consistently "
            "outperformed benchmarks through early entry into high-growth "
            "manufacturing and specialty chemical companies."
        ),
        "country": "India",
        "investment_style": "Growth at Reasonable Price",
        "holdings": [
            {"symbol": "TATAELXSI", "weight_pct": 9.5},
            {"symbol": "KPITTECH", "weight_pct": 8.2},
            {"symbol": "BHARATFORG", "weight_pct": 7.0},
            {"symbol": "PERSISTENT", "weight_pct": 6.5},
            {"symbol": "CLEAN", "weight_pct": 5.8},
            {"symbol": "MARICO", "weight_pct": 5.0},
            {"symbol": "DABUR", "weight_pct": 4.2},
        ],
    },
    {
        "name": "Vijay Kedia",
        "slug": "vijay-kedia",
        "title": "The Smiling Bull",
        "bio": (
            "Self-made Mumbai investor who turned a modest start into a "
            "formidable portfolio by backing under-researched growth stories "
            "early. Vijay follows the SMILE framework — Small in size, Medium "
            "in experience, Large in aspiration, Extra-large in market potential "
            "— to identify multi-baggers across sectors."
        ),
        "country": "India",
        "investment_style": "GARP (Growth At Reasonable Price)",
        "holdings": [
            {"symbol": "COFORGE", "weight_pct": 12.0},
            {"symbol": "TATAELXSI", "weight_pct": 10.5},
            {"symbol": "HAPPSTMNDS", "weight_pct": 8.0},
            {"symbol": "MPHASIS", "weight_pct": 7.2},
            {"symbol": "MASTEK", "weight_pct": 6.0},
            {"symbol": "KFINTECH", "weight_pct": 5.5},
        ],
    },
    {
        "name": "Ashish Dhawan",
        "slug": "ashish-dhawan",
        "title": "Education Philanthropist & Investor",
        "bio": (
            "Former co-founder of ChrysCapital, one of India's premier PE "
            "firms, Ashish Dhawan pivoted to philanthropy through the Central "
            "Square Foundation while maintaining a sizeable personal equity "
            "portfolio. His picks lean toward quality compounders with strong "
            "management and secular tailwinds."
        ),
        "country": "India",
        "investment_style": "Quality Compounding",
        "holdings": [
            {"symbol": "TCS", "weight_pct": 14.0},
            {"symbol": "INFY", "weight_pct": 11.0},
            {"symbol": "HCLTECH", "weight_pct": 8.5},
            {"symbol": "DMART", "weight_pct": 7.8},
            {"symbol": "TITAN", "weight_pct": 6.2},
            {"symbol": "COLPAL", "weight_pct": 4.5},
        ],
    },
    {
        "name": "Porinju Veliyath",
        "slug": "porinju-veliyath",
        "title": "Small Cap Czar",
        "bio": (
            "Kochi-based fund manager and founder of Equity Intelligence, "
            "Porinju is famous for deep-value contrarian bets in micro- and "
            "small-cap stocks. His high-conviction, concentrated style has "
            "delivered spectacular returns in bull markets while attracting "
            "debate during downturns."
        ),
        "country": "India",
        "investment_style": "Deep Value / Contrarian",
        "holdings": [
            {"symbol": "BSOFT", "weight_pct": 10.0},
            {"symbol": "ZENSAR", "weight_pct": 8.5},
            {"symbol": "TANLA", "weight_pct": 7.8},
            {"symbol": "KAYNES", "weight_pct": 7.0},
            {"symbol": "LATENTVIEW", "weight_pct": 5.5},
            {"symbol": "KPITTECH", "weight_pct": 5.0},
        ],
    },
    # ------------------------------------------------------------------
    # Global super investors
    # ------------------------------------------------------------------
    {
        "name": "Warren Buffett",
        "slug": "warren-buffett",
        "title": "The Oracle of Omaha",
        "bio": (
            "Chairman and CEO of Berkshire Hathaway, Warren Buffett is widely "
            "regarded as the most successful investor in history. His value-"
            "oriented philosophy focuses on buying wonderful companies at fair "
            "prices and holding them for decades. Berkshire's equity portfolio "
            "exceeds $300 billion."
        ),
        "country": "United States",
        "investment_style": "Value Investing",
        "holdings": [
            {"symbol": "AAPL", "weight_pct": 42.0},
            {"symbol": "BAC", "weight_pct": 9.8},
            {"symbol": "KO", "weight_pct": 7.5},
            {"symbol": "CVX", "weight_pct": 6.2},
            {"symbol": "OXY", "weight_pct": 4.8},
            {"symbol": "KHC", "weight_pct": 3.6},
            {"symbol": "MCO", "weight_pct": 3.1},
            {"symbol": "DVA", "weight_pct": 1.9},
        ],
    },
    {
        "name": "Ray Dalio",
        "slug": "ray-dalio",
        "title": "Macro Maestro",
        "bio": (
            "Founder of Bridgewater Associates, the world's largest hedge fund. "
            "Ray Dalio pioneered the 'All Weather' portfolio strategy and is "
            "known for macro-driven, principles-based investing. His public "
            "equity holdings reflect a globally diversified, risk-parity "
            "approach spanning sectors and geographies."
        ),
        "country": "United States",
        "investment_style": "Diversified Macro / Risk Parity",
        "holdings": [
            {"symbol": "GOOGL", "weight_pct": 8.5},
            {"symbol": "MSFT", "weight_pct": 7.8},
            {"symbol": "AMZN", "weight_pct": 6.4},
            {"symbol": "NVDA", "weight_pct": 5.9},
            {"symbol": "META", "weight_pct": 4.3},
            {"symbol": "AAPL", "weight_pct": 4.0},
            {"symbol": "AVGO", "weight_pct": 3.2},
            {"symbol": "LLY", "weight_pct": 2.8},
        ],
    },
    {
        "name": "Howard Marks",
        "slug": "howard-marks",
        "title": "Distressed Debt Pioneer",
        "bio": (
            "Co-chairman of Oaktree Capital Management and author of 'The "
            "Most Important Thing'. Howard Marks is revered for his insightful "
            "memos on market cycles, risk, and contrarian thinking. His "
            "investment approach centres on buying assets below intrinsic "
            "value, particularly in distressed and special-situation credit."
        ),
        "country": "United States",
        "investment_style": "Contrarian Value / Credit",
        "holdings": [
            {"symbol": "MSFT", "weight_pct": 9.0},
            {"symbol": "AAPL", "weight_pct": 7.5},
            {"symbol": "GOOGL", "weight_pct": 6.0},
            {"symbol": "AMZN", "weight_pct": 5.5},
            {"symbol": "JPM", "weight_pct": 4.8},
            {"symbol": "TSLA", "weight_pct": 3.2},
        ],
    },
    {
        "name": "Mohnish Pabrai",
        "slug": "mohnish-pabrai",
        "title": "The Dhandho Investor",
        "bio": (
            "Indian-American investor and author of 'The Dhandho Investor', "
            "Mohnish Pabrai runs the Pabrai Investment Funds with a concentrated, "
            "low-turnover strategy inspired by Warren Buffett and Charlie Munger. "
            "He is known for investing in both US and Indian equities, seeking "
            "asymmetric risk-reward opportunities with a significant margin of "
            "safety."
        ),
        "country": "United States",
        "investment_style": "Concentrated Value",
        "holdings": [
            {"symbol": "COALINDIA", "weight_pct": 14.0},
            {"symbol": "RELIANCE", "weight_pct": 10.5},
            {"symbol": "AAPL", "weight_pct": 9.0},
            {"symbol": "GOOGL", "weight_pct": 7.5},
            {"symbol": "TRENT", "weight_pct": 6.8},
            {"symbol": "ITC", "weight_pct": 5.5},
            {"symbol": "TITAN", "weight_pct": 4.0},
        ],
    },
]
