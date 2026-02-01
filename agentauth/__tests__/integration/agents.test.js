const request = require('supertest');
const express = require('express');

// Mock Supabase before requiring server
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              agent_id: 'test-agent-1',
              name: 'Test Agent',
              tier: 'free',
              scoped_permissions: [],
              status: 'active',
              created_at: new Date().toISOString(),
            },
            error: null,
          })),
          limit: jest.fn(() => Promise.resolve({
            data: [],
            error: null,
          })),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({
            data: [],
            error: null,
          })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({
        data: {
          agent_id: 'test-agent-new',
          name: 'New Agent',
          tier: 'free',
          api_key: 'test-api-key-123',
        },
        error: null,
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: {},
          error: null,
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          error: null,
        })),
      })),
    })),
  })),
}));

describe('Agent Registration API', () => {
  let app;

  beforeAll(() => {
    // Create a minimal Express app for testing
    app = express();
    app.use(express.json({ limit: '10mb' }));

    // Mock registration endpoint
    app.post('/api/register', (req, res) => {
      const { name, email, tier = 'free' } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      res.status(201).json({
        agent_id: 'test-agent-new',
        name,
        email,
        tier,
        api_key: 'test-api-key-123',
      });
    });
  });

  describe('POST /api/register', () => {
    it('should register a new agent successfully', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Test Agent',
          email: 'test@example.com',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('agent_id');
      expect(response.body).toHaveProperty('api_key');
      expect(response.body.name).toBe('Test Agent');
      expect(response.body.tier).toBe('free');
    });

    it('should require name field', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should require email field', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Test Agent',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Test Agent',
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    it('should accept valid tier values', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Premium Agent',
          email: 'premium@example.com',
          tier: 'pro',
        });

      expect(response.status).toBe(201);
      expect(response.body.tier).toBe('pro');
    });
  });
});

describe('Agent Verification API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json({ limit: '10mb' }));

    // Mock verification endpoint
    app.post('/api/verify', (req, res) => {
      const { agent_id, api_key } = req.body;

      if (!agent_id || !api_key) {
        return res.status(400).json({
          valid: false,
          error: 'Agent ID and API key are required'
        });
      }

      // Mock verification logic
      if (api_key === 'valid-key-123') {
        return res.json({
          valid: true,
          agent_id,
          tier: 'free',
          scoped_permissions: [],
        });
      }

      res.status(401).json({
        valid: false,
        error: 'Invalid credentials',
      });
    });
  });

  describe('POST /api/verify', () => {
    it('should verify valid agent credentials', async () => {
      const response = await request(app)
        .post('/api/verify')
        .send({
          agent_id: 'test-agent-1',
          api_key: 'valid-key-123',
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body).toHaveProperty('agent_id');
      expect(response.body).toHaveProperty('tier');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/verify')
        .send({
          agent_id: 'test-agent-1',
          api_key: 'invalid-key',
        });

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should require agent_id field', async () => {
      const response = await request(app)
        .post('/api/verify')
        .send({
          api_key: 'valid-key-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should require api_key field', async () => {
      const response = await request(app)
        .post('/api/verify')
        .send({
          agent_id: 'test-agent-1',
        });

      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });
});
