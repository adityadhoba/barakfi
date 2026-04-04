"""
Collections service.

Manages curated lists of halal stocks (e.g. "Halal Tech Giants",
"Shariah Blue Chips India").
"""

from sqlalchemy.orm import Session
from app.models import Stock, StockCollection, CollectionEntry


SEED_COLLECTIONS = [
    {
        "name": "Halal Tech Giants",
        "slug": "halal-tech-giants",
        "description": "Top technology companies that pass Shariah screening across all methodologies.",
        "icon": "laptop",
        "is_featured": True,
        "symbols": ["TCS", "INFY", "WIPRO", "HCLTECH", "AAPL", "MSFT", "GOOGL", "NVDA"],
    },
    {
        "name": "Shariah Blue Chips India",
        "slug": "shariah-blue-chips-india",
        "description": "Large-cap Indian stocks compliant with S&P, AAOIFI, and FTSE Shariah methodologies.",
        "icon": "shield",
        "is_featured": True,
        "symbols": ["RELIANCE", "TCS", "INFY", "LT", "SUNPHARMA", "MARUTI", "TITAN", "CIPLA"],
    },
    {
        "name": "Clean Energy Halal",
        "slug": "clean-energy-halal",
        "description": "Renewable energy and sustainable companies that meet Shariah compliance standards.",
        "icon": "leaf",
        "is_featured": True,
        "symbols": ["ADANIGREEN", "TATAPOWER", "SJVN", "NHPC", "SUZLON", "INOXWIND", "NEE"],
    },
    {
        "name": "Healthcare & Pharma Halal",
        "slug": "healthcare-pharma-halal",
        "description": "Shariah-compliant pharmaceutical and healthcare companies serving global markets.",
        "icon": "heart",
        "is_featured": True,
        "symbols": ["SUNPHARMA", "CIPLA", "DRREDDY", "DIVISLAB", "LUPIN", "JNJ", "ABT", "TMO"],
    },
    {
        "name": "Global Consumer Staples",
        "slug": "global-consumer-staples",
        "description": "Consumer goods companies with steady revenue and Shariah compliance worldwide.",
        "icon": "shopping-bag",
        "is_featured": False,
        "symbols": ["HINDUNILVR", "DABUR", "MARICO", "PG", "KO", "PEP", "CL", "MDLZ", "NESTLEIND"],
    },
    {
        "name": "US Halal Large Caps",
        "slug": "us-halal-large-caps",
        "description": "S&P 500 constituents screened for Shariah compliance using multiple methodologies.",
        "icon": "flag",
        "is_featured": True,
        "symbols": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "JNJ", "PG", "KO", "PEP", "TMO"],
    },
    {
        "name": "Infrastructure & Industrials",
        "slug": "infrastructure-industrials",
        "description": "Companies building infrastructure and industrial capacity while remaining Shariah compliant.",
        "icon": "building",
        "is_featured": False,
        "symbols": ["LT", "SIEMENS", "ABB", "CUMMINSIND", "HON", "CAT", "GE", "DE"],
    },
    {
        "name": "Dividend Champions Halal",
        "slug": "dividend-champions-halal",
        "description": "High dividend yield stocks that pass Shariah screening — ideal for income-focused halal investors.",
        "icon": "coins",
        "is_featured": False,
        "symbols": ["ITC", "COALINDIA", "POWERGRID", "NTPC", "XOM", "CVX", "SO", "DUK"],
    },
]


def seed_collections(db: Session) -> int:
    """Seed curated collections if not already present. Returns count seeded."""
    existing = db.query(StockCollection).count()
    if existing > 0:
        return 0

    count = 0
    for coll_data in SEED_COLLECTIONS:
        coll = StockCollection(
            name=coll_data["name"],
            slug=coll_data["slug"],
            description=coll_data["description"],
            icon=coll_data["icon"],
            is_featured=coll_data["is_featured"],
        )
        db.add(coll)
        db.flush()

        from app.services.stock_lookup import resolve_stock

        for sym in coll_data["symbols"]:
            stock = resolve_stock(db, sym, "NSE", active_only=True) or resolve_stock(db, sym, None, active_only=True)
            if stock:
                entry = CollectionEntry(
                    collection_id=coll.id,
                    stock_id=stock.id,
                )
                db.add(entry)
        count += 1

    db.commit()
    return count
