import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./barakfi.db")
APP_NAME = os.getenv("APP_NAME", "Barakfi API")
APP_ENV = os.getenv("APP_ENV", "development")
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
# During envelope rollout: include previous JSON body under "legacy" for selected routes
API_ENVELOPE_LEGACY = os.getenv("API_ENVELOPE_LEGACY", "false").lower() == "true"
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
OPS_SLACK_WEBHOOK_URL = os.getenv("OPS_SLACK_WEBHOOK_URL", "").strip()
OPS_ALERT_FAILURES_ENABLED = os.getenv("OPS_ALERT_FAILURES_ENABLED", "true").lower() == "true"
OPS_ALERT_SUCCESSES_ENABLED = os.getenv("OPS_ALERT_SUCCESSES_ENABLED", "true").lower() == "true"
OPS_ALERT_JOB_A_SUCCESSES_ENABLED = os.getenv("OPS_ALERT_JOB_A_SUCCESSES_ENABLED", "false").lower() == "true"
OPS_ALERT_QUIET_WINDOW_ENABLED = os.getenv("OPS_ALERT_QUIET_WINDOW_ENABLED", "false").lower() == "true"
try:
    OPS_ALERT_QUIET_WINDOW_SECONDS = max(0, int(os.getenv("OPS_ALERT_QUIET_WINDOW_SECONDS", "1800")))
except ValueError:
    OPS_ALERT_QUIET_WINDOW_SECONDS = 1800

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
ALLOW_SEED_DATA_FALLBACK = os.getenv("ALLOW_SEED_DATA_FALLBACK", "false").lower() == "true"
try:
    FUNDAMENTALS_STALE_THRESHOLD_HOURS = max(1, int(os.getenv("FUNDAMENTALS_STALE_THRESHOLD_HOURS", "36")))
except ValueError:
    FUNDAMENTALS_STALE_THRESHOLD_HOURS = 36
GROWW_API_KEY = os.getenv("GROWW_API_KEY", "")
GROWW_ACCESS_TOKEN = os.getenv("GROWW_ACCESS_TOKEN", "")
KITE_API_KEY = os.getenv("KITE_API_KEY", "")
KITE_ACCESS_TOKEN = os.getenv("KITE_ACCESS_TOKEN", "")
UPSTOX_ACCESS_TOKEN = os.getenv("UPSTOX_ACCESS_TOKEN", "")
SIGNALX_API_KEY = os.getenv("SIGNALX_API_KEY", "")
XARO_API_KEY = os.getenv("XARO_API_KEY", "")
# Optional paid market data (e.g. Financial Modeling Prep) for ETF holdings / fundamentals fallback
MARKET_DATA_API_KEY = os.getenv("MARKET_DATA_API_KEY", "").strip()
FMP_API_BASE = os.getenv("FMP_API_BASE", "https://financialmodelingprep.com/api/v3").rstrip("/")



def is_production() -> bool:
    return APP_ENV.lower() == "production"
# Upstox OAuth (optional — for broker connect)
UPSTOX_API_KEY = os.getenv("UPSTOX_API_KEY", "")
UPSTOX_API_SECRET = os.getenv("UPSTOX_API_SECRET", "")
# Must match the redirect URL registered in Upstox developer console (e.g. https://api.barakfi.in/api/me/integrations/upstox/callback)
UPSTOX_REDIRECT_URI = os.getenv("UPSTOX_REDIRECT_URI", "")

# OAuth redirects (broker callbacks) — set in production to your Vercel URL
FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", "").strip() or (CORS_ORIGINS[0] if CORS_ORIGINS else "http://localhost:3000")
