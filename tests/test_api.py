import json

from fastapi.testclient import TestClient
from app.config import INTERNAL_SERVICE_TOKEN
from app.database import SessionLocal
from app.models import ComplianceOverride, ComplianceReviewCase, ComplianceReviewEvent, Stock

from app.main import app

client = TestClient(app)

AUTH_HEADER = {"Authorization": "Bearer test-token"}


def api_json(response):
    """Unwrap { success, data, error } for /api routes (middleware envelope)."""
    j = json.loads(response.content.decode("utf-8"))
    if isinstance(j, dict) and j.get("success") is True and "data" in j:
        return j["data"]
    return j


# ---------------------------------------------------------------------------
# Public endpoints (no auth required)
# ---------------------------------------------------------------------------

def test_home():
    response = client.get("/")
    assert response.status_code == 200
    assert api_json(response)["message"] == "Barakfi API Running"
    assert api_json(response)["environment"] == "development"
    assert "database" not in api_json(response)  # Must not leak DB URL


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert api_json(response)["status"] == "ok"


def test_auth_strategy():
    response = client.get("/api/auth/strategy")
    assert response.status_code == 200
    assert api_json(response)["provider"] == "clerk"


def test_market_data_status():
    response = client.get("/api/market-data/status")
    assert response.status_code == 200
    body = api_json(response)
    assert body["provider"] in {
        "seed",
        "nse_public",
        "yahoo_india",
        "auto_india",
        "groww",
        "kite",
        "upstox",
    }
    assert body["provider_label"]
    assert body["stock_count"] >= 5
    assert body["mode"] in {"seed", "live"}
    assert isinstance(body["capabilities"], list)
    assert isinstance(body["blockers"], list)


def test_fundamentals_status():
    response = client.get("/api/fundamentals/status")
    assert response.status_code == 200
    body = api_json(response)
    assert body["provider"] in {"seed", "signalx", "xaro"}
    assert body["provider_label"]
    assert body["screening_readiness"] in {"production_ready", "limited_seed_readiness"}
    assert isinstance(body["capabilities"], list)
    assert isinstance(body["blockers"], list)
    assert "latest_fundamentals_updated_at" in body
    assert isinstance(body["rows_with_timestamp"], int)
    assert isinstance(body["rows_missing_timestamp"], int)
    assert isinstance(body["stale"], bool)
    assert body["staleness_hours"] is None or isinstance(body["staleness_hours"], (int, float))


def test_data_stack_status():
    response = client.get("/api/data-stack/status")
    assert response.status_code == 200
    body = api_json(response)
    assert "market_data" in body
    assert "fundamentals" in body
    assert "fundamentals_freshness" in body
    assert "stale" in body["fundamentals_freshness"]
    assert "rows_with_timestamp" in body["fundamentals_freshness"]
    assert "rows_missing_timestamp" in body["fundamentals_freshness"]
    assert isinstance(body["readiness_gaps"], list)
    assert isinstance(body["ready_for_scaled_screening"], bool)


def test_app_dashboard_page():
    response = client.get("/app")
    assert response.status_code == 200
    assert "Barakfi API" in response.text


def test_list_stocks():
    response = client.get("/api/stocks")
    assert response.status_code == 200
    assert isinstance(api_json(response), list)


def test_list_stocks_includes_fundamentals_completeness_fields():
    response = client.get("/api/stocks")
    assert response.status_code == 200
    rows = api_json(response)
    assert len(rows) >= 1
    row = rows[0]
    assert "data_quality" in row
    assert row["data_quality"] in ("high", "medium", "low", None)
    assert "fundamentals_fields_missing" in row
    assert isinstance(row["fundamentals_fields_missing"], list)


def test_screen_stock():
    db = SessionLocal()
    try:
        stock = db.query(Stock).filter(Stock.symbol == "TCS").first()
        if stock:
            db.query(ComplianceOverride).filter(ComplianceOverride.stock_id == stock.id).delete()
            db.commit()
    finally:
        db.close()

    response = client.get("/api/screen/TCS")
    assert response.status_code == 200
    # TCS passes all hard rules (low debt, no forbidden sector) but may trigger
    # soft review flags (e.g., low fixed-assets ratio for IT companies).
    assert api_json(response)["status"] in ("HALAL", "CAUTIOUS")
    assert api_json(response)["active_review_case"] is None


def test_check_stock_returns_compact_payload():
    response = client.get("/api/check-stock", params={"symbol": "TCS"})
    assert response.status_code == 200
    body = api_json(response)
    assert body["name"]
    assert body["status"] in ("Halal", "Doubtful", "Haram")
    assert isinstance(body["score"], int)
    assert 0 <= body["score"] <= 100
    assert isinstance(body["summary"], str) and len(body["summary"]) > 0
    assert isinstance(body["details_available"], bool)


def test_check_stock_404_unknown_symbol():
    response = client.get("/api/check-stock", params={"symbol": "NOTREALSYM99"})
    assert response.status_code == 404


def test_check_stock_400_empty_symbol():
    response = client.get("/api/check-stock", params={"symbol": "   "})
    assert response.status_code == 400


def test_screen_stock_includes_active_review_case():
    response = client.get("/api/screen/WIPRO")
    assert response.status_code == 200
    body = api_json(response)
    assert body["active_review_case"] is not None
    assert body["active_review_case"]["stock"]["symbol"] == "WIPRO"
    assert body["active_review_case"]["status"] in {"open", "in_progress"}
    assert len(body["recent_review_cases"]) >= 1


def test_rulebook():
    response = client.get("/api/rulebook")
    assert response.status_code == 200
    assert api_json(response)["default_profile"] == "india_strict"
    assert len(api_json(response)["profiles"]) == 1


def test_rule_versions():
    response = client.get("/api/governance/rule-versions")
    assert response.status_code == 200
    assert len(api_json(response)) == 1


def test_security_headers_present():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"


# ---------------------------------------------------------------------------
# Auth guard checks
# ---------------------------------------------------------------------------

def test_users_requires_auth():
    response = client.get("/api/users")
    assert response.status_code == 401


def test_me_requires_auth():
    response = client.get("/api/me")
    assert response.status_code == 401


def test_provision_user_requires_token():
    response = client.post(
        "/api/internal/users/provision",
        json={
            "email": "new@example.com",
            "display_name": "New User",
            "auth_provider": "clerk",
            "auth_subject": "user_new",
        },
    )
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# Internal-token endpoints
# ---------------------------------------------------------------------------

def test_provision_user_and_workspace():
    provision = client.post(
        "/api/internal/users/provision",
        headers={"X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN},
        json={
            "email": "new@example.com",
            "display_name": "New User",
            "auth_provider": "clerk",
            "auth_subject": "user_new",
        },
    )
    assert provision.status_code == 200
    assert api_json(provision)["auth_subject"] == "user_new"

    # Workspace now requires auth — use internal service token
    workspace = client.get(
        "/api/users/user_new/workspace",
        headers={
            "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
            "X-Actor-Auth-Subject": "user_new",
        },
    )
    assert workspace.status_code == 200
    body = api_json(workspace)
    assert body["user"]["display_name"] == "New User"
    assert len(body["portfolios"]) == 1
    assert body["portfolios"][0]["name"] == "My Halal Core"
    assert len(body["watchlist"]) >= 1


# ---------------------------------------------------------------------------
# Admin endpoints (mock_admin_auth fixture)
# ---------------------------------------------------------------------------

def test_admin_governance_overview(mock_admin_auth):
    response = client.get("/api/admin/governance/overview", headers=AUTH_HEADER)
    assert response.status_code == 200
    body = api_json(response)
    assert len(body["rule_versions"]) >= 1
    assert len(body["review_cases"]) >= 1
    assert len(body["review_events"]) >= 1


def test_admin_universe_preview(mock_admin_auth):
    response = client.get(
        "/api/admin/data-stack/universe-preview?provider=groww&limit=4",
        headers=AUTH_HEADER,
    )
    assert response.status_code == 200
    body = api_json(response)
    assert body["provider"] == "groww"
    assert body["dry_run_only"] is True
    assert body["total_candidates"] == 4
    assert len(body["instruments"]) == 4
    assert body["instruments"][0]["provider_key"].startswith("groww_")


def test_admin_override_changes_screening_result(mock_admin_auth):
    try:
        create_response = client.post(
            "/api/admin/compliance-overrides",
            headers=AUTH_HEADER,
            json={
                "symbol": "TCS",
                "decided_status": "CAUTIOUS",
                "rationale": "Temporary founder override for governance console testing.",
            },
        )
        assert create_response.status_code == 200

        screen_response = client.get("/api/screen/TCS")
        assert screen_response.status_code == 200
        assert api_json(screen_response)["status"] == "CAUTIOUS"
        assert "Manual compliance override applied" in api_json(screen_response)["reasons"][0]
    finally:
        db = SessionLocal()
        try:
            stock = db.query(Stock).filter(Stock.symbol == "TCS").first()
            if stock:
                db.query(ComplianceOverride).filter(ComplianceOverride.stock_id == stock.id).delete()
                db.commit()
        finally:
            db.close()


def test_admin_can_create_review_case(mock_admin_auth):
    try:
        response = client.post(
            "/api/admin/review-cases",
            headers=AUTH_HEADER,
            json={
                "symbol": "DMART",
                "assigned_to": "scholar-review@barakfi.in",
                "priority": "high",
                "summary": "Open a founder review case for retail name validation.",
                "notes": "Created from automated tests to verify the review intake flow.",
            },
        )
        assert response.status_code == 200
        body = api_json(response)
        assert body["stock"]["symbol"] == "DMART"
        assert body["status"] == "open"
        assert len(body["events"]) >= 1
    finally:
        db = SessionLocal()
        try:
            stock = db.query(Stock).filter(Stock.symbol == "DMART").first()
            if stock:
                cases = db.query(ComplianceReviewCase).filter(ComplianceReviewCase.stock_id == stock.id).all()
                for case in cases:
                    db.query(ComplianceReviewEvent).filter(
                        ComplianceReviewEvent.review_case_id == case.id
                    ).delete()
                    db.delete(case)
                db.commit()
        finally:
            db.close()


def test_admin_can_update_review_case_and_create_override(mock_admin_auth):
    try:
        create_response = client.post(
            "/api/admin/review-cases",
            headers=AUTH_HEADER,
            json={
                "symbol": "DMART",
                "assigned_to": "founder@barakfi.in",
                "priority": "normal",
                "summary": "Open a review case that will be resolved in test coverage.",
                "notes": "Initial review case note.",
            },
        )
        assert create_response.status_code == 200
        case_id = api_json(create_response)["id"]

        update_response = client.post(
            "/api/admin/review-cases/update",
            headers=AUTH_HEADER,
            json={
                "case_id": case_id,
                "assigned_to": "founder@barakfi.in",
                "status": "resolved",
                "priority": "high",
                "review_outcome": "HALAL",
                "note": "Resolved after manual founder review and documentation.",
            },
        )
        assert update_response.status_code == 200
        body = api_json(update_response)
        assert body["status"] == "resolved"
        assert body["review_outcome"] == "HALAL"

        screen_response = client.get("/api/screen/DMART")
        assert screen_response.status_code == 200
        assert api_json(screen_response)["status"] == "HALAL"
        assert "Manual compliance override applied" in api_json(screen_response)["reasons"][0]
        assert any(
            item["status"] == "resolved" for item in api_json(screen_response)["recent_review_cases"]
        )
    finally:
        db = SessionLocal()
        try:
            stock = db.query(Stock).filter(Stock.symbol == "DMART").first()
            if stock:
                db.query(ComplianceOverride).filter(ComplianceOverride.stock_id == stock.id).delete()
                cases = db.query(ComplianceReviewCase).filter(ComplianceReviewCase.stock_id == stock.id).all()
                for case in cases:
                    db.query(ComplianceReviewEvent).filter(
                        ComplianceReviewEvent.review_case_id == case.id
                    ).delete()
                    db.delete(case)
                db.commit()
        finally:
            db.close()


def test_admin_can_create_support_note(mock_admin_auth):
    response = client.post(
        "/api/admin/support-notes",
        headers=AUTH_HEADER,
        json={
            "auth_subject": "google-oauth2|aditya-seed",
            "note": "Founder test note for user support workflow.",
        },
    )
    assert response.status_code == 200
    assert api_json(response)["note"] == "Founder test note for user support workflow."


def test_admin_can_update_user_status(mock_admin_auth):
    provision = client.post(
        "/api/internal/users/provision",
        headers={"X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN},
        json={
            "email": "ops-user@example.com",
            "display_name": "Ops User",
            "auth_provider": "clerk",
            "auth_subject": "ops-user-status",
        },
    )
    assert provision.status_code == 200

    response = client.post(
        "/api/admin/users/status",
        headers=AUTH_HEADER,
        json={
            "auth_subject": "ops-user-status",
            "is_active": False,
            "reason": "Pause account while support verifies access details.",
        },
    )
    assert response.status_code == 200
    assert api_json(response)["is_active"] is False


def test_admin_cannot_deactivate_configured_admin(mock_admin_auth):
    response = client.post(
        "/api/admin/users/status",
        headers=AUTH_HEADER,
        json={
            "auth_subject": "google-oauth2|aditya-seed",
            "is_active": False,
            "reason": "This should fail because configured admins cannot be disabled here.",
        },
    )
    assert response.status_code == 400


def test_users(mock_admin_auth):
    response = client.get("/api/users", headers=AUTH_HEADER)
    assert response.status_code == 200
    body = api_json(response)
    assert len(body) >= 1
    assert any(user["auth_provider"] == "google" for user in body)


def test_user_detail(mock_admin_auth):
    response = client.get(
        "/api/users/google-oauth2|aditya-seed",
        headers=AUTH_HEADER,
    )
    assert response.status_code == 200
    assert api_json(response)["display_name"] == "Aditya"


def test_screening_logs_created(mock_admin_auth):
    client.get("/api/screen/TCS")
    response = client.get("/api/screening-logs", headers=AUTH_HEADER)
    assert response.status_code == 200
    assert len(api_json(response)) >= 1


# ---------------------------------------------------------------------------
# Authenticated user endpoints (mock_admin_auth for admin user)
# ---------------------------------------------------------------------------

def test_me_workspace(mock_admin_auth):
    response = client.get("/api/me/workspace", headers=AUTH_HEADER)
    assert response.status_code == 200
    body = api_json(response)
    assert body["user"]["auth_subject"] == "google-oauth2|aditya-seed"
    assert body["dashboard"]["portfolio_count"] == 1
    assert len(body["saved_screeners"]) >= 1
    assert isinstance(body["research_notes"], list)
    assert isinstance(body["compliance_check"], list)
    assert len(body["activity_feed"]) >= 1
    assert len(body["review_cases"]) >= 1


def test_me_bootstrap(mock_auth):
    mock_auth("bootstrap_user")
    response = client.post(
        "/api/me/bootstrap",
        headers=AUTH_HEADER,
        json={
            "email": "bootstrap@example.com",
            "display_name": "Bootstrap User",
            "auth_provider": "clerk",
            "auth_subject": "bootstrap_user",
        },
    )
    assert response.status_code == 200
    assert api_json(response)["auth_subject"] == "bootstrap_user"


def test_me_settings_update(mock_admin_auth):
    response = client.patch(
        "/api/me/settings",
        headers=AUTH_HEADER,
        json={
            "preferred_currency": "USD",
            "risk_profile": "growth",
            "notifications_enabled": False,
            "theme": "light",
        },
    )
    assert response.status_code == 200
    body = api_json(response)
    assert body["preferred_currency"] == "USD"
    assert body["risk_profile"] == "growth"
    assert body["notifications_enabled"] is False
    assert body["theme"] == "light"


def test_me_alerts(mock_admin_auth):
    response = client.get("/api/me/alerts", headers=AUTH_HEADER)
    assert response.status_code == 200
    body = api_json(response)
    assert len(body) >= 1
    assert "title" in body[0]
    assert any("review" in item["title"].lower() for item in body)


def test_free_plan_alerts_are_limited(mock_auth):
    provision = client.post(
        "/api/internal/users/provision",
        headers={"X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN},
        json={
            "email": "alertsfree@example.com",
            "display_name": "Alerts Free User",
            "auth_provider": "clerk",
            "auth_subject": "alerts-free-user",
        },
    )
    assert provision.status_code == 200

    mock_auth("alerts-free-user")
    response = client.get("/api/me/alerts", headers=AUTH_HEADER)
    assert response.status_code == 200
    assert len(api_json(response)) <= 3


def test_me_activity_feed(mock_admin_auth):
    response = client.get("/api/me/activity-feed", headers=AUTH_HEADER)
    assert response.status_code == 200
    body = api_json(response)
    assert len(body) >= 1
    assert "kind" in body[0]
    assert "title" in body[0]
    assert any(item["kind"] == "review_case" for item in body)


def test_me_compliance_queue(mock_admin_auth):
    response = client.get("/api/me/compliance-queue", headers=AUTH_HEADER)
    assert response.status_code == 200
    body = api_json(response)
    assert len(body) >= 1
    assert "current_status" in body[0]


def test_me_watchlist(mock_admin_auth):
    response = client.get("/api/me/watchlist", headers=AUTH_HEADER)
    assert response.status_code == 200
    assert len(api_json(response)) >= 1


def test_create_and_delete_watchlist_entry(mock_admin_auth):
    create_response = client.post(
        "/api/me/watchlist",
        headers=AUTH_HEADER,
        json={
            "symbol": "DMART",
            "notes": "Add for long-term consumer tracking.",
        },
    )
    assert create_response.status_code == 200
    assert api_json(create_response)["stock"]["symbol"] == "DMART"

    delete_response = client.delete(
        "/api/me/watchlist/DMART",
        headers=AUTH_HEADER,
    )
    assert delete_response.status_code == 200
    assert api_json(delete_response)["ok"] is True


def test_me_saved_screeners(mock_admin_auth):
    response = client.get("/api/me/saved-screeners", headers=AUTH_HEADER)
    assert response.status_code == 200
    assert len(api_json(response)) >= 1


def test_create_and_delete_saved_screener(mock_admin_auth):
    create_response = client.post(
        "/api/me/saved-screeners",
        headers=AUTH_HEADER,
        json={
            "name": "Quality halal radar",
            "search_query": "tech",
            "sector": "Information Technology",
            "status_filter": "halal",
            "halal_only": True,
            "notes": "Track premium IT candidates.",
        },
    )
    assert create_response.status_code == 200
    created = api_json(create_response)
    assert created["name"] == "Quality halal radar"

    delete_response = client.delete(
        f"/api/me/saved-screeners/{created['id']}",
        headers=AUTH_HEADER,
    )
    assert delete_response.status_code == 200
    assert api_json(delete_response)["ok"] is True


def test_me_compliance_check(mock_admin_auth):
    response = client.get("/api/me/compliance-check", headers=AUTH_HEADER)
    assert response.status_code == 200
    body = api_json(response)
    assert len(body) >= 1
    assert "compliance_action" in body[0]


def test_create_and_delete_research_note(mock_admin_auth):
    create_response = client.post(
        "/api/me/research-notes",
        headers=AUTH_HEADER,
        json={
            "symbol": "TCS",
            "note_type": "ADD",
            "summary": "Add on planned weakness after reviewing the latest screen.",
            "conviction": "high",
            "notes": "Keep sizing disciplined.",
        },
    )
    assert create_response.status_code == 200
    body = api_json(create_response)
    assert body["stock"]["symbol"] == "TCS"
    assert body["note_type"] == "ADD"

    delete_response = client.delete(
        f"/api/me/research-notes/{body['id']}",
        headers=AUTH_HEADER,
    )
    assert delete_response.status_code == 200
    assert api_json(delete_response)["ok"] is True


def test_portfolio(mock_admin_auth):
    response = client.get("/api/portfolio/aditya", headers=AUTH_HEADER)
    assert response.status_code == 200
    body = api_json(response)
    assert len(body) >= 1
    assert any(p["name"] == "Core India Halal" for p in body)
    core = next(p for p in body if p["name"] == "Core India Halal")
    assert len(core["holdings"]) >= 1


def test_watchlist(mock_admin_auth):
    response = client.get("/api/watchlist/aditya", headers=AUTH_HEADER)
    assert response.status_code == 200
    assert len(api_json(response)) >= 1


def test_dashboard(mock_admin_auth):
    response = client.get("/api/dashboard/aditya", headers=AUTH_HEADER)
    assert response.status_code == 200
    assert api_json(response)["portfolio_count"] >= 1


def test_daily_refresh_forbidden_without_token():
    r = client.post("/api/internal/daily-refresh")
    assert r.status_code == 403


def test_daily_refresh_forbidden_wrong_token():
    r = client.post(
        "/api/internal/daily-refresh",
        headers={"X-Internal-Service-Token": "not-the-token"},
    )
    assert r.status_code == 403


def test_daily_refresh_payload_excludes_news(monkeypatch):
    from app.api import routes as routes_mod

    def _fake_price_sync(_db, provider: str, max_stocks):
        return {
            "ok": True,
            "provider": provider,
            "updated": 0,
            "failed_symbols": [],
            "total": 0,
        }

    monkeypatch.setattr(routes_mod, "sync_all_stock_prices", _fake_price_sync)
    monkeypatch.setattr(routes_mod, "_screen_stocks_bulk_impl", lambda symbols, db: [])

    r = client.post(
        "/api/internal/daily-refresh",
        headers={"X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN},
    )
    assert r.status_code == 200
    body = api_json(r)
    assert body["ok"] is True
    assert "prices" in body
    assert "screening" in body
    assert "news" not in body
