"""Dashboard / alerts use live LTP when quote fetch succeeds."""

from unittest.mock import patch

from app.api import helpers
from app.models import Portfolio, PortfolioHolding, Stock


def _minimal_stock(symbol: str, price: float) -> Stock:
    return Stock(
        symbol=symbol,
        name=symbol,
        sector="Test",
        exchange="NSE",
        market_cap=1e7,
        average_market_cap_36m=1e7,
        debt=0.0,
        revenue=1.0,
        total_business_income=1.0,
        interest_income=0.0,
        non_permissible_income=0.0,
        accounts_receivable=0.0,
        cash_and_equivalents=0.0,
        short_term_investments=0.0,
        fixed_assets=0.0,
        total_assets=1.0,
        price=price,
        currency="INR",
        country="India",
        data_source="test",
        is_active=True,
    )


def test_build_dashboard_payload_uses_live_prices_when_map_provided():
    s = _minimal_stock("ABC", price=100.0)
    h = PortfolioHolding(quantity=2.0, average_buy_price=50.0, target_allocation_pct=0.0, thesis="", stock=s)
    p = Portfolio(owner_name="t", name="P", base_currency="INR", investment_objective="x", holdings=[h])

    dash = helpers.build_dashboard_payload("t", [p], [], live_last_price_by_symbol={"ABC": 110.0})
    assert dash["portfolio_market_value"] == 220.0


def test_build_compliance_check_weights_use_live_prices():
    s1 = _minimal_stock("A", price=100.0)
    s2 = _minimal_stock("B", price=100.0)
    h1 = PortfolioHolding(quantity=1.0, average_buy_price=50.0, target_allocation_pct=50.0, thesis="", stock=s1)
    h2 = PortfolioHolding(quantity=1.0, average_buy_price=50.0, target_allocation_pct=50.0, thesis="", stock=s2)
    p = Portfolio(owner_name="t", name="P", base_currency="INR", investment_objective="x", holdings=[h1, h2])

    live = {"A": 300.0, "B": 100.0}
    rows = helpers.build_compliance_check([p], live_last_price_by_symbol=live)
    by_sym = {r["symbol"]: r["current_weight_pct"] for r in rows}
    assert by_sym["A"] == 75.0
    assert by_sym["B"] == 25.0


@patch("app.api.helpers.build_live_last_price_by_symbol")
def test_build_dashboard_fetches_live_when_map_omitted(mock_build):
    mock_build.return_value = {"XYZ": 99.0}
    s = _minimal_stock("XYZ", price=1.0)
    h = PortfolioHolding(quantity=1.0, average_buy_price=1.0, target_allocation_pct=0.0, thesis="", stock=s)
    p = Portfolio(owner_name="t", name="P", base_currency="INR", investment_objective="x", holdings=[h])

    dash = helpers.build_dashboard_payload("t", [p], [])
    assert dash["portfolio_market_value"] == 99.0
    mock_build.assert_called_once()
