from __future__ import annotations

import fetch_real_data as frd


def _fake_stock(symbol: str) -> dict:
    return {
        "symbol": symbol,
        "name": f"{symbol} Ltd",
        "sector": "Information Technology",
        "exchange": "NSE",
        "currency": "INR",
        "country": "India",
        "market_cap": 100.0,
        "average_market_cap_36m": 90.0,
        "debt": 5.0,
        "revenue": 50.0,
        "total_business_income": 51.0,
        "interest_income": 0.5,
        "non_permissible_income": 0.5,
        "accounts_receivable": 2.0,
        "cash_and_equivalents": 3.0,
        "short_term_investments": 0.0,
        "fixed_assets": 20.0,
        "total_assets": 80.0,
        "price": 1000.0,
        "data_source": "yahoo_finance",
    }


def test_main_returns_nonzero_and_warning_alert_on_partial_failure(monkeypatch):
    monkeypatch.setattr(frd, "STOCK_SYMBOLS", ["AAA", "BBB"])
    monkeypatch.setattr(frd.time, "sleep", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(
        frd,
        "fetch_stock_data",
        lambda symbol, exchange="NSE": _fake_stock(symbol) if symbol == "AAA" else None,
    )
    monkeypatch.setattr(frd, "_assert_production_database_url", lambda: "sqlite:///./test.db")
    monkeypatch.setattr(frd, "write_output_file", lambda _stocks: None)
    monkeypatch.setattr(
        frd,
        "write_to_database",
        lambda _stocks: {"created": 0, "updated": 1, "rows_with_timestamp": 1, "rows_missing_timestamp": 0},
    )
    alerts: list[tuple[str, str, dict]] = []
    monkeypatch.setattr(
        frd,
        "_send_job_a_alert",
        lambda level, title, details: alerts.append((level, title, details)),
    )
    monkeypatch.setattr(frd.sys, "argv", ["fetch_real_data.py"])

    code = frd.main()

    assert code == 1
    assert any(level == "warning" and "partial failure" in title.lower() for level, title, _ in alerts)
    assert not any(level == "success" for level, _, _ in alerts)


def test_main_returns_zero_and_success_alert_on_full_success(monkeypatch):
    monkeypatch.setattr(frd, "STOCK_SYMBOLS", ["AAA"])
    monkeypatch.setattr(frd.time, "sleep", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(frd, "fetch_stock_data", lambda symbol, exchange="NSE": _fake_stock(symbol))
    monkeypatch.setattr(frd, "_assert_production_database_url", lambda: "sqlite:///./test.db")
    monkeypatch.setattr(frd, "write_output_file", lambda _stocks: None)
    monkeypatch.setattr(
        frd,
        "write_to_database",
        lambda _stocks: {"created": 0, "updated": 1, "rows_with_timestamp": 1, "rows_missing_timestamp": 0},
    )
    alerts: list[tuple[str, str, dict]] = []
    monkeypatch.setattr(
        frd,
        "_send_job_a_alert",
        lambda level, title, details: alerts.append((level, title, details)),
    )
    monkeypatch.setattr(frd.sys, "argv", ["fetch_real_data.py"])

    code = frd.main()

    assert code == 0
    assert any(level == "success" and "job a complete" in title.lower() for level, title, _ in alerts)
