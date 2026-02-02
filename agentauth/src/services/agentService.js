const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Generate unique agent ID
 */
function generateAgentId() {
  return 'agt_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Generate API key
 */
function generateApiKey() {
  return 'sk_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Hash API key for secure storage
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Register a new agent (optionally with persona)
 */
async function registerAgent({ name, description, owner_email, permissions, persona }) {
  const agent_id = generateAgentId();
  const api_key = generateApiKey();
  const api_key_hash = hashApiKey(api_key);

  const row = {
    agent_id,
    name,
    description: description || null,
    owner_email,
    api_key_hash,
    permissions: permissions || ['zendesk:tickets:read'],
    status: 'active',
    created_at: new Date().toISOString(),
    last_verified_at: null,
  };

  // If persona provided at registration, sign and attach it
  if (persona) {
    const personaService = require('./personaService');
    row.persona = persona;
    row.persona_hash = personaService.signPersona(persona, api_key);
    row.persona_version = persona.version || '1.0.0';
  }

  const { data, error } = await supabase
    .from('agents')
    .insert(row)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // If persona was included, write to history and create drift config
  if (persona) {
    await supabase.from('persona_history').insert({
      agent_id,
      persona,
      persona_hash: row.persona_hash,
      persona_version: row.persona_version,
    });

    await supabase
      .from('drift_configs')
      .upsert({
        agent_id,
        drift_threshold: 0.30,
        warning_threshold: 0.24,
        metric_weights: {
          response_adherence: 0.3,
          constraint_violations: 0.2,
          toxicity_score: 0.2,
          hallucination_rate: 0.2,
          avg_response_length: 0.1,
        },
      }, { onConflict: 'agent_id' });
  }

  // Return agent data with plain API key (only time it's shown)
  return {
    ...data,
    api_key, // Only returned once during registration
  };
}

/**
 * Find agent by ID
 */
async function findAgentById(agent_id) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('agent_id', agent_id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * Verify agent credentials.
 * Returns agent data with persona_valid flag if persona exists.
 */
async function verifyAgent(agent_id, api_key) {
  const api_key_hash = hashApiKey(api_key);

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('agent_id', agent_id)
    .eq('api_key_hash', api_key_hash)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if agent is active
  if (data.status !== 'active') {
    return null;
  }

  // Update last verified timestamp
  await supabase
    .from('agents')
    .update({ last_verified_at: new Date().toISOString() })
    .eq('agent_id', agent_id);

  // Check persona integrity if persona exists
  if (data.persona && data.persona_hash) {
    const personaService = require('./personaService');
    data.persona_valid = personaService.verifyPersonaSignature(data.persona, api_key, data.persona_hash);
  }

  return data;
}

/**
 * List all agents with pagination
 */
async function listAgents({ limit = 50, offset = 0, status = null }) {
  let query = supabase
    .from('agents')
    .select('agent_id, name, description, owner_email, status, tier, created_at, last_verified_at', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return {
    agents: data,
    total: count,
    limit,
    offset,
  };
}

/**
 * Update agent tier
 */
async function updateAgentTier(agent_id, tier) {
  const { data, error } = await supabase
    .from('agents')
    .update({
      tier,
      updated_at: new Date().toISOString(),
    })
    .eq('agent_id', agent_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update agent status
 */
async function updateAgentStatus(agent_id, status) {
  const { data, error } = await supabase
    .from('agents')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('agent_id', agent_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update agent permissions
 */
async function updateAgentPermissions(agent_id, permissions) {
  const { data, error } = await supabase
    .from('agents')
    .update({
      permissions,
      updated_at: new Date().toISOString(),
    })
    .eq('agent_id', agent_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete agent
 */
async function deleteAgent(agent_id) {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('agent_id', agent_id);

  if (error) {
    throw error;
  }

  return true;
}

/**
 * Log verification attempt
 */
async function logVerification({ agent_id, success, reason, ipAddress }) {
  try {
    await supabase
      .from('verification_logs')
      .insert({
        agent_id,
        success,
        reason,
        timestamp: new Date().toISOString(),
        ip_address: ipAddress,
      });
  } catch (err) {
    // Don't fail the request if logging fails
    console.error('Failed to log verification:', err);
  }
}

/**
 * Get agent activity logs
 */
async function getAgentActivity(agent_id, { limit = 100, offset = 0 }) {
  const { data, error, count } = await supabase
    .from('verification_logs')
    .select('*', { count: 'exact' })
    .eq('agent_id', agent_id)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw error;
  }

  return {
    logs: data,
    total: count,
    limit,
    offset,
  };
}

module.exports = {
  registerAgent,
  findAgentById,
  verifyAgent,
  listAgents,
  updateAgentTier,
  updateAgentStatus,
  updateAgentPermissions,
  deleteAgent,
  logVerification,
  getAgentActivity,
};
