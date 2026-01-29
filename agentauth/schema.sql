-- AgentAuths Database Schema
-- Fixed version with correct column names matching the application code

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(50) UNIQUE NOT NULL,  -- Changed from 'agentauth' to match code
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

-- Verification logs (for analytics & security)
CREATE TABLE IF NOT EXISTS verification_logs (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(50) NOT NULL,  -- Changed from 'agentauth' to match code
  success BOOLEAN NOT NULL,
  reason VARCHAR(50),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);  -- Updated index name
CREATE INDEX IF NOT EXISTS idx_agents_owner_email ON agents(owner_email);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_verification_logs_agent_id ON verification_logs(agent_id);  -- Updated index name
CREATE INDEX IF NOT EXISTS idx_verification_logs_timestamp ON verification_logs(timestamp);

-- Row Level Security (RLS) - Enable after testing
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Example: View for agent stats (useful later for dashboard)
CREATE OR REPLACE VIEW agent_stats AS
SELECT 
  a.agent_id,  -- Changed from 'agentauth'
  a.name,
  a.status,
  a.created_at,
  COUNT(v.id) as total_verifications,
  COUNT(CASE WHEN v.success = true THEN 1 END) as successful_verifications,
  MAX(v.timestamp) as last_verification_attempt
FROM agents a
LEFT JOIN verification_logs v ON a.agent_id = v.agent_id  -- Updated join condition
GROUP BY a.agent_id, a.name, a.status, a.created_at;  -- Updated group by
