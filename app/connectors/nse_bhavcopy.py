"""
NSE Bhavcopy (EOD price) Connector — official daily end-of-day price data.

Fetches the official NSE bhavcopy CSV for a given trading date.
Bhavcopy is the authoritative source for Indian listed equity prices.

No paid API key required.

When a paid vendor is available later, it can be used for:
- Faster historical backfill (convenience only)
- Cross-verification of official prices
The official bhavcopy always takes precedence as the source of truth.
"""

from __future__ import annotations

import io
import logging
import zipfile
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

import pandas as pd

from app.connectors.base import BaseConnector, NSE_HEADERS, sha256_bytes

logger = logging.getLogger("barakfi.nse_bhavcopy")
UTC = timezone.utc

# NSE bhavcopy URL pattern — archives are available for any trading day
# Format: https://archives.nseindia.com/content/historical/EQUITIES/{year}/{month}/cm{DD}{MON}{YEAR}bhav.csv.zip
_BHAVCOPY_URL_TEMPLATE = (
    "https://archives.nseindia.com/content/historical/EQUITIES/{year}/{month}/"
    "cm{day}{month_upper}{year}bhav.csv.zip"
)

# NSE also maintains a "current" bhavcopy endpoint for the latest trading day:
NSE_BHAVCOPY_CURRENT_URL = "https://archives.nseindia.com/products/content/sec_bhavdata_full_28052024.csv"


def _bhavcopy_url(trade_date: date) -> str:
    """Build the NSE bhavcopy archive URL for a given trading date."""
    return (
        f"https://archives.nseindia.com/content/historical/EQUITIES/"
        f"{trade_date.year}/{trade_date.strftime('%b').upper()}/"
        f"cm{trade_date.strftime('%d').upper()}"
        f"{trade_date.strftime('%b').upper()}"
        f"{trade_date.year}bhav.csv.zip"
    )


class NSEBhavCopyConnector(BaseConnector):
    """
    Downloads and parses NSE bhavcopy ZIP archives.

    Returns normalised DataFrames suitable for inserting into market_prices_daily.
    Columns: symbol, series, open_price, high_price, low_price, close_price,
             volume, turnover_value, trade_date, source_url, source_name
    """

    source_name = "nse_bhavcopy"
    default_headers = NSE_HEADERS

    def fetch_bhavcopy(
        self,
        trade_date: date,
        db_session=None,
        job_run_id: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Fetch and parse the NSE bhavcopy for a given date.

        Returns empty DataFrame if the date is not a trading day or data is unavailable.
        """
        url = _bhavcopy_url(trade_date)
        logger.info("Fetching NSE bhavcopy for %s: %s", trade_date.isoformat(), url)

        try:
            content, http_status = self.fetch(url)
        except Exception as exc:
            logger.warning("Bhavcopy fetch failed for %s: %s", trade_date.isoformat(), exc)
            return pd.DataFrame()

        if db_session is not None:
            self.record_artifact(
                db_session=db_session,
                url=url,
                content=content,
                source_kind="zip",
                published_at=datetime.combine(trade_date, datetime.min.time()).replace(tzinfo=UTC),
                job_run_id=job_run_id,
                http_status=http_status,
            )

        df = self._parse_bhavcopy_zip(content, trade_date, url)
        logger.info("Bhavcopy %s: %d rows parsed", trade_date.isoformat(), len(df))
        return df

    def _parse_bhavcopy_zip(self, content: bytes, trade_date: date, source_url: str) -> pd.DataFrame:
        """Extract and parse the CSV inside the bhavcopy ZIP."""
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as zf:
                csv_name = next((n for n in zf.namelist() if n.endswith(".csv")), None)
                if not csv_name:
                    logger.warning("No CSV found inside bhavcopy ZIP for %s", trade_date)
                    return pd.DataFrame()
                with zf.open(csv_name) as f:
                    df = pd.read_csv(f)
        except zipfile.BadZipFile:
            # Some dates serve CSV directly rather than ZIP
            try:
                df = pd.read_csv(io.BytesIO(content))
            except Exception as exc:
                logger.warning("Could not parse bhavcopy for %s: %s", trade_date, exc)
                return pd.DataFrame()
        except Exception as exc:
            logger.warning("Error reading bhavcopy ZIP for %s: %s", trade_date, exc)
            return pd.DataFrame()

        df.columns = [c.strip().upper() for c in df.columns]

        rename = {
            "SYMBOL": "symbol",
            "SERIES": "series",
            "OPEN": "open_price",
            "HIGH": "high_price",
            "LOW": "low_price",
            "CLOSE": "close_price",
            "TOTTRDQTY": "volume",
            "TOTTRDVAL": "turnover_value",
            "ISIN": "isin",
        }
        df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})

        # Keep only EQ (equity) series by default
        if "series" in df.columns:
            df = df[df["series"].str.strip() == "EQ"].copy()

        numeric_cols = ["open_price", "high_price", "low_price", "close_price", "volume", "turnover_value"]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        df["trade_date"] = trade_date
        df["source_url"] = source_url
        df["source_name"] = self.source_name
        df["exchange_code"] = "NSE"

        keep = ["symbol", "series", "isin", "open_price", "high_price", "low_price",
                "close_price", "volume", "turnover_value", "trade_date", "source_url",
                "source_name", "exchange_code"]
        return df[[c for c in keep if c in df.columns]].reset_index(drop=True)

    def fetch_date_range(
        self,
        start: date,
        end: date,
        db_session=None,
        job_run_id: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Fetch bhavcopy for every calendar day in [start, end].
        Non-trading days (no data) are silently skipped.
        """
        frames: List[pd.DataFrame] = []
        current = start
        while current <= end:
            df = self.fetch_bhavcopy(current, db_session=db_session, job_run_id=job_run_id)
            if not df.empty:
                frames.append(df)
            current += timedelta(days=1)

        if not frames:
            return pd.DataFrame()
        return pd.concat(frames, ignore_index=True)
