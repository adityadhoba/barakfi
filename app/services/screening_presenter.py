"""
Presentation layer for screening API responses.

Reads outputs from evaluate_stock / evaluate_stock_multi only — no changes
to compliance engine logic.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.services.halal_service import (
    ALL_PROFILE_CODES,
    screening_summary_for_multi,
    stock_check_details_available,
)

RETENTION_NOTE = "Halal status may change based on financial updates"


def _product_status_from_consensus(consensus: str) -> str:
    if consensus == "HALAL":
        return "Halal"
    if consensus == "NON_COMPLIANT":
        return "Haram"
    return "Doubtful"


def build_consensus_summary(multi: dict) -> dict[str, Any]:
    """PASS=HALAL, FAIL=NON_COMPLIANT, DOUBTFUL=CAUTIOUS (excluded from headline ratio)."""
    summ = multi.get("summary") or {}
    total = int(summ.get("total") or len(ALL_PROFILE_CODES))
    passed = int(summ.get("halal_count", 0))
    failed = int(summ.get("non_compliant_count", 0))
    doubtful = int(summ.get("cautious_count", 0))
    summary = f"{passed} out of {total} standards passed"
    return {
        "passed": passed,
        "failed": failed,
        "doubtful": doubtful,
        "total": total,
        "summary": summary,
    }


def compute_trust_confidence(multi: dict, stock: dict) -> dict[str, Any]:
    """
    Trust score separate from methodology screening_score.
    Start 100; deduct for fails, missing data, conflict; cap if <2 methodologies.
    """
    summ = multi.get("summary") or {}
    fail_n = int(summ.get("non_compliant_count", 0))
    halal_n = int(summ.get("halal_count", 0))
    total_m = int(summ.get("total") or len(ALL_PROFILE_CODES))
    consensus = multi.get("consensus_status") or "CAUTIOUS"

    score = 100
    score -= 20 * fail_n
    if not stock_check_details_available(stock):
        score -= 10
    conflicting = consensus == "CAUTIOUS" or (halal_n >= 1 and fail_n >= 1)
    if conflicting:
        score -= 15

    score = max(0, min(100, score))
    effective_methods = total_m if total_m > 0 else len(ALL_PROFILE_CODES)
    if effective_methods < 2:
        score = min(score, 60)

    if score >= 80:
        level = "High"
    elif score >= 50:
        level = "Medium"
    else:
        level = "Low"

    return {"score": score, "level": level}


def build_user_highlights(
    product_status: str,
    multi: dict,
    primary_breakdown: dict | None,
) -> list[str]:
    """Max 3 short bullets; tone follows Halal / Doubtful / Haram."""
    bd = primary_breakdown or {}
    summ = multi.get("summary") or {}
    passed = int(summ.get("halal_count", 0))
    failed = int(summ.get("non_compliant_count", 0))
    total = int(summ.get("total") or 4)

    def _ratio_bullets_positive() -> list[str]:
        out: list[str] = []
        dr36 = float(bd.get("debt_to_36m_avg_market_cap_ratio") or 0)
        dr = float(bd.get("debt_to_market_cap_ratio") or 0)
        if dr36 < 0.33 and dr < 0.33:
            out.append("Debt is within common Shariah screening limits.")
        npi = float(bd.get("non_permissible_income_ratio") or 0)
        if npi < 0.05:
            out.append("Non-permissible income is small relative to revenue.")
        if bd.get("sector_allowed", True):
            out.append("Sector and business line did not trigger an automatic exclusion.")
        return out[:3]

    def _ratio_bullets_negative() -> list[str]:
        out = [
            "One or more methodologies report failing checks on this data.",
            "Review debt, income purity, receivables, and sector rules in the details.",
        ]
        if failed >= total // 2:
            out.append("Several standards align on a non-compliant view — treat with extra care.")
        return out[:3]

    if product_status == "Halal":
        lines = _ratio_bullets_positive()
        if len(lines) < 2:
            lines.insert(0, "Passed most Shariah compliance checks across methodologies.")
        if len(lines) < 3:
            lines.append("Still confirm with a scholar before investing.")
        return lines[:3]

    if product_status == "Haram":
        lines = _ratio_bullets_negative()
        return lines[:3]

    # Doubtful
    return [
        f"{passed} of {total} methodologies pass; some need review or fail on this screen.",
        "Ratios or data gaps can push different standards to different outcomes.",
        "Verify with a qualified advisor before sizing a position.",
    ][:3]


def build_seo_block(
    name: str,
    symbol: str,
    product_status: str,
    multi: dict | None = None,
    consensus_override: dict[str, Any] | None = None,
    batch_override: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if multi is not None:
        cs = build_consensus_summary(multi)
    else:
        cs = consensus_override or {
            "passed": 0,
            "failed": 0,
            "doubtful": 0,
            "total": 4,
            "summary": "Multi-methodology Shariah screening.",
        }
    title = f"Is {name} ({symbol}) Halal? Shariah status explained (2026)"
    description = (
        f"{name} automated Shariah screening: {product_status}. "
        f"{cs['summary']}. Based on S&P Shariah, AAOIFI, FTSE Yasaar, and related methodology views."
    )
    faq = [
        {
            "question": f"Is {name} ({symbol}) halal?",
            "answer": f"Our automated screen labels this name as {product_status} using multiple published methodologies; always confirm with a scholar.",
        },
        {
            "question": f"Why is {symbol} considered halal or not under these screens?",
            "answer": "Typical drivers are interest-bearing debt versus market cap, non-permissible income as a share of revenue, receivables versus assets, and sector rules. Each methodology sets its own thresholds.",
        },
        {
            "question": "Can Muslims invest in this stock?",
            "answer": "Barakfi provides informational screening only—not a fatwa or investment recommendation. Many Muslims confirm with a qualified advisor before investing.",
        },
    ]
    content = (
        f"{name} ({symbol}) is summarized as {product_status} in our multi-methodology view. "
        f"{cs['summary']}. "
        "We show methodology-level ratios and reasons so you can understand what drove the outcome. "
        "Markets and filings change—revisit screening after major results or restructuring."
    )
    out: dict[str, Any] = {
        "title": title,
        "description": description,
        "faq": faq,
        "content": content,
    }
    if batch_override:
        if isinstance(batch_override.get("title"), str) and batch_override["title"].strip():
            out["title"] = batch_override["title"].strip()
        if isinstance(batch_override.get("description"), str) and batch_override["description"].strip():
            out["description"] = batch_override["description"].strip()
        if isinstance(batch_override.get("content"), str) and batch_override["content"].strip():
            out["content"] = batch_override["content"].strip()
        faq_o = batch_override.get("faq")
        if isinstance(faq_o, list) and len(faq_o) > 0:
            out["faq"] = faq_o
    return out


def build_screening_details(
    multi: dict,
    primary_screening: dict | None,
    stock: dict,
) -> dict[str, Any]:
    """Ratios + per-methodology payloads + reasons (primary if provided)."""
    methodologies = multi.get("methodologies") or {}
    reasons: list[str] = []
    ratios: dict[str, Any] = {}
    if primary_screening:
        reasons = list(primary_screening.get("reasons") or [])
        ratios = dict(primary_screening.get("breakdown") or {})
    return {
        "ratios": ratios,
        "methodologies": methodologies,
        "reasons": reasons,
        "details_available": stock_check_details_available(stock),
    }


def build_rich_screening_payload(
    *,
    name: str,
    symbol: str,
    stock: dict,
    multi: dict,
    primary_screening: dict | None,
    evaluated_at: datetime | None = None,
) -> dict[str, Any]:
    """Single rich `data` object for check-stock / stock-details style responses."""
    consensus_engine = multi.get("consensus_status") or "CAUTIOUS"
    product_status = _product_status_from_consensus(consensus_engine)
    score = int(multi.get("screening_score") or 0)
    score = max(0, min(100, score))

    summary = screening_summary_for_multi(multi)

    ts = evaluated_at or datetime.now(timezone.utc)
    last_updated = ts.isoformat().replace("+00:00", "Z")

    details = build_screening_details(multi, primary_screening, stock)
    return {
        "name": name,
        "symbol": symbol,
        "status": product_status,
        "score": score,
        "summary": summary,
        "highlights": build_user_highlights(product_status, multi, (primary_screening or {}).get("breakdown")),
        "consensus": build_consensus_summary(multi),
        "confidence": compute_trust_confidence(multi, stock),
        "details": details,
        "details_available": details.get("details_available", False),
        "note": RETENTION_NOTE,
        "last_updated": last_updated,
    }


def simple_row_from_cache_entry(entry: dict | None) -> dict[str, Any] | None:
    """Pick symbol, score, status from a cached rich payload if present."""
    if not entry or not isinstance(entry, dict):
        return None
    sym = entry.get("symbol")
    if not sym:
        return None
    return {
        "symbol": sym,
        "score": int(entry.get("score", 0)),
        "status": entry.get("status", "Doubtful"),
    }
