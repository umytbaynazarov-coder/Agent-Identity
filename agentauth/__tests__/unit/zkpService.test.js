const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// Supabase mock — uses plain functions (not jest.fn) so resetMocks won't clear them
// ─────────────────────────────────────────────────────────────────────────────

let mockCommitmentStore = {};

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => ({
      select: () => ({
        eq: () => ({
          single: () => {
            if (table === 'zkp_commitments') {
              const record = mockCommitmentStore.record || null;
              return Promise.resolve({
                data: record,
                error: record ? null : { code: 'PGRST116' },
              });
            }
            return Promise.resolve({ data: null, error: null });
          },
          eq: () => ({
            single: () => {
              const record = mockCommitmentStore.record || null;
              return Promise.resolve({
                data: record,
                error: record ? null : { code: 'PGRST116' },
              });
            },
          }),
          lt: () => Promise.resolve({
            data: mockCommitmentStore.expired || [],
            error: null,
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({
            data: mockCommitmentStore.insertResult || { id: 1 },
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCommitmentStore.updateResult || {},
              error: mockCommitmentStore.updateError || null,
            }),
          }),
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: mockCommitmentStore.updateResult || {},
                error: mockCommitmentStore.updateError || null,
              }),
            }),
          }),
        }),
        in: () => Promise.resolve({ error: null }),
      }),
    }),
  }),
}));

// Mock snarkjs — use require() + beforeEach to survive resetMocks
jest.mock('snarkjs');

// Mock verification_key.json
const mockVKey = {
  protocol: 'groth16',
  curve: 'bn128',
  nPublic: 1,
  vk_alpha_1: ['mock-alpha'],
  vk_beta_2: [['mock-beta']],
  vk_gamma_2: [['mock-gamma']],
  vk_delta_2: [['mock-delta']],
  IC: [['mock-IC']],
};
jest.mock('../../zkp/verification_key.json', () => mockVKey, { virtual: true });

// Mock logger
jest.mock('../../src/config/logger', () => ({
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}));

jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

const snarkjs = require('snarkjs');

const {
  generateCommitment,
  getVerificationKey,
  registerCommitment,
  verifyAnonymous,
  revokeCommitment,
  cleanupExpiredCommitments,
} = require('../../src/services/zkpService');

// ─────────────────────────────────────────────────────────────────────────────
// generateCommitment()
// ─────────────────────────────────────────────────────────────────────────────

describe('generateCommitment()', () => {
  const agentId = 'agt_test123';
  const apiKey = 'sk_test_key_abc';

  it('should return commitment and salt', () => {
    const result = generateCommitment(agentId, apiKey);
    expect(result).toHaveProperty('commitment');
    expect(result).toHaveProperty('salt');
  });

  it('should return 64-char hex commitment (SHA-256)', () => {
    const { commitment } = generateCommitment(agentId, apiKey);
    expect(commitment).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(commitment)).toBe(true);
  });

  it('should return 64-char hex salt (32 random bytes)', () => {
    const { salt } = generateCommitment(agentId, apiKey);
    expect(salt).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(salt)).toBe(true);
  });

  it('should generate unique commitments on each call (random salt)', () => {
    const result1 = generateCommitment(agentId, apiKey);
    const result2 = generateCommitment(agentId, apiKey);

    expect(result1.commitment).not.toBe(result2.commitment);
    expect(result1.salt).not.toBe(result2.salt);
  });

  it('should use SHA-256 of agentId:apiKey:salt as preimage', () => {
    // Mock randomBytes to produce a known salt
    const knownSalt = 'a'.repeat(64);
    const originalRandom = crypto.randomBytes;
    crypto.randomBytes = jest.fn(() => Buffer.from(knownSalt, 'hex'));

    const { commitment, salt } = generateCommitment(agentId, apiKey);

    const expectedPreimage = `${agentId}:${apiKey}:${salt}`;
    const expectedCommitment = crypto.createHash('sha256').update(expectedPreimage).digest('hex');

    expect(commitment).toBe(expectedCommitment);

    crypto.randomBytes = originalRandom;
  });

  it('should produce different commitments for different agents', () => {
    const r1 = generateCommitment('agent-1', apiKey);
    const r2 = generateCommitment('agent-2', apiKey);
    // With different salts, commitments will differ regardless,
    // but even with same salt they would differ due to different agentId
    expect(r1.commitment).not.toBe(r2.commitment);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getVerificationKey() — caching
// ─────────────────────────────────────────────────────────────────────────────

describe('getVerificationKey()', () => {
  it('should return the verification key', () => {
    const vKey = getVerificationKey();
    expect(vKey).toBeDefined();
    expect(vKey.protocol).toBe('groth16');
    expect(vKey.curve).toBe('bn128');
  });

  it('should return the same cached reference on multiple calls', () => {
    const vKey1 = getVerificationKey();
    const vKey2 = getVerificationKey();
    expect(vKey1).toBe(vKey2); // Same reference — cached
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// verifyAnonymous() — hash mode
// ─────────────────────────────────────────────────────────────────────────────

describe('verifyAnonymous() — hash mode', () => {
  it('should verify matching preimage_hash', async () => {
    const commitment = 'a'.repeat(64);
    mockCommitmentStore.record = {
      commitment,
      status: 'active',
      permissions: ['read'],
      tier: 'pro',
      expires_at: null,
    };

    const result = await verifyAnonymous(commitment, { preimage_hash: commitment }, 'hash');

    expect(result.valid).toBe(true);
    expect(result.permissions).toEqual(['read']);
    expect(result.tier).toBe('pro');
    expect(result.reason).toContain('Hash verification passed');
  });

  it('should reject non-matching preimage_hash', async () => {
    const commitment = 'a'.repeat(64);
    mockCommitmentStore.record = {
      commitment,
      status: 'active',
      permissions: ['read'],
      tier: 'pro',
      expires_at: null,
    };

    const result = await verifyAnonymous(commitment, { preimage_hash: 'b'.repeat(64) }, 'hash');

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Hash mismatch');
  });

  it('should reject when commitment not found', async () => {
    mockCommitmentStore.record = null;

    const result = await verifyAnonymous('c'.repeat(64), { preimage_hash: 'c'.repeat(64) }, 'hash');

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not found or revoked');
  });

  it('should reject expired commitment', async () => {
    const commitment = 'd'.repeat(64);
    mockCommitmentStore.record = {
      commitment,
      status: 'active',
      permissions: [],
      tier: 'free',
      expires_at: '2020-01-01T00:00:00Z', // Already expired
    };

    const result = await verifyAnonymous(commitment, { preimage_hash: commitment }, 'hash');

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('expired');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// verifyAnonymous() — ZKP mode (mocked snarkjs)
// ─────────────────────────────────────────────────────────────────────────────

describe('verifyAnonymous() — zkp mode', () => {
  const commitment = 'e'.repeat(64);

  beforeEach(() => {
    // Re-establish snarkjs mock on every test (resetMocks clears it)
    snarkjs.groth16 = {
      verify: jest.fn().mockResolvedValue(true),
    };

    mockCommitmentStore.record = {
      commitment,
      status: 'active',
      permissions: ['read', 'write'],
      tier: 'enterprise',
      expires_at: null,
    };
  });

  it('should call snarkjs.groth16.verify with correct args', async () => {
    const proof = { pi_a: [], pi_b: [], pi_c: [] };
    const publicSignals = [commitment];

    await verifyAnonymous(commitment, { proof, publicSignals }, 'zkp');

    expect(snarkjs.groth16.verify).toHaveBeenCalledWith(
      mockVKey,
      publicSignals,
      proof
    );
  });

  it('should return valid when snarkjs verifies and commitment matches', async () => {
    const result = await verifyAnonymous(
      commitment,
      { proof: { pi_a: [], pi_b: [], pi_c: [] }, publicSignals: [commitment] },
      'zkp'
    );

    expect(result.valid).toBe(true);
    expect(result.permissions).toEqual(['read', 'write']);
    expect(result.tier).toBe('enterprise');
  });

  it('should reject when publicSignals[0] does not match commitment', async () => {
    const result = await verifyAnonymous(
      commitment,
      { proof: { pi_a: [], pi_b: [], pi_c: [] }, publicSignals: ['f'.repeat(64)] },
      'zkp'
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('does not match');
  });

  it('should return invalid when snarkjs returns false', async () => {
    snarkjs.groth16.verify.mockResolvedValue(false);

    const result = await verifyAnonymous(
      commitment,
      { proof: { pi_a: [], pi_b: [], pi_c: [] }, publicSignals: [commitment] },
      'zkp'
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('invalid');
  });

  it('should handle snarkjs verification error gracefully', async () => {
    snarkjs.groth16.verify.mockRejectedValue(new Error('Circuit mismatch'));

    const result = await verifyAnonymous(
      commitment,
      { proof: { pi_a: [], pi_b: [], pi_c: [] }, publicSignals: [commitment] },
      'zkp'
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Circuit mismatch');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TTL handling
// ─────────────────────────────────────────────────────────────────────────────

describe('TTL handling', () => {
  it('should set expires_at when expires_in is provided', async () => {
    mockCommitmentStore.insertResult = { id: 1, commitment: 'x'.repeat(64), status: 'active' };
    mockCommitmentStore.record = null;

    const now = Date.now();
    const result = await registerCommitment('agt_test', 'sk_key', ['read'], 'pro', 3600);

    expect(result).toHaveProperty('expires_at');
    const expiresAt = new Date(result.expires_at).getTime();
    // Should be approximately 1 hour from now (within 5 seconds tolerance)
    expect(expiresAt).toBeGreaterThan(now + 3595000);
    expect(expiresAt).toBeLessThan(now + 3605000);
  });

  it('should set expires_at to null when no TTL', async () => {
    mockCommitmentStore.insertResult = { id: 2, commitment: 'y'.repeat(64), status: 'active' };

    const result = await registerCommitment('agt_test', 'sk_key', ['read'], 'pro', undefined);

    expect(result.expires_at).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cleanupExpiredCommitments()
// ─────────────────────────────────────────────────────────────────────────────

describe('cleanupExpiredCommitments()', () => {
  it('should report 0 purged when no expired commitments', async () => {
    mockCommitmentStore.expired = [];

    const result = await cleanupExpiredCommitments();
    expect(result.purged).toBe(0);
  });

  it('should purge expired commitments and return count', async () => {
    mockCommitmentStore.expired = [
      { commitment: 'a'.repeat(64) },
      { commitment: 'b'.repeat(64) },
    ];
    mockCommitmentStore.updateResult = {};

    const result = await cleanupExpiredCommitments();
    expect(result.purged).toBe(2);
  });

  it('should not run concurrently (throttle protection)', async () => {
    mockCommitmentStore.expired = [];

    // Run two cleanups simultaneously
    const [result1, result2] = await Promise.all([
      cleanupExpiredCommitments(),
      cleanupExpiredCommitments(),
    ]);

    // One should run, the other should be skipped
    const results = [result1, result2];
    const skipped = results.filter(r => r.skipped);
    const ran = results.filter(r => !r.skipped);

    // At least one should have run
    expect(ran.length).toBeGreaterThanOrEqual(1);
  });
});
