from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool, StaticPool
from app.config import DATABASE_URL

# SQLite needs special handling: single-threaded check disabled, and
# we use StaticPool to avoid connection-per-thread issues, or a generous
# QueuePool for PostgreSQL / other backends.
_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    # For SQLite: use a NullPool-like StaticPool (one shared connection)
    # or QueuePool with generous limits. StaticPool reuses one connection
    # which avoids the pool exhaustion entirely for dev/test.
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # PostgreSQL / other production databases
    # Render free tier drops idle connections aggressively —
    # keep pool small, recycle fast, always pre-ping.
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=300,       # Recycle connections every 5 minutes
        pool_pre_ping=True,     # Test connection before using it
    )

# Enable WAL mode for SQLite (much better concurrency)
if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
