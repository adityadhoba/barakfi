"""Tests for get_simple_result wrapper around evaluate_stock_multi."""

from unittest.mock import patch

from app.services.halal_service import evaluate_stock_multi, get_simple_result


def _base_stock(**overrides):
    """Minimal valid stock dict for screening (clean sector, sane ratios)."""
    d = {
        "sector": "TECHNOLOGY",
        "market_cap": 1_000_000_000,
        "average_market_cap_36m": 1_000_000_000,
        # Debt must be > 0 or every methodology flags missing debt (CAUTIOUS).
        "debt": 1,
        "total_assets": 500_000_000,
        "total_business_income": 100_000_000,
        "interest_income": 0,
        "non_permissible_income": 0,
        "accounts_receivable": 10_000_000,
        "cash_and_equivalents": 20_000_000,
        "short_term_investments": 0,
        "fixed_assets": 200_000_000,
    }
    d.update(overrides)
    return d


def test_get_simple_result_halal_matches_multi_consensus():
    stock = _base_stock()
    multi = evaluate_stock_multi(stock)
    assert multi["consensus_status"] == "HALAL"

    simple = get_simple_result(stock)
    assert simple == {
        "status": "Halal",
        "score": 100,
        "summary": "Consensus pass across four Shariah screening methodologies.",
    }


def test_get_simple_result_harm_when_non_compliant():
    stock = _base_stock(sector="BANKING")
    multi = evaluate_stock_multi(stock)
    assert multi["consensus_status"] == "NON_COMPLIANT"

    simple = get_simple_result(stock)
    assert simple["status"] == "Haram"
    assert simple["score"] == 0
    assert "Consensus fail" in simple["summary"]


def test_get_simple_result_doubtful_score_from_halal_count():
    stock = _base_stock()
    fake_multi = {
        "consensus_status": "CAUTIOUS",
        "methodologies": {},
        "disclaimer": "",
        "summary": {
            "halal_count": 2,
            "cautious_count": 1,
            "non_compliant_count": 1,
            "total": 4,
        },
    }
    with patch("app.services.halal_service.evaluate_stock_multi", return_value=fake_multi):
        simple = get_simple_result(stock)
    assert simple["status"] == "Doubtful"
    assert simple["score"] == 50
    assert "2 of 4 methodologies pass" in simple["summary"]
