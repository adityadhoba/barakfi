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
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=30,
        pool_timeout=60,
        pool_recycle=1800,
        pool_pre_ping=True,
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
