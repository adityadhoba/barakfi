"""
ISIN-first data warehouse tables (additive to legacy `stocks`).

Official exchange ingestion targets these models; yfinance writes with source tags.
"""

from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import JSON
from sqlalchemy.orm import relationship

from app.database import Base
from app.models import utc_now


class DataIssuer(Base):
    """Legal issuer (company) keyed by canonical ISIN."""

    __tablename__ = "data_issuers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    canonical_isin = Column(String(12), nullable=False, unique=True, index=True)
    cin = Column(String(32), nullable=True)
    legal_name = Column(Text, nullable=False)
    display_name = Column(Text, nullable=False)
    industry_label = Column(Text, nullable=True)
    sector_label = Column(Text, nullable=True)
    coverage_universe = Column(String(64), nullable=False, default="nifty500")
    lifecycle_status = Column(String(32), nullable=False, default="active")
    first_seen_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    last_seen_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    securities = relationship("DataSecurity", back_populates="issuer")


class DataSecurity(Base):
    """Listed instrument (ISIN-level)."""

    __tablename__ = "data_securities"
    __table_args__ = (UniqueConstraint("isin", name="uq_data_securities_isin"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    issuer_id = Column(BigInteger, ForeignKey("data_issuers.id"), nullable=False, index=True)
    isin = Column(String(12), nullable=False, index=True)
    security_type = Column(String(32), nullable=False, default="EQUITY")
    face_value = Column(Numeric(18, 6), nullable=True)
    currency_code = Column(String(3), nullable=False, default="INR")
    active = Column(Boolean, nullable=False, default=True)

    issuer = relationship("DataIssuer", back_populates="securities")
    listings = relationship("DataListing", back_populates="security")


class DataListing(Base):
    """Exchange-specific listing (symbol + venue)."""

    __tablename__ = "data_listings"
    __table_args__ = (
        UniqueConstraint("exchange_code", "native_symbol", "series_code", name="uq_data_listings_ex_sym_series"),
        Index("ix_data_listings_native_symbol", "native_symbol"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    security_id = Column(BigInteger, ForeignKey("data_securities.id"), nullable=False, index=True)
    exchange_code = Column(String(8), nullable=False)  # NSE, BSE
    native_symbol = Column(String(64), nullable=False)
    series_code = Column(String(8), nullable=False, default="EQ")
    bse_scrip_code = Column(String(32), nullable=True, index=True)
    listing_date = Column(Date, nullable=True)
    listing_status = Column(String(32), nullable=True)
    trading_status = Column(String(32), nullable=True)
    is_primary = Column(Boolean, nullable=False, default=True)
    first_seen_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    last_seen_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    security = relationship("DataSecurity", back_populates="listings")
    symbol_aliases = relationship("DataListingSymbolAlias", back_populates="listing")
    price_rows = relationship("DataPriceDaily", back_populates="listing")


class DataListingSymbolAlias(Base):
    """Historical symbol/name changes for a listing."""

    __tablename__ = "data_listing_symbol_aliases"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    listing_id = Column(BigInteger, ForeignKey("data_listings.id"), nullable=False, index=True)
    old_symbol = Column(String(64), nullable=True)
    new_symbol = Column(String(64), nullable=True)
    old_name = Column(Text, nullable=True)
    new_name = Column(Text, nullable=True)
    effective_date = Column(Date, nullable=True)
    source_url = Column(Text, nullable=True)
    source_ref = Column(Text, nullable=True)
    source_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    listing = relationship("DataListing", back_populates="symbol_aliases")


class DataIngestionRun(Base):
    """Idempotent batch job run."""

    __tablename__ = "data_ingestion_runs"
    __table_args__ = (UniqueConstraint("idempotency_key", name="uq_data_ingestion_idempotency"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_name = Column(String(128), nullable=False, index=True)
    idempotency_key = Column(String(256), nullable=False)
    status = Column(String(32), nullable=False, default="queued")
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    attempt_count = Column(Integer, nullable=False, default=0)
    metrics_json = Column(JSON, nullable=False, default=dict)
    error_json = Column(JSON, nullable=False, default=dict)


class DataRawArtifact(Base):
    """Fetched raw file metadata (hash-deduplicated)."""

    __tablename__ = "data_raw_artifacts"
    __table_args__ = (
        UniqueConstraint("source_name", "source_url", "content_sha256", name="uq_data_raw_artifact"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_run_id = Column(BigInteger, ForeignKey("data_ingestion_runs.id"), nullable=True, index=True)
    source_name = Column(String(64), nullable=False)
    source_kind = Column(String(32), nullable=False)
    source_url = Column(Text, nullable=False)
    source_ref = Column(Text, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    fetched_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    http_status = Column(Integer, nullable=True)
    content_sha256 = Column(String(64), nullable=False)
    storage_path = Column(Text, nullable=True)
    headers_json = Column(JSON, nullable=False, default=dict)
    parse_status = Column(String(32), nullable=False, default="pending")


class DataFiling(Base):
    """Exchange or company filing reference."""

    __tablename__ = "data_filings"
    __table_args__ = (Index("ix_data_filings_issuer_type", "issuer_id", "filing_type", "period_end_date"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    issuer_id = Column(BigInteger, ForeignKey("data_issuers.id"), nullable=False, index=True)
    raw_artifact_id = Column(BigInteger, ForeignKey("data_raw_artifacts.id"), nullable=True)
    filing_type = Column(String(64), nullable=False)
    filing_subtype = Column(String(64), nullable=True)
    exchange_code = Column(String(8), nullable=True)
    period_type = Column(String(32), nullable=True)
    period_end_date = Column(Date, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    document_url = Column(Text, nullable=False)
    source_ref = Column(Text, nullable=True)
    content_sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class DataFinancialPeriod(Base):
    """Statement period (standalone/consolidated)."""

    __tablename__ = "data_financial_periods"
    __table_args__ = (Index("ix_data_fin_period_issuer_end", "issuer_id", "period_end_date"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    issuer_id = Column(BigInteger, ForeignKey("data_issuers.id"), nullable=False, index=True)
    filing_id = Column(BigInteger, ForeignKey("data_filings.id"), nullable=True)
    statement_scope = Column(String(32), nullable=False, default="CONSOLIDATED")
    period_type = Column(String(32), nullable=False)
    period_end_date = Column(Date, nullable=False)
    currency_code = Column(String(3), nullable=False, default="INR")
    auditor_name = Column(Text, nullable=True)
    auditor_opinion = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    facts = relationship("DataFinancialFact", back_populates="period")


class DataFinancialFact(Base):
    """Tall store of numeric facts per period."""

    __tablename__ = "data_financial_facts"
    __table_args__ = (Index("ix_data_fin_fact_period_metric", "period_id", "metric_code"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    period_id = Column(BigInteger, ForeignKey("data_financial_periods.id"), nullable=False, index=True)
    metric_code = Column(String(64), nullable=False)
    value_numeric = Column(Numeric(30, 8), nullable=True)
    value_text = Column(Text, nullable=True)
    unit = Column(String(32), nullable=False, default="INR")
    source_note = Column(Text, nullable=True)
    confidence = Column(Numeric(5, 4), nullable=True)
    provenance_json = Column(JSON, nullable=False, default=dict)
    source_name = Column(String(64), nullable=False, default="unknown")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    period = relationship("DataFinancialPeriod", back_populates="facts")


class DataCorporateEvent(Base):
    """Corporate action or scheme event."""

    __tablename__ = "data_corporate_events"
    __table_args__ = (UniqueConstraint("canonical_event_hash", name="uq_data_corp_event_hash"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    event_type = Column(String(64), nullable=False, index=True)
    source_name = Column(String(64), nullable=False)
    issuer_id = Column(BigInteger, ForeignKey("data_issuers.id"), nullable=True, index=True)
    filing_id = Column(BigInteger, ForeignKey("data_filings.id"), nullable=True)
    title = Column(Text, nullable=True)
    announced_at = Column(DateTime(timezone=True), nullable=True)
    ex_date = Column(Date, nullable=True)
    record_date = Column(Date, nullable=True)
    effective_date = Column(Date, nullable=True)
    status = Column(String(32), nullable=False, default="ANNOUNCED")
    ratio_numerator = Column(Numeric(20, 8), nullable=True)
    ratio_denominator = Column(Numeric(20, 8), nullable=True)
    cash_component = Column(Numeric(20, 8), nullable=True)
    details_json = Column(JSON, nullable=False, default=dict)
    requires_manual_review = Column(Boolean, nullable=False, default=False)
    canonical_event_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class DataCorporateEventParticipant(Base):
    __tablename__ = "data_corporate_event_participants"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    event_id = Column(BigInteger, ForeignKey("data_corporate_events.id"), nullable=False, index=True)
    participant_role = Column(String(64), nullable=False)
    issuer_id = Column(BigInteger, ForeignKey("data_issuers.id"), nullable=True)
    details_json = Column(JSON, nullable=False, default=dict)


class DataPriceDaily(Base):
    """EOD OHLCV per listing."""

    __tablename__ = "data_price_daily"
    __table_args__ = (
        UniqueConstraint("listing_id", "trade_date", "source_name", name="uq_data_price_listing_date_src"),
        Index("ix_data_price_listing_date", "listing_id", "trade_date"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    listing_id = Column(BigInteger, ForeignKey("data_listings.id"), nullable=False, index=True)
    trade_date = Column(Date, nullable=False)
    open_price = Column(Numeric(18, 6), nullable=True)
    high_price = Column(Numeric(18, 6), nullable=True)
    low_price = Column(Numeric(18, 6), nullable=True)
    close_price = Column(Numeric(18, 6), nullable=False)
    volume = Column(BigInteger, nullable=True)
    turnover_value = Column(Numeric(24, 2), nullable=True)
    source_name = Column(String(64), nullable=False, default="nse_bhavcopy")
    source_url = Column(Text, nullable=True)
    fetched_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    adjusted_close_price = Column(Numeric(18, 6), nullable=True)
    quality_flags_json = Column(JSON, nullable=False, default=list)

    listing = relationship("DataListing", back_populates="price_rows")


class DataScreeningMethodology(Base):
    """Versioned methodology config."""

    __tablename__ = "data_screening_methodologies"
    __table_args__ = (UniqueConstraint("version_code", name="uq_data_method_version"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    version_code = Column(String(32), nullable=False)
    methodology_name = Column(String(128), nullable=False)
    thresholds_json = Column(JSON, nullable=False, default=dict)
    formulas_json = Column(JSON, nullable=False, default=dict)
    disclosure_text = Column(Text, nullable=False, default="")
    status = Column(String(32), nullable=False, default="draft")
    effective_from = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    effective_to = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class DataScreeningSnapshot(Base):
    """Point-in-time screening output."""

    __tablename__ = "data_screening_snapshots"
    __table_args__ = (
        UniqueConstraint("listing_id", "methodology_id", "as_of_date", name="uq_data_snap_list_meth_date"),
        Index("ix_data_snap_listing_updated", "listing_id", "created_at"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    listing_id = Column(BigInteger, ForeignKey("data_listings.id"), nullable=False, index=True)
    methodology_id = Column(BigInteger, ForeignKey("data_screening_methodologies.id"), nullable=False, index=True)
    as_of_date = Column(Date, nullable=False)
    overall_status = Column(String(32), nullable=False)
    explainability_json = Column(JSON, nullable=False, default=dict)
    completeness_score = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class DataIngestionIssue(Base):
    """Connector/parser issues for operator queue."""

    __tablename__ = "data_ingestion_issues"
    __table_args__ = (Index("ix_data_ing_issue_open", "status", "created_at"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    run_id = Column(BigInteger, ForeignKey("data_ingestion_runs.id"), nullable=True, index=True)
    source_name = Column(String(64), nullable=False)
    listing_id = Column(BigInteger, ForeignKey("data_listings.id"), nullable=True)
    issuer_id = Column(BigInteger, ForeignKey("data_issuers.id"), nullable=True)
    issue_type = Column(String(64), nullable=False)
    severity = Column(String(16), nullable=False, default="WARN")
    payload_json = Column(JSON, nullable=False, default=dict)
    status = Column(String(32), nullable=False, default="OPEN")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
