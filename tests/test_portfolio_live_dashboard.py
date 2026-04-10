"""Dashboard / alerts use live LTP when quote fetch succeeds."""

from unittest.mock import MagicMock, patch

from app.api import helpers
from app.models import Portfolio, PortfolioHolding, Stock
from app.services import portfolio_live_prices as plp


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


def test_portfolio_quote_cache_hits_on_second_build():
    plp.clear_portfolio_quote_cache()
    s = _minimal_stock("CACHE1", price=10.0)
    h = PortfolioHolding(quantity=1.0, average_buy_price=1.0, target_allocation_pct=0.0, thesis="", stock=s)
    p = Portfolio(owner_name="t", name="P", base_currency="INR", investment_objective="x", holdings=[h])

    mock_q = MagicMock()
    mock_q.last_price = 55.0
    with patch.object(plp, "fetch_quote_by_provider", return_value=mock_q) as fetch:
        dash1 = helpers.build_dashboard_payload("t", [p], [])
        dash2 = helpers.build_dashboard_payload("t", [p], [])
    assert dash1["portfolio_market_value"] == 55.0
    assert dash2["portfolio_market_value"] == 55.0
    assert fetch.call_count == 1


def test_portfolio_quote_cache_expires():
    plp.clear_portfolio_quote_cache()
    s = _minimal_stock("CACHE2", price=10.0)
    h = PortfolioHolding(quantity=1.0, average_buy_price=1.0, target_allocation_pct=0.0, thesis="", stock=s)
    p = Portfolio(owner_name="t", name="P", base_currency="INR", investment_objective="x", holdings=[h])

    mock_q = MagicMock()
    mock_q.last_price = 77.0
    ttl = plp._CACHE_TTL_SECONDS
    mono_vals = iter([0.0, 0.0, ttl + 1.0, ttl + 2.0])

    with patch.object(plp, "fetch_quote_by_provider", return_value=mock_q) as fetch:
        with patch.object(plp.time, "monotonic", side_effect=lambda: next(mono_vals)):
            helpers.build_dashboard_payload("t", [p], [])
            helpers.build_dashboard_payload("t", [p], [])
    assert fetch.call_count == 2
