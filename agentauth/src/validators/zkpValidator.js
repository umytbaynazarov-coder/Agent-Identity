/**
 * Custom error for invalid ZKP mode selection.
 */
class ZKPModeError extends Error {
  constructor(mode) {
    super(`Invalid ZKP verification mode: "${mode}". Must be "zkp" or "hash".`);
    this.name = 'ZKPModeError';
    this.statusCode = 400;
  }
}

/**
 * Validate commitment registration input.
 */
function validateCommitmentRegistration(data) {
  const errors = [];

  if (!data.agent_id) {
    errors.push({ field: 'agent_id', message: 'Agent ID is required' });
  } else if (typeof data.agent_id !== 'string') {
    errors.push({ field: 'agent_id', message: 'Agent ID must be a string' });
  }

  if (!data.api_key) {
    errors.push({ field: 'api_key', message: 'API key is required' });
  } else if (typeof data.api_key !== 'string') {
    errors.push({ field: 'api_key', message: 'API key must be a string' });
  }

  // Optional expires_in (seconds)
  if (data.expires_in !== undefined) {
    if (typeof data.expires_in !== 'number' || data.expires_in <= 0) {
      errors.push({ field: 'expires_in', message: 'expires_in must be a positive number (seconds)' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate anonymous verification input.
 * Commitment must be a hex string 64-256 chars (flexible for future hash algos).
 * Mode must be 'zkp' or 'hash'.
 * If mode is 'zkp', proof object is validated for Groth16 structure.
 */
function validateAnonymousVerification(data) {
  const errors = [];

  // Commitment
  if (!data.commitment) {
    errors.push({ field: 'commitment', message: 'Commitment is required' });
  } else if (typeof data.commitment !== 'string') {
    errors.push({ field: 'commitment', message: 'Commitment must be a string' });
  } else if (!/^[0-9a-f]{64,256}$/i.test(data.commitment)) {
    errors.push({ field: 'commitment', message: 'Commitment must be a hex string between 64 and 256 characters' });
  }

  // Mode
  const validModes = ['zkp', 'hash'];
  const mode = data.mode || 'zkp';

  if (!validModes.includes(mode)) {
    throw new ZKPModeError(mode);
  }

  // Proof validation for ZKP mode
  if (mode === 'zkp') {
    if (!data.proof) {
      errors.push({ field: 'proof', message: 'Proof object is required for ZKP mode' });
    } else if (typeof data.proof !== 'object' || Array.isArray(data.proof)) {
      errors.push({ field: 'proof', message: 'Proof must be an object' });
    } else {
      // Groth16 proof structure: pi_a, pi_b, pi_c, protocol, curve
      if (!data.proof.pi_a || !Array.isArray(data.proof.pi_a)) {
        errors.push({ field: 'proof.pi_a', message: 'Proof must include pi_a array' });
      }
      if (!data.proof.pi_b || !Array.isArray(data.proof.pi_b)) {
        errors.push({ field: 'proof.pi_b', message: 'Proof must include pi_b array' });
      }
      if (!data.proof.pi_c || !Array.isArray(data.proof.pi_c)) {
        errors.push({ field: 'proof.pi_c', message: 'Proof must include pi_c array' });
      }
      if (data.proof.protocol && data.proof.protocol !== 'groth16') {
        errors.push({ field: 'proof.protocol', message: 'Only groth16 protocol is supported' });
      }
    }

    // Public signals
    if (!data.publicSignals || !Array.isArray(data.publicSignals)) {
      errors.push({ field: 'publicSignals', message: 'publicSignals array is required for ZKP mode' });
    }
  }

  // Hash mode: preimage_hash required
  if (mode === 'hash') {
    if (!data.preimage_hash) {
      errors.push({ field: 'preimage_hash', message: 'preimage_hash is required for hash mode' });
    } else if (typeof data.preimage_hash !== 'string') {
      errors.push({ field: 'preimage_hash', message: 'preimage_hash must be a string' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  ZKPModeError,
  validateCommitmentRegistration,
  validateAnonymousVerification,
};
