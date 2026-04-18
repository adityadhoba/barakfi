"""Add ISIN-first data warehouse tables (additive).

Revision ID: 20260202_0001
Revises:
Create Date: 2026-02-02

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "20260202_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(bind, name: str) -> bool:
    return inspect(bind).has_table(name)


def upgrade() -> None:
    bind = op.get_bind()
    if _table_exists(bind, "data_issuers"):
        return  # already applied (e.g. via create_all)

    op.create_table(
        "data_issuers",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("canonical_isin", sa.String(length=12), nullable=False),
        sa.Column("cin", sa.String(length=32), nullable=True),
        sa.Column("legal_name", sa.Text(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("industry_label", sa.Text(), nullable=True),
        sa.Column("sector_label", sa.Text(), nullable=True),
        sa.Column("coverage_universe", sa.String(length=64), nullable=False),
        sa.Column("lifecycle_status", sa.String(length=32), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("canonical_isin"),
    )
    op.create_index(op.f("ix_data_issuers_canonical_isin"), "data_issuers", ["canonical_isin"], unique=False)

    op.create_table(
        "data_securities",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("issuer_id", sa.BigInteger(), nullable=False),
        sa.Column("isin", sa.String(length=12), nullable=False),
        sa.Column("security_type", sa.String(length=32), nullable=False),
        sa.Column("face_value", sa.Numeric(18, 6), nullable=True),
        sa.Column("currency_code", sa.String(length=3), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["issuer_id"], ["data_issuers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("isin", name="uq_data_securities_isin"),
    )
    op.create_index(op.f("ix_data_securities_isin"), "data_securities", ["isin"], unique=False)
    op.create_index(op.f("ix_data_securities_issuer_id"), "data_securities", ["issuer_id"], unique=False)

    op.create_table(
        "data_listings",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("security_id", sa.BigInteger(), nullable=False),
        sa.Column("exchange_code", sa.String(length=8), nullable=False),
        sa.Column("native_symbol", sa.String(length=64), nullable=False),
        sa.Column("series_code", sa.String(length=8), nullable=False),
        sa.Column("bse_scrip_code", sa.String(length=32), nullable=True),
        sa.Column("listing_date", sa.Date(), nullable=True),
        sa.Column("listing_status", sa.String(length=32), nullable=True),
        sa.Column("trading_status", sa.String(length=32), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["security_id"], ["data_securities.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exchange_code", "native_symbol", "series_code", name="uq_data_listings_ex_sym_series"),
    )
    op.create_index(op.f("ix_data_listings_native_symbol"), "data_listings", ["native_symbol"], unique=False)
    op.create_index(op.f("ix_data_listings_security_id"), "data_listings", ["security_id"], unique=False)
    op.create_index(op.f("ix_data_listings_bse_scrip_code"), "data_listings", ["bse_scrip_code"], unique=False)

    op.create_table(
        "data_listing_symbol_aliases",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.BigInteger(), nullable=False),
        sa.Column("old_symbol", sa.String(length=64), nullable=True),
        sa.Column("new_symbol", sa.String(length=64), nullable=True),
        sa.Column("old_name", sa.Text(), nullable=True),
        sa.Column("new_name", sa.Text(), nullable=True),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("source_ref", sa.Text(), nullable=True),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["data_listings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_data_listing_symbol_aliases_listing_id"),
        "data_listing_symbol_aliases",
        ["listing_id"],
        unique=False,
    )

    op.create_table(
        "data_ingestion_runs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("job_name", sa.String(length=128), nullable=False),
        sa.Column("idempotency_key", sa.String(length=256), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("metrics_json", sa.JSON(), nullable=False),
        sa.Column("error_json", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key", name="uq_data_ingestion_idempotency"),
    )
    op.create_index(op.f("ix_data_ingestion_runs_job_name"), "data_ingestion_runs", ["job_name"], unique=False)

    op.create_table(
        "data_raw_artifacts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("job_run_id", sa.BigInteger(), nullable=True),
        sa.Column("source_name", sa.String(length=64), nullable=False),
        sa.Column("source_kind", sa.String(length=32), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("source_ref", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("http_status", sa.Integer(), nullable=True),
        sa.Column("content_sha256", sa.String(length=64), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=True),
        sa.Column("headers_json", sa.JSON(), nullable=False),
        sa.Column("parse_status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["job_run_id"], ["data_ingestion_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_name", "source_url", "content_sha256", name="uq_data_raw_artifact"),
    )
    op.create_index(op.f("ix_data_raw_artifacts_job_run_id"), "data_raw_artifacts", ["job_run_id"], unique=False)

    op.create_table(
        "data_filings",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("issuer_id", sa.BigInteger(), nullable=False),
        sa.Column("raw_artifact_id", sa.BigInteger(), nullable=True),
        sa.Column("filing_type", sa.String(length=64), nullable=False),
        sa.Column("filing_subtype", sa.String(length=64), nullable=True),
        sa.Column("exchange_code", sa.String(length=8), nullable=True),
        sa.Column("period_type", sa.String(length=32), nullable=True),
        sa.Column("period_end_date", sa.Date(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("document_url", sa.Text(), nullable=False),
        sa.Column("source_ref", sa.Text(), nullable=True),
        sa.Column("content_sha256", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["issuer_id"], ["data_issuers.id"]),
        sa.ForeignKeyConstraint(["raw_artifact_id"], ["data_raw_artifacts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_data_filings_issuer_id"), "data_filings", ["issuer_id"], unique=False)
    op.create_index("ix_data_filings_issuer_type", "data_filings", ["issuer_id", "filing_type", "period_end_date"], unique=False)

    op.create_table(
        "data_financial_periods",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("issuer_id", sa.BigInteger(), nullable=False),
        sa.Column("filing_id", sa.BigInteger(), nullable=True),
        sa.Column("statement_scope", sa.String(length=32), nullable=False),
        sa.Column("period_type", sa.String(length=32), nullable=False),
        sa.Column("period_end_date", sa.Date(), nullable=False),
        sa.Column("currency_code", sa.String(length=3), nullable=False),
        sa.Column("auditor_name", sa.Text(), nullable=True),
        sa.Column("auditor_opinion", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["filing_id"], ["data_filings.id"]),
        sa.ForeignKeyConstraint(["issuer_id"], ["data_issuers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_data_financial_periods_issuer_id"), "data_financial_periods", ["issuer_id"], unique=False)
    op.create_index("ix_data_fin_period_issuer_end", "data_financial_periods", ["issuer_id", "period_end_date"], unique=False)

    op.create_table(
        "data_financial_facts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("period_id", sa.BigInteger(), nullable=False),
        sa.Column("metric_code", sa.String(length=64), nullable=False),
        sa.Column("value_numeric", sa.Numeric(30, 8), nullable=True),
        sa.Column("value_text", sa.Text(), nullable=True),
        sa.Column("unit", sa.String(length=32), nullable=False),
        sa.Column("source_note", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Numeric(5, 4), nullable=True),
        sa.Column("provenance_json", sa.JSON(), nullable=False),
        sa.Column("source_name", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["period_id"], ["data_financial_periods.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_data_financial_facts_period_id"), "data_financial_facts", ["period_id"], unique=False)
    op.create_index("ix_data_fin_fact_period_metric", "data_financial_facts", ["period_id", "metric_code"], unique=False)

    op.create_table(
        "data_corporate_events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("source_name", sa.String(length=64), nullable=False),
        sa.Column("issuer_id", sa.BigInteger(), nullable=True),
        sa.Column("filing_id", sa.BigInteger(), nullable=True),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("announced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ex_date", sa.Date(), nullable=True),
        sa.Column("record_date", sa.Date(), nullable=True),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("ratio_numerator", sa.Numeric(20, 8), nullable=True),
        sa.Column("ratio_denominator", sa.Numeric(20, 8), nullable=True),
        sa.Column("cash_component", sa.Numeric(20, 8), nullable=True),
        sa.Column("details_json", sa.JSON(), nullable=False),
        sa.Column("requires_manual_review", sa.Boolean(), nullable=False),
        sa.Column("canonical_event_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["filing_id"], ["data_filings.id"]),
        sa.ForeignKeyConstraint(["issuer_id"], ["data_issuers.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("canonical_event_hash", name="uq_data_corp_event_hash"),
    )
    op.create_index(op.f("ix_data_corporate_events_event_type"), "data_corporate_events", ["event_type"], unique=False)
    op.create_index(op.f("ix_data_corporate_events_issuer_id"), "data_corporate_events", ["issuer_id"], unique=False)

    op.create_table(
        "data_corporate_event_participants",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.BigInteger(), nullable=False),
        sa.Column("participant_role", sa.String(length=64), nullable=False),
        sa.Column("issuer_id", sa.BigInteger(), nullable=True),
        sa.Column("details_json", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["data_corporate_events.id"]),
        sa.ForeignKeyConstraint(["issuer_id"], ["data_issuers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_data_corporate_event_participants_event_id"),
        "data_corporate_event_participants",
        ["event_id"],
        unique=False,
    )

    op.create_table(
        "data_price_daily",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.BigInteger(), nullable=False),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("open_price", sa.Numeric(18, 6), nullable=True),
        sa.Column("high_price", sa.Numeric(18, 6), nullable=True),
        sa.Column("low_price", sa.Numeric(18, 6), nullable=True),
        sa.Column("close_price", sa.Numeric(18, 6), nullable=False),
        sa.Column("volume", sa.BigInteger(), nullable=True),
        sa.Column("turnover_value", sa.Numeric(24, 2), nullable=True),
        sa.Column("source_name", sa.String(length=64), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("adjusted_close_price", sa.Numeric(18, 6), nullable=True),
        sa.Column("quality_flags_json", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["data_listings.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id", "trade_date", "source_name", name="uq_data_price_listing_date_src"),
    )
    op.create_index(op.f("ix_data_price_daily_listing_id"), "data_price_daily", ["listing_id"], unique=False)
    op.create_index("ix_data_price_listing_date", "data_price_daily", ["listing_id", "trade_date"], unique=False)

    op.create_table(
        "data_screening_methodologies",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("version_code", sa.String(length=32), nullable=False),
        sa.Column("methodology_name", sa.String(length=128), nullable=False),
        sa.Column("thresholds_json", sa.JSON(), nullable=False),
        sa.Column("formulas_json", sa.JSON(), nullable=False),
        sa.Column("disclosure_text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("effective_to", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("version_code", name="uq_data_method_version"),
    )

    op.create_table(
        "data_screening_snapshots",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("listing_id", sa.BigInteger(), nullable=False),
        sa.Column("methodology_id", sa.BigInteger(), nullable=False),
        sa.Column("as_of_date", sa.Date(), nullable=False),
        sa.Column("overall_status", sa.String(length=32), nullable=False),
        sa.Column("explainability_json", sa.JSON(), nullable=False),
        sa.Column("completeness_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["data_listings.id"]),
        sa.ForeignKeyConstraint(["methodology_id"], ["data_screening_methodologies.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("listing_id", "methodology_id", "as_of_date", name="uq_data_snap_list_meth_date"),
    )
    op.create_index(op.f("ix_data_screening_snapshots_listing_id"), "data_screening_snapshots", ["listing_id"], unique=False)
    op.create_index("ix_data_snap_listing_updated", "data_screening_snapshots", ["listing_id", "created_at"], unique=False)

    op.create_table(
        "data_ingestion_issues",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("run_id", sa.BigInteger(), nullable=True),
        sa.Column("source_name", sa.String(length=64), nullable=False),
        sa.Column("listing_id", sa.BigInteger(), nullable=True),
        sa.Column("issuer_id", sa.BigInteger(), nullable=True),
        sa.Column("issue_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["issuer_id"], ["data_issuers.id"]),
        sa.ForeignKeyConstraint(["listing_id"], ["data_listings.id"]),
        sa.ForeignKeyConstraint(["run_id"], ["data_ingestion_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_data_ingestion_issues_run_id"), "data_ingestion_issues", ["run_id"], unique=False)
    op.create_index("ix_data_ing_issue_open", "data_ingestion_issues", ["status", "created_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    for name in (
        "data_ingestion_issues",
        "data_screening_snapshots",
        "data_screening_methodologies",
        "data_price_daily",
        "data_corporate_event_participants",
        "data_corporate_events",
        "data_financial_facts",
        "data_financial_periods",
        "data_filings",
        "data_raw_artifacts",
        "data_ingestion_runs",
        "data_listing_symbol_aliases",
        "data_listings",
        "data_securities",
        "data_issuers",
    ):
        if _table_exists(bind, name):
            op.drop_table(name)
