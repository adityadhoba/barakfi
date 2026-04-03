"""
Investment metrics calculator.

Computes expected return, Sharpe ratio, volatility (beta proxy),
and dividend yield for use in the Investment Checklist UI.
"""

import math


def calculate_expected_return(price_history: list[float]) -> float | None:
    if not price_history or len(price_history) < 2:
        return None
    returns = []
    for i in range(1, len(price_history)):
        if price_history[i - 1] > 0:
            returns.append((price_history[i] - price_history[i - 1]) / price_history[i - 1])
    if not returns:
        return None
    avg_daily = sum(returns) / len(returns)
    annualized = avg_daily * 252
    return round(annualized * 100, 2)


def calculate_volatility(price_history: list[float]) -> float | None:
    if not price_history or len(price_history) < 10:
        return None
    returns = []
    for i in range(1, len(price_history)):
        if price_history[i - 1] > 0:
            returns.append((price_history[i] - price_history[i - 1]) / price_history[i - 1])
    if len(returns) < 2:
        return None
    mean = sum(returns) / len(returns)
    variance = sum((r - mean) ** 2 for r in returns) / (len(returns) - 1)
    daily_vol = math.sqrt(variance)
    annual_vol = daily_vol * math.sqrt(252)
    return round(annual_vol * 100, 2)


def calculate_sharpe_ratio(
    price_history: list[float],
    risk_free_rate: float = 0.065,
) -> float | None:
    expected = calculate_expected_return(price_history)
    vol = calculate_volatility(price_history)
    if expected is None or vol is None or vol == 0:
        return None
    sharpe = (expected / 100 - risk_free_rate) / (vol / 100)
    return round(sharpe, 2)


def get_investment_checklist(
    stock_info: dict,
    price_history: list[float] | None = None,
) -> dict:
    history = price_history or []
    return {
        "expected_return": calculate_expected_return(history),
        "volatility": calculate_volatility(history),
        "sharpe_ratio": calculate_sharpe_ratio(history),
        "beta": stock_info.get("beta"),
        "dividend_yield": stock_info.get("dividend_yield"),
        "pe_ratio": stock_info.get("pe_ratio"),
        "eps": stock_info.get("eps"),
    }
