-- One-time cleanup: remove non-Indian listings after verifying dependents.
-- Run manually on Postgres/SQLite after backing up. Adjust FK handling for your DB.

-- Example: delete stocks not on NSE/BSE (review orphan FKs first: etf_holdings, watchlist_entries, etc.)
-- DELETE FROM stocks WHERE UPPER(exchange) NOT IN ('NSE', 'BSE');

-- Safer: preview count
-- SELECT exchange, COUNT(*) FROM stocks GROUP BY exchange;
