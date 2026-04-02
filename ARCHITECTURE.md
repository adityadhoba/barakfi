# Barakfi Architecture Guide

## Project Overview

**Barakfi** is a Shariah-compliant Indian equity screening and portfolio management application. It helps Muslim investors identify and manage halal (permissible under Islamic finance principles) stocks listed on the Indian National Stock Exchange (NSE).

The app combines:
- Real-time NSE market data and quotes
- Fundamental financial analysis (balance sheet, income statement screening)
- Shariah compliance rules engine (debt caps, non-permissible income exclusions, sector screening)
- Portfolio tracking and rebalancing suggestions
- Subscription-based access with entitlements

## Tech Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **Runtime**: React 19 (Server and Client components)
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Authentication**: Clerk.com (OAuth/JWT-based session management)
- **HTTP Client**: Native fetch API with ISR (Incremental Static Regeneration)
- **State Management**: React Context API (minimal, client-side only)

### Backend
- **Framework**: FastAPI (Python async web framework)
- **ORM**: SQLAlchemy with async session support
- **Database**: SQLite (development), PostgreSQL (production-ready via Docker)
- **Authentication**: Clerk JWKS validation + internal service tokens
- **Async Execution**: Python `asyncio` with `httpx` for non-blocking HTTP
- **Payment Integration**: Razorpay (subscription billing)
- **Market Data Sources**: NSE India API (official), Yahoo Finance (fallback), Groww/Upstox APIs (configured but not live)

### External Services
- **Authentication**: Clerk (user provisioning, sessions, OAuth delegation)
- **Payment Processing**: Razorpay (Indian rupee subscriptions)
- **Market Data**: NSE India, Yahoo Finance, Groww, Upstox
- **Hosting**: Docker containers (backend + frontend + postgres)

## Directory Structure

```
halal-invest-app/
├── app/                          # FastAPI backend (Python)
│   ├── api/
│   │   └── routes.py            # All API endpoints (7+ route groups)
│   ├── services/                # Business logic layer
│   │   ├── halal_service.py     # Shariah screening rules & evaluation
│   │   ├── indian_market_client.py  # NSE/Yahoo quote fetching
│   │   ├── market_data_service.py   # Market data provider status
│   │   ├── auth_service.py      # Clerk JWT verification
│   │   ├── razorpay_service.py  # Payment processing
│   │   ├── nse_service.py       # NSE data ingestion
│   │   ├── quote_sync_service.py    # Database quote updates
│   │   ├── provider_sync_service.py # Stock universe syncing
│   │   └── ...
│   ├── models.py                # SQLAlchemy ORM models (17 tables)
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── database.py              # SQLAlchemy engine & session
│   ├── config.py                # Environment-based configuration
│   └── main.py                  # FastAPI app initialization
├── frontend/                    # Next.js frontend (TypeScript/React)
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   │   ├── page.tsx         # Home landing page
│   │   │   ├── layout.tsx       # Root layout with auth wrapper
│   │   │   ├── screener/        # Stock screener page
│   │   │   ├── stocks/[symbol]/ # Stock detail page
│   │   │   ├── workspace/       # Authenticated user dashboard
│   │   │   ├── governance/      # Admin/compliance pages
│   │   │   └── api/             # API route handlers (Clerk webhooks, etc.)
│   │   ├── components/          # Reusable React components
│   │   │   ├── stock-screener-table.tsx  # Main screener UI
│   │   │   ├── home-dashboard.tsx        # Workspace overview
│   │   │   ├── compliance-queue.tsx      # Manual review queue
│   │   │   └── ...
│   │   ├── lib/                 # Utilities & API client
│   │   │   ├── api.ts           # Backend API functions (80+ exported functions)
│   │   │   └── backend-auth.ts  # Auth header builder
│   │   └── styles/              # Global CSS & modules
│   └── public/                  # Static assets
├── .env.example                 # Environment variable template
├── docker-compose.yml           # Local development setup
├── Dockerfile.backend           # Production backend image
├── Dockerfile.frontend          # Production frontend image
└── requirements.txt             # Python dependencies
```

## Frontend Architecture

### App Router Structure
- **Layouts**: Root layout wraps all pages with Clerk `<ClerkProvider>` for authentication
- **Server Components**: Page components (`.tsx` files in `/app/`) fetch data server-side during build/request
- **Client Components**: Components marked with `"use client"` handle interactivity (filters, modals, forms)
- **Incremental Static Regeneration (ISR)**: Public pages revalidate every 30-120 seconds for fresh market data

### Component Organization

#### Pages (Server-rendered)
- **`page.tsx`**: Static landing page (education + CTA)
- **`screener/page.tsx`**: Main stock screener (Server Component fetching stock list)
- **`stocks/[symbol]/page.tsx`**: Dynamic stock detail page with fundamentals + screening results
- **`workspace/page.tsx`**: Authenticated dashboard (portfolios, watchlists, activity feed)
- **`governance/page.tsx`**: Admin-only governance & rule management console

#### Components (Mixed rendering)
- **`StockScreenerTable`** (Client): Interactive table with sorting, filtering, pagination, bulk actions
- **`HomeDashboard`** (Server): Data aggregation component for workspace
- **`ComplianceQueue`** (Server): Review cases queue for manual overrides
- **Modal/Form Components** (Client): Add holding, create portfolio, save screener

### CSS Architecture
- **CSS Modules**: Each component gets a `.module.css` file (scoped class names)
- **Global Styles**: `app/shell.css` contains base typography, variables, reset
- **Dark Mode**: Theme managed via CSS custom properties (`:root` selector with `--theme-*` vars)
- **No CSS-in-JS**: Keeps bundle size minimal and debug-friendly

### Authentication Flow
1. **Client visits app** → Clerk `<ClerkProvider>` initializes
2. **Clerk SDK checks session token** (from secure HTTP-only cookie)
3. **If authenticated**: Clerk populates `useAuth()` hook with user claims
4. **Frontend calls `getAuthenticatedWorkspace(token, actor)`** to fetch user-specific data
5. **Backend validates token against Clerk JWKS** before returning data
6. **If not authenticated**: Redirect to `/sign-up` or show anonymous public pages

### API Client Pattern (`lib/api.ts`)

```typescript
// Public endpoints (no auth required)
getStocks() → Stock[] (cached 30s)
getScreeningResult(symbol) → ScreeningResult | null
getBulkScreeningResults([symbols]) → ScreeningResult[] (POST)

// Authenticated endpoints (require token + optional actor override)
getAuthenticatedWorkspace(token, actor?)
getAuthenticatedUser(token, actor?)
getAuthenticatedBilling(token, actor?)

// Admin endpoints
getAuthenticatedGovernanceOverview(token, actor?)
```

## Backend Architecture

### FastAPI Router Organization

The backend exposes **7 route groups** via `/api` prefix:

1. **`/auth`** - Authentication strategy & configuration
   - `GET /auth/strategy` - Returns active auth provider, clerk readiness, etc.

2. **`/market-data`** - Live market prices and index data
   - `GET /market-data/indices` - NSE NIFTY 50, BANK NIFTY, SENSEX
   - `GET /market-data/quote/{symbol}?provider=auto_india` - Live equity snapshot
   - `POST /market-data/sync-prices` - Update DB with latest quotes from NSE/Yahoo
   - `GET /market-data/status` - Provider health & stock count

3. **`/stocks`** - Stock universe & fundamentals
   - `GET /stocks` - All active stocks with fundamentals
   - `GET /stocks/{symbol}` - Single stock with balance sheet

4. **`/screen`** - Shariah screening evaluation
   - `GET /screen/{symbol}` - Single stock screening result
   - `POST /screen/bulk` - Batch evaluation (POST JSON array of symbols)
   - `GET /screening-logs` - Audit log of all screening runs

5. **`/users/{auth_subject}`** - User data & workspace
   - `GET /users/{auth_subject}/workspace` - Portfolio + watchlist + screeners
   - `GET /users/{auth_subject}` - User profile

6. **`/me`** - Authenticated user endpoints (requires token)
   - `GET /me` - Current user
   - `POST /me/bootstrap` - Initialize new user on first login
   - `GET /me/workspace` - Full user workspace
   - `GET /me/billing` - Subscription & entitlements
   - `GET /me/compliance-queue` - Manual review items
   - `POST /me/watchlist` - Add to watchlist

7. **`/admin`** - Governance & compliance (admin-only)
   - `GET /admin/governance/overview` - All rules, overrides, users, plans
   - `GET /admin/data-stack/universe-preview` - Import readiness by provider

### Service Layer Pattern

Each service module handles one domain:

#### `halal_service.py` - Shariah Screening Engine
- **Core function**: `evaluate_stock(stock, profile_code) → ScreeningResult`
- **Hard Rules** (fail immediately):
  - Sector exclusion (gambling, alcohol, tobacco, etc.)
  - Debt to market cap > threshold
  - Non-permissible income ratio > threshold
- **Review Rules** (flag for manual override):
  - Receivables to market cap threshold
  - Fixed assets to total assets threshold
- **Profiles**: `india_strict`, `india_moderate` (configurable rulebook)
- **Data source**: Config-based rules from `halal_rules.json` or database

#### `indian_market_client.py` - Market Data Fetching
- **NSE Integration**:
  - `fetch_nse_equity_quote(symbol)` - Scrape NSE India website JSON API
  - `fetch_nse_indices()` - Get NIFTY 50, BANK NIFTY, SENSEX, NIFTY MIDCAP 150
  - Requires session cookie (stateless calls fail)
- **Yahoo Finance Fallback**:
  - `fetch_yahoo_chart_quote(symbol)` - Historical chart API (no login needed)
- **Fallback Strategy**:
  1. Try NSE (official, delayed by ~15min)
  2. Try Yahoo (if NSE fails or timeout)
  3. Return None if both fail
- **Rate limiting**: Manual exponential backoff, respect timeout constraints

#### `quote_sync_service.py` - Database Updates
- `sync_all_stock_prices(provider, max_stocks)` - Batch update stock.price column
- Runs periodically (background task or manual trigger)
- Tracks source per stock (nse_public, yahoo_india, internal_seed)

#### `auth_service.py` - Session Validation
- `get_current_auth_claims(auth_header)` - Validate Clerk JWT
- Fetches JWKS from Clerk (cached, auto-refresh on key rotation)
- Returns `AuthClaims(sub, email, auth_method)` or raises 401

#### `razorpay_service.py` - Payment Processing
- `create_order(amount_inr, plan_code)` - Create Razorpay order
- `verify_payment_signature(razorpay_id, signature)` - Validate webhook signature
- Links successful payments to `UserSubscription` records

### Database Models (SQLAlchemy)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `stocks` | Equity universe | symbol, name, sector, market_cap, debt, interest_income, price, data_source |
| `users` | User accounts | email, auth_provider, auth_subject (Clerk ID), is_active |
| `user_settings` | User preferences | preferred_currency, risk_profile, theme |
| `portfolios` | Named investment groups | user_id, name, base_currency, investment_objective |
| `portfolio_holdings` | Stock positions | portfolio_id, stock_id, quantity, average_buy_price, target_allocation_pct, thesis |
| `watchlist_entries` | Tracked stocks | user_id, stock_id, notes |
| `saved_screeners` | Saved search queries | user_id, search_query, sector, halal_only |
| `order_intents` | Proposed trades | user_id, stock_id, side (buy/sell), quantity, limit_price |
| `investment_decisions` | Decision log | user_id, stock_id, decision_type, conviction, status_snapshot, notes |
| `screening_logs` | Audit trail | profile_code, stock_id, triggered_reasons, manual_review_flags |
| `compliance_overrides` | Manual overrides | stock_id, decided_status, rationale, decided_by |
| `compliance_review_cases` | Manual review queue | stock_id, status (open/resolved), priority, review_outcome |
| `user_subscriptions` | Billing info | user_id, status, plan_id, current_period_end, provider (razorpay) |
| `subscription_plans` | Plan catalog | code, name, monthly_price_inr, annual_price_inr, features |
| `feature_flags` | Feature toggles | code, enabled, rollout_stage |
| `support_notes` | Admin notes | user_id, note, created_by |

### Authentication & Authorization

**Token-based (Clerk JWT)**:
1. Frontend calls Clerk SDK → gets JWT in memory
2. Frontend adds JWT to `Authorization: Bearer <token>` header
3. Backend validates against Clerk JWKS endpoint
4. If valid, extracts `sub` (user ID) and `email` claims

**Admin Detection**:
- Admin if `auth_subject` in `ADMIN_AUTH_SUBJECTS` (env var list)
- Or email in `ADMIN_EMAILS` list
- Used to gate `/admin/*` endpoints

**Internal Service Token**:
- Backend can call itself with `INTERNAL_SERVICE_TOKEN` (pre-shared secret)
- Used for scheduled jobs (price sync, screening batch jobs)
- No Clerk validation required

## Key Design Patterns

### Bulk API Pattern
**Problem**: Screening 1000 stocks via 1000 individual GET requests is slow.
**Solution**:
```
POST /screen/bulk
[ "INFY", "TCS", "WIPRO", ... ]
→ [ ScreeningResult, ScreeningResult, ... ]
```
Response is evaluated in parallel using FastAPI dependency async.

### Entitlements System
- Each `UserSubscription` has a `plan_code`
- Each plan has an array of `features` (entitlements)
- Frontend checks: `BillingOverview.entitlements` before enabling feature
- Backend enforces: `/me/compliance-queue` returns 403 if user lacks `"manual_review"` entitlement

### NSE Data Fetching with Fallback
```python
def fetch_quote_by_provider(symbol, exchange, provider):
    if provider == "auto_india":
        quote = try_fetch_nse(symbol)
        if not quote:
            quote = try_fetch_yahoo(symbol)
    elif provider == "nse_public":
        quote = try_fetch_nse(symbol)
    elif provider == "yahoo_india":
        quote = try_fetch_yahoo(symbol)
    return quote
```

### Multi-Provider Import Strategy
Different providers have different:
- Stock universes (NSE has NIFTY 500, Groww may have custom list)
- Fundamental data freshness (NSE updates quarterly, Groww updates monthly)
- Coverage gaps (some providers missing penny stocks)

Config in `app/config.py`:
```python
MARKET_DATA_PROVIDER = "nse"  # or "groww" or "upstox"
FUNDAMENTALS_PROVIDER = "nse"  # or "groww"
```

## How to Run Locally

### Prerequisites
- Python 3.11+ and `pip`
- Node.js 18+ and `npm` or `pnpm`
- SQLite (usually included with Python)

### Backend Setup
```bash
cd halal-invest-app

# Create virtual environment
python -m venv halal-env
source halal-env/bin/activate  # On Windows: halal-env\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your Clerk credentials (see below)

# Initialize database
python -c "from app.database import engine, Base; Base.metadata.create_all(bind=engine)"

# Run FastAPI server
uvicorn app.main:app --reload --port 8001
# Visit http://127.0.0.1:8001/docs for interactive API explorer
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local
# Edit with your API base URL and Clerk public key

# Run dev server
npm run dev
# Visit http://localhost:3000
```

### Required Environment Variables

**Backend (`.env` in project root)**:
```
# Clerk authentication
CLERK_SECRET_KEY=sk_test_abc123...
CLERK_JWKS_URL=https://clerk.example.com/.well-known/jwks.json
CLERK_PUBLISHABLE_KEY=pk_test_def456...

# Market data provider (choose one)
MARKET_DATA_PROVIDER=nse  # or "groww", "upstox"
FUNDAMENTALS_PROVIDER=nse

# Razorpay (optional for local dev)
RAZORPAY_KEY_ID=rzp_test_abc123
RAZORPAY_KEY_SECRET=rzp_secret_xyz789

# Admin access
ADMIN_EMAILS=admin@example.com,support@example.com
ADMIN_AUTH_SUBJECTS=user_abc123,user_def456

# Database (default is SQLite)
DATABASE_URL=sqlite:///./test.db
```

**Frontend (`.env.local` in `frontend/` directory)**:
```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_def456...
```

### Docker Setup (Production)
```bash
docker-compose up --build
# Backend: http://127.0.0.1:8001/api
# Frontend: http://127.0.0.1:3000
# Postgres: localhost:5432
```

## How to Add a New Feature

### Adding a New Stock Screener Metric

1. **Add model column** (`app/models.py`):
   ```python
   class Stock(Base):
       # ... existing fields
       payout_ratio = Column(Float, nullable=False, default=0.0)
   ```

2. **Add to screening logic** (`app/services/halal_service.py`):
   ```python
   def evaluate_stock(stock, profile_code):
       result = ScreeningResult(symbol=stock.symbol)
       # ... existing checks

       if stock.payout_ratio > 0.8:
           result.review_rules.append("High payout ratio (>80%)")

       return result
   ```

3. **Export in API schema** (`app/schemas.py`):
   ```python
   class StockRead(BaseModel):
       symbol: str
       payout_ratio: float
   ```

4. **Frontend: Add to filter UI** (`frontend/src/components/stock-screener-table.tsx`):
   ```typescript
   const [payoutFilter, setPayoutFilter] = useState<number | null>(null);

   const filteredStocks = stocks.filter(s =>
     !payoutFilter || s.payout_ratio <= payoutFilter
   );
   ```

5. **Test**:
   ```bash
   # Backend unit test
   pytest tests/test_halal_service.py -v

   # Frontend component test
   npm run test -- stock-screener-table.test.tsx
   ```

## How to Add a New Stock to the Database

### Option 1: Manual SQL Insert
```sql
INSERT INTO stocks (
  symbol, name, sector, exchange, market_cap, debt, revenue,
  interest_income, non_permissible_income, accounts_receivable,
  fixed_assets, total_assets, price, currency, country, data_source
) VALUES (
  'NEWCO', 'New Company Ltd', 'Technology', 'NSE', 100000000000, 5000000000,
  20000000000, 0, 100000000, 1000000000, 5000000000, 50000000000,
  2500, 'INR', 'India', 'manual_entry'
);
```

### Option 2: Via API (admin endpoint)
```bash
curl -X POST http://127.0.0.1:8001/api/stocks \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "NEWCO",
    "name": "New Company Ltd",
    "sector": "Technology",
    "market_cap": 100000000000,
    ...
  }'
```

### Option 3: Bulk Import via NSE Sync
1. Ensure symbol is in NSE universe
2. Call sync endpoint:
   ```bash
   curl -X POST http://127.0.0.1:8001/api/market-data/sync-prices \
     -H "Authorization: Bearer <internal_token>" \
     -H "Content-Type: application/json"
   ```
3. Endpoint discovers new symbols from NSE API and creates Stock records

### Option 4: Provider Import (Groww/Upstox)
- Edit `MARKET_DATA_PROVIDER` in `.env` to "groww"
- Run: `python fetch_data.py --provider groww --limit 500`
- Bulk-imports all equities from chosen provider

## Database Schema Overview

### Core Entity Relationships
```
User (1) ──→ (N) Portfolio
         ──→ (N) WatchlistEntry
         ──→ (N) SavedScreener
         ──→ (N) UserSubscription
         ──→ (N) ComplianceReviewCase

Portfolio (1) ──→ (N) PortfolioHolding
              ──→ (N) OrderIntent
              ──→ (N) InvestmentDecision

Stock (1) ──→ (N) PortfolioHolding
        ──→ (N) WatchlistEntry
        ──→ (N) ScreeningLog
        ──→ (N) ComplianceOverride
        ──→ (N) ComplianceReviewCase
```

### Key Constraints
- `Stock.symbol` → UNIQUE, indexed (fast lookup)
- `User.auth_subject` → UNIQUE (Clerk ID)
- `PortfolioHolding.portfolio_id + stock_id` → Composite unique (no duplicate positions)
- Cascade delete: User deletion removes portfolios, holdings, watchlist entries

### Indexing Strategy
- `Stock.symbol` - High cardinality, frequently searched
- `Stock.sector` - Medium cardinality, used in filters
- `Stock.is_active` - Low cardinality, boolean index for "active only" queries
- `User.auth_subject` - Unique lookup on every API call
- `PortfolioHolding.portfolio_id` - Used to load full portfolio

## API Endpoint Summary Table

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/auth/strategy` | None | Auth provider info |
| GET | `/market-data/indices` | None | NSE indices snapshot |
| GET | `/market-data/quote/{symbol}` | None | Live stock price |
| POST | `/market-data/sync-prices` | Internal | Update DB prices |
| GET | `/stocks` | None | All stocks (fundamentals) |
| GET | `/stocks/{symbol}` | None | Single stock detail |
| GET | `/screen/{symbol}` | None | Screening result |
| POST | `/screen/bulk` | None | Batch screening |
| GET | `/users/{auth_subject}` | None | Public user profile |
| GET | `/me` | Token | Current user |
| POST | `/me/bootstrap` | Token | Initialize user |
| GET | `/me/workspace` | Token | Full user workspace |
| GET | `/me/billing` | Token | Subscriptions & entitlements |
| GET | `/me/compliance-queue` | Token | Manual review queue |
| GET | `/admin/governance/overview` | Token+Admin | All governance data |

---

## Troubleshooting

**Q: "Clerk JWKS not available"**
- Check `CLERK_JWKS_URL` is correct in `.env`
- Clerk may be rate-limiting JWKS fetches; backend caches for 1 hour

**Q: "Quote unavailable for symbol"**
- NSE API may be temporarily down (check https://www.nseindia.com)
- Symbol may not exist in NSE or Yahoo
- Try different provider: `?provider=yahoo_india`

**Q: Database locked (SQLite)**
- Only run one process writing to SQLite at a time
- For production, switch to PostgreSQL in `docker-compose.yml`

**Q: Frontend 403 on `/me/billing`**
- User token expired; refresh by reloading page
- User's Clerk session timed out; re-authenticate

---

This document is the canonical source for architecture decisions. For code-level questions, refer to docstrings in each module.
