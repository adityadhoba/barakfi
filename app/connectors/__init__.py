"""Official-source connectors for NSE/BSE data ingestion.

Includes both the legacy warehouse client (NSEClient) used by the
data_warehouse ingestion pipeline and the newer base.py / v2 connectors.
"""

from app.connectors.nse_client import NSEClient

__all__ = ["NSEClient"]
