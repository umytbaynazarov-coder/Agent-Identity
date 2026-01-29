-- Run this in Supabase SQL Editor to verify your test data

-- 1. Check all registered agents
SELECT
  agent_id,
  name,
  owner_email,
  permissions,
  status,
  created_at,
  last_verified_at
FROM agents
ORDER BY created_at DESC;

-- 2. Check verification logs (shows all authentication attempts)
SELECT
  agent_id,
  success,
  reason,
  timestamp
FROM verification_logs
ORDER BY timestamp DESC
LIMIT 10;

-- 3. Check agent statistics (using the view)
SELECT * FROM agent_stats;

-- Expected results from the test suite:
-- - 1 agent registered (agt_b8efb5757c952ca63ae24c43)
-- - Multiple verification logs (successful and failed attempts)
-- - Agent stats showing verification counts
