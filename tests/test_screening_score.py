"""Tests for screening_score_from_evaluation and evaluate_stock scoring."""

import pytest

from app.services.halal_service import (
    build_stock_check_payload,
    evaluate_stock,
    evaluate_stock_multi,
    get_simple_result,
    screening_score_for_manual_override,
    screening_score_from_evaluation,
    stock_check_details_available,
)


def test_score_100_when_only_success_reason():
    r = screening_score_from_evaluation(
        {
            "reasons": ["Meets all screening criteria under S&P Shariah Indices methodology."],
            "manual_review_flags": [],
        }
    )
    assert r == 100


def test_score_debt_breach_once_minus_30():
    r = screening_score_from_evaluation(
        {
            "reasons": [
                "Debt is 40.0% of 36m avg market cap, exceeding the 33% threshold set by S&P.",
                "Debt is 40.0% of current market cap, exceeding the 33% threshold.",
            ],
            "manual_review_flags": [],
        }
    )
    assert r == 70


def test_evaluate_stock_includes_screening_score():
    stock = {
        "sector": "TECHNOLOGY",
        "market_cap": 1_000_000_000,
        "average_market_cap_36m": 1_000_000_000,
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
    out = evaluate_stock(stock, "sp_shariah")
    assert "screening_score" in out
    assert 0 <= out["screening_score"] <= 100


def test_get_simple_result_product_labels():
    stock = {
        "sector": "TECHNOLOGY",
        "market_cap": 1_000_000_000,
        "average_market_cap_36m": 1_000_000_000,
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
    s = get_simple_result(stock)
    assert s["status"] == "Halal"
    assert s["score"] == evaluate_stock_multi(stock)["screening_score"]
    assert s["summary"] == "Meets most Shariah compliance criteria"


@pytest.mark.parametrize(
    "status,expected",
    [("HALAL", 100), ("CAUTIOUS", 50), ("NON_COMPLIANT", 0)],
)
def test_screening_score_for_manual_override(status, expected):
    assert screening_score_for_manual_override(status) == expected


def test_build_stock_check_payload():
    stock = {
        "sector": "TECHNOLOGY",
        "market_cap": 1_000_000_000,
        "average_market_cap_36m": 1_000_000_000,
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
    multi = evaluate_stock_multi(stock)
    out = build_stock_check_payload("Co", stock, multi)
    assert out["name"] == "Co"
    assert out["status"] in ("Halal", "Doubtful", "Haram")
    assert out["details_available"] == stock_check_details_available(stock)
