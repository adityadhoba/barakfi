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
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/c/c4/Rj_in_office.jpg",
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
        "name": "Vijay Kedia",
        "slug": "vijay-kedia",
        "title": "The Smiling Bull",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/e3/VijayKedia.jpg",
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
        "name": "Porinju Veliyath",
        "slug": "porinju-veliyath",
        "title": "Small Cap Czar",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/4/4b/Porinju_Veliyath.jpg",
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
    {
        "name": "N. R. Narayana Murthy",
        "slug": "nr-narayana-murthy",
        "title": "Infosys Co-founder",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/f/f6/Nagavara_Ramarao_Narayana_Murthy.jpg",
        "bio": (
            "Engineer and entrepreneur who co-founded Infosys and helped shape "
            "India's IT services industry. Known for disciplined execution, "
            "strong governance, and a long-term view on building world-class "
            "technology services from India."
        ),
        "country": "India",
        "investment_style": "Quality & Governance",
        "holdings": [
            {"symbol": "INFY", "weight_pct": 28.0},
            {"symbol": "TCS", "weight_pct": 18.0},
            {"symbol": "WIPRO", "weight_pct": 14.0},
            {"symbol": "HCLTECH", "weight_pct": 12.0},
            {"symbol": "TECHM", "weight_pct": 10.0},
            {"symbol": "LTIM", "weight_pct": 8.0},
            {"symbol": "PERSISTENT", "weight_pct": 6.0},
        ],
    },
    {
        "name": "Nandan Nilekani",
        "slug": "nandan-nilekani",
        "title": "Digital India & Infosys Pioneer",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/6/62/Nandan_M._Nilekani.jpg",
        "bio": (
            "Co-founder of Infosys and architect of large-scale digital public "
            "infrastructure initiatives in India. His investing lens blends "
            "technology-led disruption with scalable, compliant business models."
        ),
        "country": "India",
        "investment_style": "Tech-Led Compounding",
        "holdings": [
            {"symbol": "INFY", "weight_pct": 26.0},
            {"symbol": "TCS", "weight_pct": 20.0},
            {"symbol": "HCLTECH", "weight_pct": 15.0},
            {"symbol": "WIPRO", "weight_pct": 12.0},
            {"symbol": "COFORGE", "weight_pct": 10.0},
            {"symbol": "MPHASIS", "weight_pct": 9.0},
            {"symbol": "LTIM", "weight_pct": 8.0},
        ],
    },
    {
        "name": "Uday Kotak",
        "slug": "uday-kotak",
        "title": "Kotak Mahindra Bank Founder",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/e/e1/Uday_Kotak.jpeg",
        "bio": (
            "Founder of Kotak Mahindra Bank and a leading voice on Indian "
            "financial services. His approach emphasises capital discipline, "
            "risk management, and long-term franchise building in banking and "
            "wealth management."
        ),
        "country": "India",
        "investment_style": "Financials & Quality",
        "holdings": [
            {"symbol": "KOTAKBANK", "weight_pct": 34.0},
            {"symbol": "HDFCBANK", "weight_pct": 18.0},
            {"symbol": "ICICIBANK", "weight_pct": 14.0},
            {"symbol": "AXISBANK", "weight_pct": 12.0},
            {"symbol": "SBIN", "weight_pct": 10.0},
            {"symbol": "BAJFINANCE", "weight_pct": 8.0},
            {"symbol": "CHOLAFIN", "weight_pct": 4.0},
        ],
    },
    # ------------------------------------------------------------------
    # Global super investors
    # ------------------------------------------------------------------
    {
        "name": "Warren Buffett",
        "slug": "warren-buffett",
        "title": "The Oracle of Omaha",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/51/Warren_Buffett_KU_Visit.jpg",
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
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/a/a7/Ray_Dalio_Sept_23_2017_NYC.jpg",
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
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/8/8b/Howard_Marks_2.17.12_%28cropped%29.jpg",
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
        "name": "Charlie Munger",
        "slug": "charlie-munger",
        "title": "Berkshire Vice Chairman",
        "image_url": "https://upload.wikimedia.org/wikipedia/commons/5/56/Charlie_Munger_%28cropped%29.jpg",
        "bio": (
            "Long-time vice chairman of Berkshire Hathaway and Warren Buffett's "
            "investing partner. Famous for multidisciplinary thinking, "
            "inversion, and a ruthless focus on moats, management quality, and "
            "a margin of safety."
        ),
        "country": "United States",
        "investment_style": "Multidisciplinary Value",
        "holdings": [
            {"symbol": "AAPL", "weight_pct": 38.0},
            {"symbol": "BAC", "weight_pct": 12.0},
            {"symbol": "KO", "weight_pct": 9.0},
            {"symbol": "BRK-B", "weight_pct": 8.0},
            {"symbol": "AXP", "weight_pct": 7.0},
            {"symbol": "KHC", "weight_pct": 5.0},
            {"symbol": "MCO", "weight_pct": 4.0},
            {"symbol": "OXY", "weight_pct": 3.5},
        ],
    },
]

# Profiles removed from the public site (no reliable photo or global-only holdings).
DEACTIVATED_SUPER_INVESTOR_SLUGS: list[str] = [
    "radhakishan-damani",
    "dolly-khanna",
    "ashish-dhawan",
    "mohnish-pabrai",
    "warren-buffett",
    "ray-dalio",
    "howard-marks",
    "charlie-munger",
]
