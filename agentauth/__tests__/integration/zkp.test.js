const request = require('supertest');
const express = require('express');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// Supabase mock — uses plain functions (not jest.fn) so resetMocks won't clear them
// ─────────────────────────────────────────────────────────────────────────────

let mockSupabaseData = {};

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => {
      const tableData = mockSupabaseData[table] || {};
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: tableData.selectSingle || null, error: tableData.selectSingleError || null }),
            eq: () => ({
              single: () => Promise.resolve({ data: tableData.selectSingle || null, error: tableData.selectSingleError || null }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: tableData.insertResult || {}, error: tableData.insertError || null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: tableData.updateResult || {}, error: tableData.updateError || null }),
            }),
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: tableData.updateResult || {}, error: tableData.updateError || null }),
              }),
            }),
          }),
          in: () => Promise.resolve({ error: null }),
        }),
      };
    },
  }),
}));

// Mock agentService — use require() + beforeEach to survive resetMocks
jest.mock('../../src/services/agentService');

// Mock snarkjs — use require() + beforeEach to survive resetMocks
jest.mock('snarkjs');

// Mock verification_key.json
jest.mock('../../zkp/verification_key.json', () => ({
  protocol: 'groth16',
  curve: 'bn128',
  nPublic: 1,
  vk_alpha_1: ['mock'],
  vk_beta_2: [['mock']],
  vk_gamma_2: [['mock']],
  vk_delta_2: [['mock']],
  IC: [['mock']],
}), { virtual: true });

// Mock rateLimiter
jest.mock('../../src/middleware/rateLimiter', () => ({
  authLimiter: (req, res, next) => next(),
}));

// Mock logger
jest.mock('../../src/config/logger', () => ({
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}));

jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

const agentService = require('../../src/services/agentService');
const snarkjs = require('snarkjs');
const zkpRoutes = require('../../src/routes/zkp');
const { errorHandler } = require('../../src/middleware/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEST_AGENT_ID = 'agt_zkptest1';
const VALID_API_KEY = 'valid-api-key';

function generateTestCommitment(agentId, apiKey) {
  const salt = crypto.randomBytes(32).toString('hex');
  const preimage = `${agentId}:${apiKey}:${salt}`;
  const commitment = crypto.createHash('sha256').update(preimage).digest('hex');
  return { commitment, salt };
}

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/v1/zkp', zkpRoutes);
  app.use(errorHandler);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ZKP API Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    mockSupabaseData = {};
    // Re-establish agentService mock on every test (resetMocks clears it)
    agentService.verifyAgent.mockImplementation((agentId, apiKey) => {
      if (apiKey === VALID_API_KEY) {
        return Promise.resolve({
          agent_id: agentId,
          status: 'active',
          tier: 'pro',
          permissions: ['read', 'write'],
        });
      }
      return Promise.resolve(null);
    });
    // Re-establish snarkjs mock on every test (resetMocks clears it)
    snarkjs.groth16 = {
      verify: jest.fn((vKey, publicSignals, proof) => {
        // Mock: valid if proof has the expected structure
        return Promise.resolve(!!proof && !!publicSignals);
      }),
    };
  });

  // ─── Commitment Registration ─────────────────────────────────────────────

  describe('POST /v1/zkp/register-commitment', () => {
    it('should register a commitment with valid credentials', async () => {
      mockSupabaseData.zkp_commitments = {
        insertResult: {
          id: 1,
          commitment: 'mock-commitment-hash',
          status: 'active',
          permissions: ['read', 'write'],
          tier: 'pro',
        },
      };
      mockSupabaseData.agents = { updateResult: {} };

      const res = await request(app)
        .post('/v1/zkp/register-commitment')
        .send({
          agent_id: TEST_AGENT_ID,
          api_key: VALID_API_KEY,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('commitment');
      expect(res.body).toHaveProperty('salt');
      expect(res.body.commitment).toHaveLength(64); // SHA-256 hex
      expect(res.body.salt).toHaveLength(64); // 32 bytes hex
      expect(res.body.message).toContain('Store the salt');
    });

    it('should accept optional expires_in parameter', async () => {
      mockSupabaseData.zkp_commitments = {
        insertResult: { id: 2, commitment: 'hash', status: 'active' },
      };
      mockSupabaseData.agents = { updateResult: {} };

      const res = await request(app)
        .post('/v1/zkp/register-commitment')
        .send({
          agent_id: TEST_AGENT_ID,
          api_key: VALID_API_KEY,
          expires_in: 3600,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('expires_at');
      expect(res.body.expires_at).toBeTruthy();
    });

    it('should reject registration with invalid agent credentials', async () => {
      const res = await request(app)
        .post('/v1/zkp/register-commitment')
        .send({
          agent_id: TEST_AGENT_ID,
          api_key: 'bad-key',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid agent credentials');
    });

    it('should reject registration without agent_id', async () => {
      const res = await request(app)
        .post('/v1/zkp/register-commitment')
        .send({
          api_key: VALID_API_KEY,
        });

      expect(res.status).toBe(400);
    });

    it('should reject registration without api_key', async () => {
      const res = await request(app)
        .post('/v1/zkp/register-commitment')
        .send({
          agent_id: TEST_AGENT_ID,
        });

      expect(res.status).toBe(400);
    });

    it('should reject negative expires_in', async () => {
      const res = await request(app)
        .post('/v1/zkp/register-commitment')
        .send({
          agent_id: TEST_AGENT_ID,
          api_key: VALID_API_KEY,
          expires_in: -100,
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── Anonymous Verification (hash mode) ──────────────────────────────────

  describe('POST /v1/zkp/verify-anonymous (hash mode)', () => {
    it('should verify a valid hash commitment', async () => {
      const { commitment } = generateTestCommitment(TEST_AGENT_ID, VALID_API_KEY);

      mockSupabaseData.zkp_commitments = {
        selectSingle: {
          commitment,
          status: 'active',
          permissions: ['read'],
          tier: 'pro',
          expires_at: null,
        },
      };

      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          preimage_hash: commitment,
          mode: 'hash',
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.reason).toContain('Hash verification passed');
      expect(res.body).toHaveProperty('permissions');
      expect(res.body).toHaveProperty('tier');
    });

    it('should reject hash mismatch', async () => {
      const { commitment } = generateTestCommitment(TEST_AGENT_ID, VALID_API_KEY);

      mockSupabaseData.zkp_commitments = {
        selectSingle: {
          commitment,
          status: 'active',
          permissions: ['read'],
          tier: 'pro',
          expires_at: null,
        },
      };

      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          preimage_hash: 'wrong-hash-' + 'a'.repeat(53),
          mode: 'hash',
        });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toContain('Hash mismatch');
    });

    it('should reject revoked commitment', async () => {
      const { commitment } = generateTestCommitment(TEST_AGENT_ID, VALID_API_KEY);

      // Commitment not found (revoked or doesn't exist — query returns null)
      mockSupabaseData.zkp_commitments = {
        selectSingle: null,
        selectSingleError: { code: 'PGRST116' },
      };

      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          preimage_hash: commitment,
          mode: 'hash',
        });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toContain('not found or revoked');
    });

    it('should reject expired commitment', async () => {
      const { commitment } = generateTestCommitment(TEST_AGENT_ID, VALID_API_KEY);

      mockSupabaseData.zkp_commitments = {
        selectSingle: {
          commitment,
          status: 'active',
          permissions: ['read'],
          tier: 'pro',
          expires_at: '2020-01-01T00:00:00Z', // Expired
        },
      };

      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          preimage_hash: commitment,
          mode: 'hash',
        });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toContain('expired');
    });
  });

  // ─── Anonymous Verification (ZKP mode) ───────────────────────────────────

  describe('POST /v1/zkp/verify-anonymous (zkp mode)', () => {
    it('should verify a valid ZKP proof', async () => {
      const { commitment } = generateTestCommitment(TEST_AGENT_ID, VALID_API_KEY);

      mockSupabaseData.zkp_commitments = {
        selectSingle: {
          commitment,
          status: 'active',
          permissions: ['read', 'write'],
          tier: 'enterprise',
          expires_at: null,
        },
      };

      const mockProof = {
        pi_a: ['1', '2', '3'],
        pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
        pi_c: ['7', '8', '9'],
        protocol: 'groth16',
        curve: 'bn128',
      };

      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          proof: mockProof,
          publicSignals: [commitment],
          mode: 'zkp',
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.reason).toContain('ZKP verification passed');
    });

    it('should reject ZKP verification without proof object', async () => {
      const commitment = 'a'.repeat(64);

      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          publicSignals: [commitment],
          mode: 'zkp',
        });

      expect(res.status).toBe(400);
    });

    it('should reject ZKP verification without publicSignals', async () => {
      const commitment = 'a'.repeat(64);

      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          proof: { pi_a: [], pi_b: [], pi_c: [] },
          mode: 'zkp',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid proof structure (missing pi_a)', async () => {
      const commitment = 'a'.repeat(64);

      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          proof: { pi_b: [[]], pi_c: [] },
          publicSignals: [commitment],
          mode: 'zkp',
        });

      expect(res.status).toBe(400);
    });

    it('should detect mismatched publicSignals commitment', async () => {
      const { commitment } = generateTestCommitment(TEST_AGENT_ID, VALID_API_KEY);

      mockSupabaseData.zkp_commitments = {
        selectSingle: {
          commitment,
          status: 'active',
          permissions: ['read'],
          tier: 'pro',
          expires_at: null,
        },
      };

      const mockProof = {
        pi_a: ['1', '2', '3'],
        pi_b: [['1', '2'], ['3', '4'], ['5', '6']],
        pi_c: ['7', '8', '9'],
        protocol: 'groth16',
      };

      // publicSignals[0] doesn't match commitment
      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          proof: mockProof,
          publicSignals: ['b'.repeat(64)],
          mode: 'zkp',
        });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toContain('does not match');
    });

    it('should reject invalid mode parameter', async () => {
      const commitment = 'a'.repeat(64);

      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          mode: 'invalid-mode',
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── Commitment Revocation ───────────────────────────────────────────────

  describe('DELETE /v1/zkp/commitment/:commitment', () => {
    it('should revoke an active commitment', async () => {
      const { commitment } = generateTestCommitment(TEST_AGENT_ID, VALID_API_KEY);

      mockSupabaseData.zkp_commitments = {
        updateResult: {
          commitment,
          status: 'revoked',
        },
      };
      mockSupabaseData.agents = { updateResult: {} };

      const res = await request(app)
        .delete(`/v1/zkp/commitment/${commitment}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('revoked');
    });

    it('should return 404 for non-existent commitment', async () => {
      mockSupabaseData.zkp_commitments = {
        updateResult: null,
        updateError: { code: 'PGRST116' },
      };

      const res = await request(app)
        .delete('/v1/zkp/commitment/' + 'f'.repeat(64));

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found or already revoked');
    });
  });

  // ─── Commitment Validation ───────────────────────────────────────────────

  describe('Commitment format validation', () => {
    it('should reject commitment shorter than 64 hex chars', async () => {
      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment: 'abc123',
          preimage_hash: 'abc123',
          mode: 'hash',
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-hex commitment', async () => {
      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment: 'g'.repeat(64), // 'g' is not hex
          preimage_hash: 'g'.repeat(64),
          mode: 'hash',
        });

      expect(res.status).toBe(400);
    });

    it('should accept 64-char hex commitment', async () => {
      const commitment = 'a'.repeat(64);

      mockSupabaseData.zkp_commitments = {
        selectSingle: {
          commitment,
          status: 'active',
          permissions: [],
          tier: 'free',
          expires_at: null,
        },
      };

      const res = await request(app)
        .post('/v1/zkp/verify-anonymous')
        .send({
          commitment,
          preimage_hash: commitment,
          mode: 'hash',
        });

      // Should not fail on validation (200 or 401 depending on match)
      expect([200, 401]).toContain(res.status);
    });
  });
});
