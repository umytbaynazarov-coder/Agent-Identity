const request = require('supertest');
const express = require('express');

describe('Webhook API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json({ limit: '10mb' }));

    // Mock webhook management endpoints
    app.post('/api/webhooks', (req, res) => {
      const { agent_id, url, events } = req.body;

      if (!agent_id || !url || !events) {
        return res.status(400).json({
          error: 'Agent ID, URL, and events are required',
        });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid URL format',
        });
      }

      // Validate events array
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          error: 'Events must be a non-empty array',
        });
      }

      res.status(201).json({
        webhook_id: 'webhook-123',
        agent_id,
        url,
        events,
        is_active: true,
        created_at: new Date().toISOString(),
      });
    });

    app.get('/api/webhooks/:agent_id', (req, res) => {
      const { agent_id } = req.params;

      res.json({
        webhooks: [
          {
            webhook_id: 'webhook-1',
            agent_id,
            url: 'https://example.com/webhook',
            events: ['verification.success', 'verification.failure'],
            is_active: true,
          },
        ],
      });
    });

    app.delete('/api/webhooks/:webhook_id', (req, res) => {
      const { webhook_id } = req.params;

      if (!webhook_id) {
        return res.status(400).json({
          error: 'Webhook ID is required',
        });
      }

      res.json({
        success: true,
        message: 'Webhook deleted successfully',
      });
    });
  });

  describe('POST /api/webhooks', () => {
    it('should create a new webhook successfully', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .send({
          agent_id: 'test-agent-1',
          url: 'https://example.com/webhook',
          events: ['verification.success', 'verification.failure'],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('webhook_id');
      expect(response.body.url).toBe('https://example.com/webhook');
      expect(response.body.is_active).toBe(true);
    });

    it('should require agent_id field', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://example.com/webhook',
          events: ['verification.success'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should require url field', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .send({
          agent_id: 'test-agent-1',
          events: ['verification.success'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should validate URL format', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .send({
          agent_id: 'test-agent-1',
          url: 'not-a-valid-url',
          events: ['verification.success'],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid URL');
    });

    it('should require events array', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .send({
          agent_id: 'test-agent-1',
          url: 'https://example.com/webhook',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should validate events is non-empty array', async () => {
      const response = await request(app)
        .post('/api/webhooks')
        .send({
          agent_id: 'test-agent-1',
          url: 'https://example.com/webhook',
          events: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('non-empty array');
    });
  });

  describe('GET /api/webhooks/:agent_id', () => {
    it('should retrieve webhooks for an agent', async () => {
      const response = await request(app)
        .get('/api/webhooks/test-agent-1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('webhooks');
      expect(Array.isArray(response.body.webhooks)).toBe(true);
    });
  });

  describe('DELETE /api/webhooks/:webhook_id', () => {
    it('should delete a webhook successfully', async () => {
      const response = await request(app)
        .delete('/api/webhooks/webhook-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
