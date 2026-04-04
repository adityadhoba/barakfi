"""Unit tests for ETF screening from stored holdings and compliance history writes."""

from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api import helpers
from app.database import Base
from app.models import ComplianceHistory, EtfHolding, Stock
from app.services.compliance_history_service import record_compliance_change_if_needed
from app.services.etf_service import screen_etf
from app.services.halal_service import PRIMARY_PROFILE, evaluate_stock


def _minimal_equity(**kw):
    d = dict(
        symbol="X",
        name="X Co",
        sector="Technology",
        exchange="US",
        market_cap=1_000_000.0,
        average_market_cap_36m=1_000_000.0,
        debt=0.0,
        revenue=500_000.0,
        total_business_income=500_000.0,
        interest_income=0.0,
        non_permissible_income=0.0,
        accounts_receivable=10_000.0,
        cash_and_equivalents=200_000.0,
        short_term_investments=0.0,
        fixed_assets=50_000.0,
        total_assets=500_000.0,
        price=10.0,
        currency="USD",
        country="United States",
        data_source="test",
        is_active=True,
        is_etf=False,
    )
    d.update(kw)
    return Stock(**d)


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    s = Session()
    yield s
    s.close()


def test_compliance_history_inserts_once_then_skips(db_session):
    st = _minimal_equity(symbol="ZZZ", name="Zed", exchange="NSE")
    db_session.add(st)
    db_session.commit()

    r = evaluate_stock(helpers.stock_to_dict(st), profile=PRIMARY_PROFILE)
    assert record_compliance_change_if_needed(db_session, st, r["status"], r.get("compliance_rating")) is True
    db_session.commit()
    assert db_session.query(ComplianceHistory).count() == 1

    assert record_compliance_change_if_needed(db_session, st, r["status"], r.get("compliance_rating")) is False
    db_session.commit()
    assert db_session.query(ComplianceHistory).count() == 1


def test_screen_etf_uses_weights(db_session):
    etf = _minimal_equity(symbol="SPY", name="S&P 500 ETF", exchange="US", is_etf=True)
    aapl = _minimal_equity(symbol="AAPL", name="Apple", exchange="US")
    msft = _minimal_equity(symbol="MSFT", name="Microsoft", exchange="US")
    db_session.add_all([etf, aapl, msft])
    db_session.commit()

    ts = datetime.now(timezone.utc)
    db_session.add_all(
        [
            EtfHolding(
                etf_stock_id=etf.id,
                holding_symbol="AAPL",
                holding_name="Apple",
                weight_pct=60.0,
                as_of=ts,
                source="test",
            ),
            EtfHolding(
                etf_stock_id=etf.id,
                holding_symbol="MSFT",
                holding_name="Microsoft",
                weight_pct=40.0,
                as_of=ts,
                source="test",
            ),
        ]
    )
    db_session.commit()

    out = screen_etf(db_session, "SPY", "US")
    assert out is not None
    assert out["total_holdings_checked"] == 2
    assert out["halal_pct"] is not None
    assert len(out["holdings"]) == 2
