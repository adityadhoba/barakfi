"""
Super investor service.

Provides seeded data for major investors based on publicly available
13F filings. Cross-references their holdings with Shariah screening.
"""

from sqlalchemy.orm import Session
from app.models import SuperInvestor, SuperInvestorHolding, Stock
from app.services.halal_service import evaluate_stock


SEED_INVESTORS = [
    {
        "name": "Warren Buffett",
        "firm": "Berkshire Hathaway",
        "slug": "warren-buffett",
        "bio": "Chairman and CEO of Berkshire Hathaway. Known as the Oracle of Omaha, one of the most successful investors of all time.",
        "image_url": None,
        "source_url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001067983&type=13F",
        "holdings": [
            {"symbol": "AAPL", "company_name": "Apple Inc.", "shares": 905560000, "value": 174300000000, "pct_portfolio": 48.5},
            {"symbol": "BAC", "company_name": "Bank of America", "shares": 680000000, "value": 25800000000, "pct_portfolio": 7.2},
            {"symbol": "AMZN", "company_name": "Amazon.com Inc.", "shares": 10000000, "value": 1750000000, "pct_portfolio": 0.5},
            {"symbol": "KO", "company_name": "The Coca-Cola Company", "shares": 400000000, "value": 25000000000, "pct_portfolio": 7.0},
            {"symbol": "CVX", "company_name": "Chevron Corporation", "shares": 110000000, "value": 18000000000, "pct_portfolio": 5.0},
            {"symbol": "OXY", "company_name": "Occidental Petroleum", "shares": 250000000, "value": 16000000000, "pct_portfolio": 4.5},
            {"symbol": "KHC", "company_name": "Kraft Heinz", "shares": 325600000, "value": 11000000000, "pct_portfolio": 3.1},
            {"symbol": "MCO", "company_name": "Moody's Corporation", "shares": 24600000, "value": 10000000000, "pct_portfolio": 2.8},
        ],
    },
    {
        "name": "Cathie Wood",
        "firm": "ARK Invest",
        "slug": "cathie-wood",
        "bio": "Founder, CEO, and CIO of ARK Invest. Known for investing in disruptive innovation and high-growth technology companies.",
        "image_url": None,
        "source_url": "https://ark-invest.com/",
        "holdings": [
            {"symbol": "TSLA", "company_name": "Tesla Inc.", "shares": 9500000, "value": 3800000000, "pct_portfolio": 12.5},
            {"symbol": "ROKU", "company_name": "Roku Inc.", "shares": 14000000, "value": 1200000000, "pct_portfolio": 4.0},
            {"symbol": "COIN", "company_name": "Coinbase Global", "shares": 6000000, "value": 1400000000, "pct_portfolio": 4.6},
            {"symbol": "SQ", "company_name": "Block Inc.", "shares": 10000000, "value": 800000000, "pct_portfolio": 2.6},
            {"symbol": "SHOP", "company_name": "Shopify Inc.", "shares": 8000000, "value": 600000000, "pct_portfolio": 2.0},
        ],
    },
    {
        "name": "Ray Dalio",
        "firm": "Bridgewater Associates",
        "slug": "ray-dalio",
        "bio": "Founder of Bridgewater Associates, the world's largest hedge fund. Pioneer of risk parity and all-weather investing strategies.",
        "image_url": None,
        "source_url": "https://www.bridgewater.com/",
        "holdings": [
            {"symbol": "GOOGL", "company_name": "Alphabet Inc.", "shares": 3000000, "value": 500000000, "pct_portfolio": 3.5},
            {"symbol": "PG", "company_name": "Procter & Gamble", "shares": 5000000, "value": 800000000, "pct_portfolio": 5.6},
            {"symbol": "JNJ", "company_name": "Johnson & Johnson", "shares": 4000000, "value": 600000000, "pct_portfolio": 4.2},
            {"symbol": "COST", "company_name": "Costco Wholesale", "shares": 1500000, "value": 1100000000, "pct_portfolio": 7.7},
            {"symbol": "WMT", "company_name": "Walmart", "shares": 3000000, "value": 500000000, "pct_portfolio": 3.5},
            {"symbol": "PEP", "company_name": "PepsiCo", "shares": 2500000, "value": 400000000, "pct_portfolio": 2.8},
        ],
    },
    {
        "name": "Bill Ackman",
        "firm": "Pershing Square Capital",
        "slug": "bill-ackman",
        "bio": "Founder and CEO of Pershing Square Capital Management. Known as an activist investor with concentrated portfolio positions.",
        "image_url": None,
        "source_url": "https://pershingsquareholdings.com/",
        "holdings": [
            {"symbol": "GOOGL", "company_name": "Alphabet Inc.", "shares": 7000000, "value": 1200000000, "pct_portfolio": 16.0},
            {"symbol": "HLT", "company_name": "Hilton Worldwide", "shares": 8000000, "value": 1800000000, "pct_portfolio": 24.0},
            {"symbol": "QSR", "company_name": "Restaurant Brands Intl", "shares": 15000000, "value": 1000000000, "pct_portfolio": 13.3},
        ],
    },
    {
        "name": "Rakesh Jhunjhunwala (Legacy)",
        "firm": "RARE Enterprises",
        "slug": "rakesh-jhunjhunwala",
        "bio": "The late 'Big Bull' of Indian stock markets. His legacy portfolio continues to be tracked by Indian investors.",
        "image_url": None,
        "source_url": None,
        "holdings": [
            {"symbol": "TITAN", "company_name": "Titan Company", "shares": 50000000, "value": 175000000000, "pct_portfolio": 30.0},
            {"symbol": "TATACOMM", "company_name": "Tata Communications", "shares": 15000000, "value": 30000000000, "pct_portfolio": 5.1},
            {"symbol": "CRISIL", "company_name": "CRISIL Limited", "shares": 5500000, "value": 27000000000, "pct_portfolio": 4.6},
            {"symbol": "FORTIS", "company_name": "Fortis Healthcare", "shares": 36500000, "value": 18000000000, "pct_portfolio": 3.1},
        ],
    },
]


def seed_investors(db: Session) -> int:
    """Seed the super investor data if not already present. Returns count of investors seeded."""
    existing = db.query(SuperInvestor).count()
    if existing > 0:
        return 0

    count = 0
    for inv_data in SEED_INVESTORS:
        inv = SuperInvestor(
            name=inv_data["name"],
            firm=inv_data["firm"],
            slug=inv_data["slug"],
            bio=inv_data["bio"],
            image_url=inv_data.get("image_url"),
            source_url=inv_data.get("source_url"),
        )
        db.add(inv)
        db.flush()

        for h in inv_data["holdings"]:
            holding = SuperInvestorHolding(
                investor_id=inv.id,
                symbol=h["symbol"],
                company_name=h["company_name"],
                shares=h["shares"],
                value=h["value"],
                pct_portfolio=h["pct_portfolio"],
            )
            db.add(holding)
        count += 1

    db.commit()
    return count


def get_investor_with_compliance(db: Session, slug: str) -> dict | None:
    """Get an investor's holdings with Shariah screening cross-reference."""
    inv = db.query(SuperInvestor).filter(SuperInvestor.slug == slug).first()
    if not inv:
        return None

    holdings_with_compliance = []
    halal_count = 0
    total_value = 0

    for h in inv.holdings:
        stock = db.query(Stock).filter(Stock.symbol == h.symbol).first()
        compliance_status = "UNKNOWN"
        compliance_rating = None

        if stock:
            sd = {
                "symbol": stock.symbol, "name": stock.name,
                "sector": stock.sector, "market_cap": stock.market_cap,
                "average_market_cap_36m": stock.average_market_cap_36m,
                "debt": stock.debt, "revenue": stock.revenue,
                "total_business_income": stock.total_business_income,
                "interest_income": stock.interest_income,
                "non_permissible_income": stock.non_permissible_income,
                "accounts_receivable": stock.accounts_receivable,
                "cash_and_equivalents": stock.cash_and_equivalents,
                "short_term_investments": stock.short_term_investments,
                "fixed_assets": stock.fixed_assets,
                "total_assets": stock.total_assets,
                "price": stock.price,
            }
            result = evaluate_stock(sd)
            compliance_status = result["status"]
            compliance_rating = result.get("compliance_rating")
            if compliance_status == "HALAL":
                halal_count += 1

        total_value += h.value
        holdings_with_compliance.append({
            "symbol": h.symbol,
            "company_name": h.company_name,
            "shares": h.shares,
            "value": h.value,
            "pct_portfolio": h.pct_portfolio,
            "compliance_status": compliance_status,
            "compliance_rating": compliance_rating,
        })

    total = len(inv.holdings)
    halal_pct = round((halal_count / total) * 100, 1) if total > 0 else 0

    return {
        "name": inv.name,
        "firm": inv.firm,
        "slug": inv.slug,
        "bio": inv.bio,
        "image_url": inv.image_url,
        "source_url": inv.source_url,
        "total_holdings": total,
        "halal_pct": halal_pct,
        "halal_count": halal_count,
        "total_value": total_value,
        "holdings": holdings_with_compliance,
    }
