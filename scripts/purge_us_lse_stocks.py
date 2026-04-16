#!/usr/bin/env python3
"""
Hard-delete US/LSE stocks and dependent rows.

Usage:
  PYTHONPATH=. python3 scripts/purge_us_lse_stocks.py            # dry-run
  PYTHONPATH=. python3 scripts/purge_us_lse_stocks.py --execute  # apply deletes
"""

from __future__ import annotations

import argparse
from collections import OrderedDict

from sqlalchemy import text

from app.database import SessionLocal

TARGET_EXCHANGES = ("US", "LSE", "NYSE", "NASDAQ", "LON")

# (table_name, join_column)
DEPENDENCIES = [
    ("etf_holdings", "etf_stock_id"),
    ("stock_index_memberships", "stock_id"),
    ("portfolio_holdings", "stock_id"),
    ("watchlist_entries", "stock_id"),
    ("research_notes", "stock_id"),
    ("compliance_overrides", "stock_id"),
    ("compliance_review_cases", "stock_id"),
    ("screening_logs", "stock_id"),
    ("compliance_history", "stock_id"),
    ("collection_entries", "stock_id"),
    ("super_investor_holdings", "stock_id"),
]


def _in_clause(values: list[int]) -> str:
    if not values:
        return "(NULL)"
    return "(" + ",".join(str(v) for v in values) + ")"


def main() -> int:
    parser = argparse.ArgumentParser(description="Purge US/LSE stock rows and dependent records.")
    parser.add_argument("--execute", action="store_true", help="Apply deletes. Default is dry-run.")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        exchange_clause = ",".join(f"'{ex}'" for ex in TARGET_EXCHANGES)
        target_rows = db.execute(
            text(
                f"""
                SELECT id, symbol, exchange
                FROM stocks
                WHERE UPPER(exchange) IN ({exchange_clause})
                ORDER BY exchange, symbol
                """
            )
        ).fetchall()
        stock_ids = [int(r.id) for r in target_rows]
        target_symbols = [str(r.symbol) for r in target_rows]

        print(f"mode={'EXECUTE' if args.execute else 'DRY_RUN'}")
        print(f"target_exchanges={TARGET_EXCHANGES}")
        print(f"target_stock_count={len(stock_ids)}")
        if target_symbols:
            print("target_symbol_preview=" + ", ".join(target_symbols[:25]))

        if not stock_ids:
            print("Nothing to purge.")
            return 0

        stock_in = _in_clause(stock_ids)

        deleted_counts: OrderedDict[str, int] = OrderedDict()
        for table_name, col in DEPENDENCIES:
            count = db.execute(text(f"SELECT COUNT(*) FROM {table_name} WHERE {col} IN {stock_in}")).scalar() or 0
            deleted_counts[table_name] = int(count)
            if args.execute and count:
                db.execute(text(f"DELETE FROM {table_name} WHERE {col} IN {stock_in}"))

        # Symbol-keyed cleanup for non-FK tables
        symbol_in = "(" + ",".join(f"'{s}'" for s in target_symbols) + ")"
        alias_count = db.execute(
            text(
                f"""
                SELECT COUNT(*) FROM stock_symbol_aliases
                WHERE old_symbol IN {symbol_in} OR new_symbol IN {symbol_in}
                """
            )
        ).scalar() or 0
        deleted_counts["stock_symbol_aliases"] = int(alias_count)
        if args.execute and alias_count:
            db.execute(
                text(
                    f"""
                    DELETE FROM stock_symbol_aliases
                    WHERE old_symbol IN {symbol_in} OR new_symbol IN {symbol_in}
                    """
                )
            )

        corp_count = db.execute(
            text(
                f"""
                SELECT COUNT(*) FROM stock_corporate_events
                WHERE symbol IN {symbol_in}
                   OR successor_symbol IN {symbol_in}
                   OR canonical_symbol IN {symbol_in}
                """
            )
        ).scalar() or 0
        deleted_counts["stock_corporate_events"] = int(corp_count)
        if args.execute and corp_count:
            db.execute(
                text(
                    f"""
                    DELETE FROM stock_corporate_events
                    WHERE symbol IN {symbol_in}
                       OR successor_symbol IN {symbol_in}
                       OR canonical_symbol IN {symbol_in}
                    """
                )
            )

        stock_count = db.execute(text(f"SELECT COUNT(*) FROM stocks WHERE id IN {stock_in}")).scalar() or 0
        deleted_counts["stocks"] = int(stock_count)
        if args.execute and stock_count:
            db.execute(text(f"DELETE FROM stocks WHERE id IN {stock_in}"))

        post_active_non_nse = db.execute(
            text(
                f"""
                SELECT COUNT(*) FROM stocks
                WHERE is_active = 1
                  AND UPPER(exchange) IN ({exchange_clause})
                """
            )
        ).scalar() or 0

        print("delete_summary:")
        for table_name, count in deleted_counts.items():
            print(f"  {table_name}: {count}")
        print(f"post_active_us_lse_count={int(post_active_non_nse)}")

        if args.execute:
            db.commit()
            print("result=committed")
        else:
            db.rollback()
            print("result=dry_run_rollback")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"error={exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())

