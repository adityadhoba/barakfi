"""Official exchange ingestion connectors (NSE/BSE first; yfinance as fallback)."""

from app.connectors.nse_client import NSEClient

__all__ = ["NSEClient"]
