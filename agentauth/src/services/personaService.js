const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const semver = require('semver');
const diff = require('deep-diff');
const archiver = require('archiver');
const { PassThrough } = require('stream');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recursively sort object keys for deterministic JSON.
 * Rounds floats to 10 decimal places.
 */
function canonicalize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(canonicalize);
  if (typeof obj === 'number') {
    return Math.round(obj * 1e10) / 1e10;
  }
  if (typeof obj !== 'object') return obj;

  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = canonicalize(obj[key]);
  }
  return sorted;
}

/**
 * HMAC-SHA256 signature of a canonicalized persona using API key.
 */
function signPersona(persona, apiKey) {
  const canonical = JSON.stringify(canonicalize(persona));
  return crypto.createHmac('sha256', apiKey).update(canonical).digest('hex');
}

/**
 * Timing-safe comparison of persona signature.
 */
function verifyPersonaSignature(persona, apiKey, storedHash) {
  const computed = signPersona(persona, apiKey);
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Escape user inputs in prompt templates to prevent injection.
 */
function escapePromptInput(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Generate a default system prompt from persona data.
 */
function generatePromptTemplate(persona) {
  const parts = [];

  parts.push(`You are an AI agent operating under persona version ${escapePromptInput(persona.version)}.`);

  if (persona.personality?.traits) {
    const traitDescriptions = Object.entries(persona.personality.traits)
      .map(([key, val]) => {
        if (typeof val === 'number') {
          return `${escapePromptInput(key)}: ${val}`;
        }
        return `${escapePromptInput(key)}: ${escapePromptInput(String(val))}`;
      })
      .join(', ');
    parts.push(`Personality traits: ${traitDescriptions}.`);
  }

  if (persona.constraints) {
    if (persona.constraints.forbidden_topics?.length) {
      parts.push(`You must NEVER discuss: ${persona.constraints.forbidden_topics.map(escapePromptInput).join(', ')}.`);
    }
    if (persona.constraints.required_disclaimers?.length) {
      parts.push(`You must include these disclaimers when relevant: ${persona.constraints.required_disclaimers.map(escapePromptInput).join('; ')}.`);
    }
    if (persona.constraints.max_response_length) {
      parts.push(`Keep responses under ${persona.constraints.max_response_length} characters.`);
    }
    if (persona.constraints.allowed_actions?.length) {
      parts.push(`Allowed actions: ${persona.constraints.allowed_actions.map(escapePromptInput).join(', ')}.`);
    }
    if (persona.constraints.blocked_actions?.length) {
      parts.push(`Blocked actions: ${persona.constraints.blocked_actions.map(escapePromptInput).join(', ')}.`);
    }
  }

  if (persona.guardrails) {
    if (persona.guardrails.toxicity_threshold !== undefined) {
      parts.push(`Toxicity threshold: ${persona.guardrails.toxicity_threshold}.`);
    }
    if (persona.guardrails.hallucination_tolerance) {
      parts.push(`Hallucination tolerance: ${escapePromptInput(persona.guardrails.hallucination_tolerance)}.`);
    }
    if (persona.guardrails.source_citation_required) {
      parts.push('You must cite sources for factual claims.');
    }
  }

  return parts.join('\n');
}

/**
 * Fire a webhook event for the agent (best-effort, non-blocking).
 */
async function fireWebhook(agentId, eventType, payload) {
  try {
    const { data: webhooks } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('agent_id', agentId)
      .eq('is_active', true);

    if (!webhooks?.length) return;

    for (const wh of webhooks) {
      if (wh.events.includes(eventType) || wh.events.includes('*')) {
        const body = JSON.stringify({ event: eventType, agent_id: agentId, data: payload, timestamp: new Date().toISOString() });
        const signature = crypto.createHmac('sha256', wh.secret).update(body).digest('hex');

        // Best-effort delivery — don't await in production for non-blocking
        fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AgentAuth-Signature': signature,
          },
          body,
          signal: AbortSignal.timeout(5000),
        }).catch(() => { /* silent — delivery failures logged elsewhere */ });
      }
    }
  } catch {
    // Webhook delivery is best-effort
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Service functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a persona for an agent.
 * Signs the persona, stores it, creates drift baseline, writes history.
 */
async function registerPersona(agentId, persona, apiKey) {
  const personaHash = signPersona(persona, apiKey);
  const version = persona.version || '1.0.0';

  // Store persona on agent
  const { data, error } = await supabase
    .from('agents')
    .update({
      persona,
      persona_hash: personaHash,
      persona_version: version,
    })
    .eq('agent_id', agentId)
    .select()
    .single();

  if (error) throw error;

  // Write to persona_history
  await supabase.from('persona_history').insert({
    agent_id: agentId,
    persona,
    persona_hash: personaHash,
    persona_version: version,
  });

  // Create drift baseline from persona guardrails / constraints
  const baselineMetrics = {};
  if (persona.guardrails?.toxicity_threshold !== undefined) {
    baselineMetrics.toxicity_score = persona.guardrails.toxicity_threshold;
  }
  if (persona.constraints?.max_response_length) {
    baselineMetrics.avg_response_length = persona.constraints.max_response_length * 0.7;
  }

  await supabase
    .from('drift_configs')
    .upsert({
      agent_id: agentId,
      baseline_metrics: Object.keys(baselineMetrics).length ? baselineMetrics : null,
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

  // Fire webhook
  await fireWebhook(agentId, 'persona.created', { persona, persona_hash: personaHash, version });

  return {
    agent_id: agentId,
    persona,
    persona_hash: personaHash,
    persona_version: version,
  };
}

/**
 * Get persona for an agent.
 * Optionally generates a prompt template.
 */
async function getPersona(agentId, options = {}) {
  const { data, error } = await supabase
    .from('agents')
    .select('agent_id, persona, persona_hash, persona_version')
    .eq('agent_id', agentId)
    .single();

  if (error) throw error;
  if (!data.persona) return null;

  const result = {
    agent_id: data.agent_id,
    persona: data.persona,
    persona_hash: data.persona_hash,
    persona_version: data.persona_version,
  };

  if (options.includePrompt) {
    const template = data.persona.promptTemplate
      ? data.persona.promptTemplate
      : generatePromptTemplate(data.persona);
    result.prompt = template;
  }

  // ETag for caching
  result.etag = data.persona_hash;

  return result;
}

/**
 * Update a persona. Bumps minor version via semver,
 * re-signs, archives previous, fires webhook with diff.
 */
async function updatePersona(agentId, persona, apiKey) {
  // Fetch current persona for diffing and version bump
  const { data: current, error: fetchErr } = await supabase
    .from('agents')
    .select('persona, persona_hash, persona_version')
    .eq('agent_id', agentId)
    .single();

  if (fetchErr) throw fetchErr;

  // Version bump: use provided version or auto-increment minor
  const currentVersion = current.persona_version || '1.0.0';
  const newVersion = persona.version && semver.gt(persona.version, currentVersion)
    ? persona.version
    : semver.inc(currentVersion, 'minor');

  const updatedPersona = { ...persona, version: newVersion };
  const newHash = signPersona(updatedPersona, apiKey);

  // Archive previous version to persona_history
  if (current.persona) {
    await supabase.from('persona_history').insert({
      agent_id: agentId,
      persona: current.persona,
      persona_hash: current.persona_hash,
      persona_version: current.persona_version,
    });
  }

  // Update agent row
  const { data, error } = await supabase
    .from('agents')
    .update({
      persona: updatedPersona,
      persona_hash: newHash,
      persona_version: newVersion,
    })
    .eq('agent_id', agentId)
    .select()
    .single();

  if (error) throw error;

  // Compute diff for webhook
  const changes = diff(current.persona || {}, updatedPersona) || [];

  await fireWebhook(agentId, 'persona.updated', {
    persona: updatedPersona,
    persona_hash: newHash,
    version: newVersion,
    previous_version: currentVersion,
    changes,
  });

  return {
    agent_id: agentId,
    persona: updatedPersona,
    persona_hash: newHash,
    persona_version: newVersion,
    previous_version: currentVersion,
    changes,
  };
}

/**
 * Verify persona integrity by recomputing hash.
 */
async function verifyPersonaIntegrity(agentId, apiKey) {
  const { data, error } = await supabase
    .from('agents')
    .select('persona, persona_hash')
    .eq('agent_id', agentId)
    .single();

  if (error) throw error;
  if (!data.persona) {
    return { valid: false, reason: 'No persona registered' };
  }

  const isValid = verifyPersonaSignature(data.persona, apiKey, data.persona_hash);

  return {
    valid: isValid,
    agent_id: agentId,
    persona_hash: data.persona_hash,
    reason: isValid ? 'Integrity verified' : 'Hash mismatch — persona may have been tampered with',
  };
}

/**
 * Get persona version history with pagination.
 */
async function getPersonaHistory(agentId, { limit = 10, offset = 0, sort = 'desc', format = 'json' } = {}) {
  const ascending = sort === 'asc';

  const { data, error, count } = await supabase
    .from('persona_history')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)
    .order('changed_at', { ascending })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  if (format === 'csv') {
    const header = 'id,agent_id,persona_hash,persona_version,changed_at';
    const rows = (data || []).map(r =>
      `${r.id},${r.agent_id},${r.persona_hash},${r.persona_version},${r.changed_at}`
    );
    return { csv: [header, ...rows].join('\n'), total: count };
  }

  return {
    history: data,
    total: count,
    limit,
    offset,
  };
}

/**
 * Export persona + history as a signed ZIP bundle.
 */
async function exportPersona(agentId) {
  const { data: agent, error } = await supabase
    .from('agents')
    .select('agent_id, persona, persona_hash, persona_version')
    .eq('agent_id', agentId)
    .single();

  if (error) throw error;
  if (!agent.persona) return null;

  const { data: history } = await supabase
    .from('persona_history')
    .select('*')
    .eq('agent_id', agentId)
    .order('changed_at', { ascending: false });

  const bundle = {
    agent_id: agent.agent_id,
    persona: agent.persona,
    persona_hash: agent.persona_hash,
    persona_version: agent.persona_version,
    history: history || [],
    exported_at: new Date().toISOString(),
  };

  // Sign the bundle contents for tamper-proofing
  const bundleSignature = crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(bundle)))
    .digest('hex');

  const passthrough = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(passthrough);
  archive.append(JSON.stringify(bundle, null, 2), { name: 'persona.json' });
  archive.append(bundleSignature, { name: 'signature.txt' });
  archive.finalize();

  return {
    stream: passthrough,
    filename: `${agentId}_persona_export.zip`,
    signature: bundleSignature,
  };
}

/**
 * Import a persona bundle. Validates signature, extracts persona,
 * registers as a new version.
 */
async function importPersona(agentId, bundle, apiKey) {
  if (!bundle || typeof bundle !== 'object') {
    throw new Error('Invalid bundle format');
  }

  if (!bundle.persona || !bundle.persona_hash || !bundle.signature) {
    throw new Error('Bundle must include persona, persona_hash, and signature');
  }

  // Verify bundle signature
  const { signature, ...bundleData } = bundle;
  const computedSig = crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(bundleData)))
    .digest('hex');

  if (computedSig !== signature) {
    throw new Error('Bundle signature verification failed — possible tampering');
  }

  // Register the imported persona as a new version
  return registerPersona(agentId, bundle.persona, apiKey);
}

module.exports = {
  canonicalize,
  signPersona,
  verifyPersonaSignature,
  registerPersona,
  getPersona,
  updatePersona,
  verifyPersonaIntegrity,
  getPersonaHistory,
  exportPersona,
  importPersona,
};
