from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StockBase(BaseModel):
    symbol: str
    name: str
    sector: str
    exchange: str = "NSE"
    market_cap: float = Field(ge=0)
    average_market_cap_36m: float = Field(ge=0)
    debt: float = Field(ge=0)
    revenue: float = Field(ge=0)
    total_business_income: float = Field(ge=0)
    interest_income: float = Field(ge=0)
    non_permissible_income: float = Field(ge=0)
    accounts_receivable: float = Field(ge=0)
    cash_and_equivalents: float = Field(ge=0, default=0)
    short_term_investments: float = Field(ge=0, default=0)
    fixed_assets: float = Field(ge=0)
    total_assets: float = Field(ge=0)
    price: float = Field(ge=0)
    currency: str = "INR"
    country: str = "India"
    data_source: str = "internal_seed"
    is_active: bool = True
    fundamentals_updated_at: datetime | None = None


class StockCreate(StockBase):
    pass


class StockRead(StockBase):
    id: int
    data_quality: Literal["high", "medium", "low"] | None = Field(
        default=None,
        description="Heuristic completeness of fundamentals for screening (high/medium/low).",
    )
    fundamentals_fields_missing: list[str] = Field(
        default_factory=list,
        description="Fundamental field keys that are zero or missing (screening may be unreliable).",
    )
    exchange_code: str | None = None
    isin: str | None = None
    beta: float | None = None
    dividend_yield: float | None = None
    pe_ratio: float | None = None
    eps: float | None = None
    week_52_high: float | None = None
    week_52_low: float | None = None
    avg_volume: float | None = None
    shares_outstanding: float | None = None
    price_change_pct: float | None = None
    compliance_rating: int | None = None
    is_etf: bool = False
    index_memberships: list[str] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


class ScreeningBreakdown(BaseModel):
    debt_to_market_cap_ratio: float
    debt_to_36m_avg_market_cap_ratio: float
    interest_income_ratio: float
    non_permissible_income_ratio: float
    receivables_to_market_cap_ratio: float
    cash_and_interest_bearing_to_assets_ratio: float
    fixed_assets_to_total_assets_ratio: float | None = None
    sector_allowed: bool
    debt_ratio_value: float | None = None
    debt_ratio_threshold: float | None = None
    receivables_ratio_value: float | None = None
    receivables_ratio_threshold: float | None = None
    cash_ib_ratio_threshold: float | None = None


class ConfidenceBullet(BaseModel):
    tone: Literal["success", "warning", "error"]
    text: str


class ScreeningResult(BaseModel):
    symbol: str
    name: str
    profile: str
    status: str
    reasons: list[str]
    manual_review_flags: list[str]
    screening_score: int = Field(ge=0, le=100)
    purification_ratio_pct: float | None = None
    active_review_case: "PublicReviewCaseRead | None" = None
    recent_review_cases: list["PublicReviewCaseRead"] = []
    breakdown: ScreeningBreakdown
    confidence_bullets: list[ConfidenceBullet] = Field(default_factory=list)


class RuleSource(BaseModel):
    name: str
    url: str
    notes: str


class RuleProfile(BaseModel):
    code: str
    label: str
    description: str
    hard_rules: list[str]
    review_rules: list[str]
    primary_sources: list[RuleSource]
    secondary_verification: list[str]


class RulebookResponse(BaseModel):
    default_profile: str
    profiles: list[RuleProfile]


class CheckStockResponse(BaseModel):
    """Simplified screening for GET /api/check-stock (product language)."""

    name: str
    status: str = Field(description="Halal | Doubtful | Haram")
    score: int = Field(ge=0, le=100)
    summary: str
    details_available: bool


class TrackSymbolRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=64)


class AuthStrategyResponse(BaseModel):
    provider: str
    google_enabled: bool
    backend_ready: bool
    frontend_ready: bool
    clerk_js_ready: bool
    notes: list[str]


class MarketDataStatusResponse(BaseModel):
    provider: str
    provider_label: str
    configured: bool
    is_live: bool
    mode: str
    stock_count: int
    universe_source: str
    quote_source: str
    capabilities: list[str]
    blockers: list[str]
    notes: list[str]


class EquityQuoteResponse(BaseModel):
    symbol: str
    exchange: str
    last_price: float
    previous_close: float | None = None
    change: float | None = None
    change_percent: float | None = None
    day_high: float | None = None
    day_low: float | None = None
    volume: int | None = None
    week_52_high: float | None = None
    week_52_low: float | None = None
    source: str
    as_of: str
    currency: str = "INR"
    disclaimer: str = (
        "Indicative delayed-style data from public sources, not financial advice. "
        "Not an official NSE/BSE redistribution feed."
    )


class MarketPricesSyncResponse(BaseModel):
    ok: bool
    provider: str
    updated: int
    failed_symbols: list[str]
    total: int
    detail: str | None = None
    error: str | None = None


class FundamentalsStatusResponse(BaseModel):
    provider: str
    provider_label: str
    configured: bool
    is_live: bool
    mode: str
    stock_count: int
    statement_source: str
    screening_readiness: str
    capabilities: list[str]
    blockers: list[str]
    notes: list[str]
    latest_fundamentals_updated_at: datetime | None = None
    rows_with_timestamp: int = 0
    rows_missing_timestamp: int = 0
    stale: bool = False
    staleness_hours: float | None = None
    latest_daily_screening_completed_at: datetime | None = None
    screening_symbols_expected: int = 0
    screening_symbols_completed: int = 0
    screening_complete: bool = False


class FundamentalsFreshnessSummaryResponse(BaseModel):
    latest_fundamentals_updated_at: datetime | None = None
    rows_with_timestamp: int = 0
    rows_missing_timestamp: int = 0
    stale: bool = False
    staleness_hours: float | None = None
    latest_daily_screening_completed_at: datetime | None = None
    screening_symbols_expected: int = 0
    screening_symbols_completed: int = 0
    screening_complete: bool = False


class DataStackStatusResponse(BaseModel):
    market_data: MarketDataStatusResponse
    fundamentals: FundamentalsStatusResponse
    fundamentals_freshness: FundamentalsFreshnessSummaryResponse
    ready_for_scaled_screening: bool
    readiness_gaps: list[str]


class NormalizedInstrumentRead(BaseModel):
    symbol: str
    name: str
    exchange: str
    sector: str
    instrument_type: str
    provider_key: str
    currency: str
    price_hint: float
    data_source: str
    import_readiness: str


class UniversePreviewResponse(BaseModel):
    provider: str
    provider_label: str
    configured: bool
    source_type: str
    dry_run_only: bool
    total_candidates: int
    import_candidates: int
    blockers: list[str]
    notes: list[str]
    instruments: list[NormalizedInstrumentRead]


class AlertRead(BaseModel):
    level: str
    title: str
    message: str


class UserSettingsRead(BaseModel):
    preferred_currency: str
    risk_profile: str
    notifications_enabled: bool
    theme: str
    model_config = ConfigDict(from_attributes=True)


class UserSettingsUpdateRequest(BaseModel):
    preferred_currency: str | None = None
    risk_profile: str | None = None
    notifications_enabled: bool | None = None
    theme: str | None = None


class UserRead(BaseModel):
    id: int
    email: str
    display_name: str
    auth_provider: str
    auth_subject: str
    is_active: bool
    role: str = "user"
    settings: UserSettingsRead | None = None
    model_config = ConfigDict(from_attributes=True)


class AdminUserRead(BaseModel):
    """Extended user information for admin dashboard"""
    id: int
    email: str
    display_name: str
    role: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AdminUserRoleUpdateRequest(BaseModel):
    """Request body for updating user roles"""
    role: str = Field(
        description="owner | admin | reviewer | developer | user",
        pattern="^(owner|admin|reviewer|developer|user)$"
    )


class AdminUserActiveUpdateRequest(BaseModel):
    """Request body for enabling/disabling users"""
    is_active: bool


class AdminRoleDefinition(BaseModel):
    """Role definition with description"""
    code: str
    name: str
    description: str
    level: int


class AdminRolesResponse(BaseModel):
    """Response with available roles"""
    roles: list[AdminRoleDefinition]


class AdminUsersListResponse(BaseModel):
    """Paginated response for user list"""
    items: list[AdminUserRead]
    total: int
    offset: int
    limit: int


class ComplianceOverrideCreateRequest(BaseModel):
    symbol: str
    decided_status: str = Field(default="CAUTIOUS")
    rationale: str = Field(min_length=8, max_length=500)


class ComplianceOverrideRead(BaseModel):
    id: int
    decided_status: str
    rationale: str
    decided_by: str
    created_at: datetime
    stock: "HoldingStockSnapshot"
    model_config = ConfigDict(from_attributes=True)


class GovernanceOverviewResponse(BaseModel):
    rule_versions: list["ComplianceRuleVersionRead"]
    overrides: list["ComplianceOverrideRead"]
    support_notes: list["SupportNoteRead"]
    users: list["AdminUserSummaryRead"]
    review_cases: list["ComplianceReviewCaseRead"]
    review_events: list["ComplianceReviewEventRead"]


class SupportNoteCreateRequest(BaseModel):
    auth_subject: str
    note: str = Field(min_length=5, max_length=500)


class SupportNoteRead(BaseModel):
    id: int
    note: str
    created_by: str
    created_at: datetime
    user: "UserRead"
    model_config = ConfigDict(from_attributes=True)


class AdminUserSummaryRead(BaseModel):
    id: int
    email: str
    display_name: str
    auth_subject: str
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class AdminUserStatusUpdateRequest(BaseModel):
    auth_subject: str
    is_active: bool
    reason: str = Field(min_length=8, max_length=500)


class ComplianceReviewEventRead(BaseModel):
    id: int
    action: str
    note: str
    actor: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ComplianceReviewCaseRead(BaseModel):
    id: int
    requested_by: str
    assigned_to: str | None
    status: str
    priority: str
    review_outcome: str | None
    summary: str
    notes: str
    created_at: datetime
    updated_at: datetime
    stock: "HoldingStockSnapshot"
    events: list["ComplianceReviewEventRead"]
    model_config = ConfigDict(from_attributes=True)


class PublicReviewCaseRead(BaseModel):
    id: int
    assigned_to: str | None
    status: str
    priority: str
    review_outcome: str | None
    summary: str
    latest_action: str | None = None
    latest_note: str | None = None
    updated_at: datetime
    stock: "HoldingStockSnapshot"
    model_config = ConfigDict(from_attributes=True)


class ComplianceReviewCaseCreateRequest(BaseModel):
    symbol: str
    assigned_to: str | None = None
    priority: str = Field(default="normal")
    summary: str = Field(min_length=8, max_length=160)
    notes: str = Field(default="", max_length=1000)


class ComplianceReviewCaseUpdateRequest(BaseModel):
    case_id: int
    assigned_to: str | None = None
    status: str = Field(default="in_progress")
    priority: str = Field(default="normal")
    review_outcome: str | None = None
    note: str = Field(min_length=5, max_length=1000)


class UserProvisionRequest(BaseModel):
    email: str
    display_name: str
    auth_provider: str
    auth_subject: str


class WatchlistEntryCreateRequest(BaseModel):
    symbol: str
    notes: str = ""


class HoldingCreateRequest(BaseModel):
    symbol: str
    quantity: float = Field(gt=0)
    average_buy_price: float = Field(gt=0)
    thesis: str = ""


class ResearchNoteCreateRequest(BaseModel):
    symbol: str
    note_type: str = Field(default="WATCH")
    summary: str = Field(min_length=4, max_length=160)
    conviction: str = Field(default="medium")
    portfolio_id: int | None = None
    notes: str = ""


class SavedScreenerCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    search_query: str = ""
    sector: str = "All"
    status_filter: str = "all"
    halal_only: bool = False
    notes: str = ""


class SavedScreenerRead(BaseModel):
    id: int
    name: str
    search_query: str
    sector: str
    status_filter: str
    halal_only: bool
    notes: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ActionResponse(BaseModel):
    ok: bool
    message: str


class ActivityEventRead(BaseModel):
    id: str
    kind: str
    title: str
    detail: str
    created_at: datetime
    level: str
    symbol: str | None = None


class ComplianceQueueItemRead(BaseModel):
    symbol: str
    name: str
    current_status: str
    reason: str
    action_required: str


class WorkspaceResponse(BaseModel):
    user: UserRead
    dashboard: dict
    portfolios: list["PortfolioRead"]
    watchlist: list["WatchlistEntryRead"]
    saved_screeners: list["SavedScreenerRead"]
    research_notes: list["ResearchNoteRead"]
    compliance_check: list["ComplianceCheckRead"]
    activity_feed: list["ActivityEventRead"]
    review_cases: list["PublicReviewCaseRead"]


class ComplianceRuleVersionRead(BaseModel):
    id: int
    profile_code: str
    version: str
    status: str
    approved_by: str | None
    notes: str
    effective_from: datetime
    source_summary: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class HoldingStockSnapshot(BaseModel):
    """Nested stock summary for watchlist, holdings, research notes — includes market fields for UI."""

    symbol: str
    name: str
    price: float
    sector: str
    exchange: str = "NSE"
    currency: str = "INR"
    country: str = "India"
    model_config = ConfigDict(from_attributes=True)


class PortfolioHoldingRead(BaseModel):
    id: int
    quantity: float
    average_buy_price: float
    target_allocation_pct: float
    thesis: str
    stock: HoldingStockSnapshot
    model_config = ConfigDict(from_attributes=True)


class PortfolioRead(BaseModel):
    id: int
    owner_name: str
    name: str
    base_currency: str
    investment_objective: str
    created_at: datetime
    holdings: list[PortfolioHoldingRead]
    model_config = ConfigDict(from_attributes=True)


class WatchlistEntryRead(BaseModel):
    id: int
    owner_name: str
    notes: str
    added_at: datetime
    stock: HoldingStockSnapshot
    latest_research_summary: str = ""
    model_config = ConfigDict(from_attributes=True)


class ResearchNoteRead(BaseModel):
    id: int
    note_type: str
    summary: str
    conviction: str
    status_snapshot: str
    notes: str
    created_at: datetime
    stock: HoldingStockSnapshot
    model_config = ConfigDict(from_attributes=True)


class ComplianceCheckRead(BaseModel):
    symbol: str
    name: str
    current_weight_pct: float
    target_weight_pct: float
    drift_pct: float
    compliance_action: str
    compliance_note: str


class ScreeningLogRead(BaseModel):
    id: int
    profile_code: str
    rule_version: str
    status: str
    triggered_reasons: str
    manual_review_flags: str
    created_at: datetime
    stock: HoldingStockSnapshot
    model_config = ConfigDict(from_attributes=True)


class HealthResponse(BaseModel):
    message: str
    database: str


WorkspaceResponse.model_rebuild()
