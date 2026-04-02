# Contributing to Barakfi

Thank you for your interest in contributing to Barakfi. This guide covers code style, architecture patterns, and submission guidelines to keep the codebase maintainable and professional.

## Code Style

### TypeScript/React (Frontend)

**Type Annotations**:
- Always annotate function parameters and return types
- Use `type` for union types and interfaces with `interface` for object contracts
- Avoid `any`; use `unknown` with type guards if necessary

```typescript
// Good
function getStock(symbol: string): Stock | null {
  return stocks.find(s => s.symbol === symbol) ?? null;
}

// Avoid
function getStock(symbol: any): any {
  return stocks.find(s => s.symbol === symbol);
}
```

**Naming Conventions**:
- **Components**: PascalCase (`StockScreenerTable.tsx`)
- **Functions**: camelCase (`getStocks`, `formatPrice`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_PAGE_SIZE = 100`)
- **Private functions**: Prefix with `_` if needed (`_normalizeSymbol`)
- **Exported types**: PascalCase (`type Stock`, `interface User`)

**JSDoc Comments**:
- Document exported functions with JSDoc
- Include param types, return type, and one-line description
- Add usage examples for complex functions

```typescript
/**
 * Fetch all active stocks with current market prices.
 * Cached for 30 seconds to reduce API load.
 *
 * @returns Array of Stock objects, or empty array if API fails
 * @example
 * const stocks = await getStocks();
 * stocks.forEach(s => console.log(s.symbol, s.price));
 */
export async function getStocks(): Promise<Stock[]> {
  // ...
}
```

**Component Structure**:
```typescript
import { ReactNode, useState } from 'react';
import styles from './my-component.module.css';

interface MyComponentProps {
  title: string;
  children: ReactNode;
  onSubmit?: (value: string) => void;
}

/**
 * Example component with proper structure.
 * Handles user input and validates before submission.
 */
export function MyComponent({ title, children, onSubmit }: MyComponentProps) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSubmit?.(input);
    setInput('');
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
      {children}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter value"
      />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

**No inline styles**: Always use CSS Modules. Never use `style={{ }}` props.

### Python (Backend)

**Type Hints**:
- Use Python 3.11+ syntax: `str | None` instead of `Optional[str]`
- Always annotate function parameters and return types
- Use `from typing import` for complex types

```python
# Good
def get_stock(symbol: str, db: Session) -> Stock | None:
    return db.query(Stock).filter(Stock.symbol == symbol).first()

# Avoid
def get_stock(symbol, db):
    return db.query(Stock).filter(Stock.symbol == symbol).first()
```

**Google-Style Docstrings**:
- Use for all public functions and classes
- Include Args, Returns, Raises sections
- Keep examples concise

```python
def evaluate_stock(stock: Stock, profile_code: str) -> ScreeningResult:
    """
    Evaluate a stock against Shariah screening rules.

    Applies hard rules (fail if any trigger) and review rules (flag for override).
    Uses the specified compliance rulebook version.

    Args:
        stock: Stock entity from database with fundamentals
        profile_code: One of "india_strict", "india_moderate"

    Returns:
        ScreeningResult with status (PASS, FAIL, REVIEW) and reasons

    Raises:
        ValueError: If profile_code is not recognized
    """
    if profile_code not in AVAILABLE_PROFILES:
        raise ValueError(f"Unknown profile: {profile_code}")

    result = ScreeningResult(symbol=stock.symbol, profile=profile_code)
    # ... evaluation logic
    return result
```

**Class & Function Naming**:
- **Classes**: PascalCase (`IndianMarketClient`, `HalalService`)
- **Functions**: snake_case (`fetch_nse_quote`, `evaluate_stock`)
- **Constants**: UPPER_SNAKE_CASE (`NSE_TIMEOUT = 25.0`)
- **Private methods**: Prefix with `_` (`_normalize_symbol`)

**Imports Organization**:
```python
# Standard library first
from typing import Any
from datetime import datetime

# Third-party next
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Local imports last
from app.models import Stock
from app.services.halal_service import evaluate_stock
```

**Error Handling**:
- Raise specific exceptions (`ValueError`, `HTTPException`)
- Include context in error messages
- Log before raising in services

```python
def sync_prices(db: Session, max_stocks: int | None = None) -> int:
    """
    Update stock prices from market data providers.

    Args:
        db: Database session
        max_stocks: Limit number of stocks to sync (or None for all)

    Returns:
        Number of stocks successfully updated

    Raises:
        RuntimeError: If all market data sources are unavailable
    """
    total = 0
    errors = []

    for stock in db.query(Stock).filter(Stock.is_active.is_(True)).limit(max_stocks):
        try:
            quote = fetch_quote_by_provider(stock.symbol, "auto_india")
            if quote:
                stock.price = quote.last_price
                total += 1
        except httpx.TimeoutException as e:
            errors.append(f"{stock.symbol}: {str(e)}")

    if total == 0 and errors:
        raise RuntimeError(f"Price sync failed for all stocks: {'; '.join(errors[:5])}")

    return total
```

## Component Naming Conventions

### Frontend Components

**File Organization**:
- One component per file (except very small utilities)
- Component file name matches function name
- Place related CSS in `.module.css` file

```
src/components/
├── stock-screener-table.tsx
├── stock-screener-table.module.css
├── stock-detail-card.tsx
├── stock-detail-card.module.css
├── modals/
│   ├── save-screener-modal.tsx
│   └── add-holding-modal.tsx
└── util/
    └── price-formatter.ts
```

**Naming Patterns**:
- Noun + purpose: `StockScreenerTable`, `ComplianceReviewQueue`
- Verb for actions: `ExportButton`, `RefreshMetrics`
- Modals: `<Noun>Modal` (`SaveScreenerModal`, `ConfirmDeleteModal`)
- Hooks: `use<Noun>` (`useStocks`, `useScreenFilter`)
- Utility functions: Plain function names (`formatPrice`, `normalizeSymbol`)

### Backend Services

**Service Organization**:
- One main responsibility per service file
- Exported function `name_service.py` → class `NameService()` (optional)
- Helper functions are private (`_helper_function`)

```
app/services/
├── halal_service.py          # Shariah screening logic
├── indian_market_client.py    # NSE/Yahoo API integration
├── quote_sync_service.py      # Database price updates
├── auth_service.py            # JWT validation
└── razorpay_service.py        # Payment processing
```

## File Organization Rules

### Frontend Structure
```
frontend/src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── [dynamic]/page.tsx # Dynamic routes
│   ├── stocks/
│   │   └── [symbol]/page.tsx
│   ├── api/               # API route handlers
│   └── styles/            # Global styles
├── components/            # Reusable React components
│   ├── stock-screener-table.tsx
│   ├── home-dashboard.tsx
│   ├── modals/
│   └── ...
├── lib/                   # Utilities & helpers
│   ├── api.ts            # Backend API client
│   ├── types.ts          # Type definitions (if needed)
│   └── utils.ts          # Utility functions
└── styles/               # CSS Modules
    ├── globals.css
    └── *.module.css
```

**Guidelines**:
- Keep components shallow (max 2-3 levels of nesting)
- Don't create folders for single files
- Keep component files < 400 lines (split into sub-components if larger)
- Utilities go in `lib/` unless tightly coupled to a component

### Backend Structure
```
app/
├── api/
│   └── routes.py         # All FastAPI route handlers
├── services/             # Business logic layer
│   ├── halal_service.py
│   ├── auth_service.py
│   └── ...
├── models.py            # SQLAlchemy ORM
├── schemas.py           # Pydantic request/response models
├── database.py          # SQLAlchemy setup
├── config.py            # Environment configuration
└── main.py              # FastAPI app initialization
```

**Guidelines**:
- Routes: Thin wrappers around service functions (< 20 lines per route)
- Services: Pure business logic, testable in isolation
- Models: SQLAlchemy table definitions only
- Schemas: Request/response validation schemas

## PR & Commit Guidelines

### Commit Messages
- Use imperative mood: "Add feature" not "Added feature"
- First line < 50 characters
- Include context line if needed: "Add screening filter for sector exclusions (fixes #123)"

```
Good:
  Add bulk screening endpoint for 1000+ stocks
  Implement NSE fallback for quote fetching
  Fix infinite loop in portfolio rebalancing

Avoid:
  fixed bug
  updated code
  asdf
```

### Pull Request Checklist
- [ ] Code follows style guide (see above)
- [ ] All new functions have docstrings/JSDoc
- [ ] No `console.log()` left in TypeScript (use proper logging)
- [ ] No `print()` left in Python (use logging module)
- [ ] Tests added for new functionality
- [ ] Changelog/docs updated if user-facing change
- [ ] No breaking API changes without discussion

### Branch Naming
```
feature/add-portfolio-rebalancing
fix/nse-quote-timeout-handling
docs/api-endpoint-reference
chore/update-dependencies
```

## Testing Approach

### Backend Tests (Python)

Use `pytest` for unit and integration tests.

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_halal_service.py

# Run with coverage
pytest --cov=app tests/
```

**Test Structure**:
```python
# tests/test_halal_service.py
import pytest
from app.models import Stock
from app.services.halal_service import evaluate_stock

@pytest.fixture
def sample_stock() -> Stock:
    """Create a test stock with minimal valid data."""
    return Stock(
        symbol="TEST",
        name="Test Company",
        sector="Technology",
        market_cap=1e10,
        debt=1e9,
        interest_income=1e6,
        non_permissible_income=1e5,
        price=500.0,
    )

def test_halal_stock_passes_screening(sample_stock: Stock) -> None:
    """HALAL stock with low debt should pass screening."""
    result = evaluate_stock(sample_stock, "india_strict")

    assert result.status == "PASS"
    assert result.symbol == "TEST"

def test_non_halal_stock_fails_on_debt(sample_stock: Stock) -> None:
    """Stock with debt > 33% of market cap should fail."""
    sample_stock.debt = sample_stock.market_cap * 0.5  # 50% debt ratio
    result = evaluate_stock(sample_stock, "india_strict")

    assert result.status == "FAIL"
    assert any("debt" in r.lower() for r in result.reasons)
```

### Frontend Tests (TypeScript)

Use Jest or Vitest for unit tests, React Testing Library for component tests.

```bash
# Run all tests
npm test

# Run specific test
npm test -- stock-screener-table.test.tsx

# Run with coverage
npm test -- --coverage
```

**Test Structure**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { StockScreenerTable } from '@/components/stock-screener-table';

describe('StockScreenerTable', () => {
  it('renders table with stock data', () => {
    const stocks = [
      { symbol: 'INFY', name: 'Infosys', price: 1500 },
    ];

    render(<StockScreenerTable stocks={stocks} />);

    expect(screen.getByText('INFY')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
  });

  it('filters stocks by symbol', () => {
    const stocks = [
      { symbol: 'INFY', name: 'Infosys', price: 1500 },
      { symbol: 'TCS', name: 'TCS', price: 3500 },
    ];

    render(<StockScreenerTable stocks={stocks} />);

    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'TCS' } });

    expect(screen.getByText('TCS')).toBeInTheDocument();
    expect(screen.queryByText('INFY')).not.toBeInTheDocument();
  });
});
```

**Testing Rules**:
- Test behavior, not implementation
- Avoid testing third-party libraries (test usage of them)
- Mock external API calls (NSE, Razorpay, Clerk)
- Keep tests deterministic (no time-dependent flakiness)

## API Response Format

All API responses follow this pattern:

**Success (200)**:
```json
{
  "status": "success",
  "data": { /* actual response */ }
}
```

**Error (4xx/5xx)**:
```json
{
  "status": "error",
  "message": "Human-readable error description",
  "details": { /* optional additional context */ }
}
```

Backend returns proper HTTP status codes:
- `200 OK` - Successful GET/POST
- `201 Created` - Resource created
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error (malformed request)
- `401 Unauthorized` - Missing/invalid authentication
- `403 Forbidden` - Authenticated but not authorized (admin check failed)
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Unhandled exception

## Documentation Standards

### Inline Comments
- Use `//` for explanations of complex logic
- Use `/* */` for multi-line explanations
- Explain the **why**, not the what

```typescript
// Good: Explains why we limit pagination
const MAX_PAGE_SIZE = 100; // Prevents loading >5000 stocks at once

// Avoid: Just repeating what the code says
const stocks = stocks.filter(s => s.isActive); // Filter active stocks
```

### CSS/SCSS Comments
- Use section headers for major groupings
- Keep to 2-3 sections per file

```css
/* ============================================
   HEADER STYLES
   ============================================ */
.header {
  background: var(--color-primary);
  padding: 1rem;
}

/* ============================================
   STOCK TABLE STYLES
   ============================================ */
.tableContainer {
  /* ... */
}
```

### Module Docstrings (Python)
- Always include at module top explaining file's purpose

```python
"""
Shariah compliance rule evaluation engine.

Provides evaluate_stock() to screen individual equities and
evaluate_portfolio() for multi-asset compliance checks.
Supports multiple rulebook profiles (india_strict, india_moderate, etc).
"""
```

---

## Questions?

Refer to ARCHITECTURE.md for system design decisions. For code-specific questions, check existing similar code or open an issue on the project repository.

Thanks for contributing!
