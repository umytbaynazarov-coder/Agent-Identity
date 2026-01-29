DROP VIEW IF EXISTS agent_stats;

CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_email VARCHAR(255) NOT NULL,
  api_key_hash VARCHAR(64) NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read'],
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS verification_logs (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL,
  reason VARCHAR(50),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45)
);

-- =====================================================================
-- Step 4: Create indexes
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_agents_owner_email ON agents(owner_email);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_verification_logs_agent_id ON verification_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_timestamp ON verification_logs(timestamp);

-- =====================================================================
-- Step 5: Recreate the view with correct column references
-- =====================================================================

CREATE OR REPLACE VIEW agent_stats AS
SELECT 
  a.agent_id,
  a.name,
  a.status,
  a.created_at,
  COUNT(v.id) as total_verifications,
  COUNT(CASE WHEN v.success = true THEN 1 END) as successful_verifications,
  MAX(v.timestamp) as last_verification_attempt
FROM agents a
LEFT JOIN verification_logs v ON a.agent_id = v.agent_id
GROUP BY a.agent_id, a.name, a.status, a.created_at;

-- =====================================================================
-- Step 6: VERIFICATION QUERIES (run these after the migration)
-- =====================================================================

-- Verify tables exist with correct columns:
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name IN ('agents','verification_logs') 
-- ORDER BY table_name, ordinal_position;

-- Verify the view definition:
-- SELECT definition FROM pg_views WHERE viewname = 'agent_stats' AND schemaname = 'public';

-- Test the view:
-- SELECT * FROM agent_stats LIMIT 5;

-- Test basic operations:
-- SELECT agent_id, name FROM agents LIMIT 5;

-- =====================================================================
-- DONE! Your database should now match your code expectations.
-- =====================================================================
