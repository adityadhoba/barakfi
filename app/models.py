"""
SQLAlchemy ORM models for Barakfi database.

Defines tables for stock universe, users, portfolios, watchlists,
compliance tracking, and research notes. All timestamps are UTC-aware.

Key relationships:
- User (1) -> (N) Portfolio, WatchlistEntry, SavedScreener, ResearchNote
- Portfolio (1) -> (N) PortfolioHolding, ResearchNote
- Stock (1) -> (N) PortfolioHolding, WatchlistEntry, ScreeningLog, ComplianceOverride
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import UTC, datetime
from app.database import Base


def utc_now() -> datetime:
    """Return current UTC time for column defaults."""
    return datetime.now(UTC)


# ============================================================================
# CORE ENTITIES: Stocks & Rules
# ============================================================================

class Stock(Base):
    """
    Equity security in the universe.

    Fields:
    - Market data: price, market_cap, exchange
    - Fundamentals: debt, revenue, income fields (used for screening)
    - Metadata: sector, country, data_source, is_active

    Relationships:
    - (1) stock -> (N) portfolio_holdings (positions in portfolios)
    - (1) stock -> (N) watchlist_entries (on watchlists)
    - (1) stock -> (N) screening_logs (audit trail)
    - (1) stock -> (N) compliance_overrides (manual decisions)
    """
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True)
    symbol = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    sector = Column(String, nullable=False)
    exchange = Column(String, nullable=False, default="NSE")
    market_cap = Column(Float, nullable=False, default=0.0)
    average_market_cap_36m = Column(Float, nullable=False, default=0.0)
    debt = Column(Float, nullable=False, default=0.0)
    revenue = Column(Float, nullable=False, default=0.0)
    total_business_income = Column(Float, nullable=False, default=0.0)
    interest_income = Column(Float, nullable=False, default=0.0)
    non_permissible_income = Column(Float, nullable=False, default=0.0)
    accounts_receivable = Column(Float, nullable=False, default=0.0)
    cash_and_equivalents = Column(Float, nullable=False, default=0.0)
    short_term_investments = Column(Float, nullable=False, default=0.0)
    fixed_assets = Column(Float, nullable=False, default=0.0)
    total_assets = Column(Float, nullable=False, default=0.0)
    price = Column(Float, nullable=False, default=0.0)
    currency = Column(String, nullable=False, default="INR")
    country = Column(String, nullable=False, default="India")
    data_source = Column(String, nullable=False, default="internal_seed")
    is_active = Column(Boolean, nullable=False, default=True)
    # Investment metrics
    beta = Column(Float, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    pe_ratio = Column(Float, nullable=True)
    eps = Column(Float, nullable=True)
    week_52_high = Column(Float, nullable=True)
    week_52_low = Column(Float, nullable=True)
    avg_volume = Column(Float, nullable=True)
    shares_outstanding = Column(Float, nullable=True)
    # Global identifiers
    isin = Column(String, nullable=True)
    exchange_code = Column(String, nullable=True, index=True)
    # Compliance
    compliance_rating = Column(Integer, nullable=True)
    last_compliance_change = Column(DateTime, nullable=True)
    is_etf = Column(Boolean, nullable=False, default=False)
    # Price change
    price_change_pct = Column(Float, nullable=True)


class ComplianceRuleVersion(Base):
    """
    Versioned snapshot of Shariah screening rules.

    Tracks rule changes over time for audit and rollback.

    Fields:
    - profile_code: Rule profile (india_strict, india_moderate)
    - version: Semantic version (e.g., "1.2.3")
    - status: draft | approved | archived
    - approved_by: Admin who approved (Clerk user ID)
    - effective_from: When rule takes effect
    - notes: Change summary
    """
    __tablename__ = "compliance_rule_versions"

    id = Column(Integer, primary_key=True)
    profile_code = Column(String, nullable=False, index=True)
    version = Column(String, nullable=False)
    status = Column(String, nullable=False, default="draft")
    approved_by = Column(String, nullable=True)
    notes = Column(Text, nullable=False, default="")
    effective_from = Column(DateTime, nullable=False, default=utc_now)
    source_summary = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=utc_now)


class User(Base):
    """
    User account linked to Clerk authentication.

    Fields:
    - auth_subject: Clerk user ID (unique)
    - auth_provider: "clerk" (can extend for other OAuth providers)
    - role: user | reviewer | admin | developer
    - is_active: Soft delete flag

    Relationships (cascade delete):
    - (1) user -> (1) user_settings
    - (1) user -> (N) portfolios
    - (1) user -> (N) watchlist_entries
    - (1) user -> (N) saved_screeners
    - (1) user -> (N) research_notes
    - (1) user -> (N) support_notes (created_by)
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    auth_provider = Column(String, nullable=False, default="clerk")
    auth_subject = Column(String, unique=True, index=True, nullable=False)  # Clerk user ID
    is_active = Column(Boolean, nullable=False, default=True)
    role = Column(String, nullable=False, default="user")  # admin | reviewer | developer | user
    created_at = Column(DateTime, nullable=False, default=utc_now)

    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    watchlist_entries = relationship("WatchlistEntry", back_populates="user", cascade="all, delete-orphan")
    saved_screeners = relationship("SavedScreener", back_populates="user", cascade="all, delete-orphan")
    research_notes = relationship("ResearchNote", back_populates="user", cascade="all, delete-orphan")
    support_notes = relationship("SupportNote", back_populates="user", cascade="all, delete-orphan")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    preferred_currency = Column(String, nullable=False, default="INR")
    risk_profile = Column(String, nullable=False, default="moderate")
    notifications_enabled = Column(Boolean, nullable=False, default=True)
    theme = Column(String, nullable=False, default="dark")
    created_at = Column(DateTime, nullable=False, default=utc_now)

    user = relationship("User", back_populates="settings")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    owner_name = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    base_currency = Column(String, nullable=False, default="INR")
    investment_objective = Column(String, nullable=False, default="Long-term halal investing")
    created_at = Column(DateTime, nullable=False, default=utc_now)

    user = relationship("User", back_populates="portfolios")
    holdings = relationship("PortfolioHolding", back_populates="portfolio", cascade="all, delete-orphan")
    research_notes = relationship("ResearchNote", back_populates="portfolio")


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id = Column(Integer, primary_key=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    quantity = Column(Float, nullable=False, default=0.0)
    average_buy_price = Column(Float, nullable=False, default=0.0)
    target_allocation_pct = Column(Float, nullable=False, default=0.0)
    thesis = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=utc_now)

    portfolio = relationship("Portfolio", back_populates="holdings")
    stock = relationship("Stock")


class WatchlistEntry(Base):
    __tablename__ = "watchlist_entries"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    owner_name = Column(String, nullable=False, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    notes = Column(Text, nullable=False, default="")
    added_at = Column(DateTime, nullable=False, default=utc_now)

    user = relationship("User", back_populates="watchlist_entries")
    stock = relationship("Stock")


class SavedScreener(Base):
    __tablename__ = "saved_screeners"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    search_query = Column(String, nullable=False, default="")
    sector = Column(String, nullable=False, default="All")
    status_filter = Column(String, nullable=False, default="all")
    halal_only = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=utc_now)

    user = relationship("User", back_populates="saved_screeners")


class ResearchNote(Base):
    __tablename__ = "research_notes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    note_type = Column(String, nullable=False, default="WATCH")
    summary = Column(String, nullable=False, default="")
    conviction = Column(String, nullable=False, default="medium")
    status_snapshot = Column(String, nullable=False, default="")
    notes = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=utc_now)

    user = relationship("User", back_populates="research_notes")
    portfolio = relationship("Portfolio", back_populates="research_notes")
    stock = relationship("Stock")


class ComplianceOverride(Base):
    __tablename__ = "compliance_overrides"

    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    decided_status = Column(String, nullable=False, default="CAUTIOUS")
    rationale = Column(Text, nullable=False, default="")
    decided_by = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    stock = relationship("Stock")


class SupportNote(Base):
    __tablename__ = "support_notes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    note = Column(Text, nullable=False, default="")
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    user = relationship("User", back_populates="support_notes")


class ComplianceReviewCase(Base):
    __tablename__ = "compliance_review_cases"

    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    requested_by = Column(String, nullable=False)
    assigned_to = Column(String, nullable=True)
    status = Column(String, nullable=False, default="open")
    priority = Column(String, nullable=False, default="normal")
    review_outcome = Column(String, nullable=True)
    summary = Column(String, nullable=False, default="")
    notes = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    stock = relationship("Stock")
    events = relationship("ComplianceReviewEvent", back_populates="review_case", cascade="all, delete-orphan")


class ComplianceReviewEvent(Base):
    __tablename__ = "compliance_review_events"

    id = Column(Integer, primary_key=True)
    review_case_id = Column(Integer, ForeignKey("compliance_review_cases.id"), nullable=False, index=True)
    action = Column(String, nullable=False)
    note = Column(Text, nullable=False, default="")
    actor = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)

    review_case = relationship("ComplianceReviewCase", back_populates="events")


class BrokerConnection(Base):
    """
    Tracks broker integrations per user.

    Stores connection state and encrypted credentials for supported brokers.
    Actual API key values are encrypted at rest; only the broker ID and
    connection status are stored in plaintext.
    """
    __tablename__ = "broker_connections"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    broker_id = Column(String, nullable=False, index=True)
    broker_name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")
    access_token_enc = Column(Text, nullable=True)
    refresh_token_enc = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    last_synced_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    user = relationship("User")


class ScreeningLog(Base):
    __tablename__ = "screening_logs"

    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    profile_code = Column(String, nullable=False, index=True)
    rule_version = Column(String, nullable=False)
    status = Column(String, nullable=False)
    triggered_reasons = Column(Text, nullable=False, default="")
    manual_review_flags = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=utc_now)

    stock = relationship("Stock")


class ComplianceHistory(Base):
    __tablename__ = "compliance_history"
    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    old_status = Column(String, nullable=False)
    new_status = Column(String, nullable=False)
    profile_code = Column(String, nullable=False, default="sp_shariah")
    old_rating = Column(Integer, nullable=True)
    new_rating = Column(Integer, nullable=True)
    changed_at = Column(DateTime, nullable=False, default=utc_now)
    stock = relationship("Stock")


class StockCollection(Base):
    __tablename__ = "stock_collections"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False, default="")
    icon = Column(String, nullable=False, default="")
    is_featured = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    entries = relationship("CollectionEntry", back_populates="collection", cascade="all, delete-orphan")


class CollectionEntry(Base):
    __tablename__ = "collection_entries"
    id = Column(Integer, primary_key=True)
    collection_id = Column(Integer, ForeignKey("stock_collections.id"), nullable=False, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, index=True)
    added_at = Column(DateTime, nullable=False, default=utc_now)
    collection = relationship("StockCollection", back_populates="entries")
    stock = relationship("Stock")


class SuperInvestor(Base):
    __tablename__ = "super_investors"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    firm = Column(String, nullable=False, default="")
    slug = Column(String, unique=True, index=True, nullable=False)
    bio = Column(Text, nullable=False, default="")
    image_url = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    holdings = relationship("SuperInvestorHolding", back_populates="investor", cascade="all, delete-orphan")


class SuperInvestorHolding(Base):
    __tablename__ = "super_investor_holdings"
    id = Column(Integer, primary_key=True)
    investor_id = Column(Integer, ForeignKey("super_investors.id"), nullable=False, index=True)
    symbol = Column(String, nullable=False)
    company_name = Column(String, nullable=False, default="")
    shares = Column(Float, nullable=False, default=0)
    value = Column(Float, nullable=False, default=0)
    pct_portfolio = Column(Float, nullable=False, default=0)
    as_of_date = Column(DateTime, nullable=False, default=utc_now)
    investor = relationship("SuperInvestor", back_populates="holdings")


class CoverageRequest(Base):
    __tablename__ = "coverage_requests"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    symbol = Column(String, nullable=False)
    exchange = Column(String, nullable=False, default="")
    status = Column(String, nullable=False, default="pending")
    result_status = Column(String, nullable=True)
    requested_at = Column(DateTime, nullable=False, default=utc_now)
    resolved_at = Column(DateTime, nullable=True)
    user = relationship("User")
