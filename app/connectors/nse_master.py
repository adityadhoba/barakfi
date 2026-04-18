"""
NSE Master Connector — official-source universe and reference data.

Fetches:
1. Nifty 500 constituent list (coverage universe)
2. NSE securities available for trading (symbol/ISIN master)
3. NSE symbol change history
4. NSE company name change history

All data is sourced from publicly available NSE downloads.
No paid API key required.

When a paid data provider is available, add it as a secondary enrichment layer
after the official source is already loaded — never replace official with vendor.
"""

from __future__ import annotations

import io
import logging
from datetime import datetime, timezone
from typing import Optional

import pandas as pd

from app.connectors.base import BaseConnector, NSE_HEADERS, sha256_bytes

logger = logging.getLogger("barakfi.nse_master")
UTC = timezone.utc

# Official NSE download URLs — these are stable public endpoints
NSE_NIFTY500_CSV_URL = "https://archives.nseindia.com/content/indices/ind_nifty500list.csv"
NSE_SECURITIES_CSV_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
NSE_SYMBOL_CHANGES_URL = "https://archives.nseindia.com/content/equities/symbolchange.csv"
NSE_NAME_CHANGES_URL = "https://archives.nseindia.com/content/equities/namechange.csv"

# BSE listed companies (for BSE scrip code cross-reference)
BSE_LISTED_CSV_URL = "https://api.bseindia.com/BseIndiaAPI/api/ListofScripData/w?Group=&Scripcode=&industry=&segment=Equity&status=Active"


class NSEMasterConnector(BaseConnector):
    """
    Downloads and normalises NSE reference/master data files.

    All fetched data is returned as pandas DataFrames with normalised column names.
    The caller is responsible for persisting to the database.
    """

    source_name = "nse_master"
    default_headers = NSE_HEADERS

    # ------------------------------------------------------------------
    # Nifty 500 constituent list
    # ------------------------------------------------------------------

    def fetch_nifty500(self) -> pd.DataFrame:
        """
        Download the Nifty 500 constituent CSV from NSE archives.

        Returns a DataFrame with columns:
            company_name, industry, symbol, series, isin_code
        """
        logger.info("Fetching Nifty 500 constituent list from NSE")
        content, _ = self.fetch(NSE_NIFTY500_CSV_URL)
        df = pd.read_csv(io.BytesIO(content))
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        rename = {
            "company_name": "company_name",
            "industry": "industry",
            "symbol": "symbol",
            "series": "series",
            "isin_code": "isin",
        }
        df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})

        df["symbol"] = df["symbol"].str.strip().str.upper()
        df["isin"] = df["isin"].str.strip()
        df["exchange_code"] = "NSE"
        df["coverage_universe"] = "nifty500"
        df["source_hash"] = sha256_bytes(content)
        logger.info("Nifty 500: %d rows fetched", len(df))
        return df

    # ------------------------------------------------------------------
    # NSE equity master (all listed securities)
    # ------------------------------------------------------------------

    def fetch_securities_master(self) -> pd.DataFrame:
        """
        Download the NSE EQUITY_L.csv — all securities available for trading.

        Returns a DataFrame with columns:
            symbol, name_of_company, series, date_of_listing, face_value, isin_number
        """
        logger.info("Fetching NSE securities master (EQUITY_L.csv)")
        content, _ = self.fetch(NSE_SECURITIES_CSV_URL)
        df = pd.read_csv(io.BytesIO(content))
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        rename = {
            "symbol": "symbol",
            "name_of_company": "company_name",
            "series": "series",
            "date_of_listing": "listing_date",
            "face_value": "face_value",
            "isin_number": "isin",
        }
        df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})

        df["symbol"] = df["symbol"].str.strip().str.upper()
        if "isin" in df.columns:
            df["isin"] = df["isin"].str.strip()
        df["exchange_code"] = "NSE"
        df["source_hash"] = sha256_bytes(content)
        logger.info("NSE securities master: %d rows fetched", len(df))
        return df

    # ------------------------------------------------------------------
    # Symbol change history
    # ------------------------------------------------------------------

    def fetch_symbol_changes(self) -> pd.DataFrame:
        """
        Download NSE symbol change history CSV.

        Returns a DataFrame with columns:
            old_symbol, new_symbol, company_name, date_of_change, isin
        """
        logger.info("Fetching NSE symbol change history")
        try:
            content, _ = self.fetch(NSE_SYMBOL_CHANGES_URL)
        except Exception as exc:
            logger.warning("Symbol changes fetch failed (non-fatal): %s", exc)
            return pd.DataFrame()

        df = pd.read_csv(io.BytesIO(content))
        df.columns = [c.strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns]

        rename = {
            "old_symbol": "old_symbol",
            "new_symbol": "new_symbol",
            "company_name": "company_name",
            "date_of_change": "effective_date",
        }
        df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})

        if "old_symbol" in df.columns:
            df["old_symbol"] = df["old_symbol"].str.strip().str.upper()
        if "new_symbol" in df.columns:
            df["new_symbol"] = df["new_symbol"].str.strip().str.upper()
        df["source_hash"] = sha256_bytes(content)
        logger.info("Symbol changes: %d rows fetched", len(df))
        return df

    # ------------------------------------------------------------------
    # Company name change history
    # ------------------------------------------------------------------

    def fetch_name_changes(self) -> pd.DataFrame:
        """
        Download NSE company name change history CSV.

        Returns a DataFrame with columns:
            symbol, old_name, new_name, date_of_change
        """
        logger.info("Fetching NSE company name change history")
        try:
            content, _ = self.fetch(NSE_NAME_CHANGES_URL)
        except Exception as exc:
            logger.warning("Name changes fetch failed (non-fatal): %s", exc)
            return pd.DataFrame()

        df = pd.read_csv(io.BytesIO(content))
        df.columns = [c.strip().lower().replace(" ", "_").replace("-", "_") for c in df.columns]

        rename = {
            "symbol": "symbol",
            "old_name": "old_name",
            "new_name": "new_name",
            "date_of_change": "effective_date",
        }
        df = df.rename(columns={k: v for k, v in rename.items() if k in df.columns})

        if "symbol" in df.columns:
            df["symbol"] = df["symbol"].str.strip().str.upper()
        df["source_hash"] = sha256_bytes(content)
        logger.info("Name changes: %d rows fetched", len(df))
        return df
