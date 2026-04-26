"""
SQLAlchemy ORM models for Barakfi v2 — ISIN-first, provenance-first architecture.

Design principles:
- Canonical identity is ISIN-first (issuer → security → listing)
- All facts are immutable snapshots; revisions create new rows
- Every derived screening result is methodology-versioned
- Job runs and raw artifacts are tracked for full auditability
- Conservative precedence: fail > review_required > insufficient_data > pass
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Date,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship

from app.database import Base

UTC = timezone.utc


def utc_now() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# Enums (also stored as check constraints for Postgres; JSON strings for SQLite)
# ---------------------------------------------------------------------------

class LifecycleStatus(str, enum.Enum):
    active = "active"
    delisted = "delisted"
    suspended = "suspended"
    merged = "merged"
    event_hold = "event_hold"


class ExchangeCode(str, enum.Enum):
    NSE = "NSE"
    BSE = "BSE"


class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    dead_letter = "dead_letter"


class ParseStatus(str, enum.Enum):
    pending = "pending"
    parsed = "parsed"
    failed = "failed"
    skipped = "skipped"


class FilingType(str, enum.Enum):
    annual_report = "annual_report"
    financial_results = "financial_results"
    shareholding = "shareholding"
    audit_qualification = "audit_qualification"
    scheme = "scheme"
    corporate_action = "corporate_action"
    announcement = "announcement"


class PeriodType(str, enum.Enum):
    quarterly = "quarterly"
    half_yearly = "half_yearly"
    annual = "annual"
    event_based = "event_based"


class FinancialBasis(str, enum.Enum):
    annual_audited = "annual_audited"
    quarterly_reported = "quarterly_reported"
    ttm_derived = "ttm_derived"
    manual_review = "manual_review"


class ActivityReviewStatus(str, enum.Enum):
    pass_ = "pass"
    fail = "fail"
    mixed = "mixed"
    review_required = "review_required"
    insufficient_data = "insufficient_data"


class ConfidenceLabel(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class ScreeningStatus(str, enum.Enum):
    pass_ = "pass"
    fail = "fail"
    review_required = "review_required"
    insufficient_data = "insufficient_data"


class MethodologyStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    retired = "retired"


class CoverageUniverse(str, enum.Enum):
    nifty500 = "nifty500"
    nifty50 = "nifty50"
    nifty_next50 = "nifty_next50"
    bse_500 = "bse_500"
    all_nse = "all_nse"


# Convenience: pick JSON or JSONB depending on the dialect
def _jsonb_or_json():
    """Return JSONB for Postgres, JSON for SQLite (dev)."""
    try:
        from sqlalchemy.dialects.postgresql import JSONB as _JSONB
        return _JSONB
    except ImportError:
        return JSON


JsonColumn = JSON  # used below; actual dialect switch happens at table level


# ---------------------------------------------------------------------------
# Job tracking (must be defined early; referenced by raw_artifact)
# ---------------------------------------------------------------------------

class JobRun(Base):
    """
    Tracks a single execution of any scheduled ingestion or recompute job.

    idempotency_key is deterministic: derived from job_name + date-window + params hash.
    Prevents duplicate runs even if the scheduler fires twice.
    """
    __tablename__ = "job_runs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_name = Column(String(120), nullable=False, index=True)
    idempotency_key = Column(String(255), nullable=False, unique=True)
    status = Column(
        String(20),
        CheckConstraint("status IN ('queued','running','succeeded','failed','dead_letter')"),
        nullable=False,
        default="queued",
        index=True,
    )
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    attempt_count = Column(Integer, nullable=False, default=0)
    source_window_start = Column(DateTime(timezone=True), nullable=True)
    source_window_end = Column(DateTime(timezone=True), nullable=True)
    metrics_json = Column(JSON, nullable=False, default=dict)
    error_json = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    raw_artifacts = relationship("RawArtifact", back_populates="job_run")


# ---------------------------------------------------------------------------
# Raw artifact registry — every fetched file is recorded here
# ---------------------------------------------------------------------------

class RawArtifact(Base):
    """
    Immutable record of every file/URL fetched from an official source.

    content_sha256 enables deduplication: the same document fetched twice
    will produce a duplicate constraint rather than two rows.
    """
    __tablename__ = "raw_artifacts"
    __table_args__ = (
        UniqueConstraint("source_name", "source_url", "content_sha256", name="uq_raw_artifact_url_hash"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_run_id = Column(BigInteger, ForeignKey("job_runs.id"), nullable=True, index=True)
    source_name = Column(String(80), nullable=False)
    source_kind = Column(
        String(20),
        CheckConstraint("source_kind IN ('csv','html','json','xbrl','pdf','xml','xlsx','zip')"),
        nullable=False,
    )
    source_url = Column(Text, nullable=False)
    source_ref = Column(Text, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    fetched_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    http_status = Column(Integer, nullable=True)
    content_sha256 = Column(String(64), nullable=False, index=True)
    storage_path = Column(Text, nullable=True)
    headers_json = Column(JSON, nullable=False, default=dict)
    parse_status = Column(String(20), nullable=False, default="pending", index=True)
    error_detail = Column(Text, nullable=True)

    job_run = relationship("JobRun", back_populates="raw_artifacts")
    filings = relationship("FilingV2", back_populates="raw_artifact")


# ---------------------------------------------------------------------------
# Issuer — legal company (ISIN-first canonical identity)
# ---------------------------------------------------------------------------

class Issuer(Base):
    """
    The legal company entity.  One issuer can have multiple exchange listings.

    canonical_isin is the unique business key — symbols change, names change,
    but ISIN is the stable cross-exchange identifier for an instrument.
    """
    __tablename__ = "issuers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    canonical_isin = Column(String(12), nullable=False, unique=True, index=True)
    cin = Column(String(21), nullable=True, index=True)
    legal_name = Column(Text, nullable=False)
    display_name = Column(Text, nullable=False)
    industry_label = Column(String(120), nullable=True)
    sector_label = Column(String(120), nullable=True)
    coverage_universe = Column(String(40), nullable=False, default="nifty500")
    lifecycle_status = Column(String(20), nullable=False, default="active", index=True)
    first_seen_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    last_seen_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    listings = relationship("ListingV2", back_populates="issuer", cascade="all, delete-orphan")
    symbol_history = relationship("SymbolHistory", back_populates="issuer", cascade="all, delete-orphan")
    filings = relationship("FilingV2", back_populates="issuer")
    fundamentals_snapshots = relationship("FundamentalsSnapshot", back_populates="issuer")
    business_activity_reviews = relationship("BusinessActivityReview", back_populates="issuer")
    screening_results_v2 = relationship("ScreeningResultV2", back_populates="issuer")


# ---------------------------------------------------------------------------
# Listing — exchange-specific trading identity beneath an issuer
# ---------------------------------------------------------------------------

class ListingV2(Base):
    """
    Exchange-specific listing for an issuer.

    An issuer may be listed on both NSE and BSE under the same ISIN
    but different native symbols/series.
    """
    __tablename__ = "listings_v2"
    __table_args__ = (
        UniqueConstraint("exchange_code", "symbol", "series", name="uq_listing_exchange_symbol_series"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    issuer_id = Column(BigInteger, ForeignKey("issuers.id"), nullable=False, index=True)
    exchange_code = Column(
        String(5),
        CheckConstraint("exchange_code IN ('NSE','BSE')"),
        nullable=False,
    )
    symbol = Column(String(30), nullable=False, index=True)
    series = Column(String(10), nullable=True)
    bse_scrip_code = Column(String(10), nullable=True, index=True)
    face_value = Column(Numeric(18, 6), nullable=True)
    listing_date = Column(Date, nullable=True)
    listing_status = Column(String(20), nullable=True)
    trading_status = Column(String(20), nullable=True)
    current_is_primary = Column(Boolean, nullable=False, default=True)
    first_seen_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    last_seen_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    issuer = relationship("Issuer", back_populates="listings")
    daily_prices = relationship("MarketPriceDaily", back_populates="listing", cascade="all, delete-orphan")
    screening_snapshots_v2 = relationship("ScreeningResultV2", back_populates="listing")


# ---------------------------------------------------------------------------
# Symbol history — append-only log of symbol and name changes
# ---------------------------------------------------------------------------

class SymbolHistory(Base):
    """
    Append-only record of symbol/name changes.

    Never update historical rows — always insert new ones.
    This lets us resolve any historical reference to the current issuer.
    """
    __tablename__ = "symbol_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    issuer_id = Column(BigInteger, ForeignKey("issuers.id"), nullable=False, index=True)
    exchange_code = Column(String(5), nullable=False)
    old_symbol = Column(String(30), nullable=True)
    new_symbol = Column(String(30), nullable=True)
    old_name = Column(Text, nullable=True)
    new_name = Column(Text, nullable=True)
    effective_date = Column(Date, nullable=True)
    source_url = Column(Text, nullable=True)
    source_ref = Column(Text, nullable=True)
    source_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    issuer = relationship("Issuer", back_populates="symbol_history")


# ---------------------------------------------------------------------------
# Filing — a single document filed at an exchange
# ---------------------------------------------------------------------------

class FilingV2(Base):
    """
    Represents one document (annual report, financial results, shareholding, etc.)
    filed at NSE or BSE.

    Deduplication: same issuer + filing_type + period_end + content_sha256
    is treated as one filing.  Revisions get a new sha256 and a new row.
    """
    __tablename__ = "filings_v2"
    __table_args__ = (
        UniqueConstraint(
            "issuer_id", "filing_type", "period_end_date", "content_sha256",
            name="uq_filing_v2_issuer_type_period_hash"
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    issuer_id = Column(BigInteger, ForeignKey("issuers.id"), nullable=False, index=True)
    raw_artifact_id = Column(BigInteger, ForeignKey("raw_artifacts.id"), nullable=True, index=True)
    filing_type = Column(String(40), nullable=False, index=True)
    filing_subtype = Column(String(60), nullable=True)
    exchange_code = Column(String(5), nullable=True)
    period_type = Column(String(20), nullable=True)
    period_end_date = Column(Date, nullable=True, index=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    document_url = Column(Text, nullable=False)
    source_ref = Column(Text, nullable=True)
    source_priority = Column(Integer, nullable=False, default=1)
    is_mirrored_copy = Column(Boolean, nullable=False, default=False)
    content_sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)

    issuer = relationship("Issuer", back_populates="filings")
    raw_artifact = relationship("RawArtifact", back_populates="filings")
    fundamentals_snapshots = relationship("FundamentalsSnapshot", back_populates="filing")


# ---------------------------------------------------------------------------
# Market price daily — EOD OHLCV from official bhavcopy
# ---------------------------------------------------------------------------

class MarketPriceDaily(Base):
    """
    Official end-of-day price bar sourced from NSE bhavcopy or BSE EOD archive.

    Raw close is immutable.  adjusted_close_price is derived from corporate actions
    and should be recomputed after split/bonus events — never store it as the only copy.
    """
    __tablename__ = "market_prices_daily"
    __table_args__ = (
        UniqueConstraint("listing_id", "trade_date", name="uq_market_price_listing_date"),
        Index("idx_price_listing_trade_date", "listing_id", "trade_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    listing_id = Column(BigInteger, ForeignKey("listings_v2.id"), nullable=False, index=True)
    trade_date = Column(Date, nullable=False, index=True)
    open_price = Column(Numeric(18, 6), nullable=True)
    high_price = Column(Numeric(18, 6), nullable=True)
    low_price = Column(Numeric(18, 6), nullable=True)
    close_price = Column(Numeric(18, 6), nullable=False)
    volume = Column(BigInteger, nullable=True)
    turnover_value = Column(Numeric(24, 2), nullable=True)
    source_name = Column(String(40), nullable=False, default="nse_bhavcopy")
    source_url = Column(Text, nullable=True)
    fetched_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    adjusted_close_price = Column(Numeric(18, 6), nullable=True)
    adjustment_factor = Column(Numeric(18, 10), nullable=True)
    quality_flags = Column(JSON, nullable=False, default=list)

    listing = relationship("ListingV2", back_populates="daily_prices")


# ---------------------------------------------------------------------------
# Fundamentals snapshot — immutable financial data point for a given period
# ---------------------------------------------------------------------------

class FundamentalsSnapshot(Base):
    """
    Immutable snapshot of key financial metrics for one issuer at one period.

    Basis field distinguishes annual_audited (highest trust) from quarterly_reported
    (unaudited) and ttm_derived (computed, lower trust).

    source_refs_json: list of {label, url, hash} objects tracing each figure back to a filing.
    """
    __tablename__ = "fundamentals_snapshots"
    __table_args__ = (
        UniqueConstraint(
            "issuer_id", "snapshot_date", "basis", "filing_id",
            name="uq_fundamentals_issuer_date_basis_filing"
        ),
        Index("idx_fundamentals_issuer_snapshot", "issuer_id", "snapshot_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    issuer_id = Column(BigInteger, ForeignKey("issuers.id"), nullable=False, index=True)
    filing_id = Column(BigInteger, ForeignKey("filings_v2.id"), nullable=True, index=True)
    snapshot_date = Column(Date, nullable=False)
    basis = Column(
        String(30),
        CheckConstraint("basis IN ('annual_audited','quarterly_reported','ttm_derived','manual_review')"),
        nullable=False,
    )
    currency_code = Column(String(3), nullable=False, default="INR")
    revenue = Column(Numeric(24, 2), nullable=True)
    ebitda = Column(Numeric(24, 2), nullable=True)
    net_income = Column(Numeric(24, 2), nullable=True)
    total_debt = Column(Numeric(24, 2), nullable=True)
    cash_and_equivalents = Column(Numeric(24, 2), nullable=True)
    interest_expense = Column(Numeric(24, 2), nullable=True)
    non_operating_income = Column(Numeric(24, 2), nullable=True)
    shares_outstanding = Column(Numeric(24, 2), nullable=True)
    market_cap = Column(Numeric(24, 2), nullable=True)
    average_market_cap_24m = Column(Numeric(24, 2), nullable=True)
    # Extended fields required for full halal screening parity with legacy halal_service
    accounts_receivable = Column(Numeric(24, 2), nullable=True)
    total_assets = Column(Numeric(24, 2), nullable=True)
    fixed_assets = Column(Numeric(24, 2), nullable=True)
    short_term_investments = Column(Numeric(24, 2), nullable=True)
    total_business_income = Column(Numeric(24, 2), nullable=True)
    interest_income = Column(Numeric(24, 2), nullable=True)  # distinct from interest_expense
    average_market_cap_36m = Column(Numeric(24, 2), nullable=True)  # S&P Shariah denominator
    data_source = Column(String(60), nullable=False, default="nse_xbrl")  # nse_xbrl | yfinance_fallback
    segment_revenue_json = Column(JSON, nullable=False, default=list)
    source_refs_json = Column(JSON, nullable=False, default=list)
    completeness_score = Column(Numeric(5, 2), nullable=True)
    stale_after = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)

    issuer = relationship("Issuer", back_populates="fundamentals_snapshots")
    filing = relationship("FilingV2", back_populates="fundamentals_snapshots")
    screening_results = relationship("ScreeningResultV2", back_populates="fundamentals_snapshot")


# ---------------------------------------------------------------------------
# Business activity review — manual + AI-assisted classification
# ---------------------------------------------------------------------------

class BusinessActivityReview(Base):
    """
    Human- or AI-assisted classification of a company's business activities.

    confidence_label reflects how certain the reviewer is.
    manual_override=True means a human explicitly confirmed or changed the verdict.
    effective_to=NULL means the review is current.

    evidence_json: list of {source, snippet, section, url, date} objects.
    prohibited_flags_json: list of triggered prohibition indicators.
    """
    __tablename__ = "business_activity_reviews"
    __table_args__ = (
        Index("idx_ba_review_issuer_status", "issuer_id", "review_status"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    issuer_id = Column(BigInteger, ForeignKey("issuers.id"), nullable=False, index=True)
    review_status = Column(
        String(25),
        CheckConstraint("review_status IN ('pass','fail','mixed','review_required','insufficient_data')"),
        nullable=False,
        index=True,
    )
    confidence_label = Column(
        String(10),
        CheckConstraint("confidence_label IN ('high','medium','low')"),
        nullable=False,
    )
    primary_business_summary = Column(Text, nullable=False)
    evidence_json = Column(JSON, nullable=False, default=list)
    prohibited_flags_json = Column(JSON, nullable=False, default=list)
    manual_override = Column(Boolean, nullable=False, default=False)
    reviewer_id = Column(String(100), nullable=True)
    effective_from = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    effective_to = Column(DateTime(timezone=True), nullable=True)

    issuer = relationship("Issuer", back_populates="business_activity_reviews")
    screening_results = relationship("ScreeningResultV2", back_populates="business_activity_review")


# ---------------------------------------------------------------------------
# Methodology version — versioned rule set for screening
# ---------------------------------------------------------------------------

class MethodologyVersion(Base):
    """
    A specific, versioned set of screening rules and thresholds.

    thresholds_json: {debt_ratio: 0.33, cash_ratio: 0.33, non_compliant_income_ratio: 0.05, ...}
    formulas_json: {debt_ratio: "total_debt / average_market_cap_24m", ...}

    Never hard-code thresholds in application code.
    """
    __tablename__ = "methodology_versions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    version_code = Column(String(30), nullable=False, unique=True, index=True)
    methodology_name = Column(String(120), nullable=False)
    thresholds_json = Column(JSON, nullable=False)
    formulas_json = Column(JSON, nullable=False)
    disclosure_text = Column(Text, nullable=False)
    status = Column(
        String(10),
        CheckConstraint("status IN ('draft','active','retired')"),
        nullable=False,
        default="draft",
        index=True,
    )
    effective_from = Column(DateTime(timezone=True), nullable=False)
    effective_to = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    screening_results = relationship("ScreeningResultV2", back_populates="methodology_version")


# ---------------------------------------------------------------------------
# Screening result v2 — methodology-versioned, explainable verdict
# ---------------------------------------------------------------------------

class ScreeningResultV2(Base):
    """
    A single screening verdict tied to a specific methodology version, fundamentals
    snapshot, and business activity review.

    explainability_json shape (matches the documented schema):
    {
      "overall_status": "pass|fail|review_required|insufficient_data",
      "short_reason": "...",
      "detailed_reason": "...",
      "methodology_version": "2026.04.1",
      "basis": { "financials_basis": "annual_audited", ... },
      "checks": [ {key, status, value, threshold, reason, source_refs, quality_flags} ],
      "last_updated": "...",
      "freshness": { "financials_as_of": "...", "price_as_of": "...", "stale": false }
    }
    """
    __tablename__ = "screening_results_v2"
    __table_args__ = (
        UniqueConstraint(
            "issuer_id", "methodology_version_id", "screened_at",
            name="uq_screening_result_v2_issuer_method_time"
        ),
        Index("idx_screening_v2_issuer_updated", "issuer_id", "last_updated"),
        Index("idx_screening_v2_listing", "listing_id"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    issuer_id = Column(BigInteger, ForeignKey("issuers.id"), nullable=False, index=True)
    listing_id = Column(BigInteger, ForeignKey("listings_v2.id"), nullable=True, index=True)
    methodology_version_id = Column(BigInteger, ForeignKey("methodology_versions.id"), nullable=False, index=True)
    fundamentals_snapshot_id = Column(BigInteger, ForeignKey("fundamentals_snapshots.id"), nullable=True)
    business_activity_review_id = Column(BigInteger, ForeignKey("business_activity_reviews.id"), nullable=True)
    overall_status = Column(
        String(20),
        CheckConstraint("overall_status IN ('pass','fail','review_required','insufficient_data')"),
        nullable=False,
        index=True,
    )
    short_reason = Column(Text, nullable=False)
    detailed_reason = Column(Text, nullable=False)
    explainability_json = Column(JSON, nullable=False)
    screened_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)
    last_updated = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    issuer = relationship("Issuer", back_populates="screening_results_v2")
    listing = relationship("ListingV2", back_populates="screening_snapshots_v2")
    methodology_version = relationship("MethodologyVersion", back_populates="screening_results")
    fundamentals_snapshot = relationship("FundamentalsSnapshot", back_populates="screening_results")
    business_activity_review = relationship("BusinessActivityReview", back_populates="screening_results")


# ---------------------------------------------------------------------------
# Audit event — immutable log of every significant data mutation
# ---------------------------------------------------------------------------

class AuditEventV2(Base):
    """
    Append-only audit log.  Every manual remap, methodology change, or reviewer
    decision must create a row here.

    before_json / after_json: snapshots of the changed record before and after.
    """
    __tablename__ = "audit_events_v2"
    __table_args__ = (
        Index("idx_audit_v2_entity", "entity_type", "entity_id"),
        Index("idx_audit_v2_created", "created_at"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    entity_type = Column(String(60), nullable=False)
    entity_id = Column(String(40), nullable=False)
    event_type = Column(String(80), nullable=False, index=True)
    actor = Column(String(120), nullable=False)
    before_json = Column(JSON, nullable=True)
    after_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, index=True)
