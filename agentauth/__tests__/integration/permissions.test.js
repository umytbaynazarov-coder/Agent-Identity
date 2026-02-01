const request = require('supertest');
const express = require('express');

describe('Permissions API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json({ limit: '10mb' }));

    // Mock permission update endpoint
    app.put('/api/agents/:agent_id/permissions', (req, res) => {
      const { agent_id } = req.params;
      const { scoped_permissions } = req.body;

      if (!agent_id) {
        return res.status(400).json({
          error: 'Agent ID is required',
        });
      }

      if (!scoped_permissions || !Array.isArray(scoped_permissions)) {
        return res.status(400).json({
          error: 'scoped_permissions must be an array',
        });
      }

      // Validate permission objects
      const validPermissions = ['read', 'write', 'admin'];
      for (const perm of scoped_permissions) {
        if (!perm.resource || !perm.action) {
          return res.status(400).json({
            error: 'Each permission must have resource and action',
          });
        }
        if (!validPermissions.includes(perm.action)) {
          return res.status(400).json({
            error: `Invalid action: ${perm.action}`,
          });
        }
      }

      res.json({
        agent_id,
        scoped_permissions,
        updated_at: new Date().toISOString(),
      });
    });

    // Mock tier update endpoint
    app.put('/api/agents/:agent_id/tier', (req, res) => {
      const { agent_id } = req.params;
      const { tier } = req.body;

      const validTiers = ['free', 'pro', 'enterprise'];

      if (!tier) {
        return res.status(400).json({
          error: 'Tier is required',
        });
      }

      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          error: `Invalid tier. Must be one of: ${validTiers.join(', ')}`,
        });
      }

      res.json({
        agent_id,
        tier,
        updated_at: new Date().toISOString(),
      });
    });

    // Mock status update endpoint
    app.put('/api/agents/:agent_id/status', (req, res) => {
      const { agent_id } = req.params;
      const { status } = req.body;

      const validStatuses = ['active', 'suspended', 'disabled'];

      if (!status) {
        return res.status(400).json({
          error: 'Status is required',
        });
      }

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }

      res.json({
        agent_id,
        status,
        updated_at: new Date().toISOString(),
      });
    });
  });

  describe('PUT /api/agents/:agent_id/permissions', () => {
    it('should update agent permissions successfully', async () => {
      const response = await request(app)
        .put('/api/agents/test-agent-1/permissions')
        .send({
          scoped_permissions: [
            { resource: 'users', action: 'read' },
            { resource: 'posts', action: 'write' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.agent_id).toBe('test-agent-1');
      expect(response.body.scoped_permissions).toHaveLength(2);
    });

    it('should require scoped_permissions array', async () => {
      const response = await request(app)
        .put('/api/agents/test-agent-1/permissions')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('array');
    });

    it('should validate permission structure', async () => {
      const response = await request(app)
        .put('/api/agents/test-agent-1/permissions')
        .send({
          scoped_permissions: [
            { resource: 'users' }, // missing action
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('resource and action');
    });

    it('should validate action values', async () => {
      const response = await request(app)
        .put('/api/agents/test-agent-1/permissions')
        .send({
          scoped_permissions: [
            { resource: 'users', action: 'invalid-action' },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid action');
    });
  });

  describe('PUT /api/agents/:agent_id/tier', () => {
    it('should update agent tier successfully', async () => {
      const response = await request(app)
        .put('/api/agents/test-agent-1/tier')
        .send({
          tier: 'pro',
        });

      expect(response.status).toBe(200);
      expect(response.body.tier).toBe('pro');
    });

    it('should require tier field', async () => {
      const response = await request(app)
        .put('/api/agents/test-agent-1/tier')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should validate tier values', async () => {
      const response = await request(app)
        .put('/api/agents/test-agent-1/tier')
        .send({
          tier: 'invalid-tier',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid tier');
    });

    it('should accept all valid tier values', async () => {
      const tiers = ['free', 'pro', 'enterprise'];

      for (const tier of tiers) {
        const response = await request(app)
          .put('/api/agents/test-agent-1/tier')
          .send({ tier });

        expect(response.status).toBe(200);
        expect(response.body.tier).toBe(tier);
      }
    });
  });

  describe('PUT /api/agents/:agent_id/status', () => {
    it('should update agent status successfully', async () => {
      const response = await request(app)
        .put('/api/agents/test-agent-1/status')
        .send({
          status: 'suspended',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('suspended');
    });

    it('should require status field', async () => {
      const response = await request(app)
        .put('/api/agents/test-agent-1/status')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .put('/api/agents/test-agent-1/status')
        .send({
          status: 'invalid-status',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid status');
    });
  });
});
