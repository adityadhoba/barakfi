"""In-memory screening cache (5 min TTL)."""

import time

from app.services import screening_cache
from app.services.screening_cache import TTL_SECONDS


def test_cache_miss_then_hit_primary_eval():
    screening_cache.clear_screening_cache()
    assert screening_cache.get_primary_eval("TCS") is None
    screening_cache.set_primary_eval("TCS", {"profile": "sp_shariah", "status": "HALAL"})
    got = screening_cache.get_primary_eval("TCS")
    assert got is not None
    assert got["status"] == "HALAL"


def test_cache_expires_after_ttl(monkeypatch):
    screening_cache.clear_screening_cache()
    screening_cache.set_primary_eval("INFY", {"x": 1})
    assert screening_cache.get_primary_eval("INFY") is not None

    monkeypatch.setattr(screening_cache, "_now", lambda: time.time() + TTL_SECONDS + 1.0)
    assert screening_cache.get_primary_eval("INFY") is None


def test_clear_one_symbol():
    screening_cache.clear_screening_cache()
    screening_cache.set_primary_eval("A", {"a": 1})
    screening_cache.set_primary_eval("B", {"b": 2})
    screening_cache.clear_screening_cache("A")
    assert screening_cache.get_primary_eval("A") is None
    assert screening_cache.get_primary_eval("B") is not None
