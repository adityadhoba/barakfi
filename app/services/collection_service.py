"""Stock collections service — curated thematic stock baskets."""

from __future__ import annotations
from sqlalchemy.orm import Session
from app.models import Stock, StockCollection, CollectionEntry, utc_now


def get_collections(db: Session) -> list[dict]:
    collections = (
        db.query(StockCollection)
        .filter(StockCollection.is_active.is_(True))
        .order_by(StockCollection.display_order.asc())
        .all()
    )
    result = []
    for c in collections:
        entry_count = db.query(CollectionEntry).filter(CollectionEntry.collection_id == c.id).count()
        result.append({
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "description": c.description,
            "icon": c.icon,
            "stock_count": entry_count,
        })
    return result


def get_collection_detail(db: Session, slug: str) -> dict | None:
    collection = db.query(StockCollection).filter(StockCollection.slug == slug, StockCollection.is_active.is_(True)).first()
    if not collection:
        return None

    entries = (
        db.query(CollectionEntry)
        .filter(CollectionEntry.collection_id == collection.id)
        .order_by(CollectionEntry.display_order.asc())
        .all()
    )

    stocks = []
    for entry in entries:
        stock = db.query(Stock).filter(Stock.id == entry.stock_id).first()
        if stock:
            stocks.append({
                "symbol": stock.symbol,
                "name": stock.name,
                "sector": stock.sector,
                "exchange": stock.exchange,
                "price": stock.price,
                "market_cap": stock.market_cap,
                "country": stock.country,
                "currency": stock.currency,
            })

    return {
        "id": collection.id,
        "name": collection.name,
        "slug": collection.slug,
        "description": collection.description,
        "icon": collection.icon,
        "stocks": stocks,
    }


def seed_collections(db: Session) -> int:
    """Seed collections from app/data/collections.py. Returns count of collections seeded."""
    from app.data.collections import COLLECTIONS

    seeded = 0
    for i, coll_data in enumerate(COLLECTIONS):
        existing = db.query(StockCollection).filter(StockCollection.slug == coll_data["slug"]).first()
        if existing:
            existing.name = coll_data["name"]
            existing.description = coll_data["description"]
            existing.icon = coll_data["icon"]
            existing.display_order = i
            # Optional field in some deployments; keep safe defaults.
            try:
                existing.is_featured = bool(coll_data.get("is_featured", False))
            except Exception:
                existing.is_featured = False
            existing.is_active = True
            collection = existing
        else:
            collection = StockCollection(
                name=coll_data["name"],
                slug=coll_data["slug"],
                description=coll_data["description"],
                icon=coll_data["icon"],
                display_order=i,
                is_featured=bool(coll_data.get("is_featured", False)),
                is_active=True,
            )
            db.add(collection)
            db.flush()

        # Idempotent: reset entries and rebuild
        db.query(CollectionEntry).filter(CollectionEntry.collection_id == collection.id).delete()

        for j, sym in enumerate(coll_data["symbols"]):
            # Symbols may be stored with Yahoo suffixes for LSE (e.g. "AZN.L").
            # Prefer exact match; fall back to LSE-suffixed match.
            stock = db.query(Stock).filter(Stock.symbol == sym).first()
            if not stock and coll_data["slug"].startswith("ftse100"):
                stock = db.query(Stock).filter(Stock.symbol == f"{sym}.L").first()
            if stock:
                db.add(CollectionEntry(
                    collection_id=collection.id,
                    stock_id=stock.id,
                    display_order=j,
                    added_at=utc_now(),
                ))
        seeded += 1

    db.commit()
    return seeded
