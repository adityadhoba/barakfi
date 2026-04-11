"""
Shared helper functions used across API route modules.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import ADMIN_AUTH_SUBJECTS, ADMIN_EMAILS, INTERNAL_SERVICE_TOKEN
from app.models import (
    ComplianceOverride,
    ComplianceReviewCase,
    Portfolio,
    PortfolioHolding,
    ResearchNote,
    SavedScreener,
    ScreeningLog,
    Stock,
    User,
    UserSettings,
    WatchlistEntry,
)
from app.services.halal_service import (
    PRIMARY_PROFILE,
    build_confidence_bullets,
    evaluate_stock,
    get_profile_version,
)


def require_admin(db: Session, claims: dict) -> str:
    """
    Check if user is admin via: role field, legacy ADMIN_AUTH_SUBJECTS, or legacy ADMIN_EMAILS.
    Returns the auth_subject if authorized, otherwise raises HTTPException.
    """
    auth_subject = claims.get("sub")
    if not auth_subject:
        raise HTTPException(status_code=401, detail="Token subject missing")

    if auth_subject in ADMIN_AUTH_SUBJECTS:
        return auth_subject

    current_user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()

    if current_user:
        if current_user.role == "admin":
            return auth_subject
        if current_user.email.lower() in ADMIN_EMAILS:
            return auth_subject

    raise HTTPException(status_code=403, detail="Admin access required")


def require_internal_token(token: str | None) -> None:
    if token != INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid internal service token")


def get_current_user_from_claims(db: Session, claims: dict) -> User:
    auth_subject = claims.get("sub")
    email = claims.get("email")
    if not auth_subject and not email:
        raise HTTPException(status_code=401, detail="Token subject missing")

    user = None
    if auth_subject:
        user = db.query(User).filter(User.auth_subject == auth_subject, User.is_active.is_(True)).first()
    if not user and email:
        user = (
            db.query(User)
            .filter(User.email == email.lower(), User.is_active.is_(True))
            .first()
        )
    if not user:
        raise HTTPException(status_code=404, detail="User not provisioned")

    return user


def stock_to_dict(stock: Stock) -> dict:
    return {
        "symbol": stock.symbol,
        "name": stock.name,
        "sector": stock.sector,
        "market_cap": stock.market_cap,
        "average_market_cap_36m": stock.average_market_cap_36m,
        "debt": stock.debt,
        "revenue": stock.revenue,
        "total_business_income": stock.total_business_income,
        "interest_income": stock.interest_income,
        "non_permissible_income": stock.non_permissible_income,
        "accounts_receivable": stock.accounts_receivable,
        "cash_and_equivalents": stock.cash_and_equivalents,
        "short_term_investments": stock.short_term_investments,
        "fixed_assets": stock.fixed_assets,
        "total_assets": stock.total_assets,
        "price": stock.price,
    }


def apply_compliance_override(db: Session, stock: Stock, result: dict) -> dict:
    override = (
        db.query(ComplianceOverride)
        .filter(ComplianceOverride.stock_id == stock.id)
        .order_by(ComplianceOverride.created_at.desc())
        .first()
    )
    if not override:
        return result

    updated = dict(result)
    updated["status"] = override.decided_status
    updated["reasons"] = [
        f"Manual compliance override applied by {override.decided_by}: {override.rationale}"
    ]
    updated["manual_review_flags"] = []
    updated["confidence_bullets"] = build_confidence_bullets(
        updated["status"],
        updated["breakdown"],
        updated["reasons"],
        updated["manual_review_flags"],
    )
    return updated


def record_screening_log(db: Session, stock: Stock, result: dict) -> None:
    log = ScreeningLog(
        stock_id=stock.id,
        profile_code=result["profile"],
        rule_version=get_profile_version(result["profile"]),
        status=result["status"],
        triggered_reasons=" | ".join(result["reasons"]),
        manual_review_flags=" | ".join(result["manual_review_flags"]),
    )
    db.add(log)
    db.commit()


def get_public_review_case_for_stock(db: Session, stock_id: int) -> dict | None:
    review_case = (
        db.query(ComplianceReviewCase)
        .filter(
            ComplianceReviewCase.stock_id == stock_id,
            ComplianceReviewCase.status.in_(["open", "in_progress"]),
        )
        .order_by(ComplianceReviewCase.updated_at.desc())
        .first()
    )
    if not review_case:
        return None
    return serialize_public_review_case(review_case)


def get_recent_public_review_cases_for_stock(db: Session, stock_id: int, limit: int = 3) -> list[dict]:
    review_cases = (
        db.query(ComplianceReviewCase)
        .filter(ComplianceReviewCase.stock_id == stock_id)
        .order_by(ComplianceReviewCase.updated_at.desc())
        .limit(limit)
        .all()
    )
    return [serialize_public_review_case(item) for item in review_cases]


def get_public_review_cases_for_user_scope(
    db: Session,
    user_id: int,
    statuses: list[str] | None = None,
    limit: int = 20,
) -> list[dict]:
    watchlist_stock_ids = (
        db.query(WatchlistEntry.stock_id)
        .filter(WatchlistEntry.user_id == user_id)
        .all()
    )
    holding_stock_ids = (
        db.query(PortfolioHolding.stock_id)
        .join(Portfolio, PortfolioHolding.portfolio_id == Portfolio.id)
        .filter(Portfolio.user_id == user_id)
        .all()
    )
    stock_ids = {item[0] for item in watchlist_stock_ids + holding_stock_ids}
    if not stock_ids:
        return []

    query = db.query(ComplianceReviewCase).filter(ComplianceReviewCase.stock_id.in_(stock_ids))
    if statuses:
        query = query.filter(ComplianceReviewCase.status.in_(statuses))

    review_cases = query.order_by(ComplianceReviewCase.updated_at.desc()).limit(limit).all()
    return [serialize_public_review_case(item) for item in review_cases]


def serialize_public_review_case(review_case: ComplianceReviewCase) -> dict:
    latest_event = review_case.events[-1] if review_case.events else None
    return {
        "id": review_case.id,
        "assigned_to": review_case.assigned_to,
        "status": review_case.status,
        "priority": review_case.priority,
        "review_outcome": review_case.review_outcome,
        "summary": review_case.summary,
        "latest_action": latest_event.action if latest_event else None,
        "latest_note": latest_event.note if latest_event else None,
        "updated_at": review_case.updated_at,
        "stock": {
            "symbol": review_case.stock.symbol,
            "name": review_case.stock.name,
            "price": review_case.stock.price,
            "sector": review_case.stock.sector,
        },
    }


def build_review_case_message(review_case: dict) -> tuple[str, str, str]:
    symbol = review_case["stock"]["symbol"]
    status = review_case["status"]
    priority = review_case["priority"]
    latest_note = review_case.get("latest_note") or review_case["summary"]
    review_outcome = review_case.get("review_outcome")

    if status == "resolved":
        outcome_label = review_outcome.lower().replace("_", " ") if review_outcome else "resolved"
        return (
            f"{symbol} review resolved as {outcome_label}",
            latest_note,
            "success" if review_outcome == "HALAL" else "warning",
        )

    if status == "in_progress":
        return (
            f"{symbol} review is in progress",
            latest_note,
            "warning" if priority == "high" else "info",
        )

    return (
        f"{symbol} review opened",
        latest_note,
        "warning" if priority == "high" else "info",
    )


def upsert_override_for_review_case(
    db: Session,
    review_case: ComplianceReviewCase,
    decided_status: str,
    admin_subject: str,
    note: str,
) -> None:
    override = (
        db.query(ComplianceOverride)
        .filter(ComplianceOverride.stock_id == review_case.stock_id)
        .order_by(ComplianceOverride.created_at.desc())
        .first()
    )
    rationale = f"Review case #{review_case.id} resolved by {admin_subject}: {note}"
    if override:
        override.decided_status = decided_status
        override.rationale = rationale
        override.decided_by = admin_subject
        return

    db.add(
        ComplianceOverride(
            stock_id=review_case.stock_id,
            decided_status=decided_status,
            rationale=rationale,
            decided_by=admin_subject,
        )
    )


def build_dashboard_payload(owner_name: str, portfolios: list[Portfolio], watchlist_entries: list[WatchlistEntry]):
    holdings = [holding for portfolio in portfolios for holding in portfolio.holdings]

    total_market_value = round(sum(holding.quantity * holding.stock.price for holding in holdings), 2)
    halal_holdings = 0
    non_compliant_holdings = 0
    review_holdings = 0

    for holding in holdings:
        result = evaluate_stock(stock_to_dict(holding.stock), profile=PRIMARY_PROFILE)
        if result["status"] == "HALAL":
            halal_holdings += 1
        elif result["status"] == "NON_COMPLIANT":
            non_compliant_holdings += 1
        else:
            review_holdings += 1

    return {
        "owner_name": owner_name,
        "portfolio_count": len(portfolios),
        "watchlist_count": len(watchlist_entries),
        "holding_count": len(holdings),
        "portfolio_market_value": total_market_value,
        "halal_holdings": halal_holdings,
        "non_compliant_holdings": non_compliant_holdings,
        "requires_review_holdings": review_holdings,
        "default_profile": PRIMARY_PROFILE,
    }


def build_alerts_payload(
    user: User,
    portfolios: list[Portfolio],
    watchlist_entries: list[WatchlistEntry],
    review_cases: list[dict] | None = None,
) -> list[dict]:
    alerts: list[dict] = []
    review_cases = review_cases or []
    holdings = [holding for portfolio in portfolios for holding in portfolio.holdings]
    total_market_value = sum(holding.quantity * holding.stock.price for holding in holdings)

    if user.settings and not user.settings.notifications_enabled:
        alerts.append({"level": "info", "title": "Notifications are paused", "message": "Compliance and portfolio alerts are turned off in account settings."})

    for holding in holdings:
        result = evaluate_stock(stock_to_dict(holding.stock), profile=PRIMARY_PROFILE)
        if result["status"] == "NON_COMPLIANT":
            alerts.append({"level": "critical", "title": f"{holding.stock.symbol} is non-compliant", "message": "This holding fails the active Shariah screening profile and needs review."})
        elif result["status"] == "CAUTIOUS":
            alerts.append({"level": "warning", "title": f"{holding.stock.symbol} needs manual review", "message": "The automated rules flagged this holding for deeper compliance validation."})

        if total_market_value > 0:
            weight = (holding.quantity * holding.stock.price / total_market_value) * 100
            if weight >= 45:
                alerts.append({"level": "warning", "title": f"{holding.stock.symbol} concentration is high", "message": f"This position is {weight:.1f}% of the portfolio and may need rebalancing."})

    if len(watchlist_entries) == 0:
        alerts.append({"level": "info", "title": "Watchlist is empty", "message": "Add candidate stocks to build a healthier research pipeline."})

    for review_case in review_cases[:3]:
        title, message, level = build_review_case_message(review_case)
        alerts.append({"level": level, "title": title, "message": message})

    if not alerts:
        alerts.append({"level": "success", "title": "No urgent portfolio alerts", "message": "Your current seeded workspace is stable under the active checks."})

    return alerts[:6]


def build_compliance_check(portfolios: list[Portfolio]) -> list[dict]:
    holdings = [holding for portfolio in portfolios for holding in portfolio.holdings]
    total_market_value = sum(holding.quantity * holding.stock.price for holding in holdings)
    suggestions: list[dict] = []

    for holding in holdings:
        current_weight_pct = (
            (holding.quantity * holding.stock.price / total_market_value) * 100 if total_market_value > 0 else 0
        )
        drift_pct = round(current_weight_pct - holding.target_allocation_pct, 2)

        if drift_pct >= 5:
            compliance_action = "NON_COMPLIANT_HOLDING"
            compliance_note = "Position is above target by more than five points and may need review."
        elif drift_pct <= -5:
            compliance_action = "REVIEW_NEEDED"
            compliance_note = "Position is below target by more than five points and may need attention."
        else:
            compliance_action = "COMPLIANT"
            compliance_note = "Position is close to target allocation."

        suggestions.append({
            "symbol": holding.stock.symbol,
            "name": holding.stock.name,
            "current_weight_pct": round(current_weight_pct, 2),
            "target_weight_pct": round(holding.target_allocation_pct, 2),
            "drift_pct": drift_pct,
            "compliance_action": compliance_action,
            "compliance_note": compliance_note,
        })

    suggestions.sort(key=lambda item: abs(item["drift_pct"]), reverse=True)
    return suggestions


def build_activity_feed(
    user: User,
    portfolios: list[Portfolio],
    watchlist_entries: list[WatchlistEntry],
    research_notes: list[ResearchNote],
    review_cases: list[dict] | None = None,
) -> list[dict]:
    events: list[dict] = []
    review_cases = review_cases or []

    for alert in build_alerts_payload(user, portfolios, watchlist_entries, review_cases):
        events.append({"id": f"alert-{alert['title']}", "kind": "alert", "title": alert["title"], "detail": alert["message"], "created_at": user.created_at, "level": alert["level"], "symbol": None})

    for review_case in review_cases[:4]:
        title, message, level = build_review_case_message(review_case)
        events.append({"id": f"review-{review_case['id']}", "kind": "review_case", "title": title, "detail": message, "created_at": review_case["updated_at"], "level": level, "symbol": review_case["stock"]["symbol"]})

    for note in research_notes[:4]:
        events.append({"id": f"note-{note.id}", "kind": "research_note", "title": f"{note.note_type} {note.stock.symbol}", "detail": note.summary, "created_at": note.created_at, "level": "info" if note.conviction == "low" else "success" if note.conviction == "high" else "warning", "symbol": note.stock.symbol})

    for entry in watchlist_entries[:3]:
        events.append({"id": f"watch-{entry.id}", "kind": "watchlist", "title": f"{entry.stock.symbol} is on the watchlist", "detail": entry.notes or "Tracked as an active research candidate.", "created_at": entry.added_at, "level": "info", "symbol": entry.stock.symbol})

    for portfolio in portfolios:
        for holding in portfolio.holdings:
            result = evaluate_stock(stock_to_dict(holding.stock), profile=PRIMARY_PROFILE)
            if result["status"] != "HALAL":
                events.append({"id": f"screen-{holding.stock.symbol}", "kind": "screening", "title": f"{holding.stock.symbol} needs compliance attention", "detail": "Current holding status is no longer fully clean under the active profile.", "created_at": holding.created_at, "level": "critical" if result["status"] == "NON_COMPLIANT" else "warning", "symbol": holding.stock.symbol})

    events.sort(key=lambda event: event["created_at"], reverse=True)
    return events[:12]


def build_compliance_queue(portfolios: list[Portfolio], watchlist_entries: list[WatchlistEntry]) -> list[dict]:
    items: list[dict] = []
    seen_symbols: set[str] = set()

    for portfolio in portfolios:
        for holding in portfolio.holdings:
            result = evaluate_stock(stock_to_dict(holding.stock), profile=PRIMARY_PROFILE)
            if result["status"] == "HALAL" or holding.stock.symbol in seen_symbols:
                continue
            items.append({
                "symbol": holding.stock.symbol,
                "name": holding.stock.name,
                "current_status": result["status"],
                "reason": result["reasons"][0] if result["reasons"] else "Compliance review required.",
                "action_required": "Review the holding and decide whether to trim, exit, or override with documented justification.",
            })
            seen_symbols.add(holding.stock.symbol)

    for entry in watchlist_entries:
        result = evaluate_stock(stock_to_dict(entry.stock), profile=PRIMARY_PROFILE)
        if result["status"] == "HALAL" or entry.stock.symbol in seen_symbols:
            continue
        items.append({
            "symbol": entry.stock.symbol,
            "name": entry.stock.name,
            "current_status": result["status"],
            "reason": (
                result["manual_review_flags"][0] if result["manual_review_flags"]
                else result["reasons"][0] if result["reasons"]
                else "Manual review required."
            ),
            "action_required": (
                "Resolve the compliance ambiguity before moving this stock into active capital deployment."
                if result["status"] == "CAUTIOUS"
                else "Keep this name as a benchmark or remove it from active consideration."
            ),
        })
        seen_symbols.add(entry.stock.symbol)

    return items[:8]


def create_default_workspace(db: Session, user: User) -> None:
    portfolio = Portfolio(
        user_id=user.id,
        owner_name=(user.display_name or user.email or "user").lower().replace(" ", "-"),
        name="My Halal Core",
        base_currency="INR",
        investment_objective="Build a disciplined, long-term halal portfolio in Indian equities",
    )
    db.add(portfolio)
    db.flush()

    starter_stocks = (
        db.query(Stock)
        .filter(Stock.symbol.in_(["TCS", "INFY"]))
        .order_by(Stock.symbol.asc())
        .all()
    )
    for stock in starter_stocks:
        db.add(
            WatchlistEntry(
                user_id=user.id,
                owner_name=portfolio.owner_name,
                stock_id=stock.id,
                notes="Auto-added starter watchlist during account provisioning.",
            )
        )

    db.add(
        SavedScreener(
            user_id=user.id,
            name="Strict halal leaders",
            search_query="",
            sector="Information Technology",
            status_filter="halal",
            halal_only=True,
            notes="Starter screener focused on large Indian names that fit the strict profile.",
        )
    )

