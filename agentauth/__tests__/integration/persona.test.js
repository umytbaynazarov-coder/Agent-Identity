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
          eq: () => {
            // Return a thenable that also has chaining methods
            // Supabase query builder is both chainable and thenable
            const result = Promise.resolve({ data: tableData.selectSingle || null, error: tableData.selectSingleError || null });
            result.single = () => Promise.resolve({ data: tableData.selectSingle || null, error: tableData.selectSingleError || null });
            result.eq = () => {
              const listResult = Promise.resolve({ data: tableData.selectRange || [], error: null });
              listResult.single = () => Promise.resolve({ data: tableData.selectSingle || null, error: tableData.selectSingleError || null });
              return listResult;
            };
            result.order = () => ({
              range: () => Promise.resolve({ data: tableData.selectRange || [], error: null, count: tableData.selectCount || 0 }),
              limit: () => Promise.resolve({ data: tableData.selectRange || [], error: null }),
            });
            return result;
          },
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
          }),
        }),
        upsert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: tableData.upsertResult || {}, error: null }),
          }),
        }),
      };
    },
  }),
}));

// Mock fs for persona-traits.json (used by personaValidator)
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    ...jest.requireActual('fs').promises,
    readFile: (filePath) => {
      if (filePath.includes('persona-traits.json')) {
        return Promise.resolve(JSON.stringify([
          'risk-averse', 'helpful', 'cautious', 'creative', 'formal',
          'analytical', 'concise', 'verbose', 'empathetic', 'neutral',
        ]));
      }
      return jest.requireActual('fs').promises.readFile(filePath);
    },
  },
}));

// Mock agentService — use require() + beforeEach to survive resetMocks
jest.mock('../../src/services/agentService');

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

// Suppress console in tests
jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

const agentService = require('../../src/services/agentService');
const personaRoutes = require('../../src/routes/persona');
const { errorHandler } = require('../../src/middleware/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEST_AGENT_ID = 'agt_test123';
const VALID_API_KEY = 'valid-api-key';

const VALID_PERSONA = {
  version: '1.0.0',
  personality: {
    traits: { helpfulness: 0.9, formality: 0.7 },
  },
  guardrails: {
    toxicity_threshold: 0.3,
    hallucination_tolerance: 'strict',
  },
  constraints: {
    forbidden_topics: ['politics', 'religion'],
    max_response_length: 2000,
  },
};

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(`/:agent_id/persona`, personaRoutes);
  app.use(errorHandler);
  return app;
}

function computeHash(persona, apiKey) {
  const { canonicalize, signPersona } = require('../../src/services/personaService');
  return signPersona(persona, apiKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Persona API Integration Tests', () => {
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
  });

  // ─── Register ────────────────────────────────────────────────────────────

  describe('POST /:agent_id/persona (register)', () => {
    it('should register a new persona successfully', async () => {
      const hash = computeHash(VALID_PERSONA, VALID_API_KEY);

      // Agent has no existing persona
      mockSupabaseData.agents = {
        selectSingle: { agent_id: TEST_AGENT_ID, persona: null },
        updateResult: {
          agent_id: TEST_AGENT_ID,
          persona: VALID_PERSONA,
          persona_hash: hash,
          persona_version: '1.0.0',
        },
      };
      mockSupabaseData.persona_history = { insertResult: { id: 1 } };
      mockSupabaseData.drift_configs = { upsertResult: {} };
      mockSupabaseData.webhook_endpoints = { selectRange: [] };

      const res = await request(app)
        .post(`/${TEST_AGENT_ID}/persona`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({ persona: VALID_PERSONA });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('agent_id', TEST_AGENT_ID);
      expect(res.body).toHaveProperty('persona_hash');
      expect(res.body).toHaveProperty('persona_version', '1.0.0');
      expect(res.body.persona).toEqual(VALID_PERSONA);
    });

    it('should reject registration without X-Api-Key header', async () => {
      const res = await request(app)
        .post(`/${TEST_AGENT_ID}/persona`)
        .send({ persona: VALID_PERSONA });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Missing X-Api-Key');
    });

    it('should reject registration with invalid API key', async () => {
      const res = await request(app)
        .post(`/${TEST_AGENT_ID}/persona`)
        .set('X-Api-Key', 'invalid-key')
        .send({ persona: VALID_PERSONA });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid API key');
    });

    it('should reject registration without persona object', async () => {
      const res = await request(app)
        .post(`/${TEST_AGENT_ID}/persona`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should reject duplicate registration (409)', async () => {
      // Agent already has a persona
      mockSupabaseData.agents = {
        selectSingle: {
          agent_id: TEST_AGENT_ID,
          persona: VALID_PERSONA,
          persona_hash: 'existing-hash',
          persona_version: '1.0.0',
        },
      };

      const res = await request(app)
        .post(`/${TEST_AGENT_ID}/persona`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({ persona: VALID_PERSONA });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already registered');
    });

    it('should reject persona missing version field', async () => {
      mockSupabaseData.agents = {
        selectSingle: { agent_id: TEST_AGENT_ID, persona: null },
      };

      const personaNoVersion = { ...VALID_PERSONA };
      delete personaNoVersion.version;

      const res = await request(app)
        .post(`/${TEST_AGENT_ID}/persona`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({ persona: personaNoVersion });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('validation failed');
    });

    it('should reject persona exceeding 10KB (413)', async () => {
      mockSupabaseData.agents = {
        selectSingle: { agent_id: TEST_AGENT_ID, persona: null },
      };

      // Generate a persona larger than 10KB
      const largePersona = {
        version: '1.0.0',
        personality: {
          traits: { helpfulness: 0.9 },
        },
        constraints: {
          forbidden_topics: Array.from({ length: 500 }, (_, i) => `topic-${i}-${'x'.repeat(20)}`),
        },
      };

      const res = await request(app)
        .post(`/${TEST_AGENT_ID}/persona`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({ persona: largePersona });

      expect(res.status).toBe(413);
      expect(res.body.error).toContain('validation failed');
    });
  });

  // ─── Retrieve ────────────────────────────────────────────────────────────

  describe('GET /:agent_id/persona (retrieve)', () => {
    it('should retrieve an existing persona', async () => {
      const hash = computeHash(VALID_PERSONA, VALID_API_KEY);

      mockSupabaseData.agents = {
        selectSingle: {
          agent_id: TEST_AGENT_ID,
          persona: VALID_PERSONA,
          persona_hash: hash,
          persona_version: '1.0.0',
        },
      };

      const res = await request(app)
        .get(`/${TEST_AGENT_ID}/persona`);

      expect(res.status).toBe(200);
      expect(res.body.agent_id).toBe(TEST_AGENT_ID);
      expect(res.body.persona).toEqual(VALID_PERSONA);
      expect(res.body.persona_hash).toBe(hash);
      expect(res.headers.etag).toBeDefined();
    });

    it('should return 404 when no persona is registered', async () => {
      mockSupabaseData.agents = {
        selectSingle: {
          agent_id: TEST_AGENT_ID,
          persona: null,
        },
      };

      const res = await request(app)
        .get(`/${TEST_AGENT_ID}/persona`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('No persona');
    });

    it('should return 304 when ETag matches If-None-Match', async () => {
      const hash = computeHash(VALID_PERSONA, VALID_API_KEY);

      mockSupabaseData.agents = {
        selectSingle: {
          agent_id: TEST_AGENT_ID,
          persona: VALID_PERSONA,
          persona_hash: hash,
          persona_version: '1.0.0',
        },
      };

      const res = await request(app)
        .get(`/${TEST_AGENT_ID}/persona`)
        .set('If-None-Match', `"${hash}"`);

      expect(res.status).toBe(304);
    });

    it('should include generated prompt when include_prompt=true', async () => {
      mockSupabaseData.agents = {
        selectSingle: {
          agent_id: TEST_AGENT_ID,
          persona: VALID_PERSONA,
          persona_hash: 'some-hash',
          persona_version: '1.0.0',
        },
      };

      const res = await request(app)
        .get(`/${TEST_AGENT_ID}/persona?include_prompt=true`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('prompt');
      expect(res.body.prompt).toContain('persona version 1.0.0');
      expect(res.body.prompt).toContain('helpfulness');
    });
  });

  // ─── Update ──────────────────────────────────────────────────────────────

  describe('PUT /:agent_id/persona (update)', () => {
    it('should update persona and bump version', async () => {
      const updatedPersona = {
        ...VALID_PERSONA,
        version: '1.0.0', // Will be auto-bumped to 1.1.0
        personality: {
          traits: { helpfulness: 0.95, formality: 0.8 },
        },
      };

      mockSupabaseData.agents = {
        selectSingle: {
          agent_id: TEST_AGENT_ID,
          persona: VALID_PERSONA,
          persona_hash: 'old-hash',
          persona_version: '1.0.0',
        },
        updateResult: {
          agent_id: TEST_AGENT_ID,
          persona: { ...updatedPersona, version: '1.1.0' },
          persona_hash: 'new-hash',
          persona_version: '1.1.0',
        },
      };
      mockSupabaseData.persona_history = { insertResult: { id: 2 } };
      mockSupabaseData.webhook_endpoints = { selectRange: [] };

      const res = await request(app)
        .put(`/${TEST_AGENT_ID}/persona`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({ persona: updatedPersona });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('persona_version');
      expect(res.body).toHaveProperty('previous_version', '1.0.0');
      expect(res.body).toHaveProperty('changes');
    });

    it('should reject update without API key', async () => {
      const res = await request(app)
        .put(`/${TEST_AGENT_ID}/persona`)
        .send({ persona: VALID_PERSONA });

      expect(res.status).toBe(401);
    });

    it('should reject update without persona body', async () => {
      const res = await request(app)
        .put(`/${TEST_AGENT_ID}/persona`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
  });

  // ─── Integrity Verification ──────────────────────────────────────────────

  describe('POST /:agent_id/persona/verify (integrity)', () => {
    it('should verify valid persona integrity', async () => {
      const hash = computeHash(VALID_PERSONA, VALID_API_KEY);

      mockSupabaseData.agents = {
        selectSingle: {
          persona: VALID_PERSONA,
          persona_hash: hash,
        },
      };

      const res = await request(app)
        .post(`/${TEST_AGENT_ID}/persona/verify`)
        .set('X-Api-Key', VALID_API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.reason).toContain('verified');
    });

    it('should detect tampered persona (hash mismatch)', async () => {
      // Stored hash doesn't match current persona
      mockSupabaseData.agents = {
        selectSingle: {
          persona: VALID_PERSONA,
          persona_hash: 'tampered-hash-that-does-not-match-0000000000000000',
        },
      };

      const res = await request(app)
        .post(`/${TEST_AGENT_ID}/persona/verify`)
        .set('X-Api-Key', VALID_API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toContain('tampered');
    });

    it('should report no persona registered', async () => {
      mockSupabaseData.agents = {
        selectSingle: {
          persona: null,
          persona_hash: null,
        },
      };

      const res = await request(app)
        .post(`/${TEST_AGENT_ID}/persona/verify`)
        .set('X-Api-Key', VALID_API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toContain('No persona');
    });
  });

  // ─── History ─────────────────────────────────────────────────────────────

  describe('GET /:agent_id/persona/history', () => {
    it('should return paginated version history', async () => {
      mockSupabaseData.persona_history = {
        selectRange: [
          { id: 1, agent_id: TEST_AGENT_ID, persona_hash: 'hash1', persona_version: '1.0.0', changed_at: '2025-01-01T00:00:00Z' },
          { id: 2, agent_id: TEST_AGENT_ID, persona_hash: 'hash2', persona_version: '1.1.0', changed_at: '2025-01-02T00:00:00Z' },
        ],
        selectCount: 2,
      };

      const res = await request(app)
        .get(`/${TEST_AGENT_ID}/persona/history?limit=10&offset=0`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('history');
      expect(res.body).toHaveProperty('total', 2);
      expect(res.body).toHaveProperty('limit', 10);
      expect(res.body).toHaveProperty('offset', 0);
      expect(Array.isArray(res.body.history)).toBe(true);
    });

    it('should return CSV format when requested', async () => {
      mockSupabaseData.persona_history = {
        selectRange: [
          { id: 1, agent_id: TEST_AGENT_ID, persona_hash: 'hash1', persona_version: '1.0.0', changed_at: '2025-01-01T00:00:00Z' },
        ],
        selectCount: 1,
      };

      const res = await request(app)
        .get(`/${TEST_AGENT_ID}/persona/history?format=csv`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('id,agent_id,persona_hash');
    });

    it('should return empty history for agent with no versions', async () => {
      mockSupabaseData.persona_history = {
        selectRange: [],
        selectCount: 0,
      };

      const res = await request(app)
        .get(`/${TEST_AGENT_ID}/persona/history`);

      expect(res.status).toBe(200);
      expect(res.body.history).toEqual([]);
      expect(res.body.total).toBe(0);
    });
  });

  // ─── Webhook Firing ──────────────────────────────────────────────────────

  describe('Webhook firing on persona events', () => {
    it('should fire persona.created webhook on registration', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true });

      mockSupabaseData.agents = {
        selectSingle: { agent_id: TEST_AGENT_ID, persona: null },
        updateResult: {
          agent_id: TEST_AGENT_ID,
          persona: VALID_PERSONA,
          persona_hash: 'hash',
          persona_version: '1.0.0',
        },
      };
      mockSupabaseData.persona_history = { insertResult: { id: 1 } };
      mockSupabaseData.drift_configs = { upsertResult: {} };
      mockSupabaseData.webhook_endpoints = {
        selectRange: [{
          url: 'https://example.com/webhook',
          events: ['persona.created'],
          secret: 'webhook-secret',
          is_active: true,
        }],
      };

      await request(app)
        .post(`/${TEST_AGENT_ID}/persona`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({ persona: VALID_PERSONA });

      // fetch is called asynchronously (best-effort), allow micro-task queue to flush
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fetchSpy).toHaveBeenCalled();
      const [callUrl, callOpts] = fetchSpy.mock.calls[0] || [];
      expect(callUrl).toBe('https://example.com/webhook');
      expect(callOpts.method).toBe('POST');
      expect(callOpts.headers['X-AgentAuth-Signature']).toBeDefined();

      const body = JSON.parse(callOpts.body);
      expect(body.event).toBe('persona.created');
      expect(body.agent_id).toBe(TEST_AGENT_ID);

      fetchSpy.mockRestore();
    });
  });
});
