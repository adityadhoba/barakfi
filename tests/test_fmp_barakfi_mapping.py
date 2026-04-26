"""Unit tests for FMP → BarakFi fundamentals mapping (no live HTTP)."""

from app.connectors.fmp_client import (
    average_market_cap_from_history,
    build_barakfi_fundamentals_preview,
    first_dict_or_none,
    fmp_ticker,
    pick_latest_statement_row,
    statement_value_to_inr_crores,
)


def test_fmp_ticker_nse_bse():
    assert fmp_ticker("tcs", "nse") == "TCS.NS"
    assert fmp_ticker("500112", "BSE") == "500112.BO"


def test_statement_inr_to_crores():
    assert statement_value_to_inr_crores(10_000_000.0, currency="INR", exchange="NSE") == 1.0
    assert statement_value_to_inr_crores(100.0, currency="USD", exchange="NYSE") == 100.0


def test_pick_latest_statement_row_by_calendar_year():
    rows = [
        {"calendarYear": "2022", "date": "2022-03-31", "revenue": 100},
        {"calendarYear": "2024", "date": "2024-03-31", "revenue": 300},
        {"calendarYear": "2023", "date": "2023-03-31", "revenue": 200},
    ]
    latest = pick_latest_statement_row(rows)
    assert latest is not None
    assert latest["revenue"] == 300


def test_first_dict_or_none_list_vs_dict():
    assert first_dict_or_none([{"a": 1}]) == {"a": 1}
    assert first_dict_or_none({"b": 2}) == {"b": 2}
    assert first_dict_or_none([]) is None
    assert first_dict_or_none(None) is None


def test_build_barakfi_preview_maps_inr_crores():
    profile = {"currency": "INR", "mktCap": 15_000_000_000_000.0, "price": 3500.0}
    quote = {"price": 3510.0}
    income = {
        "revenue": 200_000_000_000.0,
        "operatingRevenue": 195_000_000_000.0,
        "interestIncome": 5_000_000_000.0,
    }
    balance = {
        "totalDebt": 50_000_000_000.0,
        "cashAndCashEquivalents": 30_000_000_000.0,
        "shortTermInvestments": 10_000_000_000.0,
        "netReceivables": 40_000_000_000.0,
        "propertyPlantEquipmentNet": 80_000_000_000.0,
        "totalAssets": 500_000_000_000.0,
    }
    out = build_barakfi_fundamentals_preview(
        profile_row=profile,
        quote_row=quote,
        income_latest=income,
        balance_latest=balance,
        exchange="NSE",
        currency="INR",
    )
    assert out["market_cap"] == 1_500_000.0
    assert out["price"] == 3510.0
    assert out["revenue"] == 20_000.0
    assert out["total_business_income"] == 20_000.0
    assert out["non_permissible_income"] == 500.0
    assert out["interest_income"] == 500.0
    assert out["debt"] == 5_000.0
    assert out["cash_and_equivalents"] == 3_000.0
    assert out["short_term_investments"] == 1_000.0
    assert out["accounts_receivable"] == 4_000.0
    assert out["fixed_assets"] == 8_000.0
    assert out["total_assets"] == 50_000.0


def test_build_barakfi_debt_falls_back_to_short_plus_long():
    out = build_barakfi_fundamentals_preview(
        profile_row={"currency": "INR"},
        quote_row=None,
        income_latest=None,
        balance_latest={"shortTermDebt": 10_000_000_000.0, "longTermDebt": 5_000_000_000.0},
        exchange="NSE",
        currency="INR",
    )
    assert out["debt"] == 1_500.0


def test_average_market_cap_from_history_inr():
    hist = [
        {"date": "2024-01-01", "marketCap": 10_000_000_000_000.0},
        {"date": "2023-01-01", "marketCap": 8_000_000_000_000.0},
    ]
    avg = average_market_cap_from_history(hist, months=36, exchange="NSE", currency="INR")
    assert avg is not None
    assert abs(avg - 900_000.0) < 1.0
