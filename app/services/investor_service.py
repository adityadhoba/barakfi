"""Super investors service — returns investor profiles and their holdings."""

from __future__ import annotations
from sqlalchemy.orm import Session
from app.models import SuperInvestor, SuperInvestorHolding, Stock


def get_investors(db: Session) -> list[dict]:
    investors = (
        db.query(SuperInvestor)
        .filter(SuperInvestor.is_active.is_(True))
        .order_by(SuperInvestor.name.asc())
        .all()
    )
    result = []
    for inv in investors:
        holding_count = db.query(SuperInvestorHolding).filter(SuperInvestorHolding.investor_id == inv.id).count()
        result.append({
            "id": inv.id,
            "name": inv.name,
            "slug": inv.slug,
            "title": inv.title,
            "bio": inv.bio,
            "country": inv.country,
            "investment_style": inv.investment_style,
            "image_url": inv.image_url,
            "holding_count": holding_count,
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
        if stock:
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
    from app.data.super_investors import SUPER_INVESTORS

    seeded = 0
    for inv_data in SUPER_INVESTORS:
        existing = db.query(SuperInvestor).filter(SuperInvestor.slug == inv_data["slug"]).first()
        if existing:
            existing.name = inv_data["name"]
            existing.title = inv_data["title"]
            existing.bio = inv_data["bio"]
            existing.country = inv_data["country"]
            existing.investment_style = inv_data["investment_style"]
            existing.image_url = inv_data.get("image_url", "") or ""
            investor = existing
        else:
            investor = SuperInvestor(
                name=inv_data["name"],
                slug=inv_data["slug"],
                title=inv_data["title"],
                bio=inv_data["bio"],
                country=inv_data["country"],
                investment_style=inv_data["investment_style"],
                image_url=inv_data.get("image_url", "") or "",
            )
            db.add(investor)
            db.flush()

        for h in inv_data.get("holdings", []):
            stock = db.query(Stock).filter(Stock.symbol == h["symbol"]).first()
            if stock:
                db.add(SuperInvestorHolding(
                    investor_id=investor.id,
                    stock_id=stock.id,
                    weight_pct=h.get("weight_pct", 0.0),
                ))
        seeded += 1

    db.commit()
    return seeded
