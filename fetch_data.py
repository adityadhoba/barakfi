from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import (
    ComplianceReviewCase,
    ComplianceReviewEvent,
    ComplianceRuleVersion,
    Portfolio,
    PortfolioHolding,
    ResearchNote,
    SavedScreener,
    Stock,
    User,
    UserSettings,
    WatchlistEntry,
)

SEED_STOCKS = [
    # ── INFORMATION TECHNOLOGY ──
    {"symbol": "TCS", "name": "Tata Consultancy Services", "sector": "Information Technology", "exchange": "NSE", "market_cap": 1400000.0, "average_market_cap_36m": 1330000.0, "debt": 15000.0, "revenue": 240000.0, "total_business_income": 243000.0, "interest_income": 3000.0, "non_permissible_income": 3000.0, "accounts_receivable": 95000.0, "fixed_assets": 50000.0, "total_assets": 145000.0, "price": 3900.0, "data_source": "internal_seed"},
    {"symbol": "INFY", "name": "Infosys", "sector": "Information Technology", "exchange": "NSE", "market_cap": 620000.0, "average_market_cap_36m": 600000.0, "debt": 9000.0, "revenue": 155000.0, "total_business_income": 157000.0, "interest_income": 2200.0, "non_permissible_income": 2200.0, "accounts_receivable": 64000.0, "fixed_assets": 26000.0, "total_assets": 92000.0, "price": 1500.0, "data_source": "internal_seed"},
    {"symbol": "WIPRO", "name": "Wipro", "sector": "Information Technology", "exchange": "NSE", "market_cap": 310000.0, "average_market_cap_36m": 320000.0, "debt": 12000.0, "revenue": 90000.0, "total_business_income": 91500.0, "interest_income": 1500.0, "non_permissible_income": 1500.0, "accounts_receivable": 42000.0, "fixed_assets": 17000.0, "total_assets": 58000.0, "price": 480.0, "data_source": "internal_seed"},
    {"symbol": "HCLTECH", "name": "HCL Technologies", "sector": "Information Technology", "exchange": "NSE", "market_cap": 450000.0, "average_market_cap_36m": 420000.0, "debt": 11000.0, "revenue": 108000.0, "total_business_income": 110000.0, "interest_income": 2000.0, "non_permissible_income": 2000.0, "accounts_receivable": 48000.0, "fixed_assets": 22000.0, "total_assets": 78000.0, "price": 1660.0, "data_source": "internal_seed"},
    {"symbol": "TECHM", "name": "Tech Mahindra", "sector": "Information Technology", "exchange": "NSE", "market_cap": 160000.0, "average_market_cap_36m": 145000.0, "debt": 8000.0, "revenue": 53000.0, "total_business_income": 53800.0, "interest_income": 800.0, "non_permissible_income": 800.0, "accounts_receivable": 22000.0, "fixed_assets": 9000.0, "total_assets": 45000.0, "price": 1800.0, "data_source": "internal_seed"},
    {"symbol": "LTIM", "name": "LTIMindtree", "sector": "Information Technology", "exchange": "NSE", "market_cap": 175000.0, "average_market_cap_36m": 160000.0, "debt": 4500.0, "revenue": 36000.0, "total_business_income": 36500.0, "interest_income": 500.0, "non_permissible_income": 500.0, "accounts_receivable": 15000.0, "fixed_assets": 7000.0, "total_assets": 30000.0, "price": 5900.0, "data_source": "internal_seed"},
    {"symbol": "PERSISTENT", "name": "Persistent Systems", "sector": "Information Technology", "exchange": "NSE", "market_cap": 85000.0, "average_market_cap_36m": 72000.0, "debt": 2000.0, "revenue": 10500.0, "total_business_income": 10700.0, "interest_income": 200.0, "non_permissible_income": 200.0, "accounts_receivable": 5500.0, "fixed_assets": 2800.0, "total_assets": 12000.0, "price": 5500.0, "data_source": "internal_seed"},
    {"symbol": "COFORGE", "name": "Coforge", "sector": "Information Technology", "exchange": "NSE", "market_cap": 52000.0, "average_market_cap_36m": 48000.0, "debt": 3500.0, "revenue": 9800.0, "total_business_income": 10000.0, "interest_income": 200.0, "non_permissible_income": 200.0, "accounts_receivable": 4800.0, "fixed_assets": 2200.0, "total_assets": 10000.0, "price": 7800.0, "data_source": "internal_seed"},

    # ── CONSUMER GOODS & RETAIL ──
    {"symbol": "DMART", "name": "Avenue Supermarts", "sector": "Consumer Goods", "exchange": "NSE", "market_cap": 290000.0, "average_market_cap_36m": 275000.0, "debt": 8000.0, "revenue": 52000.0, "total_business_income": 52250.0, "interest_income": 250.0, "non_permissible_income": 250.0, "accounts_receivable": 1100.0, "fixed_assets": 10000.0, "total_assets": 30000.0, "price": 4500.0, "data_source": "internal_seed"},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever", "sector": "Consumer Goods", "exchange": "NSE", "market_cap": 550000.0, "average_market_cap_36m": 580000.0, "debt": 7500.0, "revenue": 60000.0, "total_business_income": 61000.0, "interest_income": 1000.0, "non_permissible_income": 1000.0, "accounts_receivable": 5200.0, "fixed_assets": 9500.0, "total_assets": 38000.0, "price": 2350.0, "data_source": "internal_seed"},
    {"symbol": "ITC", "name": "ITC Limited", "sector": "Tobacco and Consumer Goods", "exchange": "NSE", "market_cap": 580000.0, "average_market_cap_36m": 540000.0, "debt": 5000.0, "revenue": 70000.0, "total_business_income": 73000.0, "interest_income": 3000.0, "non_permissible_income": 18000.0, "accounts_receivable": 6500.0, "fixed_assets": 22000.0, "total_assets": 72000.0, "price": 465.0, "data_source": "internal_seed"},
    {"symbol": "NESTLEIND", "name": "Nestle India", "sector": "Consumer Goods", "exchange": "NSE", "market_cap": 210000.0, "average_market_cap_36m": 200000.0, "debt": 2500.0, "revenue": 19000.0, "total_business_income": 19200.0, "interest_income": 200.0, "non_permissible_income": 200.0, "accounts_receivable": 1500.0, "fixed_assets": 5000.0, "total_assets": 12000.0, "price": 2180.0, "data_source": "internal_seed"},
    {"symbol": "DABUR", "name": "Dabur India", "sector": "Consumer Goods", "exchange": "NSE", "market_cap": 98000.0, "average_market_cap_36m": 95000.0, "debt": 3200.0, "revenue": 12500.0, "total_business_income": 12800.0, "interest_income": 300.0, "non_permissible_income": 300.0, "accounts_receivable": 2800.0, "fixed_assets": 3500.0, "total_assets": 14000.0, "price": 555.0, "data_source": "internal_seed"},
    {"symbol": "MARICO", "name": "Marico", "sector": "Consumer Goods", "exchange": "NSE", "market_cap": 82000.0, "average_market_cap_36m": 78000.0, "debt": 1500.0, "revenue": 10000.0, "total_business_income": 10200.0, "interest_income": 200.0, "non_permissible_income": 200.0, "accounts_receivable": 1800.0, "fixed_assets": 2200.0, "total_assets": 8500.0, "price": 635.0, "data_source": "internal_seed"},
    {"symbol": "TRENT", "name": "Trent (Westside/Zudio)", "sector": "Consumer Goods", "exchange": "NSE", "market_cap": 220000.0, "average_market_cap_36m": 180000.0, "debt": 9000.0, "revenue": 14500.0, "total_business_income": 14700.0, "interest_income": 200.0, "non_permissible_income": 200.0, "accounts_receivable": 800.0, "fixed_assets": 11000.0, "total_assets": 22000.0, "price": 6200.0, "data_source": "internal_seed"},
    {"symbol": "TITAN", "name": "Titan Company", "sector": "Consumer Goods", "exchange": "NSE", "market_cap": 310000.0, "average_market_cap_36m": 290000.0, "debt": 15000.0, "revenue": 51000.0, "total_business_income": 51500.0, "interest_income": 500.0, "non_permissible_income": 500.0, "accounts_receivable": 3800.0, "fixed_assets": 7000.0, "total_assets": 30000.0, "price": 3500.0, "data_source": "internal_seed"},

    # ── PHARMACEUTICALS & HEALTHCARE ──
    {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical", "sector": "Pharmaceuticals", "exchange": "NSE", "market_cap": 420000.0, "average_market_cap_36m": 380000.0, "debt": 18000.0, "revenue": 49000.0, "total_business_income": 50000.0, "interest_income": 1000.0, "non_permissible_income": 1000.0, "accounts_receivable": 22000.0, "fixed_assets": 15000.0, "total_assets": 65000.0, "price": 1750.0, "data_source": "internal_seed"},
    {"symbol": "DRREDDY", "name": "Dr Reddy's Laboratories", "sector": "Pharmaceuticals", "exchange": "NSE", "market_cap": 105000.0, "average_market_cap_36m": 100000.0, "debt": 8000.0, "revenue": 27000.0, "total_business_income": 27500.0, "interest_income": 500.0, "non_permissible_income": 500.0, "accounts_receivable": 12000.0, "fixed_assets": 8500.0, "total_assets": 35000.0, "price": 6300.0, "data_source": "internal_seed"},
    {"symbol": "CIPLA", "name": "Cipla", "sector": "Pharmaceuticals", "exchange": "NSE", "market_cap": 120000.0, "average_market_cap_36m": 110000.0, "debt": 5000.0, "revenue": 25500.0, "total_business_income": 26000.0, "interest_income": 500.0, "non_permissible_income": 500.0, "accounts_receivable": 9000.0, "fixed_assets": 7000.0, "total_assets": 28000.0, "price": 1480.0, "data_source": "internal_seed"},
    {"symbol": "DIVISLAB", "name": "Divi's Laboratories", "sector": "Pharmaceuticals", "exchange": "NSE", "market_cap": 140000.0, "average_market_cap_36m": 130000.0, "debt": 800.0, "revenue": 8500.0, "total_business_income": 8700.0, "interest_income": 200.0, "non_permissible_income": 200.0, "accounts_receivable": 3000.0, "fixed_assets": 5500.0, "total_assets": 14000.0, "price": 5300.0, "data_source": "internal_seed"},
    {"symbol": "APOLLOHOSP", "name": "Apollo Hospitals", "sector": "Healthcare", "exchange": "NSE", "market_cap": 95000.0, "average_market_cap_36m": 88000.0, "debt": 12000.0, "revenue": 19500.0, "total_business_income": 19800.0, "interest_income": 300.0, "non_permissible_income": 300.0, "accounts_receivable": 3500.0, "fixed_assets": 14000.0, "total_assets": 28000.0, "price": 6600.0, "data_source": "internal_seed"},

    # ── AUTOMOBILES ──
    {"symbol": "MARUTI", "name": "Maruti Suzuki India", "sector": "Automobile", "exchange": "NSE", "market_cap": 380000.0, "average_market_cap_36m": 350000.0, "debt": 4000.0, "revenue": 140000.0, "total_business_income": 143000.0, "interest_income": 3000.0, "non_permissible_income": 3000.0, "accounts_receivable": 8500.0, "fixed_assets": 18000.0, "total_assets": 72000.0, "price": 12500.0, "data_source": "internal_seed"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors", "sector": "Automobile", "exchange": "NSE", "market_cap": 280000.0, "average_market_cap_36m": 260000.0, "debt": 95000.0, "revenue": 440000.0, "total_business_income": 445000.0, "interest_income": 5000.0, "non_permissible_income": 5000.0, "accounts_receivable": 28000.0, "fixed_assets": 85000.0, "total_assets": 310000.0, "price": 750.0, "data_source": "internal_seed"},
    {"symbol": "M&M", "name": "Mahindra & Mahindra", "sector": "Automobile", "exchange": "NSE", "market_cap": 380000.0, "average_market_cap_36m": 340000.0, "debt": 48000.0, "revenue": 145000.0, "total_business_income": 148000.0, "interest_income": 3000.0, "non_permissible_income": 3000.0, "accounts_receivable": 14000.0, "fixed_assets": 35000.0, "total_assets": 125000.0, "price": 3050.0, "data_source": "internal_seed"},
    {"symbol": "BAJAJ-AUTO", "name": "Bajaj Auto", "sector": "Automobile", "exchange": "NSE", "market_cap": 260000.0, "average_market_cap_36m": 240000.0, "debt": 2500.0, "revenue": 44000.0, "total_business_income": 46000.0, "interest_income": 2000.0, "non_permissible_income": 2000.0, "accounts_receivable": 3500.0, "fixed_assets": 5500.0, "total_assets": 30000.0, "price": 9200.0, "data_source": "internal_seed"},
    {"symbol": "EICHERMOT", "name": "Eicher Motors (Royal Enfield)", "sector": "Automobile", "exchange": "NSE", "market_cap": 135000.0, "average_market_cap_36m": 125000.0, "debt": 3000.0, "revenue": 17500.0, "total_business_income": 18000.0, "interest_income": 500.0, "non_permissible_income": 500.0, "accounts_receivable": 2200.0, "fixed_assets": 5800.0, "total_assets": 18000.0, "price": 4900.0, "data_source": "internal_seed"},
    {"symbol": "HEROMOTOCO", "name": "Hero MotoCorp", "sector": "Automobile", "exchange": "NSE", "market_cap": 105000.0, "average_market_cap_36m": 95000.0, "debt": 3500.0, "revenue": 39000.0, "total_business_income": 40000.0, "interest_income": 1000.0, "non_permissible_income": 1000.0, "accounts_receivable": 4200.0, "fixed_assets": 7500.0, "total_assets": 22000.0, "price": 5250.0, "data_source": "internal_seed"},

    # ── ENERGY & OIL/GAS ──
    {"symbol": "RELIANCE", "name": "Reliance Industries", "sector": "Energy", "exchange": "NSE", "market_cap": 1800000.0, "average_market_cap_36m": 1700000.0, "debt": 320000.0, "revenue": 960000.0, "total_business_income": 975000.0, "interest_income": 15000.0, "non_permissible_income": 15000.0, "accounts_receivable": 65000.0, "fixed_assets": 550000.0, "total_assets": 1500000.0, "price": 1330.0, "data_source": "internal_seed"},
    {"symbol": "ONGC", "name": "Oil and Natural Gas Corporation", "sector": "Energy", "exchange": "NSE", "market_cap": 350000.0, "average_market_cap_36m": 320000.0, "debt": 45000.0, "revenue": 640000.0, "total_business_income": 650000.0, "interest_income": 10000.0, "non_permissible_income": 10000.0, "accounts_receivable": 42000.0, "fixed_assets": 180000.0, "total_assets": 450000.0, "price": 280.0, "data_source": "internal_seed"},
    {"symbol": "NTPC", "name": "NTPC Limited", "sector": "Energy", "exchange": "NSE", "market_cap": 380000.0, "average_market_cap_36m": 340000.0, "debt": 185000.0, "revenue": 180000.0, "total_business_income": 185000.0, "interest_income": 5000.0, "non_permissible_income": 5000.0, "accounts_receivable": 28000.0, "fixed_assets": 250000.0, "total_assets": 480000.0, "price": 390.0, "data_source": "internal_seed"},
    {"symbol": "POWERGRID", "name": "Power Grid Corporation", "sector": "Energy", "exchange": "NSE", "market_cap": 310000.0, "average_market_cap_36m": 280000.0, "debt": 160000.0, "revenue": 46000.0, "total_business_income": 48000.0, "interest_income": 2000.0, "non_permissible_income": 2000.0, "accounts_receivable": 8000.0, "fixed_assets": 210000.0, "total_assets": 340000.0, "price": 330.0, "data_source": "internal_seed"},
    {"symbol": "ADANIENT", "name": "Adani Enterprises", "sector": "Energy", "exchange": "NSE", "market_cap": 350000.0, "average_market_cap_36m": 320000.0, "debt": 55000.0, "revenue": 96000.0, "total_business_income": 98000.0, "interest_income": 2000.0, "non_permissible_income": 2000.0, "accounts_receivable": 18000.0, "fixed_assets": 45000.0, "total_assets": 120000.0, "price": 3050.0, "data_source": "internal_seed"},
    {"symbol": "ADANIPORTS", "name": "Adani Ports & SEZ", "sector": "Infrastructure", "exchange": "NSE", "market_cap": 310000.0, "average_market_cap_36m": 280000.0, "debt": 50000.0, "revenue": 26000.0, "total_business_income": 27000.0, "interest_income": 1000.0, "non_permissible_income": 1000.0, "accounts_receivable": 5500.0, "fixed_assets": 40000.0, "total_assets": 85000.0, "price": 1440.0, "data_source": "internal_seed"},

    # ── METALS & MINING ──
    {"symbol": "TATASTEEL", "name": "Tata Steel", "sector": "Metals & Mining", "exchange": "NSE", "market_cap": 195000.0, "average_market_cap_36m": 180000.0, "debt": 85000.0, "revenue": 230000.0, "total_business_income": 233000.0, "interest_income": 3000.0, "non_permissible_income": 3000.0, "accounts_receivable": 18000.0, "fixed_assets": 95000.0, "total_assets": 250000.0, "price": 160.0, "data_source": "internal_seed"},
    {"symbol": "JSWSTEEL", "name": "JSW Steel", "sector": "Metals & Mining", "exchange": "NSE", "market_cap": 240000.0, "average_market_cap_36m": 220000.0, "debt": 72000.0, "revenue": 175000.0, "total_business_income": 178000.0, "interest_income": 3000.0, "non_permissible_income": 3000.0, "accounts_receivable": 14000.0, "fixed_assets": 85000.0, "total_assets": 200000.0, "price": 980.0, "data_source": "internal_seed"},
    {"symbol": "HINDALCO", "name": "Hindalco Industries", "sector": "Metals & Mining", "exchange": "NSE", "market_cap": 150000.0, "average_market_cap_36m": 140000.0, "debt": 42000.0, "revenue": 220000.0, "total_business_income": 222000.0, "interest_income": 2000.0, "non_permissible_income": 2000.0, "accounts_receivable": 15000.0, "fixed_assets": 55000.0, "total_assets": 140000.0, "price": 680.0, "data_source": "internal_seed"},
    {"symbol": "COALINDIA", "name": "Coal India", "sector": "Metals & Mining", "exchange": "NSE", "market_cap": 260000.0, "average_market_cap_36m": 240000.0, "debt": 8000.0, "revenue": 130000.0, "total_business_income": 135000.0, "interest_income": 5000.0, "non_permissible_income": 5000.0, "accounts_receivable": 22000.0, "fixed_assets": 35000.0, "total_assets": 95000.0, "price": 420.0, "data_source": "internal_seed"},

    # ── CEMENT & CONSTRUCTION ──
    {"symbol": "ULTRACEMCO", "name": "UltraTech Cement", "sector": "Cement", "exchange": "NSE", "market_cap": 320000.0, "average_market_cap_36m": 290000.0, "debt": 25000.0, "revenue": 72000.0, "total_business_income": 73000.0, "interest_income": 1000.0, "non_permissible_income": 1000.0, "accounts_receivable": 5800.0, "fixed_assets": 48000.0, "total_assets": 85000.0, "price": 11000.0, "data_source": "internal_seed"},
    {"symbol": "GRASIM", "name": "Grasim Industries", "sector": "Cement", "exchange": "NSE", "market_cap": 175000.0, "average_market_cap_36m": 160000.0, "debt": 18000.0, "revenue": 28000.0, "total_business_income": 29000.0, "interest_income": 1000.0, "non_permissible_income": 1000.0, "accounts_receivable": 4200.0, "fixed_assets": 22000.0, "total_assets": 55000.0, "price": 2650.0, "data_source": "internal_seed"},
    {"symbol": "SHREECEM", "name": "Shree Cement", "sector": "Cement", "exchange": "NSE", "market_cap": 98000.0, "average_market_cap_36m": 92000.0, "debt": 5500.0, "revenue": 20000.0, "total_business_income": 20500.0, "interest_income": 500.0, "non_permissible_income": 500.0, "accounts_receivable": 2200.0, "fixed_assets": 18000.0, "total_assets": 32000.0, "price": 27200.0, "data_source": "internal_seed"},
    {"symbol": "LT", "name": "Larsen & Toubro", "sector": "Infrastructure", "exchange": "NSE", "market_cap": 500000.0, "average_market_cap_36m": 460000.0, "debt": 120000.0, "revenue": 230000.0, "total_business_income": 240000.0, "interest_income": 10000.0, "non_permissible_income": 10000.0, "accounts_receivable": 65000.0, "fixed_assets": 35000.0, "total_assets": 280000.0, "price": 3650.0, "data_source": "internal_seed"},

    # ── BANKING & FINANCE (Sector-excluded) ──
    {"symbol": "HDFCBANK", "name": "HDFC Bank", "sector": "Banking and Financial Services", "exchange": "NSE", "market_cap": 1200000.0, "average_market_cap_36m": 1120000.0, "debt": 500000.0, "revenue": 210000.0, "total_business_income": 330000.0, "interest_income": 120000.0, "non_permissible_income": 120000.0, "accounts_receivable": 0.0, "fixed_assets": 18000.0, "total_assets": 3500000.0, "price": 1650.0, "data_source": "internal_seed"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank", "sector": "Banking and Financial Services", "exchange": "NSE", "market_cap": 920000.0, "average_market_cap_36m": 850000.0, "debt": 420000.0, "revenue": 180000.0, "total_business_income": 290000.0, "interest_income": 110000.0, "non_permissible_income": 110000.0, "accounts_receivable": 0.0, "fixed_assets": 15000.0, "total_assets": 2500000.0, "price": 1300.0, "data_source": "internal_seed"},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "sector": "Banking and Financial Services", "exchange": "NSE", "market_cap": 360000.0, "average_market_cap_36m": 340000.0, "debt": 280000.0, "revenue": 55000.0, "total_business_income": 95000.0, "interest_income": 40000.0, "non_permissible_income": 40000.0, "accounts_receivable": 0.0, "fixed_assets": 8000.0, "total_assets": 650000.0, "price": 1810.0, "data_source": "internal_seed"},
    {"symbol": "SBIN", "name": "State Bank of India", "sector": "Banking and Financial Services", "exchange": "NSE", "market_cap": 700000.0, "average_market_cap_36m": 650000.0, "debt": 2800000.0, "revenue": 350000.0, "total_business_income": 500000.0, "interest_income": 350000.0, "non_permissible_income": 350000.0, "accounts_receivable": 0.0, "fixed_assets": 42000.0, "total_assets": 6500000.0, "price": 785.0, "data_source": "internal_seed"},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance", "sector": "Financial Services", "exchange": "NSE", "market_cap": 520000.0, "average_market_cap_36m": 480000.0, "debt": 280000.0, "revenue": 55000.0, "total_business_income": 65000.0, "interest_income": 52000.0, "non_permissible_income": 52000.0, "accounts_receivable": 0.0, "fixed_assets": 5000.0, "total_assets": 380000.0, "price": 8400.0, "data_source": "internal_seed"},
    {"symbol": "HDFCLIFE", "name": "HDFC Life Insurance", "sector": "Insurance", "exchange": "NSE", "market_cap": 140000.0, "average_market_cap_36m": 135000.0, "debt": 8000.0, "revenue": 65000.0, "total_business_income": 68000.0, "interest_income": 35000.0, "non_permissible_income": 55000.0, "accounts_receivable": 2500.0, "fixed_assets": 1200.0, "total_assets": 280000.0, "price": 650.0, "data_source": "internal_seed"},

    # ── TELECOM ──
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel", "sector": "Telecom", "exchange": "NSE", "market_cap": 950000.0, "average_market_cap_36m": 850000.0, "debt": 180000.0, "revenue": 155000.0, "total_business_income": 158000.0, "interest_income": 3000.0, "non_permissible_income": 3000.0, "accounts_receivable": 12000.0, "fixed_assets": 250000.0, "total_assets": 480000.0, "price": 1700.0, "data_source": "internal_seed"},

    # ── CHEMICALS ──
    {"symbol": "PIDILITIND", "name": "Pidilite Industries", "sector": "Chemicals", "exchange": "NSE", "market_cap": 150000.0, "average_market_cap_36m": 140000.0, "debt": 3500.0, "revenue": 13000.0, "total_business_income": 13300.0, "interest_income": 300.0, "non_permissible_income": 300.0, "accounts_receivable": 3200.0, "fixed_assets": 5500.0, "total_assets": 15000.0, "price": 2950.0, "data_source": "internal_seed"},
    {"symbol": "ASIANPAINT", "name": "Asian Paints", "sector": "Chemicals", "exchange": "NSE", "market_cap": 260000.0, "average_market_cap_36m": 280000.0, "debt": 8000.0, "revenue": 35000.0, "total_business_income": 35500.0, "interest_income": 500.0, "non_permissible_income": 500.0, "accounts_receivable": 4500.0, "fixed_assets": 9000.0, "total_assets": 25000.0, "price": 2700.0, "data_source": "internal_seed"},
    {"symbol": "SOLARINDS", "name": "Solar Industries India", "sector": "Chemicals", "exchange": "NSE", "market_cap": 95000.0, "average_market_cap_36m": 85000.0, "debt": 4500.0, "revenue": 7500.0, "total_business_income": 7700.0, "interest_income": 200.0, "non_permissible_income": 200.0, "accounts_receivable": 3800.0, "fixed_assets": 3500.0, "total_assets": 10000.0, "price": 10500.0, "data_source": "internal_seed"},

    # ── REAL ESTATE ──
    {"symbol": "DLF", "name": "DLF Limited", "sector": "Real Estate", "exchange": "NSE", "market_cap": 195000.0, "average_market_cap_36m": 170000.0, "debt": 8000.0, "revenue": 8500.0, "total_business_income": 9000.0, "interest_income": 500.0, "non_permissible_income": 500.0, "accounts_receivable": 2200.0, "fixed_assets": 5500.0, "total_assets": 42000.0, "price": 790.0, "data_source": "internal_seed"},
    {"symbol": "GODREJPROP", "name": "Godrej Properties", "sector": "Real Estate", "exchange": "NSE", "market_cap": 75000.0, "average_market_cap_36m": 68000.0, "debt": 12000.0, "revenue": 5500.0, "total_business_income": 5700.0, "interest_income": 200.0, "non_permissible_income": 200.0, "accounts_receivable": 4000.0, "fixed_assets": 3500.0, "total_assets": 25000.0, "price": 2700.0, "data_source": "internal_seed"},

    # ── MISCELLANEOUS LARGE-CAP ──
    {"symbol": "BRITANNIA", "name": "Britannia Industries", "sector": "Consumer Goods", "exchange": "NSE", "market_cap": 130000.0, "average_market_cap_36m": 120000.0, "debt": 5500.0, "revenue": 17500.0, "total_business_income": 17800.0, "interest_income": 300.0, "non_permissible_income": 300.0, "accounts_receivable": 1800.0, "fixed_assets": 4500.0, "total_assets": 12000.0, "price": 5400.0, "data_source": "internal_seed"},
    {"symbol": "HAL", "name": "Hindustan Aeronautics", "sector": "Defence", "exchange": "NSE", "market_cap": 310000.0, "average_market_cap_36m": 280000.0, "debt": 5000.0, "revenue": 30000.0, "total_business_income": 32000.0, "interest_income": 2000.0, "non_permissible_income": 30000.0, "accounts_receivable": 18000.0, "fixed_assets": 12000.0, "total_assets": 55000.0, "price": 4650.0, "data_source": "internal_seed"},
    {"symbol": "BEL", "name": "Bharat Electronics", "sector": "Defence", "exchange": "NSE", "market_cap": 220000.0, "average_market_cap_36m": 190000.0, "debt": 2000.0, "revenue": 20000.0, "total_business_income": 21000.0, "interest_income": 1000.0, "non_permissible_income": 20000.0, "accounts_receivable": 9000.0, "fixed_assets": 5000.0, "total_assets": 28000.0, "price": 300.0, "data_source": "internal_seed"},
    {"symbol": "ZOMATO", "name": "Zomato", "sector": "Consumer Services", "exchange": "NSE", "market_cap": 210000.0, "average_market_cap_36m": 180000.0, "debt": 2000.0, "revenue": 15000.0, "total_business_income": 15200.0, "interest_income": 200.0, "non_permissible_income": 200.0, "accounts_receivable": 2500.0, "fixed_assets": 3000.0, "total_assets": 22000.0, "price": 240.0, "data_source": "internal_seed"},
    {"symbol": "IRCTC", "name": "Indian Railway Catering & Tourism", "sector": "Consumer Services", "exchange": "NSE", "market_cap": 70000.0, "average_market_cap_36m": 65000.0, "debt": 500.0, "revenue": 4200.0, "total_business_income": 4400.0, "interest_income": 200.0, "non_permissible_income": 200.0, "accounts_receivable": 1500.0, "fixed_assets": 800.0, "total_assets": 5500.0, "price": 875.0, "data_source": "internal_seed"},
    {"symbol": "TATAPOWER", "name": "Tata Power Company", "sector": "Energy", "exchange": "NSE", "market_cap": 145000.0, "average_market_cap_36m": 130000.0, "debt": 42000.0, "revenue": 60000.0, "total_business_income": 62000.0, "interest_income": 2000.0, "non_permissible_income": 2000.0, "accounts_receivable": 8500.0, "fixed_assets": 55000.0, "total_assets": 95000.0, "price": 450.0, "data_source": "internal_seed"},
    {"symbol": "INDIGO", "name": "InterGlobe Aviation (IndiGo)", "sector": "Aviation", "exchange": "NSE", "market_cap": 180000.0, "average_market_cap_36m": 160000.0, "debt": 48000.0, "revenue": 68000.0, "total_business_income": 69000.0, "interest_income": 1000.0, "non_permissible_income": 1000.0, "accounts_receivable": 3500.0, "fixed_assets": 85000.0, "total_assets": 110000.0, "price": 4650.0, "data_source": "internal_seed"},
]

SEED_RULE_VERSIONS = [
    {
        "profile_code": "india_strict",
        "version": "2026.04-app",
        "status": "internal_active",
        "approved_by": "Founder review pending scholar validation",
        "notes": "Single strict app profile combining current S&P-style hard rules with ICIF-informed India verification rules.",
        "source_summary": "Primary source anchors are S&P methodology and ICIF references.",
    },
]

SEED_USERS = [
    {
        "email": "aditya@example.com",
        "display_name": "Aditya",
        "auth_provider": "google",
        "auth_subject": "google-oauth2|aditya-seed",
        "is_active": True,
    }
]

SEED_USER_SETTINGS = [
    {
        "auth_subject": "google-oauth2|aditya-seed",
        "preferred_currency": "INR",
        "risk_profile": "moderate",
        "notifications_enabled": True,
        "theme": "dark",
    }
]

SEED_PORTFOLIOS = [
    {
        "auth_subject": "google-oauth2|aditya-seed",
        "owner_name": "aditya",
        "name": "Core India Halal",
        "base_currency": "INR",
        "investment_objective": "Compounding through large-cap Indian halal equities",
    }
]

SEED_HOLDINGS = [
    {"portfolio_name": "Core India Halal", "symbol": "TCS", "quantity": 8, "average_buy_price": 3725.0, "target_allocation_pct": 35.0, "thesis": "High-quality IT compounder with strong balance sheet."},
    {"portfolio_name": "Core India Halal", "symbol": "INFY", "quantity": 12, "average_buy_price": 1480.0, "target_allocation_pct": 30.0, "thesis": "Global IT services exposure with cleaner compliance profile."},
    {"portfolio_name": "Core India Halal", "symbol": "DMART", "quantity": 4, "average_buy_price": 4300.0, "target_allocation_pct": 20.0, "thesis": "Consumer retail franchise with disciplined operations."},
]

SEED_WATCHLIST = [
    {"auth_subject": "google-oauth2|aditya-seed", "owner_name": "aditya", "symbol": "WIPRO", "notes": "Watch for business quality improvement and valuation comfort."},
    {"auth_subject": "google-oauth2|aditya-seed", "owner_name": "aditya", "symbol": "HDFCBANK", "notes": "Tracked as a benchmark non-compliant example for UX and testing."},
]

SEED_SAVED_SCREENERS = [
    {
        "auth_subject": "google-oauth2|aditya-seed",
        "name": "Strict halal compounders",
        "search_query": "",
        "sector": "Information Technology",
        "status_filter": "halal",
        "halal_only": True,
        "notes": "Focus on large-cap IT names already aligned with the strict India profile.",
    },
    {
        "auth_subject": "google-oauth2|aditya-seed",
        "name": "Review radar",
        "search_query": "",
        "sector": "All",
        "status_filter": "requires_review",
        "halal_only": False,
        "notes": "Use this list to monitor names that need scholar or manual review.",
    },
]

SEED_RESEARCH_NOTES = [
    {
        "auth_subject": "google-oauth2|aditya-seed",
        "portfolio_name": "Core India Halal",
        "symbol": "TCS",
        "note_type": "ADD",
        "summary": "Add slowly if valuation stays reasonable and the compliance screen remains clean.",
        "conviction": "high",
        "status_snapshot": "HALAL",
        "notes": "Core compounder. Add only in measured size to avoid concentration drift.",
    },
    {
        "auth_subject": "google-oauth2|aditya-seed",
        "portfolio_name": "Core India Halal",
        "symbol": "DMART",
        "note_type": "WATCH",
        "summary": "Keep on watch until position size and valuation both line up.",
        "conviction": "medium",
        "status_snapshot": "HALAL",
        "notes": "Business quality is strong, but entry discipline matters.",
    },
]

SEED_REVIEW_CASES = [
    {
        "symbol": "HDFCBANK",
        "requested_by": "seed",
        "assigned_to": "founder@barakfi.in",
        "status": "open",
        "priority": "high",
        "review_outcome": None,
        "summary": "Keep a benchmark review case for a clearly non-compliant banking name.",
        "notes": "Useful for validating how the governance queue handles obvious exclusions.",
        "events": [
            {
                "action": "case_created",
                "note": "Seeded founder review case for testing the governance workflow.",
                "actor": "seed",
            }
        ],
    },
    {
        "symbol": "WIPRO",
        "requested_by": "seed",
        "assigned_to": "scholar-review@barakfi.in",
        "status": "in_progress",
        "priority": "normal",
        "review_outcome": "REQUIRES_REVIEW",
        "summary": "Track an in-progress review workflow for a watchlist stock.",
        "notes": "Use this case to validate assignment and event history in the founder console.",
        "events": [
            {
                "action": "case_created",
                "note": "Seeded review case created from the watchlist research flow.",
                "actor": "seed",
            },
            {
                "action": "status_updated",
                "note": "Assigned for manual review and left in progress pending founder notes.",
                "actor": "seed",
            },
        ],
    },
]


def seed_stocks(db: Session) -> None:
    for payload in SEED_STOCKS:
        existing = db.query(Stock).filter(Stock.symbol == payload["symbol"]).first()
        if existing:
            for key, value in payload.items():
                setattr(existing, key, value)
        else:
            db.add(Stock(**payload))
    db.commit()


def seed_rule_versions(db: Session) -> None:
    for payload in SEED_RULE_VERSIONS:
        db.add(ComplianceRuleVersion(**payload))
    db.commit()


def seed_users(db: Session) -> None:
    for payload in SEED_USERS:
        db.add(User(**payload))
    db.flush()

    user_map = {user.auth_subject: user for user in db.query(User).all()}

    for payload in SEED_USER_SETTINGS:
        auth_subject = payload["auth_subject"]
        user = user_map[auth_subject]
        db.add(
            UserSettings(
                user_id=user.id,
                preferred_currency=payload["preferred_currency"],
                risk_profile=payload["risk_profile"],
                notifications_enabled=payload["notifications_enabled"],
                theme=payload["theme"],
            )
        )
    db.commit()


def seed_portfolios(db: Session) -> None:
    portfolio_map = {}
    stock_map = {stock.symbol: stock for stock in db.query(Stock).all()}
    user_map = {user.auth_subject: user for user in db.query(User).all()}

    for payload in SEED_PORTFOLIOS:
        user = user_map[payload["auth_subject"]]
        portfolio = Portfolio(
            user_id=user.id,
            owner_name=payload["owner_name"],
            name=payload["name"],
            base_currency=payload["base_currency"],
            investment_objective=payload["investment_objective"],
        )
        db.add(portfolio)
        db.flush()
        portfolio_map[portfolio.name] = portfolio

    for payload in SEED_HOLDINGS:
        portfolio = portfolio_map[payload["portfolio_name"]]
        stock = stock_map[payload["symbol"]]
        db.add(
            PortfolioHolding(
                portfolio_id=portfolio.id,
                stock_id=stock.id,
                quantity=payload["quantity"],
                average_buy_price=payload["average_buy_price"],
                target_allocation_pct=payload["target_allocation_pct"],
                thesis=payload["thesis"],
            )
        )

    for payload in SEED_WATCHLIST:
        stock = stock_map[payload["symbol"]]
        user = user_map[payload["auth_subject"]]
        db.add(
            WatchlistEntry(
                user_id=user.id,
                owner_name=payload["owner_name"],
                stock_id=stock.id,
                notes=payload["notes"],
            )
        )

    db.commit()


def seed_saved_screeners(db: Session) -> None:
    user_map = {user.auth_subject: user for user in db.query(User).all()}

    for payload in SEED_SAVED_SCREENERS:
        user = user_map[payload["auth_subject"]]
        db.add(
            SavedScreener(
                user_id=user.id,
                name=payload["name"],
                search_query=payload["search_query"],
                sector=payload["sector"],
                status_filter=payload["status_filter"],
                halal_only=payload["halal_only"],
                notes=payload["notes"],
            )
        )

    db.commit()


def seed_research_notes(db: Session) -> None:
    user_map = {user.auth_subject: user for user in db.query(User).all()}
    portfolio_map = {portfolio.name: portfolio for portfolio in db.query(Portfolio).all()}
    stock_map = {stock.symbol: stock for stock in db.query(Stock).all()}

    for payload in SEED_RESEARCH_NOTES:
        user = user_map[payload["auth_subject"]]
        portfolio = portfolio_map[payload["portfolio_name"]]
        stock = stock_map[payload["symbol"]]
        db.add(
            ResearchNote(
                user_id=user.id,
                portfolio_id=portfolio.id,
                stock_id=stock.id,
                note_type=payload["note_type"],
                summary=payload["summary"],
                conviction=payload["conviction"],
                status_snapshot=payload["status_snapshot"],
                notes=payload["notes"],
            )
        )

    db.commit()


def seed_review_cases(db: Session) -> None:
    stock_map = {stock.symbol: stock for stock in db.query(Stock).all()}

    for payload in SEED_REVIEW_CASES:
        stock = stock_map[payload["symbol"]]
        review_case = ComplianceReviewCase(
            stock_id=stock.id,
            requested_by=payload["requested_by"],
            assigned_to=payload["assigned_to"],
            status=payload["status"],
            priority=payload["priority"],
            review_outcome=payload["review_outcome"],
            summary=payload["summary"],
            notes=payload["notes"],
        )
        db.add(review_case)
        db.flush()

        for event_payload in payload["events"]:
            db.add(
                ComplianceReviewEvent(
                    review_case_id=review_case.id,
                    action=event_payload["action"],
                    note=event_payload["note"],
                    actor=event_payload["actor"],
                )
            )

    db.commit()


def main() -> None:
    # For this personal-project seed flow, recreating the local SQLite schema is
    # the simplest way to keep the development database aligned with model changes.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_stocks(db)
        seed_rule_versions(db)
        seed_users(db)
        seed_portfolios(db)
        seed_saved_screeners(db)
        seed_research_notes(db)
        seed_review_cases(db)
        sectors = set(s["sector"] for s in SEED_STOCKS)
        print(f"Loaded {len(SEED_STOCKS)} stocks across {len(sectors)} sectors into the local database.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
