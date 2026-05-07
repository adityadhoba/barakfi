"""Add account, usage, waitlist, and export tracking tables.

Revision ID: 20260507_0002
Revises: 20260202_0001
Create Date: 2026-05-07

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260507_0002"
down_revision: Union[str, None] = "20260202_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(bind, name: str) -> bool:
    return inspect(bind).has_table(name)


def _column_names(bind, table_name: str) -> set[str]:
    inspector = inspect(bind)
    if not inspector.has_table(table_name):
        return set()
    return {col["name"] for col in inspector.get_columns(table_name)}


def _has_unique(bind, table_name: str, name: str) -> bool:
    inspector = inspect(bind)
    for constraint in inspector.get_unique_constraints(table_name):
        if constraint.get("name") == name:
            return True
    for idx in inspector.get_indexes(table_name):
        if idx.get("name") == name and idx.get("unique"):
            return True
    return False


def upgrade() -> None:
    bind = op.get_bind()
    user_columns = _column_names(bind, "users")

    if "image_url" not in user_columns:
        op.add_column("users", sa.Column("image_url", sa.Text(), nullable=True))
    if "plan_key" not in user_columns:
        op.add_column("users", sa.Column("plan_key", sa.String(), nullable=False, server_default="free"))
        op.create_index(op.f("ix_users_plan_key"), "users", ["plan_key"], unique=False)
    if "status" not in user_columns:
        op.add_column("users", sa.Column("status", sa.String(), nullable=False, server_default="active"))
        op.create_index(op.f("ix_users_status"), "users", ["status"], unique=False)
    if "updated_at" not in user_columns:
        op.add_column("users", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))
    if "last_seen_at" not in user_columns:
        op.add_column("users", sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))
    if "deleted_at" not in user_columns:
        op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))

    if _table_exists(bind, "watchlist_entries") and not _has_unique(bind, "watchlist_entries", "uq_watchlist_user_stock"):
        op.create_unique_constraint("uq_watchlist_user_stock", "watchlist_entries", ["user_id", "stock_id"])

    if not _table_exists(bind, "plans"):
        op.create_table(
            "plans",
            sa.Column("key", sa.String(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("max_reports_per_month", sa.Integer(), nullable=False, server_default="50"),
            sa.Column("max_watchlist_items", sa.Integer(), nullable=False, server_default="25"),
            sa.Column("alerts_allowed", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("advanced_filters_allowed", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("export_allowed", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("compare_allowed", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("portfolio_allowed", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("historical_tracking_allowed", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("key"),
        )

    if not _table_exists(bind, "monthly_usage"):
        op.create_table(
            "monthly_usage",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("usage_month", sa.String(), nullable=False),
            sa.Column("reports_used", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("watchlist_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "usage_month", name="uq_monthly_usage_user_month"),
        )
        op.create_index(op.f("ix_monthly_usage_user_id"), "monthly_usage", ["user_id"], unique=False)
        op.create_index(op.f("ix_monthly_usage_usage_month"), "monthly_usage", ["usage_month"], unique=False)

    if not _table_exists(bind, "report_usage_events"):
        op.create_table(
            "report_usage_events",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("stock_symbol", sa.String(), nullable=False),
            sa.Column("exchange", sa.String(), nullable=False, server_default="NSE"),
            sa.Column("usage_date", sa.Date(), nullable=False),
            sa.Column("usage_month", sa.String(), nullable=False),
            sa.Column("counted", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("reason", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "stock_symbol", "usage_date", name="uq_report_usage_user_symbol_date"),
        )
        op.create_index(op.f("ix_report_usage_events_user_id"), "report_usage_events", ["user_id"], unique=False)
        op.create_index(op.f("ix_report_usage_events_stock_symbol"), "report_usage_events", ["stock_symbol"], unique=False)
        op.create_index(op.f("ix_report_usage_events_usage_date"), "report_usage_events", ["usage_date"], unique=False)
        op.create_index(op.f("ix_report_usage_events_usage_month"), "report_usage_events", ["usage_month"], unique=False)

    if not _table_exists(bind, "screening_report_history"):
        op.create_table(
            "screening_report_history",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("stock_symbol", sa.String(), nullable=False),
            sa.Column("exchange", sa.String(), nullable=False, server_default="NSE"),
            sa.Column("company_name", sa.String(), nullable=True),
            sa.Column("sector", sa.String(), nullable=True),
            sa.Column("screening_method", sa.String(), nullable=False, server_default="AAOIFI_ALIGNED"),
            sa.Column("result_status", sa.String(), nullable=True),
            sa.Column("data_period", sa.String(), nullable=True),
            sa.Column("debt_ratio", sa.Numeric(10, 4), nullable=True),
            sa.Column("interest_income_ratio", sa.Numeric(10, 4), nullable=True),
            sa.Column("business_activity_status", sa.String(), nullable=True),
            sa.Column("receivables_ratio", sa.Numeric(10, 4), nullable=True),
            sa.Column("report_version", sa.String(), nullable=True),
            sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_screening_report_history_user_id"), "screening_report_history", ["user_id"], unique=False)
        op.create_index(op.f("ix_screening_report_history_stock_symbol"), "screening_report_history", ["stock_symbol"], unique=False)
        op.create_index(op.f("ix_screening_report_history_opened_at"), "screening_report_history", ["opened_at"], unique=False)

    if not _table_exists(bind, "feature_waitlist"):
        op.create_table(
            "feature_waitlist",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("feature_key", sa.String(), nullable=False),
            sa.Column("source", sa.String(), nullable=False),
            sa.Column("message", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email", "feature_key", name="uq_feature_waitlist_email_feature"),
        )
        op.create_index(op.f("ix_feature_waitlist_user_id"), "feature_waitlist", ["user_id"], unique=False)
        op.create_index(op.f("ix_feature_waitlist_email"), "feature_waitlist", ["email"], unique=False)
        op.create_index(op.f("ix_feature_waitlist_feature_key"), "feature_waitlist", ["feature_key"], unique=False)

    if not _table_exists(bind, "analytics_events"):
        op.create_table(
            "analytics_events",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("anonymous_id", sa.String(), nullable=True),
            sa.Column("event_name", sa.String(), nullable=False),
            sa.Column("properties", sa.JSON(), nullable=False),
            sa.Column("page_path", sa.String(), nullable=True),
            sa.Column("ip_hash", sa.String(), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_analytics_events_user_id"), "analytics_events", ["user_id"], unique=False)
        op.create_index(op.f("ix_analytics_events_anonymous_id"), "analytics_events", ["anonymous_id"], unique=False)
        op.create_index(op.f("ix_analytics_events_event_name"), "analytics_events", ["event_name"], unique=False)
        op.create_index(op.f("ix_analytics_events_created_at"), "analytics_events", ["created_at"], unique=False)

    if not _table_exists(bind, "audit_logs"):
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("action", sa.String(), nullable=False),
            sa.Column("ip_hash", sa.String(), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("metadata", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_audit_logs_user_id"), "audit_logs", ["user_id"], unique=False)
        op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False)
        op.create_index(op.f("ix_audit_logs_created_at"), "audit_logs", ["created_at"], unique=False)

    if not _table_exists(bind, "data_export_requests"):
        op.create_table(
            "data_export_requests",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="requested"),
            sa.Column("file_url", sa.Text(), nullable=True),
            sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_data_export_requests_user_id"), "data_export_requests", ["user_id"], unique=False)
        op.create_index(op.f("ix_data_export_requests_requested_at"), "data_export_requests", ["requested_at"], unique=False)

    if not _table_exists(bind, "account_deletion_requests"):
        op.create_table(
            "account_deletion_requests",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("clerk_user_id", sa.String(), nullable=False),
            sa.Column("status", sa.String(), nullable=False, server_default="requested"),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("scheduled_delete_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_account_deletion_requests_user_id"), "account_deletion_requests", ["user_id"], unique=False)
        op.create_index(op.f("ix_account_deletion_requests_clerk_user_id"), "account_deletion_requests", ["clerk_user_id"], unique=False)
        op.create_index(op.f("ix_account_deletion_requests_requested_at"), "account_deletion_requests", ["requested_at"], unique=False)

    op.execute(
        sa.text(
            """
            INSERT INTO plans (
                key, name, max_reports_per_month, max_watchlist_items,
                alerts_allowed, advanced_filters_allowed, export_allowed,
                compare_allowed, portfolio_allowed, historical_tracking_allowed
            )
            VALUES (
                'free', 'Free', 50, 25, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE
            )
            ON CONFLICT (key) DO UPDATE SET
                name = EXCLUDED.name,
                max_reports_per_month = EXCLUDED.max_reports_per_month,
                max_watchlist_items = EXCLUDED.max_watchlist_items,
                alerts_allowed = EXCLUDED.alerts_allowed,
                advanced_filters_allowed = EXCLUDED.advanced_filters_allowed,
                export_allowed = EXCLUDED.export_allowed,
                compare_allowed = EXCLUDED.compare_allowed,
                portfolio_allowed = EXCLUDED.portfolio_allowed,
                historical_tracking_allowed = EXCLUDED.historical_tracking_allowed
            """
        )
    )


def downgrade() -> None:
    # This migration is intentionally additive and not safely reversible in-place.
    pass
