"""Unit tests for screening presenter (consensus, confidence, no engine changes)."""

from app.services.screening_presenter import build_consensus_summary, compute_trust_confidence


def test_consensus_summary_headline_uses_passed_and_total():
    multi = {
        "summary": {
            "total": 4,
            "halal_count": 3,
            "non_compliant_count": 0,
            "cautious_count": 1,
        }
    }
    c = build_consensus_summary(multi)
    assert c["passed"] == 3
    assert c["failed"] == 0
    assert c["doubtful"] == 1
    assert c["total"] == 4
    assert c["summary"] == "3 out of 4 standards passed"


def test_confidence_capped_when_few_methodologies():
    stock = {"revenue": 1.0, "total_business_income": 1.0, "market_cap": 1.0, "total_assets": 1.0}
    multi = {
        "summary": {"total": 1, "halal_count": 1, "non_compliant_count": 0, "cautious_count": 0},
        "consensus_status": "HALAL",
    }
    out = compute_trust_confidence(multi, stock)
    assert out["score"] <= 60
    assert out["level"] in ("High", "Medium", "Low")


def test_confidence_deducts_for_conflicting_consensus():
    stock = {"revenue": 1.0, "total_business_income": 1.0, "market_cap": 1.0, "total_assets": 1.0}
    multi = {
        "summary": {"total": 4, "halal_count": 1, "non_compliant_count": 1, "cautious_count": 2},
        "consensus_status": "CAUTIOUS",
    }
    out = compute_trust_confidence(multi, stock)
    assert out["score"] < 100
