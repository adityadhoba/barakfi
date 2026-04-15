from datetime import datetime, timedelta, timezone

from app.services.market_data_service import summarize_fundamentals_freshness


def test_summarize_fundamentals_freshness_fresh_dataset():
    now = datetime(2026, 4, 15, 12, 0, tzinfo=timezone.utc)
    latest = now - timedelta(hours=2)
    out = summarize_fundamentals_freshness(
        stock_count=100,
        latest_fundamentals_updated_at=latest,
        rows_with_timestamp=100,
        stale_threshold_hours=36,
        now_utc=now,
    )
    assert out["stale"] is False
    assert out["rows_with_timestamp"] == 100
    assert out["rows_missing_timestamp"] == 0
    assert out["staleness_hours"] == 2.0


def test_summarize_fundamentals_freshness_mixed_timestamps():
    now = datetime(2026, 4, 15, 12, 0, tzinfo=timezone.utc)
    latest = now - timedelta(hours=8, minutes=30)
    out = summarize_fundamentals_freshness(
        stock_count=100,
        latest_fundamentals_updated_at=latest,
        rows_with_timestamp=72,
        stale_threshold_hours=36,
        now_utc=now,
    )
    assert out["stale"] is False
    assert out["rows_with_timestamp"] == 72
    assert out["rows_missing_timestamp"] == 28
    assert out["staleness_hours"] == 8.5


def test_summarize_fundamentals_freshness_stale_dataset():
    now = datetime(2026, 4, 15, 12, 0, tzinfo=timezone.utc)
    latest = now - timedelta(hours=49)
    out = summarize_fundamentals_freshness(
        stock_count=100,
        latest_fundamentals_updated_at=latest,
        rows_with_timestamp=100,
        stale_threshold_hours=36,
        now_utc=now,
    )
    assert out["stale"] is True
    assert out["rows_with_timestamp"] == 100
    assert out["rows_missing_timestamp"] == 0
    assert out["staleness_hours"] == 49.0
