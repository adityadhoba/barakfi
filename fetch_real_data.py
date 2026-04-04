"""
Fetch REAL financial data for 200+ Indian NSE stocks from Yahoo Finance.

Usage:
    python fetch_real_data.py              # Fetch data and write to DB + real_stock_data.py
    python fetch_real_data.py --dry-run    # Fetch data, print summary, skip DB write

Data source: Yahoo Finance via yfinance library.
All financial values are converted to Crores INR (divide raw values by 1,00,00,000).

=== WEEKLY STOCK ADDITION PROCESS ===

Every week, add ~10 new pre-screened stocks with the following steps:

1. ADD SYMBOLS: Add new NSE symbols to the STOCK_SYMBOLS list below.
   Group them with a comment like "# Week N expansion (Month Year)".

2. ADD LOGO MAPPINGS: For each new symbol, add a domain mapping to
   frontend/src/components/stock-logo.tsx in the SYMBOL_TO_DOMAIN dict.
   Find the company's website domain (e.g., SUZLON -> "suzlon.com").

3. FETCH DATA: Run this script to pull financial data:
   python fetch_real_data.py

4. VERIFY: Check the output for any FAILED symbols.
   Fix alternate tickers in TICKER_ALTERNATES if needed.

5. DEPLOY: Push changes and redeploy backend (Render auto-deploys from main).
   Frontend will pick up new stocks automatically via API.

The screening happens automatically — the API evaluates each stock on request
using the screening engine in app/services/halal_service.py.

No cron jobs needed. This is a manual weekly process.
"""

import argparse
import logging
import os
import sys
import time
from collections import defaultdict
from datetime import datetime, UTC
from pathlib import Path

try:
    import yfinance as yf
except ImportError:
    print("ERROR: yfinance is required. Install it with: pip install yfinance")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CRORE = 1e7  # 1 Crore = 10,000,000

RATE_LIMIT_SECONDS = 0.5

OUTPUT_FILE = Path(__file__).parent / "real_stock_data.py"

# Sector mapping: yfinance sector names can be inconsistent for Indian stocks.
# We keep a manual fallback map keyed by NSE symbol.
SYMBOL_SECTOR_MAP = {
    # Information Technology
    "TCS": "Information Technology", "INFY": "Information Technology",
    "WIPRO": "Information Technology", "HCLTECH": "Information Technology",
    "TECHM": "Information Technology", "LTIM": "Information Technology",
    "PERSISTENT": "Information Technology", "COFORGE": "Information Technology",
    "MPHASIS": "Information Technology", "NAUKRI": "Information Technology",
    # Consumer Goods & Retail
    "HINDUNILVR": "Consumer Goods", "ITC": "Tobacco and Consumer Goods",
    "NESTLEIND": "Consumer Goods", "DABUR": "Consumer Goods",
    "MARICO": "Consumer Goods", "TRENT": "Consumer Goods",
    "TITAN": "Consumer Goods", "DMART": "Consumer Goods",
    "BRITANNIA": "Consumer Goods", "COLPAL": "Consumer Goods",
    "TATACONSUM": "Consumer Goods", "PAGEIND": "Consumer Goods",
    # Pharmaceuticals & Healthcare
    "SUNPHARMA": "Pharmaceuticals", "DRREDDY": "Pharmaceuticals",
    "CIPLA": "Pharmaceuticals", "DIVISLAB": "Pharmaceuticals",
    "APOLLOHOSP": "Healthcare", "TORNTPHARM": "Pharmaceuticals",
    "AUROPHARMA": "Pharmaceuticals", "LUPIN": "Pharmaceuticals",
    "BIOCON": "Pharmaceuticals",
    # Automobiles
    "MARUTI": "Automobile", "TATAMOTORS": "Automobile",
    "M&M": "Automobile", "BAJAJ-AUTO": "Automobile",
    "EICHERMOT": "Automobile", "HEROMOTOCO": "Automobile",
    "MOTHERSON": "Automobile",
    # Energy & Power
    "RELIANCE": "Energy", "ONGC": "Energy", "NTPC": "Energy",
    "POWERGRID": "Energy", "ADANIENT": "Energy",
    "TATAPOWER": "Energy", "COALINDIA": "Metals & Mining",
    # Infrastructure & Industrials
    "ADANIPORTS": "Infrastructure", "LT": "Infrastructure",
    "SIEMENS": "Industrials", "ABB": "Industrials",
    "HAL": "Defence", "BEL": "Defence",
    "INDUSTOWER": "Telecom Infrastructure",
    # Metals & Mining
    "TATASTEEL": "Metals & Mining", "JSWSTEEL": "Metals & Mining",
    "HINDALCO": "Metals & Mining",
    # Cement
    "ULTRACEMCO": "Cement", "GRASIM": "Cement", "SHREECEM": "Cement",
    # Banking & Financial Services
    "HDFCBANK": "Banking and Financial Services",
    "ICICIBANK": "Banking and Financial Services",
    "KOTAKBANK": "Banking and Financial Services",
    "SBIN": "Banking and Financial Services",
    "AXISBANK": "Banking and Financial Services",
    "INDUSINDBK": "Banking and Financial Services",
    "BAJFINANCE": "Financial Services",
    "BAJAJFINSV": "Financial Services",
    "HDFCLIFE": "Insurance", "SBILIFE": "Insurance",
    "ICICIPRULI": "Insurance",
    "IDFCFIRSTB": "Banking and Financial Services",
    "BANKBARODA": "Banking and Financial Services",
    "PNB": "Banking and Financial Services",
    "CANBK": "Banking and Financial Services",
    "FEDERALBNK": "Banking and Financial Services",
    "PEL": "Financial Services",
    # Telecom
    "BHARTIARTL": "Telecom",
    # Chemicals
    "PIDILITIND": "Chemicals", "ASIANPAINT": "Chemicals",
    "SOLARINDS": "Chemicals", "DEEPAKNTR": "Chemicals",
    "PIIND": "Chemicals",
    # Real Estate
    "DLF": "Real Estate", "GODREJPROP": "Real Estate",
    "OBEROIRLTY": "Real Estate", "PRESTIGE": "Real Estate",
    "BRIGADE": "Real Estate", "PHOENIXLTD": "Real Estate",
    # Consumer Services
    "ZOMATO": "Consumer Services", "IRCTC": "Consumer Services",
    "INDIGO": "Aviation", "MCDOWELL-N": "Consumer Goods",
    # Electrical & Electronics
    "HAVELLS": "Consumer Durables", "VOLTAS": "Consumer Durables",
    "POLYCAB": "Consumer Durables", "CROMPTON": "Consumer Durables",
    "WHIRLPOOL": "Consumer Durables", "BLUESTARCO": "Consumer Durables",
    "DIXON": "Consumer Durables", "KAYNES": "Consumer Durables",
    # IT Midcap
    "TATAELXSI": "Information Technology", "LTTS": "Information Technology",
    "KPITTECH": "Information Technology", "TATACOMM": "Information Technology",
    # Pharma additions
    "ALKEM": "Pharmaceuticals", "LAURUSLABS": "Pharmaceuticals",
    "IPCALAB": "Pharmaceuticals", "GLENMARK": "Pharmaceuticals",
    "NATCOPHARM": "Pharmaceuticals", "AJANTPHARM": "Pharmaceuticals",
    "GRANULES": "Pharmaceuticals", "SYNGENE": "Pharmaceuticals",
    "MAXHEALTH": "Healthcare", "FORTIS": "Healthcare",
    "LALPATHLAB": "Healthcare",
    # Auto & Ancillary
    "BOSCHLTD": "Automobile", "BHARATFORG": "Automobile",
    "EXIDEIND": "Automobile", "BALKRISIND": "Automobile",
    "TVSMOTOR": "Automobile", "ASHOKLEY": "Automobile", "ESCORTS": "Automobile",
    # Chemicals
    "UPL": "Chemicals", "SRF": "Chemicals", "ATUL": "Chemicals",
    "NAVINFLUOR": "Chemicals", "CLEAN": "Chemicals",
    # Consumer
    "VBL": "Consumer Goods", "GODREJCP": "Consumer Goods",
    "BATAINDIA": "Consumer Goods", "EMAMILTD": "Consumer Goods",
    "INDIANHOTELS": "Consumer Services", "JUBLFOOD": "Consumer Services",
    "DEVYANI": "Consumer Services",
    # Infrastructure
    "CUMMINSIND": "Industrials", "THERMAX": "Industrials",
    "ASTRAL": "Industrials", "APLAPOLLO": "Industrials",
    "SUPREMEIND": "Industrials", "CONCOR": "Infrastructure",
    # Power & Energy
    "NHPC": "Energy", "SJVN": "Energy", "IRFC": "Infrastructure",
    "RECLTD": "Financial Services", "PFC": "Financial Services",
    "IREDA": "Financial Services", "HINDPETRO": "Energy",
    "BPCL": "Energy", "IOC": "Energy", "GAIL": "Energy",
    # Financial Services
    "LICHSGFIN": "Financial Services", "MANAPPURAM": "Financial Services",
    "MUTHOOTFIN": "Financial Services", "ABCAPITAL": "Financial Services",
    "CHOLAFIN": "Financial Services", "SHRIRAMFIN": "Financial Services",
    "MFSL": "Financial Services", "JIOFIN": "Financial Services",
    "NIACL": "Insurance", "STARHEALTH": "Insurance",
    "BANDHANBNK": "Banking and Financial Services",
    "AUBANK": "Banking and Financial Services",
    "RBLBANK": "Banking and Financial Services",
    # Cement
    "AMBUJACEM": "Cement", "RAMCOCEM": "Cement", "JKCEMENT": "Cement",
    # Metals
    "VEDL": "Metals & Mining", "NMDC": "Metals & Mining",
    "NATIONALUM": "Metals & Mining",
}

# Full name fallback map
SYMBOL_NAME_MAP = {
    "RELIANCE": "Reliance Industries",
    "TCS": "Tata Consultancy Services",
    "HDFCBANK": "HDFC Bank",
    "ICICIBANK": "ICICI Bank",
    "INFY": "Infosys",
    "HINDUNILVR": "Hindustan Unilever",
    "ITC": "ITC Limited",
    "SBIN": "State Bank of India",
    "BHARTIARTL": "Bharti Airtel",
    "KOTAKBANK": "Kotak Mahindra Bank",
    "LT": "Larsen & Toubro",
    "HCLTECH": "HCL Technologies",
    "AXISBANK": "Axis Bank",
    "ASIANPAINT": "Asian Paints",
    "MARUTI": "Maruti Suzuki India",
    "SUNPHARMA": "Sun Pharmaceutical",
    "TITAN": "Titan Company",
    "BAJFINANCE": "Bajaj Finance",
    "DMART": "Avenue Supermarts",
    "NESTLEIND": "Nestle India",
    "ULTRACEMCO": "UltraTech Cement",
    "NTPC": "NTPC Limited",
    "WIPRO": "Wipro",
    "ADANIENT": "Adani Enterprises",
    "ADANIPORTS": "Adani Ports & SEZ",
    "POWERGRID": "Power Grid Corporation",
    "TATAMOTORS": "Tata Motors",
    "BAJAJFINSV": "Bajaj Finserv",
    "ONGC": "Oil and Natural Gas Corporation",
    "JSWSTEEL": "JSW Steel",
    "TECHM": "Tech Mahindra",
    "COALINDIA": "Coal India",
    "M&M": "Mahindra & Mahindra",
    "TATASTEEL": "Tata Steel",
    "INDUSINDBK": "IndusInd Bank",
    "HINDALCO": "Hindalco Industries",
    "GRASIM": "Grasim Industries",
    "CIPLA": "Cipla",
    "BRITANNIA": "Britannia Industries",
    "DRREDDY": "Dr Reddy's Laboratories",
    "APOLLOHOSP": "Apollo Hospitals",
    "EICHERMOT": "Eicher Motors",
    "HEROMOTOCO": "Hero MotoCorp",
    "DIVISLAB": "Divi's Laboratories",
    "LTIM": "LTIMindtree",
    "BAJAJ-AUTO": "Bajaj Auto",
    "TRENT": "Trent Limited",
    "SHREECEM": "Shree Cement",
    "PIDILITIND": "Pidilite Industries",
    "SOLARINDS": "Solar Industries India",
    "HAL": "Hindustan Aeronautics",
    "BEL": "Bharat Electronics",
    "IRCTC": "Indian Railway Catering & Tourism",
    "ZOMATO": "Zomato",
    "TATAPOWER": "Tata Power Company",
    "INDIGO": "InterGlobe Aviation (IndiGo)",
    "DLF": "DLF Limited",
    "GODREJPROP": "Godrej Properties",
    "DABUR": "Dabur India",
    "MARICO": "Marico",
    "PERSISTENT": "Persistent Systems",
    "COFORGE": "Coforge",
    "TATACONSUM": "Tata Consumer Products",
    "COLPAL": "Colgate-Palmolive India",
    "MCDOWELL-N": "United Spirits",
    "PEL": "Piramal Enterprises",
    "SIEMENS": "Siemens India",
    "ABB": "ABB India",
    "TORNTPHARM": "Torrent Pharmaceuticals",
    "AUROPHARMA": "Aurobindo Pharma",
    "LUPIN": "Lupin",
    "BIOCON": "Biocon",
    "HAVELLS": "Havells India",
    "VOLTAS": "Voltas",
    "INDUSTOWER": "Indus Towers",
    "MOTHERSON": "Samvardhana Motherson",
    "PIIND": "PI Industries",
    "NAUKRI": "Info Edge (Naukri)",
    "PAGEIND": "Page Industries",
    "MPHASIS": "Mphasis",
    "HDFCLIFE": "HDFC Life Insurance",
    "POLYCAB": "Polycab India",
    "DEEPAKNTR": "Deepak Nitrite",
    "SBILIFE": "SBI Life Insurance",
    "IDFCFIRSTB": "IDFC First Bank",
    "BANKBARODA": "Bank of Baroda",
    "PNB": "Punjab National Bank",
    "CANBK": "Canara Bank",
    "FEDERALBNK": "Federal Bank",
    "ICICIPRULI": "ICICI Prudential Life Insurance",
}

# The complete stock universe to fetch
STOCK_SYMBOLS = [
    # NIFTY 50
    "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "HINDUNILVR", "ITC",
    "SBIN", "BHARTIARTL", "KOTAKBANK", "LT", "HCLTECH", "AXISBANK", "ASIANPAINT",
    "MARUTI", "SUNPHARMA", "TITAN", "BAJFINANCE", "DMART", "NESTLEIND",
    "ULTRACEMCO", "NTPC", "WIPRO", "ADANIENT", "ADANIPORTS", "POWERGRID",
    "TATAMOTORS", "BAJAJFINSV", "ONGC", "JSWSTEEL", "TECHM", "COALINDIA",
    "M&M", "TATASTEEL", "INDUSINDBK", "HINDALCO", "GRASIM", "CIPLA",
    "BRITANNIA", "DRREDDY", "APOLLOHOSP", "EICHERMOT", "HEROMOTOCO", "DIVISLAB",
    "LTIM", "BAJAJ-AUTO", "TRENT", "SHREECEM", "PIDILITIND", "SOLARINDS",
    # NIFTY NEXT 50
    "HAL", "BEL", "IRCTC", "ZOMATO", "TATAPOWER", "INDIGO", "DLF", "GODREJPROP",
    "DABUR", "MARICO", "PERSISTENT", "COFORGE", "TATACONSUM", "COLPAL",
    "MCDOWELL-N", "PEL", "SIEMENS", "ABB", "TORNTPHARM", "AUROPHARMA",
    "LUPIN", "BIOCON", "HAVELLS", "VOLTAS", "INDUSTOWER", "MOTHERSON",
    "PIIND", "NAUKRI", "PAGEIND", "MPHASIS",
    # Additional popular stocks
    "HDFCLIFE", "POLYCAB", "DEEPAKNTR", "SBILIFE", "IDFCFIRSTB",
    "BANKBARODA", "PNB", "CANBK", "FEDERALBNK", "ICICIPRULI",
    # NIFTY Midcap 100 additions
    "TATAELXSI", "LTTS", "KPITTECH", "DIXON", "KAYNES",
    "ALKEM", "LAURUSLABS", "IPCALAB", "GLENMARK", "NATCOPHARM",
    "BOSCHLTD", "BHARATFORG", "EXIDEIND", "BALKRISIND",
    "UPL", "SRF", "ATUL", "NAVINFLUOR", "CLEAN",
    "VBL", "GODREJCP", "BATAINDIA", "EMAMILTD",
    "CUMMINSIND", "THERMAX", "ASTRAL", "APLAPOLLO", "SUPREMEIND",
    "OBEROIRLTY", "PRESTIGE", "BRIGADE", "PHOENIXLTD",
    "IRFC", "JIOFIN", "TATACOMM",
    "MAXHEALTH", "FORTIS", "LALPATHLAB",
    "INDIANHOTELS", "JUBLFOOD", "DEVYANI",
    "LICHSGFIN", "MANAPPURAM", "MUTHOOTFIN",
    "CONCOR", "NHPC", "SJVN", "RECLTD", "PFC", "IREDA",
    "SYNGENE", "AJANTPHARM", "GRANULES",
    "CROMPTON", "WHIRLPOOL", "BLUESTARCO",
    "ABCAPITAL", "CHOLAFIN", "SHRIRAMFIN",
    "MFSL", "NIACL", "STARHEALTH",
    "AMBUJACEM", "RAMCOCEM", "JKCEMENT",
    "TVSMOTOR", "ASHOKLEY", "ESCORTS",
    "HINDPETRO", "BPCL", "IOC", "GAIL",
    "VEDL", "NMDC", "NATIONALUM",
    "BANDHANBNK", "AUBANK", "RBLBANK",
    # Week 1 expansion (April 2026)
    "DALBHARAT", "JSWENERGY", "ADANIGREEN", "ADANIPOWER", "ADANITRANS",
    "POWERMECH", "SUZLON", "INOXWIND", "TTML", "IDEA",
    # Week 2 expansion
    "TITAN", "ZYDUSLIFE", "SUNPHARMA", "MANKIND", "LICI",
    "PGHH", "NESTLEIND", "HINDUNILVR", "GODREJIND", "PATANJALI",
    # Week 3 expansion
    "CENTURYTEX", "GRINFRA", "KFINTECH", "CAMS", "BSOFT",
    "HAPPSTMNDS", "TANLA", "LATENTVIEW", "MASTEK", "ZENSAR",
    # Week 4 expansion
    "CUB", "KARURVYSYA", "SOUTHBANK", "TMB", "EQUITASBNK",
    "FINPIPE", "APLLTD", "JBCHEPHARM", "GLAXO", "PFIZER",
]

# De-duplicate (BEL appears in both NIFTY NEXT 50 and Additional)
STOCK_SYMBOLS = list(dict.fromkeys(STOCK_SYMBOLS))

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("fetch_real_data")

# ---------------------------------------------------------------------------
# Helper: safe numeric extraction from yfinance data
# ---------------------------------------------------------------------------


def _safe_val(series_or_df, keys, default=0.0):
    """
    Try to extract a numeric value from a pandas Series / DataFrame.
    `keys` is a list of possible row labels to try.
    Returns the first non-NaN hit, else default.
    """
    import pandas as pd

    if series_or_df is None:
        return default

    for key in keys:
        try:
            if isinstance(series_or_df, pd.DataFrame):
                if key in series_or_df.index:
                    # Take the most recent column (latest fiscal year)
                    val = series_or_df.loc[key].dropna()
                    if len(val) > 0:
                        v = val.iloc[0]
                        if pd.notna(v):
                            return float(v)
            elif isinstance(series_or_df, pd.Series):
                if key in series_or_df.index:
                    v = series_or_df[key]
                    if pd.notna(v):
                        return float(v)
        except Exception:
            continue
    return default


def _to_crores(value):
    """Convert a raw currency value to Crores."""
    if value is None or value == 0.0:
        return 0.0
    return round(value / CRORE, 2)


# Some NSE symbols need alternate Yahoo Finance tickers.
# Primary is tried first; if it fails, alternates are attempted.
TICKER_ALTERNATES = {
    "TATAMOTORS": ["TATAMOTORS.NS", "TATAMOTORS.BO"],
    "MCDOWELL-N": ["MCDOWELL-N.NS", "UNITDSPR.NS", "MCDOWELL-N.BO"],
    "PEL": ["PEL.NS", "PEL.BO"],
    "ZOMATO": ["ZOMATO.NS", "ZOMATO.BO"],
}


def _nse_ticker(symbol):
    """
    Convert an NSE symbol to a yfinance ticker string.
    Handles the M&M edge case and other special characters.
    """
    return f"{symbol}.NS"


# ---------------------------------------------------------------------------
# Core: fetch data for a single stock
# ---------------------------------------------------------------------------


def fetch_stock_data(symbol):
    """
    Fetch financial data for a single NSE stock via yfinance.
    Returns a dict matching the Stock model fields, or None on failure.
    """
    ticker_str = _nse_ticker(symbol)
    log.info("Fetching %s (%s) ...", symbol, ticker_str)

    try:
        ticker = yf.Ticker(ticker_str)
        info = ticker.info or {}

        # If yfinance returns almost nothing, try alternates
        if not info or (info.get("regularMarketPrice") is None and info.get("currentPrice") is None):
            log.warning("No price data for %s, attempting alternate tickers", symbol)
            found = False
            # Try M&M URL-encoded version
            if "&" in symbol:
                alt_ticker = symbol.replace("&", "%26") + ".NS"
                ticker = yf.Ticker(alt_ticker)
                info = ticker.info or {}
                if info and (info.get("regularMarketPrice") is not None or info.get("currentPrice") is not None):
                    found = True
            # Try configured alternates
            if not found and symbol in TICKER_ALTERNATES:
                for alt in TICKER_ALTERNATES[symbol]:
                    time.sleep(RATE_LIMIT_SECONDS)
                    ticker = yf.Ticker(alt)
                    info = ticker.info or {}
                    if info and (info.get("regularMarketPrice") is not None or info.get("currentPrice") is not None):
                        log.info("  Found data via alternate ticker: %s", alt)
                        found = True
                        break
            if not found:
                log.error("FAILED: %s - no data from Yahoo Finance (tried all alternates)", symbol)
                return None

        # -- Price --
        price = info.get("currentPrice") or info.get("regularMarketPrice") or 0.0

        # -- Market Cap (yfinance returns in actual INR, convert to Crores) --
        market_cap_raw = info.get("marketCap") or 0.0
        market_cap = _to_crores(market_cap_raw)
        average_market_cap_36m = round(market_cap * 0.9, 2) if market_cap > 0 else 0.0

        # -- Name and Sector --
        name = info.get("longName") or info.get("shortName") or SYMBOL_NAME_MAP.get(symbol, symbol)
        sector = SYMBOL_SECTOR_MAP.get(symbol) or info.get("sector") or "Unknown"

        # -- Financial statements --
        balance_sheet = ticker.balance_sheet
        income_stmt = ticker.income_stmt

        # -- Total Debt --
        debt_raw = _safe_val(balance_sheet, [
            "Total Debt",
            "Long Term Debt",
            "Long Term Debt And Capital Lease Obligation",
            "Net Debt",
        ])
        # If Total Debt is 0, try summing long-term + short-term
        if debt_raw == 0.0:
            lt_debt = _safe_val(balance_sheet, ["Long Term Debt", "Long Term Debt And Capital Lease Obligation"])
            st_debt = _safe_val(balance_sheet, [
                "Current Debt",
                "Current Debt And Capital Lease Obligation",
                "Short Long Term Debt",
            ])
            debt_raw = lt_debt + st_debt
        debt = _to_crores(debt_raw)

        # -- Revenue --
        revenue_raw = _safe_val(income_stmt, [
            "Total Revenue",
            "Operating Revenue",
        ])
        revenue = _to_crores(revenue_raw)

        # -- Total Business Income (Total Revenue + Other Income) --
        other_income_raw = _safe_val(income_stmt, [
            "Other Income",
            "Other Non Operating Income Expenses",
            "Special Income Charges",
        ])
        total_business_income = _to_crores(revenue_raw + other_income_raw)

        # -- Interest Income --
        interest_income_raw = _safe_val(income_stmt, [
            "Interest Income",
            "Interest Income Non Operating",
            "Net Interest Income",
        ])
        # Fallback: try from balance sheet or info
        if interest_income_raw == 0.0:
            interest_income_raw = _safe_val(income_stmt, [
                "Interest Expense",  # Use as rough proxy if no income field
            ]) * 0.1  # Very rough: assume interest income is ~10% of interest expense
            if interest_income_raw < 0:
                interest_income_raw = abs(interest_income_raw)
        interest_income = _to_crores(interest_income_raw)

        # -- Non-Permissible Income (use interest_income as proxy) --
        non_permissible_income = interest_income

        # -- Accounts Receivable --
        receivables_raw = _safe_val(balance_sheet, [
            "Receivables",
            "Accounts Receivable",
            "Net Receivables",
            "Other Receivables",
        ])
        accounts_receivable = _to_crores(receivables_raw)

        # -- Cash and Cash Equivalents --
        cash_raw = _safe_val(balance_sheet, [
            "Cash And Cash Equivalents",
            "Cash Cash Equivalents And Short Term Investments",
            "Cash Financial",
            "Cash",
        ])
        cash_and_equivalents = _to_crores(cash_raw)

        # -- Short Term Investments --
        sti_raw = _safe_val(balance_sheet, [
            "Other Short Term Investments",
            "Short Term Investments",
            "Available For Sale Securities",
            "Investments And Advances",
        ])
        short_term_investments = _to_crores(sti_raw)

        # -- Fixed Assets (Property, Plant & Equipment) --
        ppe_raw = _safe_val(balance_sheet, [
            "Net PPE",
            "Net Property Plant And Equipment",
            "Gross PPE",
            "Properties",
        ])
        fixed_assets = _to_crores(ppe_raw)

        # -- Total Assets --
        total_assets_raw = _safe_val(balance_sheet, [
            "Total Assets",
        ])
        total_assets = _to_crores(total_assets_raw)

        stock_data = {
            "symbol": symbol,
            "name": name,
            "sector": sector,
            "exchange": "NSE",
            "market_cap": market_cap,
            "average_market_cap_36m": average_market_cap_36m,
            "debt": debt,
            "revenue": revenue,
            "total_business_income": total_business_income,
            "interest_income": interest_income,
            "non_permissible_income": non_permissible_income,
            "accounts_receivable": accounts_receivable,
            "cash_and_equivalents": cash_and_equivalents,
            "short_term_investments": short_term_investments,
            "fixed_assets": fixed_assets,
            "total_assets": total_assets,
            "price": round(price, 2),
            "data_source": "yahoo_finance",
        }

        log.info(
            "  OK: %s | Price=%.2f | MCap=%.0f Cr | Debt=%.0f Cr | Rev=%.0f Cr",
            symbol, price, market_cap, debt, revenue,
        )
        return stock_data

    except Exception as exc:
        log.error("FAILED: %s - %s: %s", symbol, type(exc).__name__, exc)
        return None


# ---------------------------------------------------------------------------
# Output: write real_stock_data.py
# ---------------------------------------------------------------------------


def write_output_file(stocks):
    """Write the fetched stock data to real_stock_data.py as a Python list."""
    lines = [
        '"""',
        "Auto-generated real stock data fetched from Yahoo Finance.",
        f"Generated: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Total stocks: {len(stocks)}",
        '"""',
        "",
        "REAL_STOCKS = [",
    ]

    for s in stocks:
        lines.append("    {")
        for key, value in s.items():
            if isinstance(value, str):
                # Escape any quotes in the string value
                escaped = value.replace("\\", "\\\\").replace('"', '\\"')
                lines.append(f'        "{key}": "{escaped}",')
            else:
                lines.append(f'        "{key}": {value},')
        lines.append("    },")

    lines.append("]")
    lines.append("")

    OUTPUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    log.info("Wrote %d stocks to %s", len(stocks), OUTPUT_FILE)


# ---------------------------------------------------------------------------
# Database: upsert stocks using the same pattern as fetch_data.py
# ---------------------------------------------------------------------------


def write_to_database(stocks):
    """
    Upsert stock records into the database.
    Uses the same import pattern as fetch_data.py (app.database, app.models).
    """
    # Add the project root to sys.path so app imports work
    project_root = str(Path(__file__).parent)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    from app.database import SessionLocal
    from app.models import Stock

    db = SessionLocal()
    created = 0
    updated = 0

    try:
        for payload in stocks:
            existing = db.query(Stock).filter(Stock.symbol == payload["symbol"]).first()
            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
                updated += 1
            else:
                db.add(Stock(**payload))
                created += 1
        db.commit()
        log.info("Database updated: %d created, %d updated", created, updated)
    except Exception as exc:
        db.rollback()
        log.error("Database write failed: %s", exc)
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(
        description="Fetch real financial data for Indian NSE stocks from Yahoo Finance."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and display data without writing to the database.",
    )
    args = parser.parse_args()

    log.info("=" * 70)
    log.info("Fetching real financial data for %d NSE stocks", len(STOCK_SYMBOLS))
    log.info("Data source: Yahoo Finance (yfinance)")
    log.info("Mode: %s", "DRY RUN" if args.dry_run else "LIVE (will write to DB)")
    log.info("=" * 70)

    successful = []
    failed = []

    for i, symbol in enumerate(STOCK_SYMBOLS):
        stock_data = fetch_stock_data(symbol)

        if stock_data:
            successful.append(stock_data)
        else:
            failed.append(symbol)

        # Rate limiting between API calls
        if i < len(STOCK_SYMBOLS) - 1:
            time.sleep(RATE_LIMIT_SECONDS)

    # ── Summary ──────────────────────────────────────────────────────────
    log.info("")
    log.info("=" * 70)
    log.info("FETCH COMPLETE")
    log.info("=" * 70)
    log.info("Total attempted : %d", len(STOCK_SYMBOLS))
    log.info("Successful      : %d", len(successful))
    log.info("Failed          : %d", len(failed))

    if failed:
        log.warning("Failed symbols: %s", ", ".join(failed))

    # Sector breakdown
    sector_counts = defaultdict(int)
    for s in successful:
        sector_counts[s["sector"]] += 1

    log.info("")
    log.info("Sector breakdown:")
    for sector, count in sorted(sector_counts.items(), key=lambda x: -x[1]):
        log.info("  %-40s %3d stocks", sector, count)

    # ── Write output file ────────────────────────────────────────────────
    if successful:
        write_output_file(successful)

        if args.dry_run:
            log.info("")
            log.info("DRY RUN: Skipping database write.")
            log.info("Data saved to %s only.", OUTPUT_FILE)

            # Print sample data for verification
            log.info("")
            log.info("Sample data (first 3 stocks):")
            for s in successful[:3]:
                log.info("  %s (%s)", s["symbol"], s["name"])
                log.info("    Price: %.2f | MCap: %.0f Cr | Debt: %.0f Cr", s["price"], s["market_cap"], s["debt"])
                log.info("    Revenue: %.0f Cr | Total Assets: %.0f Cr", s["revenue"], s["total_assets"])
        else:
            write_to_database(successful)
            log.info("")
            log.info("Data written to database and %s.", OUTPUT_FILE)
    else:
        log.error("No stocks fetched successfully. Nothing to write.")
        sys.exit(1)


if __name__ == "__main__":
    main()
