"""
Shariah compliance screening engine.

Evaluates individual stocks against Islamic finance principles using four
internationally recognised methodologies:

1. S&P Shariah Indices Methodology (Dow Jones Islamic Market Index)
2. AAOIFI Financial Accounting Standards
3. FTSE/Maxis (Yasaar) Shariah Index Series
4. Khatkhatay Independent Norms (Harvard 2006)

The fourth methodology is based on the academic paper "Shariah Compliant
Equity Investments: An Assessment of Current Screening Norms" by M.H.
Khatkhatay, presented at the Seventh Harvard University Forum on Islamic
Finance (2006). It proposes stricter thresholds grounded in empirical
analysis of BSE-500 data and argues for using total assets (not market
capitalisation) as the denominator for all financial ratios.

Core Functions:
- evaluate_stock(stock_dict, profile) -> screening result with status + screening_score
- evaluate_stock_multi(stock_dict) -> consensus + per-methodology scores
- get_simple_result(stock_dict) -> {status, score, summary} product language (wraps multi)
- get_rulebook() -> active rules and profiles
- calculate_purification_ratio(stock_dict) -> dividend purification percentage

Status Values (API / engine):
- HALAL: Meets all screening criteria under the given methodology
- CAUTIOUS: Passes core criteria but has flags that need attention
- NON_COMPLIANT: Fails one or more screening criteria

Product UI labels: HALAL → Halal, CAUTIOUS → Doubtful, NON_COMPLIANT → Haram.
"""

PRIMARY_PROFILE = "sp_shariah"
PRIMARY_PROFILE_VERSION = "2026.04.2"

SCREENING_DISCLAIMER = (
    "Screening results are based on automated financial ratio analysis using "
    "publicly available data. They do not constitute a fatwa or religious ruling. "
    "Consult a qualified Shariah scholar for definitive investment guidance."
)

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
# Methodology Profiles
# ---------------------------------------------------------------------------
PROFILES = {
    "sp_shariah": {
        "code": "sp_shariah",
        "label": "S&P Shariah Indices",
        "short": "S&P",
        "description": (
            "S&P Dow Jones Shariah Indices methodology (DJIMI). Uses trailing "
            "twelve-month average market capitalisation as the denominator for "
            "debt and receivables ratios. Threshold of 33% for debt, receivables, "
            "and cash ratios; 5% for income screens."
        ),
        "thresholds": {
            "debt_ratio": 0.33,
            "non_permissible_income": 0.05,
            "interest_income": 0.05,
            "receivables_ratio": 0.33,
            "cash_ib_ratio": 0.33,
        },
        "denominators": {
            "debt": "market_cap_36m",
            "debt_current": "market_cap",
            "receivables": "market_cap",
            "cash_ib": "total_assets",
        },
    },
    "aaoifi": {
        "code": "aaoifi",
        "label": "AAOIFI Standards",
        "short": "AAOIFI",
        "description": (
            "Accounting and Auditing Organisation for Islamic Financial "
            "Institutions. Uses total assets as the denominator for all ratios. "
            "Stricter debt limit at 30% and cash/IB at 30%."
        ),
        "thresholds": {
            "debt_ratio": 0.30,
            "non_permissible_income": 0.05,
            "interest_income": 0.05,
            "receivables_ratio": 0.49,
            "cash_ib_ratio": 0.30,
        },
        "denominators": {
            "debt": "total_assets",
            "debt_current": "total_assets",
            "receivables": "total_assets",
            "cash_ib": "total_assets",
        },
    },
    "ftse_maxis": {
        "code": "ftse_maxis",
        "label": "FTSE Yasaar (Maxis)",
        "short": "FTSE",
        "description": (
            "FTSE Shariah Index Series methodology (Yasaar/Maxis). Uses total "
            "assets as the denominator. Higher receivables tolerance at 50%."
        ),
        "thresholds": {
            "debt_ratio": 0.33,
            "non_permissible_income": 0.05,
            "interest_income": 0.05,
            "receivables_ratio": 0.50,
            "cash_ib_ratio": 0.33,
        },
        "denominators": {
            "debt": "total_assets",
            "debt_current": "total_assets",
            "receivables": "total_assets",
            "cash_ib": "total_assets",
        },
    },
    "khatkhatay": {
        "code": "khatkhatay",
        "label": "Khatkhatay Independent Norms",
        "short": "Independent",
        "description": (
            "Independent screening norms proposed by Khatkhatay & Nisar "
            "(Harvard University Forum on Islamic Finance, 2006). Uses total "
            "assets as the denominator for all ratios. Stricter thresholds: "
            "debt < 25% of total assets, interest income < 3% of revenue, "
            "interest-bearing assets < 10% of total assets. The receivables "
            "screen is effectively removed as the paper demonstrates it is "
            "academically unsound — share price is not connected to the "
            "par value of receivables."
        ),
        "thresholds": {
            "debt_ratio": 0.25,
            "non_permissible_income": 0.05,
            "interest_income": 0.03,
            "receivables_ratio": 1.0,
            "cash_ib_ratio": 0.10,
        },
        "denominators": {
            "debt": "total_assets",
            "debt_current": "total_assets",
            "receivables": "total_assets",
            "cash_ib": "total_assets",
        },
    },
}

ALL_PROFILE_CODES = list(PROFILES.keys())

FIXED_ASSETS_REVIEW_THRESHOLD = 0.25

SCORE_START = 100
SCORE_DEBT_BREACH = 30
SCORE_INCOME_BREACH = 30
SCORE_OTHER_ISSUE = 10

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def _safe_ratio(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def _get_denominator_value(stock: dict, denom_key: str) -> float:
    mapping = {
        "market_cap_36m": stock.get("average_market_cap_36m", 0) or 0,
        "market_cap": stock.get("market_cap", 0) or 0,
        "total_assets": stock.get("total_assets", 0) or 0,
    }
    return mapping.get(denom_key, 0)


def get_rulebook() -> dict:
    # NOTE: `/api/rulebook` is intentionally conservative. Tests and older clients
    # expect exactly one "default profile" entry. Multi-methodology details are
    # exposed through `/api/screen/{symbol}/multi` and the methodology pages.
    code = PRIMARY_PROFILE
    p = PROFILES.get(code, PROFILES["sp_shariah"])
    default_profile = "india_strict" if code == "sp_shariah" else code
    profile = {
        "code": default_profile,
        "label": p["label"],
        "description": p["description"],
        "hard_rules": [
            "Sector exclusions",
            "Debt cap",
            "Non-permissible income cap",
            "Interest income cap",
            "Receivables cap",
            "Cash & interest-bearing securities cap",
        ],
        "review_rules": [
            "Data gaps or accounting classification ambiguity",
            "Low fixed-assets ratio guidance check (where applicable)",
        ],
        "primary_sources": [
            {"name": "Methodology overview", "url": "https://barakfi.in/methodology", "notes": "Summary of screening approaches and ratios used in Barakfi."}
        ],
        "secondary_verification": [
            "Cross-check with a qualified Shariah scholar before making religious claims",
            "Use multiple methodologies for triangulation",
        ],
    }
    return {"default_profile": default_profile, "profiles": [profile]}


def get_profile_version(profile: str) -> str:
    if profile in PROFILES:
        return PRIMARY_PROFILE_VERSION
    raise ValueError(f"Unsupported profile: {profile}")


def calculate_purification_ratio(stock: dict) -> float | None:
    total_income = stock.get("total_business_income", 0)
    non_permissible = stock.get("non_permissible_income", 0)
    if total_income <= 0:
        return None
    ratio = non_permissible / total_income
    return round(ratio * 100, 2)


def _reason_is_success_line(reason: str) -> bool:
    return "Meets all screening criteria" in reason


def screening_score_from_evaluation(result: dict) -> int:
    """
    0–100 from one evaluate_stock() result: start 100; −30 debt (once); −30 income
    breaches (once); −10 per other hard reason and each manual_review_flag.
    """
    reasons = list(result.get("reasons") or [])
    flags = list(result.get("manual_review_flags") or [])

    debt_hit = False
    income_hit = False
    other_hits = 0

    for r in reasons:
        if _reason_is_success_line(r):
            continue
        s = r.strip()
        if s.startswith("Debt is"):
            debt_hit = True
        elif s.startswith("Non-permissible income") or s.startswith("Interest income"):
            income_hit = True
        else:
            other_hits += 1

    other_hits += len(flags)

    score = SCORE_START
    if debt_hit:
        score -= SCORE_DEBT_BREACH
    if income_hit:
        score -= SCORE_INCOME_BREACH
    score -= SCORE_OTHER_ISSUE * other_hits
    return max(0, min(100, score))


def screening_score_for_manual_override(status: str) -> int:
    if status == "HALAL":
        return 100
    if status == "NON_COMPLIANT":
        return 0
    return 50


def calculate_compliance_rating(breakdown: dict, status: str) -> int:
    """
    1–5 compliance rating from ratio headroom vs thresholds.
    5 = strong headroom, 1 = non-compliant status.
    """
    if status == "NON_COMPLIANT":
        return 1

    ratios = [
        (breakdown.get("debt_ratio_value", 0), breakdown.get("debt_ratio_threshold", 0.33)),
        (breakdown.get("non_permissible_income_ratio", 0), 0.05),
        (breakdown.get("interest_income_ratio", 0), 0.05),
        (breakdown.get("receivables_ratio_value", 0), breakdown.get("receivables_ratio_threshold", 0.33)),
        (breakdown.get("cash_and_interest_bearing_to_assets_ratio", 0), breakdown.get("cash_ib_ratio_threshold", 0.33)),
    ]

    if status == "CAUTIOUS":
        max_pct = max((v / t if t > 0 else 0) for v, t in ratios)
        return 3 if max_pct < 0.7 else 2

    max_pct = max((v / t if t > 0 else 0) for v, t in ratios)
    avg_pct = sum(v / t if t > 0 else 0 for v, t in ratios) / len(ratios) if ratios else 0

    if max_pct < 0.3 and avg_pct < 0.2:
        return 5
    if max_pct < 0.5 and avg_pct < 0.35:
        return 5
    if max_pct < 0.7:
        return 4
    return 3


def _shorten_reason(text: str, max_len: int = 130) -> str:
    text = text.strip()
    if len(text) <= max_len:
        return text
    cut = text[: max_len - 1].rsplit(" ", 1)[0]
    return cut + "…"


def build_confidence_bullets(
    status: str,
    breakdown: dict,
    reasons: list[str],
    manual_review_flags: list[str],
) -> list[dict[str, str]]:
    """
    Human-readable lines (2–3) explaining the screening outcome.
    Each item: {"tone": "success"|"warning"|"error", "text": "..."} for UI icons.
    """
    joined_reasons = " ".join(reasons)
    if "Manual compliance override" in joined_reasons:
        tone = {"HALAL": "success", "CAUTIOUS": "warning", "NON_COMPLIANT": "error"}.get(
            status, "warning"
        )
        bullets: list[dict[str, str]] = [
            {"tone": tone, "text": "Final status follows an approved manual compliance decision."},
            {"tone": "warning", "text": "Read the reviewer notes in the reasons list for full context."},
        ]
        if status == "HALAL":
            bullets.insert(
                0,
                {
                    "tone": "success",
                    "text": "Automated ratios below are kept for transparency alongside the override.",
                },
            )
        return bullets[:3]

    if status == "NON_COMPLIANT":
        return _confidence_bullets_non_compliant(reasons)
    if status == "CAUTIOUS":
        return _confidence_bullets_cautious(breakdown, manual_review_flags)
    return _confidence_bullets_halal(breakdown)


def _confidence_bullets_non_compliant(reasons: list[str]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for reason in reasons:
        r = reason.lower()
        key: str | None = None
        text: str | None = None
        if "sector" in r and ("non-compliant" in r or "prohibited" in r or "business" in r):
            key, text = "sector", "Business falls in a sector our rules treat as non-permissible."
        elif r.startswith("debt") or "debt is" in r:
            key, text = "debt", "Debt is too high compared with the screening benchmark."
        elif "non-permissible" in r:
            key, text = "npi", "Non-halal income is larger than the small amount Islamic screens usually allow."
        elif "interest income" in r:
            key, text = "int", "Interest-based income exceeds the permitted ceiling."
        elif "receivables" in r:
            key, text = "recv", "Receivables are above the allowed limit versus assets or market value."
        elif "cash" in r and "interest-bearing" in r:
            key, text = "cash", "Cash and interest-bearing investments exceed the permitted share of the balance sheet."
        else:
            key = f"other:{reason[:40]}"
            text = _shorten_reason(reason)
        if key is None or text is None or key in seen:
            continue
        seen.add(key)
        out.append({"tone": "error", "text": text})
        if len(out) >= 3:
            break
    if not out:
        out.append(
            {
                "tone": "error",
                "text": "One or more core Shariah checks did not pass for this company.",
            }
        )
    # Product/tests expect 2–3 lines for consistent UI; pad when only one hard rule fired.
    if len(out) < 2:
        out.append(
            {
                "tone": "error",
                "text": "Review the ratio breakdown and methodology notes below for full context.",
            }
        )
    return out[:3]


def _confidence_bullets_cautious(breakdown: dict, flags: list[str]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    joined = " ".join(flags).lower()
    if "missing" in joined or "zero data" in joined:
        out.append(
            {
                "tone": "warning",
                "text": "Some key financial numbers are missing or zero, so we cannot fully confirm the screen.",
            }
        )
    if "fixed-asset" in joined or "fixed assets" in joined:
        out.append(
            {
                "tone": "warning",
                "text": "Very few hard assets are reported, which often leads to extra scholar review.",
            }
        )
    if not out:
        out.append(
            {
                "tone": "warning",
                "text": "Hard rules passed, but review flags mean we label this cautious, not fully verified.",
            }
        )
    if breakdown.get("sector_allowed", True):
        out.append(
            {
                "tone": "success",
                "text": "Sector screening did not hit an automatic exclusion on this run.",
            }
        )
    if len(out) < 3:
        out.append(
            {
                "tone": "warning",
                "text": "Compare the ratios below with a qualified advisor before sizing a position.",
            }
        )
    return out[:3]


def _confidence_bullets_halal(breakdown: dict) -> list[dict[str, str]]:
    bullets: list[dict[str, str]] = []
    if breakdown.get("sector_allowed", True):
        bullets.append(
            {"tone": "success", "text": "Passed the sector and business-line screen."}
        )

    dr = float(breakdown.get("debt_ratio_value") or 0)
    dt = float(breakdown.get("debt_ratio_threshold") or 0.33)
    if dt > 0:
        if dr <= dt * 0.6:
            bullets.append(
                {"tone": "success", "text": "Debt is comfortably inside the allowed limit."}
            )
        elif dr <= dt:
            bullets.append(
                {"tone": "success", "text": "Debt is within acceptable limits for this methodology."}
            )
        else:
            bullets.append(
                {
                    "tone": "success",
                    "text": "Debt meets this profile’s automated rule (check the methodology tab for nuance).",
                }
            )

    npi = float(breakdown.get("non_permissible_income_ratio") or 0)
    intr = float(breakdown.get("interest_income_ratio") or 0)
    if npi <= 0.025 and intr <= 0.025:
        bullets.append(
            {
                "tone": "success",
                "text": "Non-halal and interest-linked income are both very small versus revenue.",
            }
        )
    elif npi <= 0.05:
        bullets.append(
            {
                "tone": "success",
                "text": "Non-permissible income stays under the usual screening cap.",
            }
        )
    else:
        bullets.append(
            {
                "tone": "success",
                "text": "Income purity checks did not trigger a hard fail on this run.",
            }
        )

    if len(bullets) > 3:
        return bullets[:3]

    recv = float(breakdown.get("receivables_ratio_value") or 0)
    rt = float(breakdown.get("receivables_ratio_threshold") or 0.33)
    if len(bullets) < 3 and rt > 0 and recv <= rt:
        bullets.append(
            {
                "tone": "success",
                "text": "Receivables look reasonable against the benchmark.",
            }
        )
    cash = float(breakdown.get("cash_and_interest_bearing_to_assets_ratio") or 0)
    cit = float(breakdown.get("cash_ib_ratio_threshold") or 0.33)
    if len(bullets) < 3 and cit > 0 and cash <= cit:
        bullets.append(
            {
                "tone": "success",
                "text": "Cash and interest-bearing balances sit below the asset-based ceiling.",
            }
        )
    while len(bullets) < 3:
        bullets.append(
            {
                "tone": "success",
                "text": "Overall, the automated checks did not flag a hard breach.",
            }
        )
    return bullets[:3]


def build_consensus_confidence_bullets(payload: dict) -> list[dict[str, str]]:
    """Short explanation for multi-methodology consensus (2–3 bullets)."""
    consensus = payload["consensus_status"]
    summ = payload["summary"]
    halal_count = summ["halal_count"]
    cautious_count = summ["cautious_count"]
    non_compliant_count = summ["non_compliant_count"]
    total = summ["total"]

    if consensus == "HALAL" and halal_count == total:
        return [
            {
                "tone": "success",
                "text": "All three methodologies return halal on the same automated rules.",
            },
            {
                "tone": "success",
                "text": "No methodology raised a hard-rule breach in this combined view.",
            },
            {
                "tone": "success",
                "text": "You should still confirm sector fit and personal guidance before investing.",
            },
        ]
    if consensus == "HALAL":
        bullets = [
            {
                "tone": "success",
                "text": f"{halal_count} of {total} methodologies give a halal outcome on this data.",
            },
            {
                "tone": "warning",
                "text": "Standards disagree in places — open each methodology card to see what moved.",
            },
        ]
        if cautious_count:
            bullets.append(
                {
                    "tone": "warning",
                    "text": "At least one methodology stayed cautious because of data gaps or borderline ratios.",
                }
            )
        else:
            bullets.append(
                {
                    "tone": "warning",
                    "text": "One methodology may use stricter denominators or limits than the others.",
                }
            )
        return bullets[:3]
    if consensus == "NON_COMPLIANT":
        bullets = [
            {
                "tone": "error",
                "text": f"{non_compliant_count} of {total} methodologies fail at least one hard rule.",
            },
            {
                "tone": "error",
                "text": "When several standards agree on a fail, debt, income purity, or sector usually drive it.",
            },
        ]
        if halal_count:
            bullets.append(
                {
                    "tone": "warning",
                    "text": "One view may still pass — read each tab before treating the name as cleared.",
                }
            )
        else:
            bullets.append(
                {
                    "tone": "error",
                    "text": "Treat this as non-compliant until the failing checks are resolved or reviewed.",
                }
            )
        return bullets[:3]

    # CAUTIOUS consensus
    bullets = [
        {
            "tone": "warning",
            "text": "No confident halal majority: mixed compliance across methodologies on this screen.",
        },
        {
            "tone": "warning",
            "text": "This often happens when data is thin or financial ratios sit right on the edge.",
        },
    ]
    if halal_count >= 1:
        bullets.append(
            {
                "tone": "success",
                "text": f"{halal_count} methodology view(s) still look acceptable on paper — pair with manual review.",
            }
        )
    else:
        bullets.append(
            {
                "tone": "warning",
                "text": "Prioritise better fundamentals or scholar review before taking a position.",
            }
        )
    return bullets[:3]


# ============================================================================
# SCREENING ENGINE
# ============================================================================

def evaluate_stock(stock: dict, profile: str = PRIMARY_PROFILE) -> dict:
    """
    Evaluate a stock against a specific Shariah screening methodology.

    Hard Rules (NON_COMPLIANT if any fail):
    1. Sector exclusion (prohibited business activities)
    2. Non-permissible income exceeds threshold
    3. Interest income exceeds threshold
    4. Debt exceeds threshold (using profile-specific denominator)
    5. Debt (current) exceeds threshold
    6. Receivables exceed threshold
    7. Cash + interest-bearing securities exceed threshold

    Soft Rules (CAUTIOUS):
    - Fixed-assets ratio below 25% guidance
    - Missing or zero critical financial fields
    """
    if profile == "india_strict":
        profile = "sp_shariah"

    if profile not in PROFILES:
        raise ValueError(f"Unsupported profile: {profile}")

    p = PROFILES[profile]
    t = p["thresholds"]
    d = p["denominators"]

    sector = stock["sector"].upper()

    debt_denom = _get_denominator_value(stock, d["debt"])
    debt_current_denom = _get_denominator_value(stock, d["debt_current"])
    recv_denom = _get_denominator_value(stock, d["receivables"])
    cash_denom = _get_denominator_value(stock, d["cash_ib"])

    debt_ratio = _safe_ratio(stock["debt"], debt_denom)
    debt_current_ratio = _safe_ratio(stock["debt"], debt_current_denom)
    interest_income_ratio = _safe_ratio(
        stock["interest_income"], stock["total_business_income"]
    )
    non_permissible_ratio = _safe_ratio(
        stock["non_permissible_income"], stock["total_business_income"]
    )
    receivables_ratio = _safe_ratio(stock["accounts_receivable"], recv_denom)

    cash = stock.get("cash_and_equivalents", 0) or 0
    short_term_investments = stock.get("short_term_investments", 0) or 0
    cash_and_interest_bearing = cash + short_term_investments
    cash_to_assets = _safe_ratio(cash_and_interest_bearing, cash_denom)

    fixed_assets_ratio = None
    if stock["total_assets"] > 0:
        fixed_assets_ratio = _safe_ratio(stock["fixed_assets"], stock["total_assets"])

    purification_pct = calculate_purification_ratio(stock)

    sector_allowed = not any(keyword in sector for keyword in FORBIDDEN_KEYWORDS)

    reasons = []
    manual_review_flags = []

    # --- Hard rules ---
    if not sector_allowed:
        reasons.append(
            f"Business sector involves prohibited activities under {p['short']} screening criteria."
        )

    debt_label = "36m avg market cap" if d["debt"] == "market_cap_36m" else (
        "market cap" if d["debt"] == "market_cap" else "total assets"
    )
    if debt_ratio >= t["debt_ratio"]:
        reasons.append(
            f"Debt is {debt_ratio:.1%} of {debt_label}, exceeding the {t['debt_ratio']:.0%} threshold set by {p['short']}."
        )

    debt_cur_label = "market cap" if d["debt_current"] == "market_cap" else "total assets"
    if debt_current_ratio >= t["debt_ratio"]:
        reasons.append(
            f"Debt is {debt_current_ratio:.1%} of current {debt_cur_label}, exceeding the {t['debt_ratio']:.0%} threshold."
        )

    if non_permissible_ratio >= t["non_permissible_income"]:
        reasons.append(
            f"Non-permissible income is {non_permissible_ratio:.1%} of revenue, exceeding the {t['non_permissible_income']:.0%} limit under {p['short']}."
        )

    if interest_income_ratio >= t["interest_income"]:
        reasons.append(
            f"Interest income is {interest_income_ratio:.1%} of revenue, exceeding the {t['interest_income']:.0%} limit under {p['short']}."
        )

    recv_label = "market cap" if d["receivables"] == "market_cap" else "total assets"
    if receivables_ratio >= t["receivables_ratio"]:
        reasons.append(
            f"Receivables are {receivables_ratio:.1%} of {recv_label}, exceeding the {t['receivables_ratio']:.0%} threshold under {p['short']}."
        )

    if cash_to_assets >= t["cash_ib_ratio"]:
        reasons.append(
            f"Cash & interest-bearing securities are {cash_to_assets:.1%} of total assets, exceeding the {t['cash_ib_ratio']:.0%} limit under {p['short']}."
        )

    # --- Soft rules ---
    critical_fields = ["market_cap", "debt", "total_business_income", "total_assets"]
    missing_fields = [f for f in critical_fields if stock.get(f, 0) <= 0]
    if missing_fields:
        manual_review_flags.append(
            f"Missing or zero data for: {', '.join(missing_fields)}. Cannot reliably screen."
        )

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
        status = "CAUTIOUS"
    else:
        status = "HALAL"
        reasons.append(
            f"Meets all screening criteria under {p['label']} methodology."
        )

    screening_score = screening_score_from_evaluation(
        {"reasons": reasons, "manual_review_flags": manual_review_flags}
    )

    bd = {
        "debt_to_market_cap_ratio": round(_safe_ratio(stock["debt"], stock.get("market_cap", 0) or 0), 4),
        "debt_to_36m_avg_market_cap_ratio": round(_safe_ratio(stock["debt"], stock.get("average_market_cap_36m", 0) or 0), 4),
        "interest_income_ratio": round(interest_income_ratio, 4),
        "non_permissible_income_ratio": round(non_permissible_ratio, 4),
        "receivables_to_market_cap_ratio": round(_safe_ratio(stock["accounts_receivable"], stock.get("market_cap", 0) or 0), 4),
        "cash_and_interest_bearing_to_assets_ratio": round(cash_to_assets, 4),
        "fixed_assets_to_total_assets_ratio": (
            round(fixed_assets_ratio, 4) if fixed_assets_ratio is not None else None
        ),
        "sector_allowed": sector_allowed,
        "debt_ratio_value": round(debt_ratio, 4),
        "debt_ratio_threshold": t["debt_ratio"],
        "receivables_ratio_value": round(receivables_ratio, 4),
        "receivables_ratio_threshold": t["receivables_ratio"],
        "cash_ib_ratio_threshold": t["cash_ib_ratio"],
    }
    rating_input = {
        "debt_ratio_value": debt_ratio,
        "debt_ratio_threshold": t["debt_ratio"],
        "non_permissible_income_ratio": non_permissible_ratio,
        "interest_income_ratio": interest_income_ratio,
        "receivables_ratio_value": receivables_ratio,
        "receivables_ratio_threshold": t["receivables_ratio"],
        "cash_and_interest_bearing_to_assets_ratio": cash_to_assets,
        "cash_ib_ratio_threshold": t["cash_ib_ratio"],
    }
    return {
        "profile": profile,
        "status": status,
        "methodology_label": p["label"],
        "reasons": reasons,
        "manual_review_flags": manual_review_flags,
        "screening_score": screening_score,
        "purification_ratio_pct": purification_pct,
        "disclaimer": SCREENING_DISCLAIMER,
        "breakdown": bd,
        "compliance_rating": calculate_compliance_rating(rating_input, status),
        "confidence_bullets": build_confidence_bullets(status, bd, reasons, manual_review_flags),
    }


def evaluate_stock_multi(stock: dict) -> dict:
    """
    Evaluate a stock against all four methodologies and return a combined result.

    Consensus rule (majority of 4):
    - HALAL if 3+ methodologies pass
    - NON_COMPLIANT if 3+ methodologies fail
    - Otherwise uses 2+ threshold with NON_COMPLIANT taking precedence over ties
    """
    results = {}
    for code in ALL_PROFILE_CODES:
        results[code] = evaluate_stock(stock, code)

    statuses = [r["status"] for r in results.values()]
    halal_count = statuses.count("HALAL")
    fail_count = statuses.count("NON_COMPLIANT")

    if halal_count >= 3:
        consensus = "HALAL"
    elif fail_count >= 3:
        consensus = "NON_COMPLIANT"
    elif halal_count >= 2:
        consensus = "HALAL"
    elif fail_count >= 2:
        consensus = "NON_COMPLIANT"
    else:
        consensus = "CAUTIOUS"

    per_method_scores = [r["screening_score"] for r in results.values()]
    if consensus == "CAUTIOUS":
        consensus_score = int(round(sum(per_method_scores) / len(per_method_scores)))
    else:
        consensus_score = min(per_method_scores)

    payload = {
        "consensus_status": consensus,
        "screening_score": max(0, min(100, consensus_score)),
        "methodologies": results,
        "disclaimer": SCREENING_DISCLAIMER,
        "summary": {
            "halal_count": halal_count,
            "cautious_count": statuses.count("CAUTIOUS"),
            "non_compliant_count": fail_count,
            "total": len(ALL_PROFILE_CODES),
        },
    }
    payload["confidence_bullets"] = build_consensus_confidence_bullets(payload)
    return payload


def _simple_summary_from_multi(multi: dict) -> str:
    """One-line product summary from evaluate_stock_multi output."""
    consensus = multi["consensus_status"]
    tallies = multi["summary"]
    halal_count = tallies["halal_count"]
    cautious_count = tallies["cautious_count"]
    fail_count = tallies["non_compliant_count"]
    total = tallies["total"] or len(ALL_PROFILE_CODES)

    if consensus == "HALAL":
        return (
            "Consensus pass across four Shariah methodologies — low structural risk "
            "on debt, income purity, and sector rules in our automated screen."
        )
    if consensus == "NON_COMPLIANT":
        return (
            "Consensus fail: sector exclusion or financial ratios exceed Shariah "
            "thresholds on a majority of methodologies."
        )
    return (
        f"{halal_count} of {total} methodologies pass; {cautious_count} need review and "
        f"{fail_count} fail — verify with a scholar before investing."
    )


def get_simple_result(stock: dict) -> dict:
    """
    Product wrapper over evaluate_stock_multi — no engine changes.

    Returns:
        status: "Halal" | "Doubtful" | "Haram"
        score: 0–100 (consensus methodology score)
        summary: one line
    """
    multi = evaluate_stock_multi(stock)
    consensus = multi["consensus_status"]
    score = int(multi["screening_score"])

    if consensus == "HALAL":
        status = "Halal"
    elif consensus == "NON_COMPLIANT":
        status = "Haram"
    else:
        status = "Doubtful"

    return {
        "status": status,
        "score": max(0, min(100, score)),
        "summary": _simple_summary_from_multi(multi),
    }


def stock_check_details_available(stock: dict) -> bool:
    return (
        (stock.get("market_cap") or 0) > 0
        and (stock.get("total_business_income") or 0) > 0
        and (stock.get("total_assets") or 0) > 0
    )


def build_stock_check_payload(name: str, stock: dict, multi: dict) -> dict:
    """GET /api/check-stock response body (uses precomputed multi — single engine run)."""
    consensus = multi["consensus_status"]
    if consensus == "HALAL":
        status = "Halal"
    elif consensus == "NON_COMPLIANT":
        status = "Haram"
    else:
        status = "Doubtful"
    score = int(multi["screening_score"])
    return {
        "name": name,
        "status": status,
        "score": max(0, min(100, score)),
        "summary": _simple_summary_from_multi(multi),
        "details_available": stock_check_details_available(stock),
    }
