"""
Resolve BarakFi / vendor symbols to data_listings rows (ISIN-first).

Returns structured outcomes for ingestion_issue logging.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.models_data_warehouse import DataListing


class ResolutionKind(str, Enum):
    EXACT_MATCH = "exact_match"
    PROBABLE_MATCH = "probable_match"
    AMBIGUOUS = "ambiguous"
    NEW_SECURITY_REQUIRED = "new_security_required"


@dataclass
class ResolutionResult:
    kind: ResolutionKind
    listing: "DataListing | None"
    message: str


def resolve_nse_symbol(db: "Session", native_symbol: str) -> ResolutionResult:
    """Resolve NSE native symbol (vendor) to primary listing."""
    from app.models_data_warehouse import DataListing

    sym = native_symbol.upper().strip()
    q = (
        db.query(DataListing)
        .filter(DataListing.exchange_code == "NSE", DataListing.native_symbol == sym)
        .all()
    )
    if len(q) == 1:
        return ResolutionResult(ResolutionKind.EXACT_MATCH, q[0], "single NSE listing")
    if len(q) > 1:
        return ResolutionResult(ResolutionKind.AMBIGUOUS, q[0], "multiple listings for symbol")
    return ResolutionResult(ResolutionKind.NEW_SECURITY_REQUIRED, None, "unknown NSE symbol")
