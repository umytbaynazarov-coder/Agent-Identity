/**
 * Mock AgentAuth API server for local testing
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { MockServerConfig } from '../types.js';

const MOCK_AGENT_ID = 'agent_test_123456';
const MOCK_API_KEY = 'ak_test_abcdefghijklmnop';
const MOCK_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.mock';

interface MockResponse {
  statusCode: number;
  body: any;
}

/**
 * Start mock API server for testing
 */
export function startMockServer(config: MockServerConfig): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      // Add delay if configured
      if (config.delay) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }

      const url = new URL(req.url || '/', `http://localhost:${config.port}`);
      const path = url.pathname;
      const method = req.method;

      let response: MockResponse;

      try {
        // Parse request body
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }
        const requestData = body ? JSON.parse(body) : {};

        // Route handlers
        if (path === '/health' && method === 'GET') {
          response = handleHealth();
        } else if (path === '/agents/register' && method === 'POST') {
          response = handleRegister(requestData);
        } else if (path === '/agents/verify' && method === 'POST') {
          response = handleVerify(requestData);
        } else if (path.startsWith('/agents/') && method === 'GET') {
          const agentId = path.split('/')[2];
          response = handleGetAgent(agentId);
        } else if (path === '/permissions/list' && method === 'GET') {
          response = handleListPermissions();
        } else {
          response = { statusCode: 404, body: { error: 'Not found' } };
        }
      } catch (error) {
        response = { statusCode: 400, body: { error: 'Invalid request' } };
      }

      // Send response
      res.writeHead(response.statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response.body));
    });

    server.listen(config.port, () => {
      resolve({
        port: config.port,
        close: () => server.close(),
      });
    });

    server.on('error', reject);
  });
}

function handleHealth(): MockResponse {
  return {
    statusCode: 200,
    body: {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    },
  };
}

function handleRegister(data: any): MockResponse {
  if (!data.name || !data.owner_email || !data.permissions) {
    return {
      statusCode: 400,
      body: { error: 'Missing required fields' },
    };
  }

  return {
    statusCode: 201,
    body: {
      agent: {
        agent_id: MOCK_AGENT_ID,
        name: data.name,
        owner_email: data.owner_email,
        permissions: data.permissions,
        status: 'active',
        tier: 'free',
        created_at: new Date().toISOString(),
      },
      credentials: {
        api_key: MOCK_API_KEY,
      },
    },
  };
}

function handleVerify(data: any): MockResponse {
  if (!data.agent_id || !data.api_key) {
    return {
      statusCode: 400,
      body: { error: 'Missing agent_id or api_key' },
    };
  }

  if (data.agent_id !== MOCK_AGENT_ID || data.api_key !== MOCK_API_KEY) {
    return {
      statusCode: 401,
      body: { error: 'Invalid credentials' },
    };
  }

  return {
    statusCode: 200,
    body: {
      agent: {
        agent_id: MOCK_AGENT_ID,
        name: 'Test Agent',
        permissions: ['zendesk:tickets:read'],
      },
      token: {
        access_token: MOCK_ACCESS_TOKEN,
        refresh_token: 'rt_test_mock',
        expires_in: 3600,
      },
    },
  };
}

function handleGetAgent(agentId: string): MockResponse {
  if (agentId !== MOCK_AGENT_ID) {
    return {
      statusCode: 404,
      body: { error: 'Agent not found' },
    };
  }

  return {
    statusCode: 200,
    body: {
      agent: {
        agent_id: MOCK_AGENT_ID,
        name: 'Test Agent',
        owner_email: 'test@example.com',
        permissions: ['zendesk:tickets:read'],
        status: 'active',
        tier: 'free',
        created_at: new Date().toISOString(),
      },
    },
  };
}

function handleListPermissions(): MockResponse {
  return {
    statusCode: 200,
    body: {
      permissions: {
        zendesk: ['zendesk:tickets:read', 'zendesk:tickets:write'],
        slack: ['slack:messages:write', 'slack:channels:read'],
        hubspot: ['hubspot:contacts:read', 'hubspot:deals:write'],
      },
    },
  };
}
