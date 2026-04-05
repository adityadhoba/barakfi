"""Fetch and store Islamic finance news from RSS (feedparser)."""

from __future__ import annotations

import logging
import re
from datetime import UTC, datetime

import feedparser
from sqlalchemy.orm import Session

from app.config import NEWS_RSS_URL
from app.models import NewsArticle, utc_now

logger = logging.getLogger("barakfi")

UA = "BarakfiNewsBot/1.0 (+https://barakfi.in)"


def _parse_published(entry) -> datetime:
    if getattr(entry, "published_parsed", None):
        try:
            return datetime(*entry.published_parsed[:6], tzinfo=UTC)
        except Exception:
            pass
    if getattr(entry, "updated_parsed", None):
        try:
            return datetime(*entry.updated_parsed[:6], tzinfo=UTC)
        except Exception:
            pass
    return utc_now()


def _image_from_entry(entry) -> str:
    if getattr(entry, "media_content", None):
        for m in entry.media_content:
            u = m.get("url")
            if u:
                return u
    if getattr(entry, "media_thumbnail", None):
        for m in entry.media_thumbnail:
            u = m.get("url")
            if u:
                return u
    summary = getattr(entry, "summary", "") or ""
    m = re.search(r'src="(https?://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"', summary, re.I)
    return m.group(1) if m else ""


def fetch_and_upsert_news(db: Session, feed_url: str | None = None, max_items: int = 40) -> int:
    url = (feed_url or NEWS_RSS_URL or "").strip()
    if not url:
        logger.warning("NEWS_RSS_URL not set; skip news sync")
        return 0

    parsed = feedparser.parse(url, agent=UA)
    if getattr(parsed, "bozo", False) and not parsed.entries:
        logger.warning("RSS parse issue: %s", getattr(parsed, "bozo_exception", ""))

    n = 0
    for entry in parsed.entries[:max_items]:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        if not title or not link:
            continue
        summary = re.sub(r"<[^>]+>", "", entry.get("summary", "") or "")[:2000]
        pub = _parse_published(entry)
        img = _image_from_entry(entry)[:2000]

        row = db.query(NewsArticle).filter(NewsArticle.url == link).first()
        if row:
            row.title = title[:500]
            row.summary = summary
            if img:
                row.image_url = img
            row.published_at = pub
            row.fetched_at = utc_now()
        else:
            db.add(
                NewsArticle(
                    title=title[:500],
                    summary=summary,
                    url=link[:2000],
                    image_url=img,
                    source="RSS",
                    published_at=pub,
                )
            )
        n += 1
    db.commit()
    return n


def list_news(db: Session, limit: int = 24) -> list[dict]:
    rows = (
        db.query(NewsArticle)
        .order_by(NewsArticle.published_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    return [
        {
            "id": r.id,
            "title": r.title,
            "summary": r.summary,
            "url": r.url,
            "image_url": r.image_url,
            "source": r.source,
            "published_at": r.published_at.isoformat() if r.published_at else None,
        }
        for r in rows
    ]


def fetch_and_upsert_newsapi(db: Session, max_items: int = 40) -> int:
    """Fetch from NewsAPI.org /v2/everything when NEWS_NEWSAPI_KEY is set."""
    from app.config import NEWS_NEWSAPI_KEY, NEWS_NEWSAPI_QUERY

    key = (NEWS_NEWSAPI_KEY or "").strip()
    if not key:
        return 0

    import httpx

    params = {
        "q": NEWS_NEWSAPI_QUERY or "islamic finance",
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": min(max_items, 100),
        "apiKey": key,
    }
    try:
        r = httpx.get("https://newsapi.org/v2/everything", params=params, timeout=35.0)
        r.raise_for_status()
        payload = r.json()
    except Exception as exc:
        logger.warning("NewsAPI request failed: %s", exc)
        return 0

    articles = payload.get("articles") or []
    n = 0
    for art in articles[:max_items]:
        title = (art.get("title") or "").strip()
        link = (art.get("url") or "").strip()
        if not title or not link:
            continue
        desc = (art.get("description") or art.get("content") or "") or ""
        desc = re.sub(r"<[^>]+>", "", desc)[:2000]
        img = (art.get("urlToImage") or "")[:2000]
        src = ""
        if isinstance(art.get("source"), dict):
            src = (art.get("source") or {}).get("name") or ""
        pub_s = art.get("publishedAt") or ""
        try:
            pub = datetime.fromisoformat(pub_s.replace("Z", "+00:00"))
        except Exception:
            pub = utc_now()

        row = db.query(NewsArticle).filter(NewsArticle.url == link).first()
        if row:
            row.title = title[:500]
            row.summary = desc
            row.source = src[:200] or "NewsAPI"
            if img:
                row.image_url = img
            row.published_at = pub
            row.fetched_at = utc_now()
        else:
            db.add(
                NewsArticle(
                    title=title[:500],
                    summary=desc,
                    url=link[:2000],
                    image_url=img,
                    source=src[:200] or "NewsAPI",
                    published_at=pub,
                )
            )
        n += 1
    db.commit()
    return n
