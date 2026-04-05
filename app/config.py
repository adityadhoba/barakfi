import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./barakfi.db")
APP_NAME = os.getenv("APP_NAME", "Barakfi API")
APP_ENV = os.getenv("APP_ENV", "development")
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]
AUTHORIZED_PARTIES = [
    origin.strip()
    for origin in os.getenv("AUTHORIZED_PARTIES", ",".join(CORS_ORIGINS)).split(",")
    if origin.strip()
]
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
AUTH_PROVIDER = os.getenv("AUTH_PROVIDER", "clerk")
AUTH_GOOGLE_ENABLED = os.getenv("AUTH_GOOGLE_ENABLED", "false").lower() == "true"
CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY", "")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")
CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "https://api.clerk.com/v1/jwks")
CLERK_JS_URL = os.getenv("CLERK_JS_URL", "")
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")
if not INTERNAL_SERVICE_TOKEN and APP_ENV.lower() != "production":
    INTERNAL_SERVICE_TOKEN = "dev-internal-token-change-me"

ADMIN_AUTH_SUBJECTS = [
    subject.strip()
    for subject in os.getenv("ADMIN_AUTH_SUBJECTS", "").split(",")
    if subject.strip()
]
ADMIN_EMAILS = [
    email.strip().lower()
    for email in os.getenv("ADMIN_EMAILS", "").split(",")
    if email.strip()
]
MARKET_DATA_PROVIDER = os.getenv("MARKET_DATA_PROVIDER", "seed").strip().lower()
FUNDAMENTALS_PROVIDER = os.getenv("FUNDAMENTALS_PROVIDER", "seed").strip().lower()
GROWW_API_KEY = os.getenv("GROWW_API_KEY", "")
GROWW_ACCESS_TOKEN = os.getenv("GROWW_ACCESS_TOKEN", "")
KITE_API_KEY = os.getenv("KITE_API_KEY", "")
KITE_ACCESS_TOKEN = os.getenv("KITE_ACCESS_TOKEN", "")
UPSTOX_ACCESS_TOKEN = os.getenv("UPSTOX_ACCESS_TOKEN", "")
SIGNALX_API_KEY = os.getenv("SIGNALX_API_KEY", "")
XARO_API_KEY = os.getenv("XARO_API_KEY", "")



def is_production() -> bool:
    return APP_ENV.lower() == "production"

# RSS feed for Islamic finance news (Google News topic query — configurable)
NEWS_RSS_URL = os.getenv(
    "NEWS_RSS_URL",
    "https://news.google.com/rss/search?q=Islamic+finance+OR+Shariah+investing&hl=en-US&gl=US&ceid=US:en",
)
# Upstox OAuth (optional — for broker connect)
UPSTOX_API_KEY = os.getenv("UPSTOX_API_KEY", "")
UPSTOX_API_SECRET = os.getenv("UPSTOX_API_SECRET", "")
# Must match the redirect URL registered in Upstox developer console (e.g. https://api.barakfi.in/api/me/integrations/upstox/callback)
UPSTOX_REDIRECT_URI = os.getenv("UPSTOX_REDIRECT_URI", "")

# OAuth redirects (broker callbacks) — set in production to your Vercel URL
FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", "").strip() or (CORS_ORIGINS[0] if CORS_ORIGINS else "http://localhost:3000")

# NewsData.io (optional — set NEWSDATA_API_KEY for /internal/news/sync)
# Falls back to NEWS_NEWSAPI_* env names for migration from NewsAPI.org.
NEWSDATA_API_KEY = (
    os.getenv("NEWSDATA_API_KEY") or os.getenv("NEWS_NEWSAPI_KEY") or ""
).strip()
NEWSDATA_Q = (
    os.getenv("NEWSDATA_Q")
    or os.getenv("NEWS_NEWSAPI_QUERY")
    or "islamic finance OR sukuk OR shariah finance"
).strip()
