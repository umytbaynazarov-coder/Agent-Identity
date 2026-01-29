const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// JWT secret for signing tokens
const JWT_SECRET = process.env.JWT_SECRET || '6963e33bc0e8eb38b1a4a7a9e98cc3dfe9ad7aed897b0d34f2b03b79b85c8c5e';

// Helper: Generate API key
function generateApiKey() {
  return `ak_${crypto.randomBytes(24).toString('hex')}`;
}

// Helper: Generate Agent ID
function generateAgentId() {
  return `agt_${crypto.randomBytes(12).toString('hex')}`;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AgentAuths API',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// POST /agents/register
// Register a new agent and get credentials
// ============================================
app.post('/agents/register', async (req, res) => {
  try {
    const { name, description, owner_email, permissions } = req.body;

    // Validation
    if (!name || !owner_email) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'owner_email']
      });
    }

    // Generate credentials
    const agent_id = generateAgentId();
    const api_key = generateApiKey();
    const api_key_hash = crypto.createHash('sha256').update(api_key).digest('hex');

    // Insert into database
    const { data, error } = await supabase
      .from('agents')
      .insert({
        agent_id,
        name,
        description: description || null,
        owner_email,
        api_key_hash,
        permissions: permissions || ['read'],
        status: 'active',
        created_at: new Date().toISOString(),
        last_verified_at: null
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to register agent' });
    }

    // Return credentials (only time API key is shown in plain text!)
    res.status(201).json({
      success: true,
      message: 'Agent registered successfully. Save your API key - it won\'t be shown again!',
      agent: {
        agent_id: data.agent_id,
        name: data.name,
        status: data.status,
        created_at: data.created_at
      },
      credentials: {
        api_key: api_key,  // Only returned once!
        token_type: 'Bearer'
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /agents/verify
// Verify agent credentials and return JWT
// ============================================
app.post('/agents/verify', async (req, res) => {
  try {
    const { agent_id, api_key } = req.body;

    // Validation
    if (!agent_id || !api_key) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['agent_id', 'api_key']
      });
    }

    // Hash the provided API key
    const api_key_hash = crypto.createHash('sha256').update(api_key).digest('hex');

    // Look up agent
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agent_id)
      .single();

    if (error || !agent) {
      // Log failed attempt (don't reveal if agent exists)
      await logVerification(agent_id, false, 'agent_not_found');
      return res.status(401).json({
        verified: false,
        error: 'Invalid credentials'
      });
    }

    // Check if agent is active
    if (agent.status !== 'active') {
      await logVerification(agent_id, false, 'agent_inactive');
      return res.status(401).json({
        verified: false,
        error: 'Agent is not active',
        status: agent.status
      });
    }

    // Verify API key
    if (agent.api_key_hash !== api_key_hash) {
      await logVerification(agent_id, false, 'invalid_api_key');
      return res.status(401).json({
        verified: false,
        error: 'Invalid credentials'
      });
    }

    // Success! Generate JWT token
    const token = jwt.sign(
      {
        agent_id: agent.agent_id,
        name: agent.name,
        permissions: agent.permissions
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Update last_verified_at
    await supabase
      .from('agents')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('agent_id', agent_id);

    // Log successful verification
    await logVerification(agent_id, true, 'success');

    res.json({
      verified: true,
      agent: {
        agent_id: agent.agent_id,
        name: agent.name,
        permissions: agent.permissions,
        status: agent.status
      },
      token: {
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600  // 1 hour in seconds
      }
    });

  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /agents/:id
// Get agent details (requires auth)
// ============================================
app.get('/agents/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if requesting own data or has admin permission
    if (req.agent.agent_id !== id && !req.agent.permissions.includes('admin')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own agent details'
      });
    }

    // Fetch agent
    const { data: agent, error } = await supabase
      .from('agents')
      .select('agent_id, name, description, owner_email, permissions, status, created_at, last_verified_at')
      .eq('agent_id', id)
      .single();

    if (error || !agent) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Agent not found'
      });
    }

    res.json({
      agent
    });

  } catch (err) {
    console.error('Get agent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// MIDDLEWARE: Authenticate JWT Token
// ============================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No token provided. Use POST /agents/verify to get a token.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
    req.agent = decoded;
    next();
  });
}

// ============================================
// HELPER: Log verification attempts
// ============================================
async function logVerification(agent_id, success, reason) {
  try {
    await supabase
      .from('verification_logs')
      .insert({
        agent_id,
        success,
        reason,
        timestamp: new Date().toISOString(),
        ip_address: null  // Add req.ip in production
      });
  } catch (err) {
    console.error('Failed to log verification:', err);
    // Don't fail the request if logging fails
  }
}

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║         AgentAuths API v0.1.0             ║
  ╠═══════════════════════════════════════════╣
  ║  Server running on port ${PORT}              ║
  ║                                           ║
  ║  Endpoints:                               ║
  ║  • GET  /health          Health check     ║
  ║  • POST /agents/register Register agent   ║
  ║  • POST /agents/verify   Verify & login   ║
  ║  • GET  /agents/:id      Get agent info   ║
  ╚═══════════════════════════════════════════╝
  `);
});

module.exports = app;