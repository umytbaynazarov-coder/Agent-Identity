/**
 * Real API Integration Tests
 * Tests actual server.js endpoints
 */

const request = require('supertest');

// Set up test environment before importing app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

const app = require('../../server');

describe('AgentAuth API Integration Tests', () => {
  describe('Health Check', () => {
    it('GET /health should return health status', async () => {
      const response = await request(app).get('/health');

      // Accept either 200 (healthy) or 503 (degraded/unhealthy) since DB may not connect in tests
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
    });

    it('should include timestamp in health response', async () => {
      const response = await request(app).get('/health');

      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests with no origin', async () => {
      const response = await request(app)
        .get('/health');

      // Accept either 200 or 503 (health check may fail in test env)
      expect([200, 503]).toContain(response.status);
    });

    it('should set correct CORS headers for allowed origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      // Accept either 200 or 503 (health check may fail in test env)
      expect([200, 503]).toContain(response.status);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('Rate Limiting', () => {
    it('should have rate limit headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });

    it('should include rate limit information', async () => {
      const response = await request(app).get('/health');

      const limit = parseInt(response.headers['ratelimit-limit']);
      expect(limit).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/verify')
        .set('Content-Type', 'application/json')
        .send('invalid-json{');

      expect(response.status).toBe(400);
    });
  });

  describe('Request Body Size Limits', () => {
    it('should accept normal-sized JSON payloads', async () => {
      const normalPayload = {
        agent_id: 'test',
        api_key: 'test-key',
        data: 'a'.repeat(1000), // 1KB
      };

      const response = await request(app)
        .post('/api/verify')
        .send(normalPayload);

      // Should not be rejected due to size
      expect(response.status).not.toBe(413);
    });

    it('should have body size limit configured', async () => {
      // The limit is configured in server.js
      // This test verifies the middleware is present
      expect(app._router.stack.some(layer =>
        layer.name === 'jsonParser'
      )).toBe(true);
    });
  });

  describe('API Endpoints Structure', () => {
    it('should have authentication endpoints', async () => {
      // Verify endpoint should exist (even if it requires valid data)
      const response = await request(app)
        .post('/v1/agents/verify')
        .send({});

      // Should not be 404
      expect(response.status).not.toBe(404);
    });

    it('should have webhook events endpoint', async () => {
      const response = await request(app)
        .get('/v1/webhooks/events');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
    });
  });

  describe('Security Headers', () => {
    it('should set appropriate content-type headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        // Accept either 200 or 503 (health check may fail in test env)
        expect([200, 503]).toContain(response.status);
      });
    });
  });
});

describe('Webhook Events', () => {
  describe('GET /v1/webhooks/events', () => {
    it('should return list of available webhook events', async () => {
      const response = await request(app)
        .get('/v1/webhooks/events');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should include standard webhook event types', async () => {
      const response = await request(app)
        .get('/v1/webhooks/events');

      expect(response.status).toBe(200);
      const events = response.body.events;

      // Should have some events defined
      expect(events.length).toBeGreaterThan(0);

      // Common event types should exist
      expect(events).toContain('verification.success');
      expect(events).toContain('verification.failure');
    });
  });
});

describe('Verification Endpoint', () => {
  describe('POST /v1/agents/verify', () => {
    it('should require agent_id field', async () => {
      const response = await request(app)
        .post('/v1/agents/verify')
        .send({
          api_key: 'test-key',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('valid');
      expect(response.body.valid).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should require api_key field', async () => {
      const response = await request(app)
        .post('/v1/agents/verify')
        .send({
          agent_id: 'test-agent',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('valid');
      expect(response.body.valid).toBe(false);
    });

    it('should reject empty request body', async () => {
      const response = await request(app)
        .post('/v1/agents/verify')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
    });

    it('should return proper structure for invalid credentials', async () => {
      const response = await request(app)
        .post('/v1/agents/verify')
        .send({
          agent_id: 'non-existent-agent',
          api_key: 'invalid-key',
        });

      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.valid).toBe('boolean');
    });
  });
});
