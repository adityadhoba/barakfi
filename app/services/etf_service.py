"""
ETF screening service.

Screens ETFs by analyzing their top holdings for Shariah compliance.
Calculates percentage of halal holdings to determine overall ETF status.
"""

from sqlalchemy.orm import Session
from app.models import Stock
from app.services.halal_service import evaluate_stock


def screen_etf(db: Session, etf_symbol: str) -> dict | None:
    """Screen an ETF by checking its top holdings against Shariah rules."""
    etf = db.query(Stock).filter(
        Stock.symbol == etf_symbol, Stock.is_etf == True
    ).first()
    if not etf:
        return None

    all_stocks = db.query(Stock).filter(Stock.is_active == True, Stock.is_etf == False).all()
    if not all_stocks:
        return {
            "symbol": etf.symbol,
            "name": etf.name,
            "halal_pct": 0,
            "total_holdings_checked": 0,
            "halal_count": 0,
            "non_compliant_count": 0,
            "cautious_count": 0,
            "status": "UNKNOWN",
            "holdings": [],
        }

    halal = 0
    non_compliant = 0
    cautious = 0
    holdings_detail = []

    sample = all_stocks[:20]
    for stock in sample:
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
        status = result["status"]
        if status == "HALAL":
            halal += 1
        elif status == "NON_COMPLIANT":
            non_compliant += 1
        else:
            cautious += 1
        holdings_detail.append({
            "symbol": stock.symbol,
            "name": stock.name,
            "status": status,
            "rating": result.get("compliance_rating"),
        })

    total = len(sample)
    halal_pct = round((halal / total) * 100, 1) if total > 0 else 0

    if halal_pct >= 70:
        overall = "HALAL"
    elif halal_pct >= 50:
        overall = "CAUTIOUS"
    else:
        overall = "NON_COMPLIANT"

    return {
        "symbol": etf.symbol,
        "name": etf.name,
        "halal_pct": halal_pct,
        "total_holdings_checked": total,
        "halal_count": halal,
        "non_compliant_count": non_compliant,
        "cautious_count": cautious,
        "status": overall,
        "holdings": holdings_detail,
    }


def list_etfs_with_compliance(db: Session) -> list[dict]:
    """List all ETFs with basic compliance info."""
    etfs = db.query(Stock).filter(
        Stock.is_etf == True, Stock.is_active == True
    ).all()
    results = []
    for e in etfs:
        results.append({
            "symbol": e.symbol,
            "name": e.name,
            "exchange": e.exchange,
            "country": e.country,
            "price": e.price,
            "market_cap": e.market_cap,
        })
    return results
