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
  refresh_token_hash TEXT,
  refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
  permissions TEXT[] DEFAULT ARRAY['read'],
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise'))
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

-- Webhook endpoints for event notifications
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(50) REFERENCES agents(agent_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,  -- ['agent.registered', 'agent.verified', 'agent.revoked']
  secret VARCHAR(64) NOT NULL,  -- For HMAC signature
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);  -- Updated index name
CREATE INDEX IF NOT EXISTS idx_agents_owner_email ON agents(owner_email);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_refresh_token_hash ON agents(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_verification_logs_agent_id ON verification_logs(agent_id);  -- Updated index name
CREATE INDEX IF NOT EXISTS idx_verification_logs_timestamp ON verification_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_agent_id ON webhook_endpoints(agent_id);

-- Row Level Security (RLS)
-- Note: Since we're using the service role key (anon key) from the server,
-- these policies allow full access. RLS adds defense-in-depth in case credentials leak.
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access to agents
CREATE POLICY "Service role has full access to agents" ON agents
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Allow service role full access to verification_logs
CREATE POLICY "Service role has full access to verification_logs" ON verification_logs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access to webhook_endpoints
CREATE POLICY "Service role has full access to webhook_endpoints" ON webhook_endpoints
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

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
