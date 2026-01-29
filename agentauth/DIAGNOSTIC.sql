-- =====================================================================
-- DIAGNOSTIC QUERIES - Run these first to understand your database state
-- =====================================================================

-- 1. Check if tables exist and what columns they have
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('agents','verification_logs')
ORDER BY table_name, ordinal_position;

-- 2. Check if the view exists and its definition
SELECT
  viewname,
  definition
FROM pg_views
WHERE viewname = 'agent_stats' AND schemaname = 'public';

-- 3. Check which tables actually exist
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN ('agents', 'verification_logs')
  AND schemaname = 'public';

-- 4. Check for any existing data (only run if tables exist)
-- Uncomment lines below if step 3 shows the tables exist:
-- SELECT 'agents' as table_name, COUNT(*) as row_count FROM agents
-- UNION ALL
-- SELECT 'verification_logs', COUNT(*) FROM verification_logs;

-- 5. Try to select from the view (this will fail if the view has the error)
-- Uncomment the line below to test:
-- SELECT * FROM agent_stats LIMIT 5;
