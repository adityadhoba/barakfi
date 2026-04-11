"""Investment metrics service — stock-level financial metrics for display."""

from __future__ import annotations


def get_investment_metrics(stock_data: dict) -> dict:
    """Compute display-ready investment metrics from a stock data dict."""
    market_cap = stock_data.get("market_cap", 0)
    debt = stock_data.get("debt", 0)
    revenue = stock_data.get("revenue", 0)
    total_assets = stock_data.get("total_assets", 0)
    cash = stock_data.get("cash_and_equivalents", 0)

    debt_to_equity = round(debt / max(total_assets - debt, 1), 2)
    debt_to_mcap = round(debt / max(market_cap, 1) * 100, 1)
    cash_to_mcap = round(cash / max(market_cap, 1) * 100, 1)

    return {
        "market_cap": market_cap,
        "debt": debt,
        "revenue": revenue,
        "total_assets": total_assets,
        "debt_to_equity": debt_to_equity,
        "debt_to_mcap_pct": debt_to_mcap,
        "cash_to_mcap_pct": cash_to_mcap,
    }
