from __future__ import annotations

import importlib
import sys


def _reload_module():
    mod = importlib.import_module("fetch_real_data")
    return importlib.reload(mod)


def test_filter_stock_payload_for_model_drops_unknown_fields():
    mod = _reload_module()
    payload = {"symbol": "ABC", "exchange": "NSE", "beta": 1.2, "pe_ratio": 20.3}
    filtered = mod._filter_stock_payload_for_model(payload, {"symbol", "exchange"})
    assert filtered == {"symbol": "ABC", "exchange": "NSE"}


def test_nse_ticker_uses_canonical_symbol_alias():
    mod = _reload_module()
    assert mod._nse_ticker("ZOMATO") == "ETERNAL.NS"
    assert mod._nse_ticker("ADANITRANS") == "ADANIENSOL.NS"
    assert mod._nse_ticker("TCS") == "TCS.NS"


def test_main_partial_failure_returns_non_zero_and_sends_warning(monkeypatch):
    mod = _reload_module()
    monkeypatch.setattr(sys, "argv", ["fetch_real_data.py", "--dry-run"])
    monkeypatch.setattr(mod, "STOCK_SYMBOLS", ["GOOD1", "BAD1"])
    monkeypatch.setattr(mod, "US_STOCK_SYMBOLS", ["US1"])
    monkeypatch.setattr(mod, "UK_STOCK_SYMBOLS", ["UK1"])
    monkeypatch.setattr(mod.time, "sleep", lambda _: None)
    monkeypatch.setattr(mod, "write_output_file", lambda _: None)

    alerts: list[tuple[str, str, dict]] = []
    monkeypatch.setattr(mod, "_send_job_a_alert", lambda level, title, details: alerts.append((level, title, details)))

    calls: list[tuple[str, str]] = []

    def fake_fetch(symbol: str, exchange: str):
        calls.append((symbol, exchange))
        if symbol == "BAD1":
            return None
        return {
            "symbol": symbol,
            "exchange": exchange,
            "sector": "IT",
            "name": symbol,
            "price": 100.0,
            "market_cap": 1000.0,
            "debt": 100.0,
            "revenue": 500.0,
            "total_assets": 1200.0,
        }

    monkeypatch.setattr(mod, "fetch_stock_data", fake_fetch)

    rc = mod.main()
    assert rc == 1
    assert calls == [("GOOD1", "NSE"), ("BAD1", "NSE")]
    assert len(alerts) == 1
    level, title, details = alerts[0]
    assert level == "warning"
    assert "partial" in title.lower()
    assert details["failed"] == 1


def test_main_dry_run_full_success_sends_success_alert(monkeypatch):
    mod = _reload_module()
    monkeypatch.setattr(sys, "argv", ["fetch_real_data.py", "--dry-run"])
    monkeypatch.setattr(mod, "STOCK_SYMBOLS", ["ONLY1"])
    monkeypatch.setattr(mod.time, "sleep", lambda _: None)
    monkeypatch.setattr(mod, "write_output_file", lambda _: None)

    alerts: list[tuple[str, str, dict]] = []
    monkeypatch.setattr(mod, "_send_job_a_alert", lambda level, title, details: alerts.append((level, title, details)))
    monkeypatch.setattr(
        mod,
        "fetch_stock_data",
        lambda symbol, exchange: {
            "symbol": symbol,
            "exchange": exchange,
            "sector": "IT",
            "name": symbol,
            "price": 100.0,
            "market_cap": 1000.0,
            "debt": 100.0,
            "revenue": 500.0,
            "total_assets": 1200.0,
        },
    )

    rc = mod.main()
    assert rc == 0
    assert len(alerts) == 1
    level, title, details = alerts[0]
    assert level == "success"
    assert "dry-run" in title.lower()
    assert details["failed"] == 0
