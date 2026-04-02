"""Unit tests for Indian quote parsing (no live HTTP)."""

from unittest.mock import MagicMock, patch

from app.services.indian_market_client import fetch_quote_by_provider, fetch_yahoo_india_quote


def test_fetch_yahoo_india_quote_parses_meta():
    fake_json = {
        "chart": {
            "result": [
                {
                    "meta": {
                        "regularMarketPrice": 100.5,
                        "chartPreviousClose": 99.0,
                        "regularMarketDayHigh": 101.0,
                        "regularMarketDayLow": 98.0,
                        "regularMarketVolume": 1_234_567,
                        "fiftyTwoWeekHigh": 120.0,
                        "fiftyTwoWeekLow": 80.0,
                    }
                }
            ]
        }
    }
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = fake_json

    with patch("app.services.indian_market_client.httpx.get", return_value=mock_resp):
        q = fetch_yahoo_india_quote("TEST", "NSE")

    assert q is not None
    assert q.symbol == "TEST"
    assert q.last_price == 100.5
    assert q.previous_close == 99.0
    assert q.change_percent is not None
    assert q.volume == 1_234_567
    assert q.source == "yahoo_finance_chart"


def test_fetch_quote_by_provider_auto_prefers_nse_then_none():
    with patch(
        "app.services.indian_market_client.fetch_nse_equity_quote",
        return_value=None,
    ) as mock_nse:
        with patch(
            "app.services.indian_market_client.fetch_yahoo_india_quote",
            return_value=None,
        ) as mock_yh:
            out = fetch_quote_by_provider("X", "NSE", "auto_india")
    assert out is None
    mock_nse.assert_called_once_with("X")
    mock_yh.assert_called_once_with("X", "NSE")
