"""
Shariah compliance screening engine.

Evaluates individual stocks against Islamic finance principles using rules
aligned with S&P Shariah Indices Methodology and AAOIFI standards, with
India-specific guidance from ICIF.

Core Functions:
- evaluate_stock(stock_dict, profile) -> screening result with status
- get_rulebook() -> active rules and profiles
- calculate_purification_ratio(stock_dict) -> dividend purification percentage

Profiles:
- india_strict: Default profile using S&P + AAOIFI thresholds

Status Values:
- HALAL: Passes all hard rules
- REQUIRES_REVIEW: Fails a soft rule or has missing data
- NON_COMPLIANT: Fails one or more hard rules
"""

PRIMARY_PROFILE = "india_strict"
PRIMARY_PROFILE_VERSION = "2026.04.1"

# ---------------------------------------------------------------------------
# Sector exclusions (hard rule)
# Companies in these industries are always non-compliant.
# ---------------------------------------------------------------------------
FORBIDDEN_KEYWORDS = {
    "ADULT",
    "ALCOHOL",
    "BANK",
    "BETTING",
    "CANNABIS",
    "CASINO",
    "CONVENTIONAL FINANCIAL",
    "CRYPTOCURRENCY EXCHANGE",
    "DEFENCE",
    "ENTERTAINMENT",
    "GAMBLING",
    "INSURANCE",
    "LENDING",
    "LIQUOR",
    "MEDIA",
    "MUSIC",
    "NIGHTCLUB",
    "PORK",
    "PORNOGRAPH",
    "TOBACCO",
    "VAPING",
    "WEAPON",
}

# ---------------------------------------------------------------------------
# Thresholds (aligned with S&P Shariah Indices Methodology & AAOIFI)
# ---------------------------------------------------------------------------
DEBT_TO_MARKET_CAP_THRESHOLD = 0.33       # < 33% of 36m avg market cap
DEBT_TO_CURRENT_MCAP_THRESHOLD = 0.33     # < 33% of current market cap
NON_PERMISSIBLE_INCOME_THRESHOLD = 0.05   # < 5% of total revenue
INTEREST_INCOME_THRESHOLD = 0.05          # < 5% of total revenue
RECEIVABLES_THRESHOLD = 0.33             # < 33% of market cap (S&P standard)
CASH_AND_INTEREST_BEARING_THRESHOLD = 0.33  # < 33% of total assets
FIXED_ASSETS_REVIEW_THRESHOLD = 0.25      # Soft flag if < 25%

RULEBOOK = {
    "code": PRIMARY_PROFILE,
    "label": "India Strict Profile (S&P + AAOIFI aligned)",
    "description": (
        "Strict Shariah screening profile aligned with S&P Shariah Indices "
        "Methodology and AAOIFI Financial Accounting Standards. Uses "
        "India-specific guidance from ICIF for receivables and fixed-assets."
    ),
    "hard_rules": [
        "Exclude prohibited business sectors and activities (banking, alcohol, tobacco, gambling, weapons, pork, adult entertainment, cannabis, conventional insurance, interest-based lending).",
        "Non-permissible income divided by total business income must be below 5%.",
        "Interest income divided by total business income must be below 5%.",
        "Debt divided by 36-month average market capitalisation must be below 33%.",
        "Debt divided by current market capitalisation must be below 33%.",
        "Accounts receivable divided by market capitalisation must be below 33%.",
        "Cash and interest-bearing securities divided by total assets must be below 33%.",
    ],
    "review_rules": [
        "Fixed-assets ratio below 25% triggers manual review (ICIF guidance).",
        "Stocks with missing or zero critical financial data are flagged for review rather than auto-approved.",
        "Dividend purification ratio is calculated for informational purposes.",
    ],
    "primary_sources": [
        {
            "name": "S&P Shariah Indices Methodology",
            "url": "https://www.spglobal.com/spdji/en/documents/methodologies/methodology-sp-shariah-indices.pdf",
            "notes": "Primary formal methodology anchor. Current edition observed February 2026.",
        },
        {
            "name": "AAOIFI Financial Accounting Standards",
            "url": "https://aaoifi.com/",
            "notes": "Global Shariah accounting standards for Islamic financial institutions.",
        },
        {
            "name": "Indian Centre for Islamic Finance (ICIF)",
            "url": "https://icif.org.in/icif-news-event.php?event=ei&id=151",
            "notes": "India-oriented receivables and fixed-assets references.",
        },
    ],
    "secondary_verification": [
        "Use the S&P methodology to validate core accounting and business activity screens.",
        "Use AAOIFI standards for cash and interest-bearing securities checks.",
        "Use ICIF guidance for India-specific fixed-asset review thresholds.",
        "Where sources are ambiguous, return REQUIRES_REVIEW instead of HALAL.",
    ],
}


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def _safe_ratio(numerator: float, denominator: float) -> float:
    """Divide two numbers safely; return 0.0 if denominator is zero or negative."""
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def get_rulebook() -> dict:
    """Get the active rulebook with all profiles and rule definitions."""
    return {"default_profile": PRIMARY_PROFILE, "profiles": [RULEBOOK]}


def get_profile_version(profile: str) -> str:
    """Get version identifier for a given profile code."""
    if profile == PRIMARY_PROFILE:
        return PRIMARY_PROFILE_VERSION
    raise ValueError(f"Unsupported profile: {profile}")


def calculate_purification_ratio(stock: dict) -> float | None:
    """
    Calculate the dividend purification ratio — the percentage of dividend
    income that must be donated to charity to purify earnings.

    Formula: non_permissible_income / total_business_income
    This is the same as the non-permissible income ratio.

    Returns None if data is insufficient.
    """
    total_income = stock.get("total_business_income", 0)
    non_permissible = stock.get("non_permissible_income", 0)
    if total_income <= 0:
        return None
    ratio = non_permissible / total_income
    return round(ratio * 100, 2)  # Return as percentage


# ============================================================================
# SCREENING ENGINE
# ============================================================================

def evaluate_stock(stock: dict, profile: str = PRIMARY_PROFILE) -> dict:
    """
    Evaluate a stock's Shariah compliance against a rulebook profile.

    Applies hard rules (automatic fail) and review rules (flag for manual).
    Aligned with S&P Shariah Indices Methodology and AAOIFI standards.

    Hard Rules (NON_COMPLIANT if any fail):
    1. Sector exclusion (alcohol, gambling, tobacco, banking, etc.)
    2. Non-permissible income >= 5% of total business income
    3. Interest income >= 5% of total business income
    4. Debt >= 33% of 36-month average market cap
    5. Debt >= 33% of current market cap
    6. Accounts receivable >= 33% of market cap
    7. Cash + interest-bearing securities >= 33% of total assets

    Review Rules (REQUIRES_REVIEW):
    - Fixed-assets ratio < 25% (ICIF guidance)
    - Missing or zero critical financial fields
    """
    if profile != PRIMARY_PROFILE:
        raise ValueError(f"Unsupported profile: {profile}")

    sector = stock["sector"].upper()

    # --- Calculate all ratios ---
    debt_to_market_cap = _safe_ratio(stock["debt"], stock["market_cap"])
    debt_to_36m_avg = _safe_ratio(stock["debt"], stock["average_market_cap_36m"])
    interest_income_ratio = _safe_ratio(
        stock["interest_income"], stock["total_business_income"]
    )
    non_permissible_ratio = _safe_ratio(
        stock["non_permissible_income"], stock["total_business_income"]
    )
    receivables_to_mcap = _safe_ratio(
        stock["accounts_receivable"], stock["market_cap"]
    )

    # Cash + interest-bearing securities check
    cash = stock.get("cash_and_equivalents", 0) or 0
    short_term_investments = stock.get("short_term_investments", 0) or 0
    cash_and_interest_bearing = cash + short_term_investments
    cash_to_assets = _safe_ratio(cash_and_interest_bearing, stock["total_assets"])

    # Fixed assets ratio
    fixed_assets_ratio = None
    if stock["total_assets"] > 0:
        fixed_assets_ratio = _safe_ratio(stock["fixed_assets"], stock["total_assets"])

    # Purification ratio
    purification_pct = calculate_purification_ratio(stock)

    # --- Sector check ---
    sector_allowed = not any(keyword in sector for keyword in FORBIDDEN_KEYWORDS)

    reasons = []
    manual_review_flags = []

    # --- Hard rules ---
    if not sector_allowed:
        reasons.append("Business sector is non-compliant (prohibited activity).")

    if debt_to_36m_avg >= DEBT_TO_MARKET_CAP_THRESHOLD:
        reasons.append(
            f"Debt is {debt_to_36m_avg:.1%} of 36-month avg market cap (limit: <{DEBT_TO_MARKET_CAP_THRESHOLD:.0%})."
        )

    if debt_to_market_cap >= DEBT_TO_CURRENT_MCAP_THRESHOLD:
        reasons.append(
            f"Debt is {debt_to_market_cap:.1%} of current market cap (limit: <{DEBT_TO_CURRENT_MCAP_THRESHOLD:.0%})."
        )

    if non_permissible_ratio >= NON_PERMISSIBLE_INCOME_THRESHOLD:
        reasons.append(
            f"Non-permissible income is {non_permissible_ratio:.1%} of revenue (limit: <{NON_PERMISSIBLE_INCOME_THRESHOLD:.0%})."
        )

    if interest_income_ratio >= INTEREST_INCOME_THRESHOLD:
        reasons.append(
            f"Interest income is {interest_income_ratio:.1%} of revenue (limit: <{INTEREST_INCOME_THRESHOLD:.0%})."
        )

    if receivables_to_mcap >= RECEIVABLES_THRESHOLD:
        reasons.append(
            f"Receivables are {receivables_to_mcap:.1%} of market cap (limit: <{RECEIVABLES_THRESHOLD:.0%})."
        )

    if cash_to_assets >= CASH_AND_INTEREST_BEARING_THRESHOLD:
        reasons.append(
            f"Cash & interest-bearing securities are {cash_to_assets:.1%} of total assets (limit: <{CASH_AND_INTEREST_BEARING_THRESHOLD:.0%})."
        )

    # --- Soft rules (manual review flags) ---

    # Missing critical data → flag for review instead of auto-approving
    critical_fields = ["market_cap", "debt", "total_business_income", "total_assets"]
    missing_fields = [f for f in critical_fields if stock.get(f, 0) <= 0]
    if missing_fields:
        manual_review_flags.append(
            f"Missing or zero data for: {', '.join(missing_fields)}. Cannot reliably screen."
        )

    # Fixed assets ratio check
    if stock["fixed_assets"] <= 0 or stock["total_assets"] <= 0:
        manual_review_flags.append(
            "Fixed-asset data unavailable — manual review recommended."
        )
    elif fixed_assets_ratio is not None and fixed_assets_ratio < FIXED_ASSETS_REVIEW_THRESHOLD:
        manual_review_flags.append(
            f"Fixed-assets ratio is {fixed_assets_ratio:.1%} (below {FIXED_ASSETS_REVIEW_THRESHOLD:.0%} guidance threshold). Manual review recommended."
        )

    # --- Determine status ---
    if reasons:
        status = "NON_COMPLIANT"
    elif manual_review_flags:
        status = "REQUIRES_REVIEW"
    else:
        status = "HALAL"
        reasons.append("Passed all automated screening rules.")

    return {
        "profile": profile,
        "status": status,
        "reasons": reasons,
        "manual_review_flags": manual_review_flags,
        "purification_ratio_pct": purification_pct,
        "breakdown": {
            "debt_to_market_cap_ratio": round(debt_to_market_cap, 4),
            "debt_to_36m_avg_market_cap_ratio": round(debt_to_36m_avg, 4),
            "interest_income_ratio": round(interest_income_ratio, 4),
            "non_permissible_income_ratio": round(non_permissible_ratio, 4),
            "receivables_to_market_cap_ratio": round(receivables_to_mcap, 4),
            "cash_and_interest_bearing_to_assets_ratio": round(cash_to_assets, 4),
            "fixed_assets_to_total_assets_ratio": (
                round(fixed_assets_ratio, 4) if fixed_assets_ratio is not None else None
            ),
            "sector_allowed": sector_allowed,
        },
    }
