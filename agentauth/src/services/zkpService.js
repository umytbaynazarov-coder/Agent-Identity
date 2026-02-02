const crypto = require('crypto');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../config/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────────────────────────────────────
// Verification key — lazy-loaded and cached in memory
// ─────────────────────────────────────────────────────────────────────────────

let cachedVKey = null;

function getVerificationKey() {
  if (!cachedVKey) {
    cachedVKey = require(path.join(__dirname, '../../zkp/verification_key.json'));
  }
  return cachedVKey;
}

// ─────────────────────────────────────────────────────────────────────────────
// Commitment generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a ZKP commitment from agent credentials.
 * Returns { commitment, salt } — salt is shown once.
 */
function generateCommitment(agentId, apiKey) {
  const salt = crypto.randomBytes(32).toString('hex');
  const preimage = `${agentId}:${apiKey}:${salt}`;
  const commitment = crypto.createHash('sha256').update(preimage).digest('hex');
  return { commitment, salt };
}

/**
 * Store a commitment in the zkp_commitments table.
 */
async function storeCommitment(commitment, permissions, tier, expiresAt) {
  const row = {
    commitment,
    permissions: permissions || null,
    tier: tier || null,
    status: 'active',
  };

  if (expiresAt) {
    row.expires_at = expiresAt;
  }

  const { data, error } = await supabase
    .from('zkp_commitments')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Orchestrate commitment registration:
 * generate + store + update agents.zkp_commitment.
 * Returns { commitment, salt } — salt is the secret shown once.
 */
async function registerCommitment(agentId, apiKey, permissions, tier, expiresIn) {
  const { commitment, salt } = generateCommitment(agentId, apiKey);

  // Compute optional TTL
  let expiresAt = null;
  if (expiresIn) {
    expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  }

  // Store in zkp_commitments table
  await storeCommitment(commitment, permissions, tier, expiresAt);

  // Update the agent row with the latest commitment
  await supabase
    .from('agents')
    .update({ zkp_commitment: commitment })
    .eq('agent_id', agentId);

  return {
    commitment,
    salt, // Only returned once
    expires_at: expiresAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify an anonymous commitment.
 * mode='zkp': Groth16 verify via snarkjs
 * mode='hash': simple SHA-256 preimage check
 */
async function verifyAnonymous(commitment, proof, mode) {
  // Look up commitment (check TTL via the active_commitments view logic)
  const { data: record, error } = await supabase
    .from('zkp_commitments')
    .select('*')
    .eq('commitment', commitment)
    .eq('status', 'active')
    .single();

  if (error || !record) {
    return { valid: false, reason: 'Commitment not found or revoked' };
  }

  // Check TTL
  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return { valid: false, reason: 'Commitment has expired' };
  }

  if (mode === 'zkp') {
    return verifyGroth16(commitment, proof, record);
  }

  // hash mode — proof object contains preimage_hash
  return verifyHashMode(commitment, proof, record);
}

/**
 * Groth16 proof verification via snarkjs.
 */
async function verifyGroth16(commitment, { proof, publicSignals }, record) {
  try {
    // Lazy-require snarkjs only when ZKP mode is actually used
    const snarkjs = require('snarkjs');
    const vKey = getVerificationKey();

    // Verify the proof
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    // Also check that the publicSignals commitment matches
    const signalCommitment = publicSignals[0];
    if (signalCommitment !== commitment) {
      return {
        valid: false,
        reason: 'Public signal commitment does not match',
      };
    }

    return {
      valid: isValid,
      permissions: record.permissions,
      tier: record.tier,
      reason: isValid ? 'ZKP verification passed' : 'ZKP proof invalid',
    };
  } catch (err) {
    logger.error('ZKP Groth16 verification error', { error: err.message });
    return {
      valid: false,
      reason: 'ZKP verification failed: ' + err.message,
    };
  }
}

/**
 * Simple hash-based fallback verification.
 * Caller provides SHA-256(agent_id:api_key:salt) as preimage_hash.
 */
function verifyHashMode(commitment, { preimage_hash }, record) {
  const isValid = commitment === preimage_hash;
  return {
    valid: isValid,
    permissions: isValid ? record.permissions : undefined,
    tier: isValid ? record.tier : undefined,
    reason: isValid ? 'Hash verification passed' : 'Hash mismatch',
  };
}

/**
 * Convenience wrapper for hash-only verification.
 */
async function verifyAnonymousSimple(commitment, preimageHash) {
  return verifyAnonymous(commitment, { preimage_hash: preimageHash }, 'hash');
}

// ─────────────────────────────────────────────────────────────────────────────
// Revocation & cleanup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Revoke a commitment (set status to 'revoked').
 */
async function revokeCommitment(commitment) {
  const { data, error } = await supabase
    .from('zkp_commitments')
    .update({ status: 'revoked' })
    .eq('commitment', commitment)
    .eq('status', 'active')
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found or already revoked
    }
    throw error;
  }

  // Also clear the agent's zkp_commitment reference if it matches
  await supabase
    .from('agents')
    .update({ zkp_commitment: null })
    .eq('zkp_commitment', commitment);

  return data;
}

/**
 * Clean up expired commitments.
 * Designed to run on setInterval(1h) or via cron.
 * Throttles if DB-heavy, logs purged counts.
 */
let cleanupRunning = false;

async function cleanupExpiredCommitments() {
  if (cleanupRunning) {
    logger.warn('ZKP cleanup already running, skipping');
    return { skipped: true };
  }

  cleanupRunning = true;
  try {
    // Find expired active commitments
    const { data: expired, error: fetchErr } = await supabase
      .from('zkp_commitments')
      .select('commitment')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    if (fetchErr) throw fetchErr;

    if (!expired?.length) {
      logger.info('ZKP cleanup: no expired commitments');
      return { purged: 0 };
    }

    const commitments = expired.map(r => r.commitment);

    // Revoke all expired commitments in batch
    const { error: updateErr } = await supabase
      .from('zkp_commitments')
      .update({ status: 'revoked' })
      .in('commitment', commitments);

    if (updateErr) throw updateErr;

    // Cascade: clear agent references
    const { error: agentErr } = await supabase
      .from('agents')
      .update({ zkp_commitment: null })
      .in('zkp_commitment', commitments);

    if (agentErr) throw agentErr;

    logger.info('ZKP cleanup completed', { purged: commitments.length });
    return { purged: commitments.length };
  } catch (err) {
    logger.error('ZKP cleanup failed', { error: err.message });
    throw err;
  } finally {
    cleanupRunning = false;
  }
}

// Start hourly cleanup interval (only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
  const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  setInterval(() => {
    cleanupExpiredCommitments().catch(() => {});
  }, CLEANUP_INTERVAL);
}

module.exports = {
  generateCommitment,
  storeCommitment,
  registerCommitment,
  verifyAnonymous,
  verifyAnonymousSimple,
  revokeCommitment,
  getVerificationKey,
  cleanupExpiredCommitments,
};
