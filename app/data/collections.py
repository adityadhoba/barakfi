"""
Seed data for stock collections (curated thematic baskets).

Each collection maps to a StockCollection row and its symbols resolve
to CollectionEntry rows via the stocks table at seed time.
"""

COLLECTIONS: list[dict] = [
    {
        "name": "Halal Blue Chips India",
        "slug": "halal-blue-chips-india",
        "description": (
            "Top Shariah-compliant large-cap stocks on the NSE. These blue-chip "
            "companies have strong fundamentals, low debt ratios, and minimal "
            "exposure to non-permissible revenue streams."
        ),
        "icon": "🏛️",
        "symbols": [
            "RELIANCE", "BHARTIARTL", "MARUTI", "ADANIPORTS", "ULTRACEMCO",
            "DMART", "TITAN", "EICHERMOT", "HAL", "BOSCHLTD",
        ],
    },
    {
        "name": "Halal IT Stocks",
        "slug": "halal-it-stocks",
        "description": (
            "Leading Indian IT services and technology companies that pass "
            "Shariah screening criteria. The IT sector naturally carries low "
            "debt and negligible non-permissible income."
        ),
        "icon": "💻",
        "symbols": [
            "TCS", "INFY", "WIPRO", "HCLTECH", "TECHM",
            "LTIM", "PERSISTENT", "COFORGE", "MPHASIS", "TATAELXSI",
        ],
    },
    {
        "name": "Halal Pharma & Healthcare",
        "slug": "halal-pharma-healthcare",
        "description": (
            "Shariah-compliant pharmaceutical manufacturers and healthcare "
            "providers listed on Indian exchanges. These companies focus on "
            "life-saving therapies and hospital services with clean balance sheets."
        ),
        "icon": "💊",
        "symbols": [
            "SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "APOLLOHOSP",
            "TORNTPHARM", "LUPIN", "BIOCON", "MAXHEALTH", "FORTIS",
        ],
    },
    {
        "name": "Halal Auto Stocks",
        "slug": "halal-auto",
        "description": (
            "Shariah-compliant automobile manufacturers, two-wheeler makers, and "
            "auto component suppliers from India. Includes OEMs and ancillary "
            "companies with conservative capital structures."
        ),
        "icon": "🚗",
        "symbols": [
            "MARUTI", "TATAMOTORS", "M&M", "BAJAJ-AUTO", "EICHERMOT",
            "HEROMOTOCO", "BOSCHLTD", "TVSMOTOR", "BHARATFORG", "ASHOKLEY",
        ],
    },
    {
        "name": "S&P 500 Halal",
        "slug": "sp500-halal",
        "description": (
            "The largest US-listed companies that comply with Shariah investment "
            "guidelines. This collection tracks the top constituents of the S&P "
            "500 that pass standard Islamic finance screens for debt, interest "
            "income, and business activity."
        ),
        "icon": "🇺🇸",
        "symbols": [
            "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
            "TSLA", "META", "AVGO", "LLY", "JPM",
        ],
    },
    {
        "name": "FTSE 100 Halal",
        "slug": "ftse100-halal",
        "description": (
            "Shariah-compliant constituents of the UK FTSE 100 index. "
            "Features multinational blue chips listed on the London Stock "
            "Exchange that meet Islamic screening thresholds for leverage, "
            "cash positioning, and permissible revenue."
        ),
        "icon": "🇬🇧",
        "symbols": [
            "SHEL", "AZN", "ULVR", "RIO", "LSEG",
            "GSK", "DGE", "BP", "HSBA", "REL",
        ],
    },
    {
        "name": "Low Debt Leaders",
        "slug": "low-debt-leaders",
        "description": (
            "Companies with exceptionally low debt-to-market-cap ratios, making "
            "them strong candidates for conservative halal portfolios. Ideal for "
            "investors seeking minimal leverage risk."
        ),
        "icon": "📉",
        "symbols": [
            "TCS", "INFY", "DMART", "ITC", "BRITANNIA",
            "DABUR", "MARICO", "COLPAL", "NESTLEIND", "PAGEIND",
        ],
    },
    {
        "name": "Halal FMCG",
        "slug": "halal-fmcg",
        "description": (
            "Fast-moving consumer goods companies that pass Shariah screening. "
            "These defensive, cash-generative businesses sell everyday essentials "
            "and carry minimal interest-bearing debt."
        ),
        "icon": "🛒",
        "symbols": [
            "HINDUNILVR", "ITC", "NESTLEIND", "BRITANNIA", "DABUR",
            "MARICO", "COLPAL", "TATACONSUM", "GODREJCP", "VBL",
        ],
    },
    {
        "name": "Halal Cement & Infra",
        "slug": "halal-cement-infra",
        "description": (
            "Shariah-compliant cement producers and infrastructure companies "
            "benefiting from India's capex cycle. These asset-heavy businesses "
            "still maintain permissible financial ratios under standard screens."
        ),
        "icon": "🏗️",
        "symbols": [
            "ULTRACEMCO", "GRASIM", "SHREECEM", "AMBUJACEM", "LT",
            "ADANIPORTS", "CONCOR", "SIEMENS", "ABB", "CUMMINSIND",
        ],
    },
    {
        "name": "Small Cap Gems",
        "slug": "small-cap-gems",
        "description": (
            "High-growth small-cap technology and services companies that are "
            "Shariah-compliant. These emerging leaders offer strong revenue "
            "growth with low leverage, suitable for higher risk-tolerance investors."
        ),
        "icon": "💎",
        "symbols": [
            "KPITTECH", "KAYNES", "CLEAN", "LATENTVIEW", "MASTEK",
            "HAPPSTMNDS", "TANLA", "ZENSAR", "BSOFT", "KFINTECH",
        ],
    },
]
