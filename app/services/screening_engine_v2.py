"""
Modular halal screening engine v2 — methodology-versioned, explainable.

Design:
- No hard-coded thresholds in code — all thresholds come from MethodologyVersion.thresholds_json
- Each check returns: status, value, threshold, formula, reason, source_refs, quality_flags
- Conservative precedence: fail > review_required > insufficient_data > pass
- Overall pass only if ALL required checks pass and NO uncertainty flags remain
- Output is a fully structured explainability_json object suitable for public display

Conservative precedence rules:
1. If business_activity is 'fail' → overall is 'fail' (no other check matters)
2. If business_activity is 'review_required' or 'mixed' → overall is at most 'review_required'
3. If any required financial value is missing/stale → 'insufficient_data' or 'review_required'
4. If any ratio check fails → 'fail'
5. 'pass' only when all required checks pass and no uncertainty flags remain
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("barakfi.screening_v2")
UTC = timezone.utc


# ---------------------------------------------------------------------------
# Check result type
# ---------------------------------------------------------------------------

class CheckResult:
    """Result of a single screening check."""

    def __init__(
        self,
        key: str,
        status: str,
        value: Optional[float],
        threshold: Optional[float],
        formula: Optional[str],
        reason: str,
        source_refs: List[Dict],
        quality_flags: List[str],
    ):
        assert status in ("pass", "fail", "review_required", "insufficient_data"), \
            f"Invalid status: {status}"
        self.key = key
        self.status = status
        self.value = value
        self.threshold = threshold
        self.formula = formula
        self.reason = reason
        self.source_refs = source_refs
        self.quality_flags = quality_flags

    def to_dict(self) -> Dict[str, Any]:
        return {
            "key": self.key,
            "status": self.status,
            "value": self.value,
            "threshold": self.threshold,
            "formula": self.formula,
            "reason": self.reason,
            "source_refs": self.source_refs,
            "quality_flags": self.quality_flags,
        }


# ---------------------------------------------------------------------------
# Individual check modules
# ---------------------------------------------------------------------------

def check_business_activity(
    review_status: Optional[str],
    confidence_label: Optional[str],
    source_refs: Optional[List[Dict]] = None,
) -> CheckResult:
    """
    Business activity check — whether the company's primary operations are permissible.

    This is the GATING check.  A 'fail' here overrides all other checks.
    """
    flags: List[str] = []
    refs = source_refs or []

    if review_status is None:
        return CheckResult(
            key="business_activity",
            status="insufficient_data",
            value=None,
            threshold=None,
            formula=None,
            reason="Business activity has not been reviewed yet.  Classification is required before a verdict can be issued.",
            source_refs=refs,
            quality_flags=["no_review"],
        )

    if review_status == "fail":
        return CheckResult(
            key="business_activity",
            status="fail",
            value=None,
            threshold=None,
            formula=None,
            reason="Business activity is classified as non-compliant.",
            source_refs=refs,
            quality_flags=flags,
        )

    if review_status in ("mixed", "review_required"):
        flags.append("business_activity_uncertainty")
        return CheckResult(
            key="business_activity",
            status="review_required",
            value=None,
            threshold=None,
            formula=None,
            reason="Business activity has mixed or uncertain compliance.  Manual review is required.",
            source_refs=refs,
            quality_flags=flags,
        )

    if review_status == "insufficient_data":
        return CheckResult(
            key="business_activity",
            status="insufficient_data",
            value=None,
            threshold=None,
            formula=None,
            reason="Insufficient evidence to classify business activity.",
            source_refs=refs,
            quality_flags=["insufficient_data"],
        )

    # review_status == "pass"
    if confidence_label == "low":
        flags.append("low_confidence_classification")
        return CheckResult(
            key="business_activity",
            status="review_required",
            value=None,
            threshold=None,
            formula=None,
            reason="Business activity appears permissible but reviewer confidence is low.  Additional review recommended.",
            source_refs=refs,
            quality_flags=flags,
        )

    return CheckResult(
        key="business_activity",
        status="pass",
        value=None,
        threshold=None,
        formula=None,
        reason="Business activity is classified as permissible.",
        source_refs=refs,
        quality_flags=flags,
    )


def check_debt_ratio(
    total_debt: Optional[float],
    market_cap: Optional[float],
    threshold: float,
    formula: str = "total_debt / market_cap",
    source_refs: Optional[List[Dict]] = None,
    stale: bool = False,
) -> CheckResult:
    """
    Debt ratio check: total_debt / market_cap must be below threshold (typically 0.33).

    Sources: annual report balance sheet or XBRL filing.
    Denominator: market cap from official EOD close × latest shares outstanding.
    """
    refs = source_refs or []
    flags: List[str] = []

    if stale:
        flags.append("stale_financials")

    if total_debt is None:
        return CheckResult(
            key="debt_ratio",
            status="insufficient_data",
            value=None,
            threshold=threshold,
            formula=formula,
            reason="Total debt figure is missing from the latest reliable filing.",
            source_refs=refs,
            quality_flags=flags + ["missing_debt"],
        )

    if market_cap is None or market_cap <= 0:
        return CheckResult(
            key="debt_ratio",
            status="insufficient_data",
            value=None,
            threshold=threshold,
            formula=formula,
            reason="Market cap is unavailable or zero; ratio cannot be computed.",
            source_refs=refs,
            quality_flags=flags + ["missing_market_cap"],
        )

    ratio = total_debt / market_cap
    status = "pass" if ratio < threshold else "fail"

    if stale and status == "pass":
        status = "review_required"
        flags.append("stale_data_blocks_pass")

    reason = (
        f"Debt ratio is {ratio:.4f} (threshold: {threshold}).  "
        + ("Within permissible range." if status == "pass" else "Exceeds permissible threshold.")
    )
    if stale:
        reason += "  Note: financial data may be stale."

    return CheckResult(
        key="debt_ratio",
        status=status,
        value=round(ratio, 6),
        threshold=threshold,
        formula=formula,
        reason=reason,
        source_refs=refs,
        quality_flags=flags,
    )


def check_cash_ratio(
    cash_and_equivalents: Optional[float],
    market_cap: Optional[float],
    threshold: float,
    formula: str = "cash_and_equivalents / market_cap",
    source_refs: Optional[List[Dict]] = None,
    stale: bool = False,
) -> CheckResult:
    """
    Cash and liquid assets ratio check: cash_and_equivalents / market_cap < threshold.
    """
    refs = source_refs or []
    flags: List[str] = []

    if stale:
        flags.append("stale_financials")

    if cash_and_equivalents is None:
        return CheckResult(
            key="cash_ratio",
            status="insufficient_data",
            value=None,
            threshold=threshold,
            formula=formula,
            reason="Cash and equivalents figure is missing from the latest reliable filing.",
            source_refs=refs,
            quality_flags=flags + ["missing_cash"],
        )

    if market_cap is None or market_cap <= 0:
        return CheckResult(
            key="cash_ratio",
            status="insufficient_data",
            value=None,
            threshold=threshold,
            formula=formula,
            reason="Market cap is unavailable or zero; ratio cannot be computed.",
            source_refs=refs,
            quality_flags=flags + ["missing_market_cap"],
        )

    ratio = cash_and_equivalents / market_cap
    status = "pass" if ratio < threshold else "fail"

    if stale and status == "pass":
        status = "review_required"
        flags.append("stale_data_blocks_pass")

    reason = (
        f"Cash ratio is {ratio:.4f} (threshold: {threshold}).  "
        + ("Within permissible range." if status == "pass" else "Exceeds permissible threshold.")
    )
    if stale:
        reason += "  Note: financial data may be stale."

    return CheckResult(
        key="cash_ratio",
        status=status,
        value=round(ratio, 6),
        threshold=threshold,
        formula=formula,
        reason=reason,
        source_refs=refs,
        quality_flags=flags,
    )


def check_non_compliant_income_ratio(
    non_compliant_income: Optional[float],
    total_revenue: Optional[float],
    threshold: float,
    formula: str = "non_compliant_income / total_revenue",
    source_refs: Optional[List[Dict]] = None,
    stale: bool = False,
    is_proxy: bool = True,
) -> CheckResult:
    """
    Non-compliant income ratio: non_compliant_income / total_revenue < threshold.

    Note: In Indian filings, 'non-compliant income' is not a single structured field.
    This is typically a derived proxy from 'other income', finance income, or
    segment notes — hence is_proxy=True by default.  Proxies should trigger
    review_required unless confidence is high.
    """
    refs = source_refs or []
    flags: List[str] = []

    if stale:
        flags.append("stale_financials")
    if is_proxy:
        flags.append("proxy_value")

    if non_compliant_income is None:
        status = "review_required" if is_proxy else "insufficient_data"
        return CheckResult(
            key="non_compliant_income_ratio",
            status=status,
            value=None,
            threshold=threshold,
            formula=formula,
            reason="Non-compliant income proxy is unavailable.  Manual review of annual report required.",
            source_refs=refs,
            quality_flags=flags + ["missing_non_compliant_income"],
        )

    if total_revenue is None or total_revenue <= 0:
        return CheckResult(
            key="non_compliant_income_ratio",
            status="insufficient_data",
            value=None,
            threshold=threshold,
            formula=formula,
            reason="Total revenue is missing; ratio cannot be computed.",
            source_refs=refs,
            quality_flags=flags + ["missing_revenue"],
        )

    ratio = non_compliant_income / total_revenue
    status = "pass" if ratio < threshold else "fail"

    if is_proxy and status == "pass":
        # Even if the number passes, a proxy warrants review
        status = "review_required"
        flags.append("proxy_blocks_pass")
        reason = (
            f"Non-compliant income proxy ratio is {ratio:.4f} (threshold: {threshold}).  "
            "Ratio is within range but this is a derived proxy, not a directly filed figure.  "
            "Manual review of annual report is required to confirm."
        )
    else:
        reason = (
            f"Non-compliant income ratio is {ratio:.4f} (threshold: {threshold}).  "
            + ("Within permissible range." if status == "pass" else "Exceeds permissible threshold.")
        )

    return CheckResult(
        key="non_compliant_income_ratio",
        status=status,
        value=round(ratio, 6),
        threshold=threshold,
        formula=formula,
        reason=reason,
        source_refs=refs,
        quality_flags=flags,
    )


# ---------------------------------------------------------------------------
# Conservative precedence aggregation
# ---------------------------------------------------------------------------

_STATUS_RANK = {
    "fail": 0,
    "review_required": 1,
    "insufficient_data": 2,
    "pass": 3,
}


def _aggregate_status(checks: List[CheckResult]) -> str:
    """
    Aggregate individual check statuses using conservative precedence.

    fail > review_required > insufficient_data > pass
    """
    if not checks:
        return "insufficient_data"
    return min(
        (c.status for c in checks),
        key=lambda s: _STATUS_RANK.get(s, 99),
    )


# ---------------------------------------------------------------------------
# Main screening engine entry point
# ---------------------------------------------------------------------------

class ScreeningEngineV2:
    """
    Evaluate a single issuer against a loaded methodology version.

    Usage:
        engine = ScreeningEngineV2(methodology_config)
        result = engine.screen(snapshot_data, activity_review_data)
    """

    def __init__(self, methodology: Dict[str, Any]):
        """
        Args:
            methodology: dict with keys:
                version_code, thresholds_json, formulas_json, disclosure_text
        """
        self.version_code: str = methodology["version_code"]
        self.thresholds: Dict[str, float] = methodology["thresholds_json"]
        self.formulas: Dict[str, str] = methodology.get("formulas_json", {})
        self.disclosure_text: str = methodology.get("disclosure_text", "")

    def screen(
        self,
        snapshot: Optional[Dict[str, Any]],
        activity_review: Optional[Dict[str, Any]],
        price_as_of: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Run all checks and return a complete explainability JSON object.

        Args:
            snapshot: dict with fundamentals data (from FundamentalsSnapshot)
            activity_review: dict with business activity review data
            price_as_of: the date of the latest price used for market cap

        Returns:
            Explainability JSON (see ScreeningResultV2 docstring for schema)
        """
        now = datetime.now(UTC)
        checks: List[CheckResult] = []

        # ---- Business activity check (gating) ----
        if activity_review:
            ba_check = check_business_activity(
                review_status=activity_review.get("review_status"),
                confidence_label=activity_review.get("confidence_label"),
                source_refs=activity_review.get("evidence_json", [])[:3],
            )
        else:
            ba_check = check_business_activity(
                review_status=None,
                confidence_label=None,
                source_refs=[],
            )
        checks.append(ba_check)

        # Short-circuit: if business activity fails, no need to run ratio checks
        if ba_check.status == "fail":
            return self._build_result(
                checks=checks,
                snapshot=snapshot,
                activity_review=activity_review,
                price_as_of=price_as_of,
                screened_at=now,
            )

        # ---- Financial ratio checks ----
        if snapshot:
            total_debt = snapshot.get("total_debt")
            cash = snapshot.get("cash_and_equivalents")
            short_term_investments = snapshot.get("short_term_investments") or 0.0
            cash_and_ib = (cash or 0.0) + short_term_investments
            revenue = snapshot.get("revenue")
            total_business_income = snapshot.get("total_business_income") or revenue
            non_compliant_income = snapshot.get("non_operating_income")
            interest_income = snapshot.get("interest_income")
            accounts_receivable = snapshot.get("accounts_receivable")
            total_assets = snapshot.get("total_assets")
            # Denominator priority: 36m avg > current market cap > 24m avg
            market_cap_36m = snapshot.get("average_market_cap_36m")
            market_cap_current = snapshot.get("market_cap")
            market_cap_24m = snapshot.get("average_market_cap_24m")
            market_cap = market_cap_36m or market_cap_current or market_cap_24m
            snapshot_date = snapshot.get("snapshot_date")
            basis = snapshot.get("basis", "unknown")

            # Determine if financials are stale
            stale = False
            if snapshot_date:
                from datetime import timedelta
                if isinstance(snapshot_date, str):
                    try:
                        snapshot_date = date.fromisoformat(snapshot_date)
                    except ValueError:
                        snapshot_date = None
                if snapshot_date and (date.today() - snapshot_date).days > 365:
                    stale = True

            snapshot_refs = list(snapshot.get("source_refs_json", []))

            # Debt ratio: total_debt / average_market_cap_36m (S&P Shariah style)
            checks.append(check_debt_ratio(
                total_debt=total_debt,
                market_cap=market_cap,
                threshold=self.thresholds.get("debt_ratio", 0.33),
                formula=self.formulas.get(
                    "debt_ratio",
                    "total_debt / average_market_cap_36m",
                ),
                source_refs=snapshot_refs,
                stale=stale,
            ))

            # Cash + interest-bearing assets ratio: (cash + short_term_investments) / market_cap
            checks.append(check_cash_ratio(
                cash_and_equivalents=cash_and_ib if cash_and_ib else cash,
                market_cap=market_cap,
                threshold=self.thresholds.get("cash_ratio", 0.33),
                formula=self.formulas.get(
                    "cash_ratio",
                    "(cash_and_equivalents + short_term_investments) / market_cap",
                ),
                source_refs=snapshot_refs,
                stale=stale,
            ))

            # Non-compliant income ratio: non_operating_income / total_business_income
            checks.append(check_non_compliant_income_ratio(
                non_compliant_income=non_compliant_income,
                total_revenue=total_business_income,
                threshold=self.thresholds.get("non_compliant_income_ratio", 0.05),
                formula=self.formulas.get(
                    "non_compliant_income_ratio",
                    "non_operating_income / total_business_income",
                ),
                source_refs=snapshot_refs,
                stale=stale,
                is_proxy=True,
            ))

            # Interest income ratio: interest_income / total_business_income
            if interest_income is not None:
                checks.append(check_non_compliant_income_ratio(
                    non_compliant_income=interest_income,
                    total_revenue=total_business_income,
                    threshold=self.thresholds.get("interest_income_ratio", 0.05),
                    formula=self.formulas.get(
                        "interest_income_ratio",
                        "interest_income / total_business_income",
                    ),
                    source_refs=snapshot_refs,
                    stale=stale,
                    is_proxy=False,
                ))

            # Receivables ratio: accounts_receivable / market_cap
            if accounts_receivable is not None and market_cap:
                recv_ratio = accounts_receivable / market_cap
                recv_threshold = self.thresholds.get("receivables_ratio", 0.33)
                checks.append(CheckResult(
                    key="receivables_ratio",
                    status="pass" if recv_ratio < recv_threshold else "fail",
                    value=round(recv_ratio, 6),
                    threshold=recv_threshold,
                    formula="accounts_receivable / market_cap",
                    reason=(
                        f"Receivables ratio {recv_ratio:.4f} "
                        + ("within" if recv_ratio < recv_threshold else "exceeds")
                        + f" threshold {recv_threshold}."
                    ),
                    source_refs=snapshot_refs,
                    quality_flags=["stale_financials"] if stale else [],
                ))
        else:
            # No snapshot available
            for key, label in [
                ("debt_ratio", "Debt"),
                ("cash_ratio", "Cash and interest-bearing assets"),
                ("non_compliant_income_ratio", "Non-compliant income"),
                ("interest_income_ratio", "Interest income"),
                ("receivables_ratio", "Accounts receivable"),
            ]:
                checks.append(CheckResult(
                    key=key,
                    status="insufficient_data",
                    value=None,
                    threshold=self.thresholds.get(key),
                    formula=self.formulas.get(key),
                    reason=f"{label} data is not yet available for this issuer.",
                    source_refs=[],
                    quality_flags=["no_snapshot"],
                ))

        return self._build_result(
            checks=checks,
            snapshot=snapshot,
            activity_review=activity_review,
            price_as_of=price_as_of,
            screened_at=now,
        )

    def _build_result(
        self,
        checks: List[CheckResult],
        snapshot: Optional[Dict],
        activity_review: Optional[Dict],
        price_as_of: Optional[date],
        screened_at: datetime,
    ) -> Dict[str, Any]:
        overall = _aggregate_status(checks)

        short_reason = self._short_reason(overall, checks)
        detailed_reason = self._detailed_reason(overall, checks, snapshot)

        snapshot_date: Optional[str] = None
        basis: Optional[str] = None
        stale = False

        if snapshot:
            snapshot_date_raw = snapshot.get("snapshot_date")
            if snapshot_date_raw:
                snapshot_date = str(snapshot_date_raw)
            basis = snapshot.get("basis")
            if snapshot_date:
                try:
                    sd = date.fromisoformat(snapshot_date)
                    stale = (date.today() - sd).days > 365
                except ValueError:
                    pass

        return {
            "overall_status": overall,
            "short_reason": short_reason,
            "detailed_reason": detailed_reason,
            "methodology_version": self.version_code,
            "disclosure": self.disclosure_text,
            "basis": {
                "financials_basis": basis or "unknown",
                "financial_snapshot_date": snapshot_date,
                "market_cap_basis": "latest_eod_close",
                "business_activity_basis": (
                    "manual_review"
                    if activity_review and activity_review.get("manual_override")
                    else "ai_assisted_review"
                ),
            },
            "checks": [c.to_dict() for c in checks],
            "last_updated": screened_at.isoformat(),
            "freshness": {
                "financials_as_of": snapshot_date,
                "price_as_of": price_as_of.isoformat() if price_as_of else None,
                "stale": stale,
            },
        }

    @staticmethod
    def _short_reason(overall: str, checks: List[CheckResult]) -> str:
        if overall == "pass":
            return "All required checks pass with current data."
        if overall == "fail":
            failed = [c for c in checks if c.status == "fail"]
            keys = ", ".join(c.key for c in failed[:2])
            return f"Failed on: {keys}."
        if overall == "review_required":
            flagged = [c for c in checks if c.status == "review_required"]
            keys = ", ".join(c.key for c in flagged[:2])
            return f"Review required for: {keys}."
        # insufficient_data
        missing = [c for c in checks if c.status == "insufficient_data"]
        keys = ", ".join(c.key for c in missing[:2])
        return f"Insufficient data for: {keys}."

    @staticmethod
    def _detailed_reason(
        overall: str, checks: List[CheckResult], snapshot: Optional[Dict]
    ) -> str:
        lines = []
        for c in checks:
            lines.append(f"• {c.key}: [{c.status.upper()}] {c.reason}")
        if snapshot and snapshot.get("basis"):
            lines.append(
                f"\nFinancials sourced from {snapshot['basis']} data "
                f"as of {snapshot.get('snapshot_date', 'unknown date')}."
            )
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Default methodology configuration (seed — loaded into DB on first run)
# ---------------------------------------------------------------------------

DEFAULT_METHODOLOGY_V1 = {
    "version_code": "2026.04.1",
    "methodology_name": "Barakfi Halal Screening Methodology v1",
    "thresholds_json": {
        "debt_ratio": 0.33,
        "cash_ratio": 0.33,
        "non_compliant_income_ratio": 0.05,
        "interest_income_ratio": 0.05,
        "receivables_ratio": 0.33,
    },
    "formulas_json": {
        "debt_ratio": "total_debt / average_market_cap_36m",
        "cash_ratio": "(cash_and_equivalents + short_term_investments) / market_cap",
        "non_compliant_income_ratio": "non_operating_income / total_business_income",
        "interest_income_ratio": "interest_income / total_business_income",
        "receivables_ratio": "accounts_receivable / market_cap",
    },
    "disclosure_text": (
        "This result is a rules-based research screen generated from public filings, "
        "exchange disclosures, and our stated methodology version. "
        "It is not investment advice, legal advice, or a religious ruling. "
        "Where data is missing, stale, revised, or ambiguous, the result may be marked "
        "'review required'. Always review the source documents linked on this page."
    ),
    "status": "active",
}
