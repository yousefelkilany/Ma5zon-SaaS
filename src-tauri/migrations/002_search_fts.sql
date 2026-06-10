-- Migration 002: backfill the global-search FTS5 indexes for databases that
-- existed before the search subsystem shipped.
--
-- This migration is a no-op marker. The `SearchInitializer` runs the same
-- DDL and refreshes on first init, so this file exists for consistency
-- with the existing migration-discovery flow.

BEGIN TRANSACTION;

COMMIT;
