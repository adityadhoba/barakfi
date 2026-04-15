"""
Fetch REAL financial data for global stocks from Yahoo Finance.

Supports three exchanges:
  - NSE (India): 200+ NIFTY 50 / Next 50 / Midcap 100 / Smallcap 100 stocks (INR, Crores)
  - US  (S&P 500 representative subset): 100+ US stocks (USD, Millions)
  - LSE (FTSE 100 representative subset): 40+ UK stocks (GBP, Millions)

Usage:
    python fetch_real_data.py              # Fetch data and write to DB + real_stock_data.py
    python fetch_real_data.py --dry-run    # Fetch data, print summary, skip DB write

Data source: Yahoo Finance via yfinance library.
NSE financials are converted to Crores INR (divide raw values by 1,00,00,000).
US/LSE financials are converted to Millions (divide raw values by 1,000,000).

=== WEEKLY STOCK ADDITION PROCESS ===

Every week, add ~10 new pre-screened stocks with the following steps:

1. ADD SYMBOLS: Add new symbols to the appropriate list below
   (STOCK_SYMBOLS for NSE, US_STOCK_SYMBOLS for US, UK_STOCK_SYMBOLS for LSE).
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
from datetime import datetime, timezone
from pathlib import Path
import requests

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
PRODUCTION_ENV_VALUES = {"production", "prod"}
OPS_SLACK_WEBHOOK_URL = os.getenv("OPS_SLACK_WEBHOOK_URL", "").strip()
OPS_ALERT_FAILURES_ENABLED = os.getenv("OPS_ALERT_FAILURES_ENABLED", "true").lower() == "true"
OPS_ALERT_SUCCESSES_ENABLED = os.getenv("OPS_ALERT_SUCCESSES_ENABLED", "true").lower() == "true"
OPS_ALERT_JOB_A_SUCCESSES_ENABLED = os.getenv("OPS_ALERT_JOB_A_SUCCESSES_ENABLED", "false").lower() == "true"

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
    # NIFTY Smallcap 100 additions
    "ROUTE", "FINEORG", "AFFLE", "DATAPATTNS", "CDSL", "BSE",
    "ANGELONE", "IIFL", "CAMPUS", "APTUS", "AAVAS", "HOMEFIRST",
    "CHALET", "GPIL", "GRSE", "COCHINSHIP", "GARDENREACH", "MAZAGON",
    "BHEL", "TIINDIA", "ZEEL", "NYKAA", "CARTRADE", "POLICYBZR",
    "PAYTM", "DELHIVERY", "MAPMYINDIA", "RAILTEL", "RVNL", "IRCON",
    "LODHA", "PRESTIGE", "SOBHA", "M&M", "MINDACORP", "SUNTV",
    "NETWORK18", "TV18BRDCST", "TATACHEM",
]

# De-duplicate (BEL appears in both NIFTY NEXT 50 and Additional)
STOCK_SYMBOLS = list(dict.fromkeys(STOCK_SYMBOLS))

# S&P 500 representative subset (US stocks) — broad list plus flagship ETFs first
US_STOCK_SYMBOLS = list(
    dict.fromkeys(
        [
            "SPY", "QQQ", "VTI", "VOO", "IVV",
            # Mega Cap Tech
            "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL", "CRM",
            "ADBE", "AMD", "INTC", "CSCO", "QCOM", "TXN", "AMAT", "MU", "NOW", "PANW",
            # Healthcare
            "LLY", "UNH", "JNJ", "ABBV", "MRK", "PFE", "TMO", "ABT", "AMGN", "GILD",
            "ISRG", "VRTX", "MDT", "ZTS", "REGN", "DXCM", "BSX", "EW", "SYK",
            # Consumer
            "PG", "KO", "PEP", "COST", "WMT", "MCD", "NKE", "SBUX", "TGT", "CL",
            "EL", "MNST", "GIS", "KHC", "HSY", "HRL", "SJM", "MDLZ",
            # Financials
            "JPM", "BAC", "WFC", "GS", "MS", "BLK", "SCHW", "C", "AXP", "V", "MA",
            # Industrials
            "CAT", "DE", "HON", "UNP", "UPS", "RTX", "BA", "LMT", "GE", "MMM",
            # Energy
            "XOM", "CVX", "COP", "SLB", "EOG", "OXY", "PSX", "VLO", "MPC", "DVN",
            # Real Estate & Materials
            "AMT", "PLD", "CCI", "LIN", "APD", "ECL", "SHW", "NEM", "FCX",
            # Communication
            "DIS", "NFLX", "CMCSA", "T", "VZ", "TMUS", "CHTR",
            # Other notable
            "BRK-B", "MCO", "DVA", "SNOW", "PLTR", "UBER", "ABNB",
        ]
    )
)

_US_SECTOR_MAIN = {
    "AAPL": "Information Technology", "MSFT": "Information Technology", "GOOGL": "Information Technology",
    "AMZN": "Consumer Discretionary", "NVDA": "Information Technology", "META": "Communication Services",
    "TSLA": "Consumer Discretionary", "AVGO": "Information Technology", "ORCL": "Information Technology",
    "CRM": "Information Technology", "ADBE": "Information Technology", "AMD": "Information Technology",
    "INTC": "Information Technology", "CSCO": "Information Technology", "QCOM": "Information Technology",
    "LLY": "Healthcare", "UNH": "Healthcare", "JNJ": "Healthcare", "ABBV": "Healthcare",
    "MRK": "Healthcare", "PFE": "Healthcare", "TMO": "Healthcare", "ABT": "Healthcare",
    "JPM": "Banking and Financial Services", "BAC": "Banking and Financial Services",
    "WFC": "Banking and Financial Services", "GS": "Banking and Financial Services",
    "V": "Financial Services", "MA": "Financial Services", "BLK": "Financial Services",
    "XOM": "Energy", "CVX": "Energy", "COP": "Energy", "OXY": "Energy",
    "PG": "Consumer Goods", "KO": "Consumer Goods", "PEP": "Consumer Goods",
    "WMT": "Consumer Goods", "MCD": "Consumer Services", "NKE": "Consumer Goods",
    "CAT": "Industrials", "HON": "Industrials", "BA": "Industrials", "LMT": "Defence",
    "DIS": "Communication Services", "NFLX": "Communication Services",
    "BRK-B": "Financial Services", "UBER": "Consumer Services", "ABNB": "Consumer Services",
}
_US_SECTOR_ETF = {"SPY": "ETF", "QQQ": "ETF", "VTI": "ETF", "VOO": "ETF", "IVV": "ETF"}
US_SECTOR_MAP = {**_US_SECTOR_MAIN, **_US_SECTOR_ETF}

US_NAME_MAP = {
    "SPY": "SPDR S&P 500 ETF Trust", "QQQ": "Invesco QQQ Trust", "VTI": "Vanguard Total Stock Market ETF",
    "VOO": "Vanguard S&P 500 ETF", "IVV": "iShares Core S&P 500 ETF",
    "AAPL": "Apple Inc.", "MSFT": "Microsoft Corporation", "GOOGL": "Alphabet Inc.",
    "AMZN": "Amazon.com Inc.", "NVDA": "NVIDIA Corporation", "META": "Meta Platforms",
    "TSLA": "Tesla Inc.", "AVGO": "Broadcom Inc.", "LLY": "Eli Lilly and Company",
    "JPM": "JPMorgan Chase & Co.", "V": "Visa Inc.", "MA": "Mastercard Inc.",
    "UNH": "UnitedHealth Group", "XOM": "Exxon Mobil Corporation", "PG": "Procter & Gamble",
    "KO": "The Coca-Cola Company", "PEP": "PepsiCo Inc.", "WMT": "Walmart Inc.",
    "BA": "The Boeing Company", "DIS": "The Walt Disney Company",
    "BRK-B": "Berkshire Hathaway Inc.", "NFLX": "Netflix Inc.", "UBER": "Uber Technologies",
}

# FTSE 100 representative subset (LSE stocks)
UK_STOCK_SYMBOLS = [
    "SHEL", "AZN", "ULVR", "RIO", "LSEG", "GSK", "DGE", "BP",
    "HSBA", "REL", "AAL", "BHP", "GLEN", "VOD", "NG",
    "AHT", "BA", "BATS", "CRH", "EXPN", "III", "IMB",
    "RKT", "SGE", "SMT", "SVT", "TSCO", "WPP",
    "ANTO", "FRES", "IAG", "JET", "MNDI", "PSON", "RR",
    "BARC", "LLOY", "NWG", "STAN",
]

UK_SECTOR_MAP = {
    "SHEL": "Energy", "AZN": "Healthcare", "ULVR": "Consumer Goods",
    "RIO": "Metals & Mining", "LSEG": "Financial Services", "GSK": "Healthcare",
    "DGE": "Consumer Goods", "BP": "Energy", "HSBA": "Banking and Financial Services",
    "REL": "Information Technology", "BHP": "Metals & Mining", "GLEN": "Metals & Mining",
    "VOD": "Telecom", "BATS": "Tobacco and Consumer Goods",
    "BARC": "Banking and Financial Services", "LLOY": "Banking and Financial Services",
}

UK_NAME_MAP = {
    "SHEL": "Shell plc", "AZN": "AstraZeneca plc", "ULVR": "Unilever plc",
    "RIO": "Rio Tinto plc", "LSEG": "London Stock Exchange Group",
    "GSK": "GSK plc", "DGE": "Diageo plc", "BP": "BP plc",
    "HSBA": "HSBC Holdings plc", "REL": "RELX plc",
}

# Known ETF tickers per venue (plus yfinance quoteType == ETF)
ETF_TICKERS_BY_EXCHANGE = {
    "US": frozenset({"SPY", "QQQ", "VTI", "VOO", "IVV", "IWM", "EFA", "EEM"}),
    "NSE": frozenset({"NIFTYBEES", "BANKBEES", "GOLDBEES", "ITBEES", "MON100", "JUNIORBEES", "SETFNIF50"}),
    "LSE": frozenset(),
}

EXCHANGE_COUNTRY = {
    "NSE": "India",
    "BSE": "India",
    "US": "United States",
    "LSE": "United Kingdom",
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


def _send_job_a_alert(level: str, title: str, details: dict[str, object]) -> None:
    level_normalized = (level or "").strip().lower()
    if level_normalized == "success" and (not OPS_ALERT_SUCCESSES_ENABLED or not OPS_ALERT_JOB_A_SUCCESSES_ENABLED):
        return
    if level_normalized in {"warning", "error"} and not OPS_ALERT_FAILURES_ENABLED:
        return
    if not OPS_SLACK_WEBHOOK_URL:
        return
    lines = [f"*[{os.getenv('APP_ENV', 'unknown').upper()}]* {title}"]
    for key, value in details.items():
        if value is None:
            continue
        lines.append(f"• {key}: {value}")
    try:
        response = requests.post(
            OPS_SLACK_WEBHOOK_URL,
            json={"text": "\n".join(lines)},
            timeout=10,
        )
        if response.status_code >= 400:
            log.warning("Job A alert rejected by Slack (%s): %s", response.status_code, response.text[:400])
    except Exception as exc:
        log.warning("Job A alert send failed: %s", exc)

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


def _build_ticker_str(symbol, exchange):
    """Build the yfinance ticker string for a given symbol and exchange."""
    if exchange == "NSE":
        return _nse_ticker(symbol)
    elif exchange == "LSE":
        return f"{symbol}.L"
    else:
        return symbol


def _convert_value(value, exchange):
    """Convert a raw financial value to the appropriate unit for the exchange."""
    if value is None or value == 0.0:
        return 0.0
    if exchange == "NSE":
        return _to_crores(value)
    # US and LSE: convert to millions
    return round(value / 1e6, 2)


def _compute_average_market_cap_36m(
    ticker,
    *,
    symbol: str,
    exchange: str,
    market_cap_raw: float,
    price: float,
    shares_outstanding_raw: float,
) -> float:
    """
    Compute 36-month average market cap from historical closes × shares outstanding.

    Falls back to current market cap (same unit conversion) only when historical
    series or shares data is unavailable.
    """
    shares_outstanding = float(shares_outstanding_raw or 0.0)
    if shares_outstanding <= 0 and market_cap_raw > 0 and price > 0:
        shares_outstanding = market_cap_raw / price

    if shares_outstanding <= 0:
        return _convert_value(market_cap_raw, exchange)

    try:
        # Monthly snapshots across 3 years keeps API usage moderate while staying
        # anchored to real market history.
        hist = ticker.history(period="3y", interval="1mo", auto_adjust=False, actions=False)
        if hist is None or hist.empty or "Close" not in hist:
            return _convert_value(market_cap_raw, exchange)

        closes = hist["Close"].dropna()
        if closes.empty:
            return _convert_value(market_cap_raw, exchange)

        avg_close = float(closes.mean())
        if avg_close <= 0:
            return _convert_value(market_cap_raw, exchange)

        avg_market_cap_raw = avg_close * shares_outstanding
        return _convert_value(avg_market_cap_raw, exchange)
    except Exception as exc:
        log.warning(
            "Average market-cap history unavailable for %s (%s): %s. Using current market cap fallback.",
            symbol,
            exchange,
            exc,
        )
        return _convert_value(market_cap_raw, exchange)


def _get_sector_map(exchange):
    """Return the sector fallback map for the given exchange."""
    if exchange == "US":
        return US_SECTOR_MAP
    elif exchange == "LSE":
        return UK_SECTOR_MAP
    return SYMBOL_SECTOR_MAP


def _get_name_map(exchange):
    """Return the name fallback map for the given exchange."""
    if exchange == "US":
        return US_NAME_MAP
    elif exchange == "LSE":
        return UK_NAME_MAP
    return SYMBOL_NAME_MAP


def _get_currency(exchange):
    """Return the currency code for the given exchange."""
    if exchange == "US":
        return "USD"
    elif exchange == "LSE":
        return "GBP"
    return "INR"


def fetch_stock_data(symbol, exchange="NSE"):
    """
    Fetch financial data for a single stock via yfinance.

    Args:
        symbol: The stock ticker symbol.
        exchange: One of "NSE", "US", or "LSE". Determines ticker suffix,
                  currency, and unit conversion.

    Returns a dict matching the Stock model fields, or None on failure.
    """
    ticker_str = _build_ticker_str(symbol, exchange)
    log.info("Fetching %s (%s, %s) ...", symbol, ticker_str, exchange)

    sector_map = _get_sector_map(exchange)
    name_map = _get_name_map(exchange)
    currency = _get_currency(exchange)

    try:
        ticker = yf.Ticker(ticker_str)
        info = ticker.info or {}

        # If yfinance returns almost nothing, try alternates (NSE only)
        if not info or (info.get("regularMarketPrice") is None and info.get("currentPrice") is None):
            log.warning("No price data for %s, attempting alternate tickers", symbol)
            found = False
            if exchange == "NSE":
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

        # -- Market Cap (spot + 36m historical average) --
        market_cap_raw = info.get("marketCap") or 0.0
        market_cap = _convert_value(market_cap_raw, exchange)
        shares_out = info.get("sharesOutstanding") or 0.0
        average_market_cap_36m = _compute_average_market_cap_36m(
            ticker,
            symbol=symbol,
            exchange=exchange,
            market_cap_raw=market_cap_raw,
            price=price,
            shares_outstanding_raw=shares_out,
        )

        # -- Name and Sector --
        name = info.get("longName") or info.get("shortName") or name_map.get(symbol, symbol)
        sector = sector_map.get(symbol) or info.get("sector") or "Unknown"

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
        debt = _convert_value(debt_raw, exchange)

        # -- Revenue --
        revenue_raw = _safe_val(income_stmt, [
            "Total Revenue",
            "Operating Revenue",
        ])
        revenue = _convert_value(revenue_raw, exchange)

        # -- Total Business Income (Total Revenue + Other Income) --
        other_income_raw = _safe_val(income_stmt, [
            "Other Income",
            "Other Non Operating Income Expenses",
            "Special Income Charges",
        ])
        total_business_income = _convert_value(revenue_raw + other_income_raw, exchange)

        # -- Interest Income --
        interest_income_raw = _safe_val(income_stmt, [
            "Interest Income",
            "Interest Income Non Operating",
            "Net Interest Income",
        ])
        # Keep only statement-derived values; no synthetic fallback multipliers.
        if interest_income_raw < 0:
            interest_income_raw = abs(interest_income_raw)
        interest_income = _convert_value(interest_income_raw, exchange)

        # -- Non-Permissible Income proxy --
        # We currently proxy this with reported interest income where explicit
        # non-permissible disclosures are not machine-readable in a consistent way.
        non_permissible_income = interest_income

        # -- Accounts Receivable --
        receivables_raw = _safe_val(balance_sheet, [
            "Receivables",
            "Accounts Receivable",
            "Net Receivables",
            "Other Receivables",
        ])
        accounts_receivable = _convert_value(receivables_raw, exchange)

        # -- Cash and Cash Equivalents --
        cash_raw = _safe_val(balance_sheet, [
            "Cash And Cash Equivalents",
            "Cash Cash Equivalents And Short Term Investments",
            "Cash Financial",
            "Cash",
        ])
        cash_and_equivalents = _convert_value(cash_raw, exchange)

        # -- Short Term Investments --
        sti_raw = _safe_val(balance_sheet, [
            "Other Short Term Investments",
            "Short Term Investments",
            "Available For Sale Securities",
            "Investments And Advances",
        ])
        short_term_investments = _convert_value(sti_raw, exchange)

        # -- Fixed Assets (Property, Plant & Equipment) --
        ppe_raw = _safe_val(balance_sheet, [
            "Net PPE",
            "Net Property Plant And Equipment",
            "Gross PPE",
            "Properties",
        ])
        fixed_assets = _convert_value(ppe_raw, exchange)

        # -- Total Assets --
        total_assets_raw = _safe_val(balance_sheet, [
            "Total Assets",
        ])
        total_assets = _convert_value(total_assets_raw, exchange)

        if exchange == "US":
            sector = US_SECTOR_MAP.get(symbol) or info.get("sector") or "Unknown"
            name = info.get("longName") or info.get("shortName") or US_NAME_MAP.get(symbol, symbol)
        elif exchange == "LSE":
            sector = UK_SECTOR_MAP.get(symbol) or info.get("sector") or "Unknown"
            name = info.get("longName") or info.get("shortName") or symbol

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

        country = EXCHANGE_COUNTRY.get(exchange, "India")

        sym_base = symbol.upper().replace(".NS", "").replace(".L", "").split(".")[0]
        is_etf = (
            (info.get("quoteType") or "").upper() == "ETF"
            or sym_base in ETF_TICKERS_BY_EXCHANGE.get(exchange, frozenset())
        )

        unit_label = "Cr" if exchange == "NSE" else "M"

        stock_data = {
            "symbol": symbol,
            "name": name,
            "sector": sector,
            "exchange": exchange,
            "currency": currency,
            "country": country,
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
            "beta": round(beta_val, 4) if beta_val else None,
            "dividend_yield": div_yield,
            "pe_ratio": round(pe_val, 2) if pe_val else None,
            "eps": round(eps_val, 2) if eps_val else None,
            "week_52_high": round(w52_high, 2) if w52_high else None,
            "week_52_low": round(w52_low, 2) if w52_low else None,
            "avg_volume": float(avg_vol) if avg_vol else None,
            "shares_outstanding": float(shares_out) if shares_out else None,
            "price_change_pct": price_chg_pct,
            "is_etf": is_etf,
        }

        log.info(
            "  OK: %s | Price=%.2f | MCap=%.0f %s | Debt=%.0f %s | Rev=%.0f %s",
            symbol, price, market_cap, unit_label, debt, unit_label, revenue, unit_label,
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
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
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


def _is_production_runtime() -> bool:
    return (os.getenv("APP_ENV") or "").strip().lower() in PRODUCTION_ENV_VALUES


def _is_sqlite_url(url: str) -> bool:
    return url.strip().lower().startswith("sqlite:")


def _assert_production_database_url() -> str:
    db_url = (os.getenv("DATABASE_URL") or "").strip()
    if _is_production_runtime():
        if not db_url:
            raise RuntimeError(
                "DATABASE_URL is required in APP_ENV=production for fundamentals ingestion."
            )
        if _is_sqlite_url(db_url):
            raise RuntimeError(
                "DATABASE_URL points to SQLite in APP_ENV=production. "
                "Use production Postgres to avoid writing fundamentals to a local file DB."
            )
    return db_url


def write_to_database(stocks):
    """
    Upsert stock records into the database.
    Uses the same import pattern as fetch_data.py (app.database, app.models).
    """
    # Fail fast for production cron misconfiguration before opening any DB session.
    db_url = _assert_production_database_url()
    if db_url:
        log.info("Database target: %s", db_url.split("@")[-1])

    # Add the project root to sys.path so app imports work
    project_root = str(Path(__file__).parent)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)

    from sqlalchemy import func
    from app.database import SessionLocal
    from app.models import Stock

    db = SessionLocal()
    created = 0
    updated = 0
    touched_ids: set[int] = set()

    try:
        now = datetime.now(timezone.utc)
        for raw in stocks:
            payload = {**raw, "fundamentals_updated_at": now}
            existing = (
                db.query(Stock)
                .filter(
                    Stock.symbol == payload["symbol"],
                    Stock.exchange == payload.get("exchange", "NSE"),
                )
                .first()
            )
            if not existing:
                existing = db.query(Stock).filter(Stock.symbol == payload["symbol"]).first()
            if existing:
                for key, value in payload.items():
                    setattr(existing, key, value)
                updated += 1
                touched_ids.add(existing.id)
            else:
                row = Stock(**payload)
                db.add(row)
                db.flush()
                touched_ids.add(row.id)
                created += 1

        from app.api import helpers
        from app.services.compliance_history_service import record_compliance_change_if_needed
        from app.services.halal_service import PRIMARY_PROFILE, evaluate_stock

        for sid in touched_ids:
            stock = db.query(Stock).filter(Stock.id == sid).first()
            if not stock:
                continue
            r = evaluate_stock(helpers.stock_to_dict(stock), profile=PRIMARY_PROFILE)
            record_compliance_change_if_needed(db, stock, r["status"], r.get("compliance_rating"))

        db.commit()
        rows_with_timestamp = int(
            db.query(func.count(Stock.id))
            .filter(
                Stock.is_active.is_(True),
                Stock.fundamentals_updated_at.isnot(None),
            )
            .scalar()
            or 0
        )
        rows_missing_timestamp = int(
            db.query(func.count(Stock.id))
            .filter(
                Stock.is_active.is_(True),
                Stock.fundamentals_updated_at.is_(None),
            )
            .scalar()
            or 0
        )
        log.info("Database updated: %d created, %d updated", created, updated)
        return {
            "created": created,
            "updated": updated,
            "rows_with_timestamp": rows_with_timestamp,
            "rows_missing_timestamp": rows_missing_timestamp,
        }
    except Exception as exc:
        db.rollback()
        log.error("Database write failed: %s", exc)
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch real financial data for NSE stocks from Yahoo Finance."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and display data without writing to the database.",
    )
    args = parser.parse_args()
    run_started_at = datetime.now(timezone.utc)

    if not args.dry_run:
        _assert_production_database_url()

    exchanges = [("NSE", STOCK_SYMBOLS)]

    total_symbols = sum(len(syms) for _, syms in exchanges)

    log.info("=" * 70)
    log.info("Fetching real financial data for %d NSE stocks", total_symbols)
    log.info("  NSE: %d stocks", len(STOCK_SYMBOLS))
    log.info("Data source: Yahoo Finance (yfinance)")
    log.info("Mode: %s", "DRY RUN" if args.dry_run else "LIVE (will write to DB)")
    log.info("=" * 70)

    successful = []
    failed = []

    for exchange, symbols in exchanges:
        log.info("")
        log.info("─" * 50)
        log.info("Fetching %s stocks (%d symbols) ...", exchange, len(symbols))
        log.info("─" * 50)

        for i, symbol in enumerate(symbols):
            stock_data = fetch_stock_data(symbol, exchange)

            if stock_data:
                successful.append(stock_data)
            else:
                failed.append(f"{symbol} ({exchange})")

            # Rate limiting between API calls
            if i < len(symbols) - 1:
                time.sleep(RATE_LIMIT_SECONDS)

    # ── Summary ──────────────────────────────────────────────────────────
    log.info("")
    log.info("=" * 70)
    log.info("FETCH COMPLETE")
    log.info("=" * 70)
    log.info("Total attempted : %d", total_symbols)
    log.info("Successful      : %d", len(successful))
    log.info("Failed          : %d", len(failed))

    if failed:
        log.warning("Failed symbols: %s", ", ".join(failed))

    # Exchange breakdown
    exchange_counts = defaultdict(int)
    for s in successful:
        exchange_counts[s["exchange"]] += 1
    log.info("")
    log.info("Exchange breakdown:")
    for ex, count in sorted(exchange_counts.items()):
        log.info("  %-10s %3d stocks", ex, count)

    # Sector breakdown
    sector_counts = defaultdict(int)
    for s in successful:
        sector_counts[s["sector"]] += 1

    log.info("")
    log.info("Sector breakdown:")
    for sector, count in sorted(sector_counts.items(), key=lambda x: -x[1]):
        log.info("  %-40s %3d stocks", sector, count)

    # ── Write output file ────────────────────────────────────────────────
    db_summary = None
    if successful:
        write_output_file(successful)

        if args.dry_run:
            log.info("")
            log.info("DRY RUN: Skipping database write.")
            log.info("Data saved to %s only.", OUTPUT_FILE)

            # Print sample data for verification (first 3 NSE rows)
            log.info("")
            log.info("Sample data (first 3 stocks):")
            for s in successful[:3]:
                unit = "Cr"
                log.info("  %s (%s) [%s, %s]", s["symbol"], s["name"], s["exchange"], s.get("currency", ""))
                log.info("    Price: %.2f | MCap: %.0f %s | Debt: %.0f %s",
                         s["price"], s["market_cap"], unit, s["debt"], unit)
                log.info("    Revenue: %.0f %s | Total Assets: %.0f %s",
                         s["revenue"], unit, s["total_assets"], unit)
        else:
            db_summary = write_to_database(successful)
            log.info("")
            log.info("Data written to database and %s.", OUTPUT_FILE)
    else:
        log.error("No stocks fetched successfully. Nothing to write.")
        _send_job_a_alert(
            "error",
            "Job A failed (no successful fundamentals fetch)",
            {
                "started_at_utc": run_started_at.isoformat(),
                "finished_at_utc": datetime.now(timezone.utc).isoformat(),
                "total_attempted": total_symbols,
                "successful": len(successful),
                "failed": len(failed),
                "failure_reason": "No stocks fetched successfully",
                "recovery_hint": "Re-run fetch_real_data.py, then run scripts/run_daily_refresh.py",
            },
        )
        return 1

    run_finished_at = datetime.now(timezone.utc)
    rows_updated = 0 if db_summary is None else db_summary["created"] + db_summary["updated"]
    rows_with_timestamp = 0 if db_summary is None else db_summary["rows_with_timestamp"]
    rows_missing_timestamp = 0 if db_summary is None else db_summary["rows_missing_timestamp"]
    log.info(
        "fundamentals_ingest_run started_at=%s finished_at=%s rows_updated=%d rows_failed=%d rows_with_timestamp=%d rows_missing_timestamp=%d",
        run_started_at.isoformat(),
        run_finished_at.isoformat(),
        rows_updated,
        len(failed),
        rows_with_timestamp,
        rows_missing_timestamp,
    )
    if failed:
        failed_preview = ", ".join(failed[:20])
        _send_job_a_alert(
            "warning",
            "Job A partial failure (NSE fundamentals)",
            {
                "started_at_utc": run_started_at.isoformat(),
                "finished_at_utc": run_finished_at.isoformat(),
                "total_attempted": total_symbols,
                "successful": len(successful),
                "failed": len(failed),
                "failed_symbols_preview": failed_preview,
                "failure_reason": "One or more NSE symbols failed to fetch",
                "recovery_hint": "Re-run fetch_real_data.py, then run scripts/run_daily_refresh.py",
            },
        )
        return 1
    if not args.dry_run:
        _send_job_a_alert(
            "success",
            "Job A complete (fundamentals refreshed)",
            {
                "started_at_utc": run_started_at.isoformat(),
                "finished_at_utc": run_finished_at.isoformat(),
                "rows_updated": rows_updated,
                "rows_failed": len(failed),
                "rows_with_timestamp": rows_with_timestamp,
                "rows_missing_timestamp": rows_missing_timestamp,
                "next_step": "Job B: scripts/run_daily_refresh.py",
            },
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        _send_job_a_alert(
            "error",
            "Job A failed (exception)",
            {
                "finished_at_utc": datetime.now(timezone.utc).isoformat(),
                "failure_reason": str(exc),
                "recovery_hint": "Check fundamentals provider connectivity and re-run Job A",
            },
        )
        raise
