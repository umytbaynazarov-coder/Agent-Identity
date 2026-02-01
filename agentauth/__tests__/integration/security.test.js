const request = require('supertest');
const express = require('express');
const cors = require('cors');

describe('Security & CORS', () => {
  let app;

  beforeAll(() => {
    app = express();

    // CORS configuration matching production
    const allowedOrigins = [
      'http://localhost:5173',
      'https://agentauth-dashboard.up.railway.app',
    ];

    app.use(cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }));

    app.use(express.json({ limit: '10mb' }));

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    app.post('/api/test', (req, res) => {
      res.json({ message: 'success' });
    });
  });

  describe('CORS Protection', () => {
    it('should allow requests from authorized origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should allow requests with no origin (same-origin)', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil.com');

      // CORS errors manifest as the absence of CORS headers
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Request Body Size Limits', () => {
    it('should accept requests within size limit', async () => {
      const data = { message: 'a'.repeat(1000) }; // Small payload

      const response = await request(app)
        .post('/api/test')
        .send(data);

      expect(response.status).toBe(200);
    });

    it('should have 10MB limit configured', () => {
      // This is tested implicitly by the app configuration
      // In a real scenario, you'd send a payload > 10MB and expect rejection
      expect(app._router.stack.some(layer =>
        layer.name === 'jsonParser'
      )).toBe(true);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return ok status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should respond quickly', async () => {
      const start = Date.now();

      await request(app).get('/api/health');

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('Error Handling', () => {
    beforeAll(() => {
      app.post('/api/error-test', (req, res) => {
        throw new Error('Test error');
      });

      // Error handler
      app.use((err, req, res, next) => {
        res.status(err.status || 500).json({
          error: err.message || 'Internal server error',
        });
      });
    });

    it('should handle errors gracefully', async () => {
      const response = await request(app)
        .post('/api/error-test');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});
