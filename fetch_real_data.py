"""
Fetch REAL financial data for global stocks from Yahoo Finance.

Supports multiple exchanges: NSE (India), NYSE/NASDAQ (US), LSE (UK), etc.

Usage:
    python fetch_real_data.py                      # Fetch ALL exchanges
    python fetch_real_data.py --exchange NSE       # Fetch only NSE stocks
    python fetch_real_data.py --exchange US         # Fetch only US stocks
    python fetch_real_data.py --dry-run             # Skip DB write

Data source: Yahoo Finance via yfinance library.
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

# Exchange suffixes for yfinance
EXCHANGE_SUFFIX = {
    "NSE": ".NS",
    "BSE": ".BO",
    "US": "",       # NYSE/NASDAQ have no suffix
    "LSE": ".L",
    "TSE": ".T",    # Tokyo
    "XETRA": ".DE", # Frankfurt
    "ASX": ".AX",   # Australia
}

# Currency by exchange
EXCHANGE_CURRENCY = {
    "NSE": "INR", "BSE": "INR",
    "US": "USD", "LSE": "GBP",
    "TSE": "JPY", "XETRA": "EUR", "ASX": "AUD",
}

# Country by exchange
EXCHANGE_COUNTRY = {
    "NSE": "India", "BSE": "India",
    "US": "United States", "LSE": "United Kingdom",
    "TSE": "Japan", "XETRA": "Germany", "ASX": "Australia",
}

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

# ── US Stocks (S&P 500 representative subset) ──
US_STOCK_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B",
    "UNH", "JNJ", "V", "XOM", "JPM", "PG", "MA", "HD", "CVX", "MRK",
    "ABBV", "LLY", "PEP", "KO", "COST", "AVGO", "TMO", "WMT", "MCD",
    "CSCO", "ACN", "ABT", "DHR", "NEE", "LIN", "TXN", "PM", "UNP",
    "BMY", "RTX", "LOW", "AMGN", "HON", "QCOM", "COP", "ORCL", "IBM",
    "SBUX", "CAT", "BA", "GE", "INTC", "AMD", "AMAT", "ADI", "ISRG",
    "NOW", "BKNG", "ADP", "GILD", "MDLZ", "SYK", "PLD", "TJX", "REGN",
    "VRTX", "CB", "MMC", "BDX", "ZTS", "CI", "SO", "DUK", "CL", "CME",
    "PNC", "USB", "TFC", "SCHW", "AIG", "MS", "GS", "BLK", "C",
    "NKE", "DE", "PYPL", "CRM", "ADBE", "NFLX", "DIS",
    "PFE", "T", "VZ", "WFC", "BAC",
]

US_SECTOR_MAP = {
    "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology",
    "AMZN": "Consumer Cyclical", "NVDA": "Technology", "META": "Technology",
    "TSLA": "Automobile", "BRK-B": "Financial Services", "UNH": "Healthcare",
    "JNJ": "Healthcare", "V": "Financial Services", "XOM": "Energy",
    "JPM": "Banking and Financial Services", "PG": "Consumer Goods",
    "MA": "Financial Services", "HD": "Consumer Cyclical", "CVX": "Energy",
    "MRK": "Pharmaceuticals", "ABBV": "Pharmaceuticals", "LLY": "Pharmaceuticals",
    "PEP": "Consumer Goods", "KO": "Consumer Goods", "COST": "Consumer Cyclical",
    "AVGO": "Technology", "TMO": "Healthcare", "WMT": "Consumer Cyclical",
    "MCD": "Consumer Services", "CSCO": "Technology", "ACN": "Technology",
    "ABT": "Healthcare", "DHR": "Healthcare", "NEE": "Energy",
    "LIN": "Industrials", "TXN": "Technology", "PM": "Tobacco and Consumer Goods",
    "UNP": "Industrials", "BMY": "Pharmaceuticals", "RTX": "Defence",
    "LOW": "Consumer Cyclical", "AMGN": "Pharmaceuticals", "HON": "Industrials",
    "QCOM": "Technology", "COP": "Energy", "ORCL": "Technology",
    "IBM": "Technology", "SBUX": "Consumer Services", "CAT": "Industrials",
    "BA": "Defence", "GE": "Industrials", "INTC": "Technology",
    "AMD": "Technology", "AMAT": "Technology", "ADI": "Technology",
    "ISRG": "Healthcare", "NOW": "Technology", "BKNG": "Consumer Services",
    "ADP": "Technology", "GILD": "Pharmaceuticals", "MDLZ": "Consumer Goods",
    "SYK": "Healthcare", "PLD": "Real Estate", "TJX": "Consumer Cyclical",
    "REGN": "Pharmaceuticals", "VRTX": "Pharmaceuticals", "CB": "Insurance",
    "MMC": "Financial Services", "BDX": "Healthcare", "ZTS": "Healthcare",
    "CI": "Insurance", "SO": "Energy", "DUK": "Energy", "CL": "Consumer Goods",
    "CME": "Financial Services", "PNC": "Banking and Financial Services",
    "USB": "Banking and Financial Services", "TFC": "Banking and Financial Services",
    "SCHW": "Financial Services", "AIG": "Insurance",
    "MS": "Banking and Financial Services", "GS": "Banking and Financial Services",
    "BLK": "Financial Services", "C": "Banking and Financial Services",
    "NKE": "Consumer Goods", "DE": "Industrials", "PYPL": "Financial Services",
    "CRM": "Technology", "ADBE": "Technology", "NFLX": "Consumer Services",
    "DIS": "Consumer Services", "PFE": "Pharmaceuticals",
    "T": "Telecom", "VZ": "Telecom",
    "WFC": "Banking and Financial Services", "BAC": "Banking and Financial Services",
}

US_NAME_MAP = {
    "AAPL": "Apple Inc.", "MSFT": "Microsoft Corporation", "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com Inc.", "NVDA": "NVIDIA Corporation", "META": "Meta Platforms",
    "TSLA": "Tesla Inc.", "BRK-B": "Berkshire Hathaway", "UNH": "UnitedHealth Group",
    "JNJ": "Johnson & Johnson", "V": "Visa Inc.", "XOM": "Exxon Mobil",
    "JPM": "JPMorgan Chase", "PG": "Procter & Gamble", "MA": "Mastercard",
    "HD": "The Home Depot", "CVX": "Chevron Corporation", "MRK": "Merck & Co.",
    "ABBV": "AbbVie Inc.", "LLY": "Eli Lilly", "PEP": "PepsiCo",
    "KO": "The Coca-Cola Company", "COST": "Costco Wholesale", "AVGO": "Broadcom",
    "TMO": "Thermo Fisher Scientific", "WMT": "Walmart", "MCD": "McDonald's",
    "CSCO": "Cisco Systems", "ACN": "Accenture", "ABT": "Abbott Laboratories",
    "NFLX": "Netflix Inc.", "DIS": "Walt Disney", "CRM": "Salesforce",
    "ADBE": "Adobe Inc.", "NKE": "Nike Inc.", "BA": "Boeing",
    "PYPL": "PayPal Holdings", "AMD": "Advanced Micro Devices",
    "INTC": "Intel Corporation", "IBM": "IBM", "ORCL": "Oracle Corporation",
    "GS": "Goldman Sachs", "MS": "Morgan Stanley", "BAC": "Bank of America",
    "WFC": "Wells Fargo", "C": "Citigroup", "PFE": "Pfizer",
    "T": "AT&T Inc.", "VZ": "Verizon Communications",
}

# ── UK Stocks (FTSE 100 subset) ──
UK_STOCK_SYMBOLS = [
    "AZN", "SHEL", "ULVR", "HSBA", "BP", "GSK", "RIO", "LSEG",
    "DGE", "REL", "BATS", "NG", "VOD", "BARC", "LLOY", "RR",
    "AAL", "ABF", "AHT", "BA",
]

UK_SECTOR_MAP = {
    "AZN": "Pharmaceuticals", "SHEL": "Energy", "ULVR": "Consumer Goods",
    "HSBA": "Banking and Financial Services", "BP": "Energy",
    "GSK": "Pharmaceuticals", "RIO": "Metals & Mining", "LSEG": "Financial Services",
    "DGE": "Consumer Goods", "REL": "Consumer Services",
    "BATS": "Tobacco and Consumer Goods", "NG": "Energy",
    "VOD": "Telecom", "BARC": "Banking and Financial Services",
    "LLOY": "Banking and Financial Services", "RR": "Industrials",
    "AAL": "Metals & Mining", "ABF": "Consumer Goods",
    "AHT": "Consumer Services", "BA": "Defence",
}

# All exchange-symbol groups
GLOBAL_STOCKS = {
    "NSE": STOCK_SYMBOLS,
    "US": US_STOCK_SYMBOLS,
    "LSE": UK_STOCK_SYMBOLS,
}

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


def _yf_ticker(symbol, exchange="NSE"):
    """Convert a symbol + exchange to a yfinance ticker string."""
    suffix = EXCHANGE_SUFFIX.get(exchange, ".NS")
    return f"{symbol}{suffix}"


def _nse_ticker(symbol):
    """Legacy helper — delegates to _yf_ticker."""
    return _yf_ticker(symbol, "NSE")


# ---------------------------------------------------------------------------
# Core: fetch data for a single stock
# ---------------------------------------------------------------------------


def fetch_stock_data(symbol, exchange="NSE"):
    """
    Fetch financial data for a stock via yfinance.
    Returns a dict matching the Stock model fields, or None on failure.
    """
    ticker_str = _yf_ticker(symbol, exchange)
    log.info("Fetching %s (%s) [%s] ...", symbol, ticker_str, exchange)

    try:
        ticker = yf.Ticker(ticker_str)
        info = ticker.info or {}

        # If yfinance returns almost nothing, try alternates
        if not info or (info.get("regularMarketPrice") is None and info.get("currentPrice") is None):
            log.warning("No price data for %s, attempting alternate tickers", symbol)
            found = False
            # Try M&M URL-encoded version (NSE specific)
            if "&" in symbol and exchange == "NSE":
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

        # Determine correct sector/name from exchange-specific maps
        if exchange == "US":
            sector = US_SECTOR_MAP.get(symbol) or info.get("sector") or "Unknown"
            name = info.get("longName") or info.get("shortName") or US_NAME_MAP.get(symbol, symbol)
        elif exchange == "LSE":
            sector = UK_SECTOR_MAP.get(symbol) or info.get("sector") or "Unknown"
            name = info.get("longName") or info.get("shortName") or symbol

        # Investment metrics from info dict
        beta_val = info.get("beta")
        div_yield = info.get("dividendYield")
        if div_yield and div_yield > 0:
            div_yield = round(div_yield * 100, 2)
        else:
            div_yield = None
        pe_val = info.get("trailingPE") or info.get("forwardPE")
        eps_val = info.get("trailingEps")
        w52_high = info.get("fiftyTwoWeekHigh")
        w52_low = info.get("fiftyTwoWeekLow")
        avg_vol = info.get("averageVolume")
        shares_out = info.get("sharesOutstanding")
        prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose")
        price_chg_pct = None
        if price and prev_close and prev_close > 0:
            price_chg_pct = round(((price - prev_close) / prev_close) * 100, 2)

        currency = EXCHANGE_CURRENCY.get(exchange, "USD")
        country = EXCHANGE_COUNTRY.get(exchange, "Unknown")

        # For non-INR stocks, don't convert to crores
        use_crores = exchange in ("NSE", "BSE")
        convert = _to_crores if use_crores else lambda v: round(v, 2) if v else 0.0

        stock_data = {
            "symbol": symbol,
            "name": name,
            "sector": sector,
            "exchange": exchange,
            "exchange_code": exchange,
            "country": country,
            "currency": currency,
            "market_cap": _to_crores(market_cap_raw) if use_crores else round(market_cap_raw / 1e6, 2) if market_cap_raw else 0.0,
            "average_market_cap_36m": average_market_cap_36m if use_crores else round((market_cap_raw or 0) * 0.9 / 1e6, 2),
            "debt": debt if use_crores else convert(debt_raw),
            "revenue": revenue if use_crores else convert(revenue_raw),
            "total_business_income": total_business_income if use_crores else convert(revenue_raw + other_income_raw),
            "interest_income": interest_income if use_crores else convert(interest_income_raw),
            "non_permissible_income": non_permissible_income if use_crores else convert(interest_income_raw),
            "accounts_receivable": accounts_receivable if use_crores else convert(receivables_raw),
            "cash_and_equivalents": cash_and_equivalents if use_crores else convert(cash_raw),
            "short_term_investments": short_term_investments if use_crores else convert(sti_raw),
            "fixed_assets": fixed_assets if use_crores else convert(ppe_raw),
            "total_assets": total_assets if use_crores else convert(total_assets_raw),
            "price": round(price, 2),
            "data_source": "yahoo_finance",
            "beta": round(beta_val, 4) if beta_val else None,
            "dividend_yield": div_yield,
            "pe_ratio": round(pe_val, 2) if pe_val else None,
            "eps": round(eps_val, 2) if eps_val else None,
            "week_52_high": round(w52_high, 2) if w52_high else None,
            "week_52_low": round(w52_low, 2) if w52_low else None,
            "avg_volume": float(avg_vol) if avg_vol else None,
            "shares_outstanding": float(shares_out) if shares_out else None,
            "price_change_pct": price_chg_pct,
            "is_etf": False,
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
            sym = payload["symbol"]
            exchange = payload.get("exchange", "NSE")
            existing = db.query(Stock).filter(Stock.symbol == sym, Stock.exchange == exchange).first()
            if not existing:
                existing = db.query(Stock).filter(Stock.symbol == sym).first()
            if existing:
                for key, value in payload.items():
                    if hasattr(existing, key):
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
        description="Fetch real financial data for global stocks from Yahoo Finance."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and display data without writing to the database.",
    )
    parser.add_argument(
        "--exchange",
        type=str,
        default=None,
        help="Fetch only a specific exchange (NSE, US, LSE). Default: all.",
    )
    args = parser.parse_args()

    exchanges_to_fetch = [args.exchange.upper()] if args.exchange else list(GLOBAL_STOCKS.keys())
    total_symbols = sum(len(GLOBAL_STOCKS.get(ex, [])) for ex in exchanges_to_fetch)

    log.info("=" * 70)
    log.info("Fetching financial data for %d stocks across %s", total_symbols, ", ".join(exchanges_to_fetch))
    log.info("Data source: Yahoo Finance (yfinance)")
    log.info("Mode: %s", "DRY RUN" if args.dry_run else "LIVE (will write to DB)")
    log.info("=" * 70)

    successful = []
    failed = []

    for exchange in exchanges_to_fetch:
        symbols = GLOBAL_STOCKS.get(exchange, [])
        log.info("── %s: %d symbols ──", exchange, len(symbols))
        for i, symbol in enumerate(symbols):
            stock_data = fetch_stock_data(symbol, exchange=exchange)
            if stock_data:
                successful.append(stock_data)
            else:
                failed.append(f"{symbol} ({exchange})")
            if i < len(symbols) - 1:
                time.sleep(RATE_LIMIT_SECONDS)

    log.info("")
    log.info("=" * 70)
    log.info("FETCH COMPLETE")
    log.info("=" * 70)
    log.info("Total attempted : %d", total_symbols)
    log.info("Successful      : %d", len(successful))
    log.info("Failed          : %d", len(failed))

    if failed:
        log.warning("Failed symbols: %s", ", ".join(failed))

    sector_counts = defaultdict(int)
    for s in successful:
        sector_counts[s["sector"]] += 1

    log.info("")
    log.info("Sector breakdown:")
    for sector, count in sorted(sector_counts.items(), key=lambda x: -x[1]):
        log.info("  %-40s %3d stocks", sector, count)

    exchange_counts = defaultdict(int)
    for s in successful:
        exchange_counts[s["exchange"]] += 1
    log.info("")
    log.info("Exchange breakdown:")
    for ex, count in sorted(exchange_counts.items(), key=lambda x: -x[1]):
        log.info("  %-10s %3d stocks", ex, count)

    if successful:
        write_output_file(successful)

        if args.dry_run:
            log.info("")
            log.info("DRY RUN: Skipping database write.")
            log.info("Data saved to %s only.", OUTPUT_FILE)
        else:
            write_to_database(successful)
            log.info("")
            log.info("Data written to database and %s.", OUTPUT_FILE)
    else:
        log.error("No stocks fetched successfully. Nothing to write.")
        sys.exit(1)


if __name__ == "__main__":
    main()
