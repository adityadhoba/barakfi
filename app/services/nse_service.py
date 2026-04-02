from typing import Any

import requests


def fetch_stock(symbol: str) -> dict[str, Any]:
    url = f"https://www.nseindia.com/api/quote-equity?symbol={symbol.upper()}"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
    }

    session = requests.Session()
    session.get("https://www.nseindia.com", headers=headers, timeout=10)
    response = session.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    return response.json()
