"""
Alembic-free migration helper to add the 'role' field to the 'users' table.
Idempotent: checks if column exists before adding it.
"""

from sqlalchemy import inspect, text, create_engine
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL


def migrate_add_role_field():
    """Add 'role' column to users table if it doesn't exist."""
    engine = create_engine(DATABASE_URL)

    # Check if the column already exists
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]

    if 'role' in columns:
        print("✓ Column 'role' already exists in 'users' table. Skipping migration.")
        return True

    # Add the column with default value
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Use raw SQL to add the column
        # This works for SQLite, PostgreSQL, and MySQL
        session.execute(
            text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user' NOT NULL")
        )
        session.commit()
        print("✓ Successfully added 'role' column to 'users' table with default value 'user'")
        return True
    except Exception as e:
        session.rollback()
        print(f"✗ Migration failed: {e}")
        return False
    finally:
        session.close()
        engine.dispose()


if __name__ == "__main__":
    success = migrate_add_role_field()
    exit(0 if success else 1)
