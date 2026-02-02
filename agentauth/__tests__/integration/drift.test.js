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
      const td = () => mockSupabaseData[table] || {};
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: td().selectSingle || null, error: td().selectSingleError || null }),
            eq: () => ({
              single: () => Promise.resolve({ data: td().selectSingle || null, error: td().selectSingleError || null }),
            }),
            order: () => ({
              range: () => Promise.resolve({ data: td().selectRange || [], error: null, count: td().selectCount || 0 }),
              limit: () => Promise.resolve({ data: td().selectLimit || [], error: null }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: td().insertResult || { id: 'ping-1' }, error: td().insertError || null }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: td().updateResult || {}, error: td().updateError || null }),
            }),
          }),
        }),
        upsert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: td().upsertResult || {}, error: null }),
          }),
        }),
      };
    },
  }),
}));

// Mock personaService (driftService imports canonicalize from it)
jest.mock('../../src/services/personaService', () => {
  function canonicalize(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(canonicalize);
    if (typeof obj === 'number') return Math.round(obj * 1e10) / 1e10;
    if (typeof obj !== 'object') return obj;
    const sorted = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = canonicalize(obj[key]);
    }
    return sorted;
  }
  return {
    canonicalize,
    fireWebhook: () => Promise.resolve(),
  };
});

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

const agentService = require('../../src/services/agentService');
const driftRoutes = require('../../src/routes/drift');
const { errorHandler } = require('../../src/middleware/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

const TEST_AGENT_ID = 'agt_drifttest1';
const VALID_API_KEY = 'valid-api-key';

const VALID_METRICS = {
  response_adherence: 0.92,
  constraint_violations: 0.05,
  toxicity_score: 0.02,
  hallucination_rate: 0.08,
  avg_response_length: 1200,
};

const DEFAULT_CONFIG = {
  agent_id: TEST_AGENT_ID,
  drift_threshold: 0.30,
  warning_threshold: 0.24,
  auto_revoke: true,
  metric_weights: {
    response_adherence: 0.3,
    constraint_violations: 0.2,
    toxicity_score: 0.2,
    hallucination_rate: 0.2,
    avg_response_length: 0.1,
  },
  baseline_metrics: {
    response_adherence: 0.95,
    constraint_violations: 0.0,
    toxicity_score: 0.0,
    hallucination_rate: 0.05,
    avg_response_length: 1000,
  },
  spike_sensitivity: 2.0,
};

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/v1/drift', driftRoutes);
  app.use(errorHandler);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Drift API Integration Tests', () => {
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

  // ─── Health Pings ────────────────────────────────────────────────────────

  describe('POST /v1/drift/:agent_id/health-ping', () => {
    it('should accept a valid health ping', async () => {
      mockSupabaseData.agents = {
        selectSingle: { agent_id: TEST_AGENT_ID, status: 'active' },
      };
      mockSupabaseData.drift_configs = {
        selectSingle: DEFAULT_CONFIG,
      };
      mockSupabaseData.drift_health_pings = {
        insertResult: { id: 'ping-1', drift_score: 0.05 },
      };
      mockSupabaseData.webhook_endpoints = { selectRange: [] };

      const res = await request(app)
        .post(`/v1/drift/${TEST_AGENT_ID}/health-ping`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({
          metrics: VALID_METRICS,
          request_count: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('ping_id');
      expect(res.body).toHaveProperty('drift_score');
      expect(typeof res.body.drift_score).toBe('number');
      expect(res.body.status).toBe('ok');
    });

    it('should reject ping without API key', async () => {
      const res = await request(app)
        .post(`/v1/drift/${TEST_AGENT_ID}/health-ping`)
        .send({ metrics: VALID_METRICS });

      expect(res.status).toBe(401);
    });

    it('should reject ping with invalid API key', async () => {
      const res = await request(app)
        .post(`/v1/drift/${TEST_AGENT_ID}/health-ping`)
        .set('X-Api-Key', 'bad-key')
        .send({ metrics: VALID_METRICS });

      expect(res.status).toBe(401);
    });

    it('should reject ping without metrics object', async () => {
      const res = await request(app)
        .post(`/v1/drift/${TEST_AGENT_ID}/health-ping`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject metrics with non-numeric values', async () => {
      const res = await request(app)
        .post(`/v1/drift/${TEST_AGENT_ID}/health-ping`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({
          metrics: { toxicity_score: 'high' },
        });

      expect(res.status).toBe(400);
    });

    it('should reject negative request_count', async () => {
      const res = await request(app)
        .post(`/v1/drift/${TEST_AGENT_ID}/health-ping`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({
          metrics: VALID_METRICS,
          request_count: -5,
        });

      expect(res.status).toBe(400);
    });

    it('should reject period_end before period_start', async () => {
      const res = await request(app)
        .post(`/v1/drift/${TEST_AGENT_ID}/health-ping`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({
          metrics: VALID_METRICS,
          period_start: '2025-01-02T00:00:00Z',
          period_end: '2025-01-01T00:00:00Z',
        });

      expect(res.status).toBe(400);
    });

    it('should reject spoofed ping signature', async () => {
      mockSupabaseData.agents = {
        selectSingle: { agent_id: TEST_AGENT_ID, status: 'active' },
      };
      mockSupabaseData.drift_configs = {
        selectSingle: DEFAULT_CONFIG,
      };

      const res = await request(app)
        .post(`/v1/drift/${TEST_AGENT_ID}/health-ping`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({
          metrics: VALID_METRICS,
          signature: 'deadbeef'.repeat(8),
        });

      expect(res.status).toBe(400);
    });

    it('should reject ping for inactive agent', async () => {
      mockSupabaseData.agents = {
        selectSingle: { agent_id: TEST_AGENT_ID, status: 'suspended' },
      };
      mockSupabaseData.drift_configs = {
        selectSingle: DEFAULT_CONFIG,
      };

      const res = await request(app)
        .post(`/v1/drift/${TEST_AGENT_ID}/health-ping`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({ metrics: VALID_METRICS });

      expect(res.status).toBe(400);
    });
  });

  // ─── Drift Score ─────────────────────────────────────────────────────────

  describe('GET /v1/drift/:agent_id/drift-score', () => {
    it('should return current drift score with trend', async () => {
      mockSupabaseData.drift_configs = {
        selectSingle: DEFAULT_CONFIG,
      };
      mockSupabaseData.drift_health_pings = {
        selectLimit: [
          { drift_score: 0.12, metrics: VALID_METRICS, created_at: '2025-01-03T00:00:00Z' },
          { drift_score: 0.08, metrics: VALID_METRICS, created_at: '2025-01-02T00:00:00Z' },
          { drift_score: 0.05, metrics: VALID_METRICS, created_at: '2025-01-01T00:00:00Z' },
        ],
      };

      const res = await request(app)
        .get(`/v1/drift/${TEST_AGENT_ID}/drift-score`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('agent_id', TEST_AGENT_ID);
      expect(res.body).toHaveProperty('drift_score');
      expect(res.body).toHaveProperty('thresholds');
      expect(res.body).toHaveProperty('trend');
      expect(Array.isArray(res.body.trend)).toBe(true);
    });

    it('should return null score when no pings exist', async () => {
      mockSupabaseData.drift_configs = {
        selectSingle: DEFAULT_CONFIG,
      };
      mockSupabaseData.drift_health_pings = {
        selectLimit: [],
      };

      const res = await request(app)
        .get(`/v1/drift/${TEST_AGENT_ID}/drift-score`);

      expect(res.status).toBe(200);
      expect(res.body.drift_score).toBeNull();
      expect(res.body.message).toContain('No health pings');
    });
  });

  // ─── Drift History ───────────────────────────────────────────────────────

  describe('GET /v1/drift/:agent_id/drift-history', () => {
    it('should return paginated drift history', async () => {
      mockSupabaseData.drift_health_pings = {
        selectRange: [
          { id: '1', agent_id: TEST_AGENT_ID, drift_score: 0.05, metrics: VALID_METRICS, created_at: '2025-01-01T00:00:00Z', request_count: 100 },
          { id: '2', agent_id: TEST_AGENT_ID, drift_score: 0.08, metrics: VALID_METRICS, created_at: '2025-01-02T00:00:00Z', request_count: 150 },
        ],
        selectCount: 2,
      };

      const res = await request(app)
        .get(`/v1/drift/${TEST_AGENT_ID}/drift-history?limit=20&offset=0`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('history');
      expect(res.body).toHaveProperty('total', 2);
      expect(res.body).toHaveProperty('limit', 20);
      expect(Array.isArray(res.body.history)).toBe(true);
    });

    it('should support CSV format export', async () => {
      mockSupabaseData.drift_health_pings = {
        selectRange: [
          { id: '1', agent_id: TEST_AGENT_ID, drift_score: 0.05, request_count: 100, period_start: null, period_end: null, created_at: '2025-01-01T00:00:00Z' },
        ],
        selectCount: 1,
      };

      const res = await request(app)
        .get(`/v1/drift/${TEST_AGENT_ID}/drift-history?format=csv`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('id,agent_id,drift_score');
    });

    it('should support single metric filter', async () => {
      mockSupabaseData.drift_health_pings = {
        selectRange: [
          { id: '1', agent_id: TEST_AGENT_ID, drift_score: 0.05, metrics: { toxicity_score: 0.02 }, created_at: '2025-01-01T00:00:00Z' },
        ],
        selectCount: 1,
      };

      const res = await request(app)
        .get(`/v1/drift/${TEST_AGENT_ID}/drift-history?metric=toxicity_score`);

      expect(res.status).toBe(200);
      expect(res.body.history[0]).toHaveProperty('metric_name', 'toxicity_score');
      expect(res.body.history[0]).toHaveProperty('metric_value');
    });

    it('should return empty history when no pings exist', async () => {
      mockSupabaseData.drift_health_pings = {
        selectRange: [],
        selectCount: 0,
      };

      const res = await request(app)
        .get(`/v1/drift/${TEST_AGENT_ID}/drift-history`);

      expect(res.status).toBe(200);
      expect(res.body.history).toEqual([]);
      expect(res.body.total).toBe(0);
    });
  });

  // ─── Drift Configuration ─────────────────────────────────────────────────

  describe('PUT /v1/drift/:agent_id/drift-config', () => {
    it('should update drift configuration', async () => {
      const newConfig = {
        drift_threshold: 0.40,
        warning_threshold: 0.30,
        auto_revoke: false,
        spike_sensitivity: 3.0,
      };

      mockSupabaseData.drift_configs = {
        upsertResult: { ...DEFAULT_CONFIG, ...newConfig },
      };

      const res = await request(app)
        .put(`/v1/drift/${TEST_AGENT_ID}/drift-config`)
        .set('X-Api-Key', VALID_API_KEY)
        .send(newConfig);

      expect(res.status).toBe(200);
      expect(res.body.drift_threshold).toBe(0.40);
      expect(res.body.warning_threshold).toBe(0.30);
      expect(res.body.auto_revoke).toBe(false);
    });

    it('should reject warning_threshold >= drift_threshold', async () => {
      const res = await request(app)
        .put(`/v1/drift/${TEST_AGENT_ID}/drift-config`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({
          drift_threshold: 0.30,
          warning_threshold: 0.30,
        });

      expect(res.status).toBe(400);
    });

    it('should reject threshold outside 0-1 range', async () => {
      const res = await request(app)
        .put(`/v1/drift/${TEST_AGENT_ID}/drift-config`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({
          drift_threshold: 1.5,
        });

      expect(res.status).toBe(400);
    });

    it('should reject negative spike_sensitivity', async () => {
      const res = await request(app)
        .put(`/v1/drift/${TEST_AGENT_ID}/drift-config`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({
          spike_sensitivity: -1,
        });

      expect(res.status).toBe(400);
    });

    it('should require API key for config updates', async () => {
      const res = await request(app)
        .put(`/v1/drift/${TEST_AGENT_ID}/drift-config`)
        .send({ drift_threshold: 0.40 });

      expect(res.status).toBe(401);
    });
  });

  // ─── Get Drift Configuration ─────────────────────────────────────────────

  describe('GET /v1/drift/:agent_id/drift-config', () => {
    it('should return drift config for an agent', async () => {
      mockSupabaseData.drift_configs = {
        selectSingle: DEFAULT_CONFIG,
      };

      const res = await request(app)
        .get(`/v1/drift/${TEST_AGENT_ID}/drift-config`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('drift_threshold');
      expect(res.body).toHaveProperty('warning_threshold');
      expect(res.body).toHaveProperty('auto_revoke');
    });

    it('should return 404 when no config exists', async () => {
      mockSupabaseData.drift_configs = {
        selectSingle: null,
        selectSingleError: { code: 'PGRST116' },
      };

      const res = await request(app)
        .get(`/v1/drift/${TEST_AGENT_ID}/drift-config`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Auto-revoke & Warnings ──────────────────────────────────────────────

  describe('Auto-revoke and warning thresholds', () => {
    it('should return revoked status when drift exceeds drift threshold', async () => {
      const revokeMetrics = {
        response_adherence: 0.30,
        constraint_violations: 0.80,
        toxicity_score: 0.90,
        hallucination_rate: 0.70,
        avg_response_length: 5000,
      };

      mockSupabaseData.agents = {
        selectSingle: { agent_id: TEST_AGENT_ID, status: 'active' },
        updateResult: { status: 'revoked' },
      };
      mockSupabaseData.drift_configs = {
        selectSingle: DEFAULT_CONFIG,
      };
      mockSupabaseData.drift_health_pings = {
        insertResult: { id: 'ping-revoke' },
      };
      mockSupabaseData.webhook_endpoints = { selectRange: [] };

      const res = await request(app)
        .post(`/v1/drift/${TEST_AGENT_ID}/health-ping`)
        .set('X-Api-Key', VALID_API_KEY)
        .send({ metrics: revokeMetrics });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('drift_score');
      expect(res.body.drift_score).toBeGreaterThan(0.30);
    });
  });
});
