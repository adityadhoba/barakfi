"""Super investors service — returns investor profiles and their holdings (India-only)."""

from __future__ import annotations
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models import SuperInvestor, SuperInvestorHolding, Stock
from app.services.halal_service import evaluate_stock

_INDIAN_EXCHANGES = {"NSE", "BSE"}

def _is_indian_exchange(ex: str | None) -> bool:
    return (ex or "").upper() in _INDIAN_EXCHANGES

def _safe_str(value: object) -> str:
    try:
        return str(value) if value is not None else ""
    except Exception:
        return ""


def get_investors(db: Session) -> list[dict]:
    investors = (
        db.query(SuperInvestor)
        .filter(SuperInvestor.is_active.is_(True))
        .order_by(SuperInvestor.name.asc())
        .all()
    )
    result = []
    for inv in investors:
        indian_count = (
            db.query(SuperInvestorHolding)
            .join(Stock, SuperInvestorHolding.stock_id == Stock.id)
            .filter(
                SuperInvestorHolding.investor_id == inv.id,
                Stock.exchange.in_(_INDIAN_EXCHANGES),
            )
            .count()
        )
        if indian_count == 0:
            continue
        result.append({
            "id": inv.id,
            "name": inv.name,
            "slug": inv.slug,
            "title": inv.title,
            "bio": inv.bio,
            "country": inv.country,
            "investment_style": inv.investment_style,
            "image_url": inv.image_url,
            "holding_count": indian_count,
        })
    return result


def get_investor_detail(db: Session, slug: str) -> dict | None:
    investor = db.query(SuperInvestor).filter(SuperInvestor.slug == slug, SuperInvestor.is_active.is_(True)).first()
    if not investor:
        return None

    holdings = (
        db.query(SuperInvestorHolding)
        .filter(SuperInvestorHolding.investor_id == investor.id)
        .order_by(SuperInvestorHolding.weight_pct.desc())
        .all()
    )

    holding_list = []
    for h in holdings:
        stock = db.query(Stock).filter(Stock.id == h.stock_id).first()
        if stock and _is_indian_exchange(stock.exchange):
            holding_list.append({
                "symbol": stock.symbol,
                "name": stock.name,
                "sector": stock.sector,
                "exchange": stock.exchange,
                "price": stock.price,
                "market_cap": stock.market_cap,
                "weight_pct": h.weight_pct,
            })

    return {
        "id": investor.id,
        "name": investor.name,
        "slug": investor.slug,
        "title": investor.title,
        "bio": investor.bio,
        "country": investor.country,
        "investment_style": investor.investment_style,
        "image_url": investor.image_url,
        "holdings": holding_list,
    }


def seed_investors(db: Session) -> int:
    """Seed super investors from app/data/super_investors.py."""
    from app.data.super_investors import SUPER_INVESTORS, DEACTIVATED_SUPER_INVESTOR_SLUGS

    def _safe_float(value: object, default: float = 0.0) -> float:
        try:
            return float(value) if value is not None else default
        except Exception:
            return default

    seeded = 0
    for inv_data in SUPER_INVESTORS:
        existing = db.query(SuperInvestor).filter(SuperInvestor.slug == inv_data["slug"]).first()
        if existing:
            existing.name = inv_data["name"]
            existing.firm = inv_data.get("firm", "") or ""
            existing.title = inv_data["title"]
            existing.bio = inv_data["bio"]
            existing.source_url = inv_data.get("source_url", "") or ""
            existing.country = inv_data["country"]
            existing.investment_style = inv_data["investment_style"]
            existing.image_url = inv_data.get("image_url", "") or ""
            investor = existing
        else:
            investor = SuperInvestor(
                name=inv_data["name"],
                slug=inv_data["slug"],
                firm=inv_data.get("firm", "") or "",
                title=inv_data["title"],
                bio=inv_data["bio"],
                source_url=inv_data.get("source_url", "") or "",
                country=inv_data["country"],
                investment_style=inv_data["investment_style"],
                image_url=inv_data.get("image_url", "") or "",
            )
            db.add(investor)
            db.flush()

        existing_holdings = {
            row.stock_id
            for row in db.query(SuperInvestorHolding)
            .filter(SuperInvestorHolding.investor_id == investor.id)
            .all()
        }

        for h in inv_data.get("holdings", []):
            sym = (h.get("symbol") or "").upper()
            stock = db.query(Stock).filter(Stock.symbol == sym).first()
            if stock:
                if stock.id in existing_holdings:
                    # Update weight if already exists
                    row = (
                        db.query(SuperInvestorHolding)
                        .filter(
                            SuperInvestorHolding.investor_id == investor.id,
                            SuperInvestorHolding.stock_id == stock.id,
                        )
                        .first()
                    )
                    if row:
                        row.weight_pct = h.get("weight_pct", 0.0)
                        row.symbol = stock.symbol
                        row.company_name = _safe_str(stock.name)
                        row.name = _safe_str(getattr(stock, "name", ""))  # backward-compat field
                        row.exchange = stock.exchange
                        row.currency = stock.currency
                        row.country = stock.country
                        row.sector = stock.sector
                        try:
                            row.company_sector = _safe_str(getattr(stock, "sector", ""))
                        except Exception:
                            pass
                        # Production schema may require these fields; default to 0.
                        try:
                            row.shares = int(getattr(row, "shares", 0) or 0)
                        except Exception:
                            row.shares = 0
                        # Some production schemas require value/pct_portfolio/as_of_date.
                        if getattr(row, "value", None) is None:
                            row.value = 0.0
                        if getattr(row, "pct_portfolio", None) is None:
                            row.pct_portfolio = _safe_float(row.weight_pct, 0.0)
                        if getattr(row, "as_of_date", None) is None:
                            row.as_of_date = datetime.now(timezone.utc)
                else:
                    now = datetime.now(timezone.utc)
                    db.add(SuperInvestorHolding(
                        investor_id=investor.id,
                        stock_id=stock.id,
                        weight_pct=h.get("weight_pct", 0.0),
                        symbol=stock.symbol,
                        company_name=_safe_str(stock.name),
                        name=_safe_str(getattr(stock, "name", "")),
                        exchange=stock.exchange,
                        currency=stock.currency,
                        country=stock.country,
                        sector=stock.sector,
                        company_sector=_safe_str(getattr(stock, "sector", "")),
                        shares=0,
                        value=0.0,
                        pct_portfolio=_safe_float(h.get("weight_pct", 0.0), 0.0),
                        as_of_date=now,
                    ))
        seeded += 1

    for slug in DEACTIVATED_SUPER_INVESTOR_SLUGS:
        inactive = db.query(SuperInvestor).filter(SuperInvestor.slug == slug).first()
        if inactive:
            inactive.is_active = False

    db.commit()
    return seeded


def get_investor_with_compliance(db: Session, slug: str) -> dict | None:
    """Get an investor's holdings with Shariah screening cross-reference."""
    inv = db.query(SuperInvestor).filter(SuperInvestor.slug == slug).first()
    if not inv:
        return None

    holdings_with_compliance = []
    halal_count = 0
    total_value = 0

    from app.services.stock_lookup import resolve_stock

    for h in inv.holdings:
        stock = resolve_stock(db, h.symbol, "NSE", active_only=True) or resolve_stock(db, h.symbol, "BSE", active_only=True) or resolve_stock(db, h.symbol, None, active_only=True)
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
