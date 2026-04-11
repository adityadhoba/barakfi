"""
Standard {success, data, error} envelopes for stock screening HTTP responses.

Top-level fields stay minimal; engine output lives under data.details.
"""

from __future__ import annotations

from typing import Any

from app.services.halal_service import (
    PRIMARY_PROFILE,
    SCREENING_DISCLAIMER,
    build_stock_check_payload,
    stock_check_details_available,
)

_ENGINE_TO_PRODUCT = {"HALAL": "Halal", "CAUTIOUS": "Doubtful", "NON_COMPLIANT": "Haram"}


def engine_status_to_product(status: str) -> str:
    return _ENGINE_TO_PRODUCT.get(status, status)


def ok_envelope(data: dict[str, Any]) -> dict[str, Any]:
    return {"success": True, "data": data, "error": None}


def _strip_methodology_entry(entry: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in entry.items() if k != "disclaimer"}
    return out


def _one_line_primary_summary(engine_status: str, reasons: list[str]) -> str:
    if not reasons:
        return "Automated Shariah screen completed."
    for r in reasons:
        if r.startswith("Meets all screening criteria"):
            if engine_status == "HALAL":
                return r
            continue
    return reasons[0]


def build_check_stock_data(name: str, symbol: str, stock: dict, multi: dict) -> dict[str, Any]:
    """Inner `data` for GET /check-stock (one evaluate_stock_multi call)."""
    base = build_stock_check_payload(name, stock, multi)
    primary = multi["methodologies"][PRIMARY_PROFILE]
    methodologies = {k: _strip_methodology_entry(dict(v)) for k, v in multi["methodologies"].items()}
    return {
        "name": base["name"],
        "symbol": symbol.strip().upper(),
        "status": base["status"],
        "score": base["score"],
        "summary": base["summary"],
        "details_available": base["details_available"],
        "details": {
            "ratios": dict(primary["breakdown"]),
            "methodologies": methodologies,
            "reasons": list(primary["reasons"]),
            "manual_review_flags": list(primary["manual_review_flags"]),
            "methodology_summary": dict(multi["summary"]),
            "consensus_status": multi["consensus_status"],
            "disclaimer": multi.get("disclaimer") or SCREENING_DISCLAIMER,
        },
    }


def build_screen_stock_data(
    symbol: str,
    name: str,
    result: dict[str, Any],
    *,
    active_review_case: Any,
    recent_review_cases: list[Any],
) -> dict[str, Any]:
    """Inner `data` for GET /screen/{symbol} and items in POST /screen/bulk."""
    engine = result["status"]
    details = {
        "engine_status": engine,
        "profile": result["profile"],
        "methodology_label": result.get("methodology_label"),
        "ratios": dict(result["breakdown"]),
        "methodologies": {},
        "reasons": list(result["reasons"]),
        "manual_review_flags": list(result["manual_review_flags"]),
        "purification_ratio_pct": result.get("purification_ratio_pct"),
        "disclaimer": result.get("disclaimer") or SCREENING_DISCLAIMER,
        "active_review_case": active_review_case,
        "recent_review_cases": list(recent_review_cases or []),
    }
    return {
        "symbol": symbol,
        "name": name,
        "status": engine_status_to_product(engine),
        "score": int(result["screening_score"]),
        "summary": _one_line_primary_summary(engine, details["reasons"]),
        "details": details,
    }


def build_multi_screen_data(symbol: str, name: str, stock: dict, multi: dict) -> dict[str, Any]:
    """Inner `data` for GET /screen/{symbol}/multi."""
    base = build_stock_check_payload(name, stock, multi)
    primary = multi["methodologies"][PRIMARY_PROFILE]
    methodologies = {k: _strip_methodology_entry(dict(v)) for k, v in multi["methodologies"].items()}
    return {
        "symbol": symbol.strip().upper(),
        "name": name,
        "status": base["status"],
        "score": base["score"],
        "summary": base["summary"],
        "details_available": True,
        "details": {
            "ratios": dict(primary["breakdown"]),
            "methodologies": methodologies,
            "reasons": list(primary["reasons"]),
            "manual_review_flags": list(primary["manual_review_flags"]),
            "methodology_summary": dict(multi["summary"]),
            "consensus_status": multi["consensus_status"],
            "disclaimer": multi.get("disclaimer") or SCREENING_DISCLAIMER,
        },
    }
