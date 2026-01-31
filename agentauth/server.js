const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Validate required environment variables at startup
function validateEnvironment() {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }
}

// Run validation before starting server
validateEnvironment();

// CORS configuration - allow frontend domains
const allowedOrigins = ['https://agentauths.com', 'https://www.agentauths.com'];

// Add localhost origins only in development
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:5173', // Vite dashboard dev server
    'http://localhost:5500',
    'http://localhost:8080', // Dashboard Docker container
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5173'
  );
}

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth attempts per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// ============================================
// Per-Agent Rate Limiting with Tiers
// ============================================
const agentRateLimitStore = new Map(); // In-memory store (use Redis in production)

const TIER_LIMITS = {
  free: 60,        // 60 requests per minute
  pro: 300,        // 300 requests per minute
  enterprise: 1000 // 1000 requests per minute
};

// Periodic cleanup for rate limit store to prevent memory leak
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  let cleanedCount = 0;

  for (const [key, record] of agentRateLimitStore.entries()) {
    if (now - record.windowStart > windowMs) {
      agentRateLimitStore.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`[Rate Limit Cleanup] Removed ${cleanedCount} expired entries from rate limit store`);
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

async function rateLimitByAgent(req, res, next) {
  // Extract agent_id from JWT token
  const agentId = req.agent?.agent_id;
  if (!agentId) return next();

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const key = `rate:${agentId}`;

  // Get agent tier from database (or use tier from JWT if available)
  const tier = req.agent?.tier || 'free';
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.free;

  // Get or initialize rate limit record
  let record = agentRateLimitStore.get(key);
  if (!record || now - record.windowStart > windowMs) {
    record = { count: 0, windowStart: now };
  }

  // Check limit BEFORE incrementing to avoid race condition
  if (record.count >= limit) {
    const resetTime = Math.ceil((record.windowStart + windowMs - now) / 1000);
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', resetTime);

    return res.status(429).json({
      error: 'Rate limit exceeded',
      tier,
      limit,
      retry_after: resetTime
    });
  }

  // Increment counter after check passes
  record.count++;
  agentRateLimitStore.set(key, record);

  const remaining = Math.max(0, limit - record.count);
  const resetTime = Math.ceil((record.windowStart + windowMs - now) / 1000);

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetTime);

  next();
}

// ============================================
// Webhook System
// ============================================
const WEBHOOK_EVENTS = ['agent.registered', 'agent.verified', 'agent.revoked'];

async function sendWebhook(agentId, event, payload) {
  const { data: webhooks } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_active', true);

  for (const webhook of webhooks || []) {
    // Check if webhook is subscribed to this event
    if (!webhook.events.includes(event)) continue;

    try {
      const timestamp = Date.now().toString();
      const body = JSON.stringify({ event, timestamp, data: payload });
      
      // Create HMAC signature
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(body)
        .digest('hex');

      // Send webhook (non-blocking)
      fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AgentAuth-Signature': signature,
          'X-AgentAuth-Event': event,
          'X-AgentAuth-Timestamp': timestamp
        },
        body
      }).catch(err => console.error('Webhook delivery failed:', webhook.url, err.message));
    } catch (error) {
      console.error('Webhook error:', webhook.url, error.message);
    }
  }
}

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// JWT secret for signing tokens (REQUIRED - no fallback for security)
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Helper: Generate API key
function generateApiKey() {
  return `ak_${crypto.randomBytes(24).toString('hex')}`;
}

// Helper: Generate Agent ID
function generateAgentId() {
  return `agt_${crypto.randomBytes(12).toString('hex')}`;
}

// Helper: Generate refresh token
function generateRefreshToken() {
  return `rt_${crypto.randomBytes(32).toString('hex')}`;
}

// Helper: Hash token values for storage
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshTokenExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();
}

// ============================================
// UPGRADE: Scoped Permissions System
// ============================================

// Define valid permission structure (service:resource:action)
const VALID_PERMISSIONS = {
  zendesk: ['tickets:read', 'tickets:write', 'users:read', 'users:write'],
  slack: ['messages:read', 'messages:write', 'channels:read', 'channels:write'],
  hubspot: ['contacts:read', 'contacts:write', 'deals:read', 'deals:write', 'companies:read'],
  github: ['repos:read', 'repos:write', 'issues:read', 'issues:write', 'pull_requests:read'],
  salesforce: ['accounts:read', 'accounts:write', 'leads:read', 'leads:write'],
  stripe: ['payments:read', 'customers:read', 'invoices:read'],
  admin: ['*:*:*'] // Full access to everything
};

// Helper: Validate permission format and legitimacy
function validatePermissions(permissions) {
  const errors = [];
  
  for (const perm of permissions) {
    // Allow admin wildcard
    if (perm === '*:*:*') continue;
    
    // Check format (must have exactly 3 parts separated by colons)
    const parts = perm.split(':');
    if (parts.length !== 3) {
      errors.push({
        permission: perm,
        reason: 'Invalid format. Must be "service:resource:action"'
      });
      continue;
    }
    
    const [service, resource, action] = parts;
    
    // Check if service exists
    if (!VALID_PERMISSIONS[service]) {
      errors.push({
        permission: perm,
        reason: `Unknown service "${service}". Valid services: ${Object.keys(VALID_PERMISSIONS).filter(s => s !== 'admin').join(', ')}`
      });
      continue;
    }
    
    // Check if permission exists for this service
    const validPerms = VALID_PERMISSIONS[service];
    const permString = `${resource}:${action}`;
    
    if (!validPerms.includes(permString) && !validPerms.includes('*:*:*')) {
      errors.push({
        permission: perm,
        reason: `Invalid permission for ${service}. Valid: ${validPerms.join(', ')}`
      });
    }
  }
  
  return errors;
}

// Middleware: Check if agent has required permission
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    const { permissions = [] } = req.agent; // From JWT
    
    // Check for admin wildcard
    if (permissions.includes('*:*:*')) {
      return next();
    }
    
    // Check exact permission
    if (permissions.includes(requiredPermission)) {
      return next();
    }
    
    // Check for wildcards at different levels
    const [reqService, reqResource, reqAction] = requiredPermission.split(':');
    
    // Service-level wildcard (e.g., "zendesk:*:*")
    if (permissions.includes(`${reqService}:*:*`)) {
      return next();
    }
    
    // Resource-level wildcard (e.g., "zendesk:tickets:*")
    if (permissions.includes(`${reqService}:${reqResource}:*`)) {
      return next();
    }
    
    return res.status(403).json({
      error: 'Insufficient permissions',
      required: requiredPermission,
      granted: permissions
    });
  };
}

// Helper: Check if agent has permission (for use in route logic)
function hasPermission(agentPermissions, requiredPermission) {
  // Admin wildcard
  if (agentPermissions.includes('*:*:*')) {
    return true;
  }
  
  // Exact match
  if (agentPermissions.includes(requiredPermission)) {
    return true;
  }
  
  const [reqService, reqResource, reqAction] = requiredPermission.split(':');
  
  // Service-level wildcard
  if (agentPermissions.includes(`${reqService}:*:*`)) {
    return true;
  }
  
  // Resource-level wildcard
  if (agentPermissions.includes(`${reqService}:${reqResource}:*`)) {
    return true;
  }
  
  return false;
}

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
async function logVerification(agent_id, success, reason, ipAddress = null) {
  try {
    await supabase
      .from('verification_logs')
      .insert({
        agent_id,
        success,
        reason,
        timestamp: new Date().toISOString(),
        ip_address: ipAddress
      });
  } catch (err) {
    console.error('Failed to log verification:', err);
    // Don't fail the request if logging fails
  }
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    service: 'AgentAuths API',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown'
    }
  };

  try {
    // Test database connectivity with a simple query
    const { error } = await supabase
      .from('agents')
      .select('agent_id')
      .limit(1);

    if (error) {
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
      console.error('Health check - database error:', error);
    } else {
      health.checks.database = 'healthy';
    }
  } catch (err) {
    health.checks.database = 'unhealthy';
    health.status = 'unhealthy';
    console.error('Health check - database exception:', err);
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// ============================================
// POST /agents/register
// Register a new agent and get credentials
// ============================================
app.post('/agents/register', authLimiter, async (req, res) => {
  try {
    const { name, description, owner_email, permissions } = req.body;

    // Basic required field validation
    if (!name || !owner_email) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'owner_email']
      });
    }

    // Validate agent name
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid agent name',
        message: 'Agent name must be a non-empty string'
      });
    }

    if (name.length < 3 || name.length > 100) {
      return res.status(400).json({
        error: 'Invalid agent name',
        message: 'Agent name must be between 3 and 100 characters'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(owner_email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    if (owner_email.length > 255) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Email address is too long (max 255 characters)'
      });
    }

    // Validate description if provided
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return res.status(400).json({
          error: 'Invalid description',
          message: 'Description must be a string'
        });
      }
      if (description.length > 500) {
        return res.status(400).json({
          error: 'Invalid description',
          message: 'Description must be 500 characters or less'
        });
      }
    }

    // Validate permissions array if provided (now using scoped permission system)
    let validatedPermissions = ['zendesk:tickets:read']; // Default permission

    if (permissions !== undefined && permissions !== null) {
      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          error: 'Invalid permissions',
          message: 'Permissions must be an array',
          format: 'service:resource:action',
          example: ['zendesk:tickets:read', 'slack:messages:write']
        });
      }

      if (permissions.length === 0) {
        return res.status(400).json({
          error: 'Invalid permissions',
          message: 'At least one permission is required',
          example: ['zendesk:tickets:read']
        });
      }

      if (permissions.length > 50) {
        return res.status(400).json({
          error: 'Invalid permissions',
          message: 'Too many permissions (max 50)'
        });
      }

      // Check each permission is a string
      for (const perm of permissions) {
        if (typeof perm !== 'string') {
          return res.status(400).json({
            error: 'Invalid permissions',
            message: 'All permissions must be strings'
          });
        }
      }

      // Validate permission format and legitimacy
      const permissionErrors = validatePermissions(permissions);
      if (permissionErrors.length > 0) {
        return res.status(400).json({
          error: 'Invalid permissions',
          invalid_permissions: permissionErrors,
          valid_format: 'service:resource:action',
          valid_services: Object.keys(VALID_PERMISSIONS).filter(s => s !== 'admin'),
          examples: [
            'zendesk:tickets:read',
            'slack:messages:write',
            'hubspot:contacts:read',
            'github:repos:read'
          ],
          wildcards: [
            '*:*:* (admin - full access)',
            'zendesk:*:* (all Zendesk resources)',
            'zendesk:tickets:* (all ticket actions)'
          ]
        });
      }

      validatedPermissions = [...new Set(permissions)]; // Remove duplicates
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
        permissions: validatedPermissions,
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

    // Send webhook (non-blocking)
    sendWebhook(agent_id, 'agent.registered', {
      agent_id,
      name,
      owner_email,
      created_at: data.created_at
    }).catch(console.error);

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
app.post('/agents/verify', authLimiter, async (req, res) => {
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
    const api_key_hash = hashToken(api_key);

    // Look up agent
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agent_id)
      .single();

    if (error || !agent) {
      // Log failed attempt (don't reveal if agent exists)
      await logVerification(agent_id, false, 'agent_not_found', req.ip);
      return res.status(401).json({
        verified: false,
        error: 'Invalid credentials'
      });
    }

    // Check if agent is active
    if (agent.status !== 'active') {
      await logVerification(agent_id, false, 'agent_inactive', req.ip);
      return res.status(401).json({
        verified: false,
        error: 'Agent is not active',
        status: agent.status
      });
    }

    // Verify API key
    if (agent.api_key_hash !== api_key_hash) {
      await logVerification(agent_id, false, 'invalid_api_key', req.ip);
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
        permissions: agent.permissions,
        tier: agent.tier || 'free'
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
    );

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const refreshTokenExpiry = getRefreshTokenExpiry();

    // Update last_verified_at and store refresh token
    const { error: refreshUpdateError } = await supabase
      .from('agents')
      .update({
        refresh_token_hash: refreshTokenHash,
        refresh_token_expires_at: refreshTokenExpiry,
        last_verified_at: new Date().toISOString()
      })
      .eq('agent_id', agent_id);

    if (refreshUpdateError) {
      console.error('Failed to store refresh token:', refreshUpdateError);
      return res.status(500).json({ error: 'Failed to issue refresh token' });
    }

    // Log successful verification
    await logVerification(agent_id, true, 'success', req.ip);

    // Send webhook (non-blocking)
    sendWebhook(agent_id, 'agent.verified', {
      agent_id,
      verified_at: new Date().toISOString(),
      ip_address: req.ip
    }).catch(console.error);

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
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        refresh_token_expires_in: REFRESH_TOKEN_TTL_SECONDS
      }
    });

  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /agents/refresh
// Refresh access token using refresh token
// ============================================
app.post('/agents/refresh', authLimiter, async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token required' });
    }

    const refreshTokenHash = hashToken(refresh_token);

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('refresh_token_hash', refreshTokenHash)
      .single();

    if (error || !agent) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (!agent.refresh_token_expires_at || new Date() > new Date(agent.refresh_token_expires_at)) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    if (agent.status !== 'active') {
      return res.status(403).json({ error: `Agent is ${agent.status}` });
    }

    const newAccessToken = jwt.sign(
      {
        agent_id: agent.agent_id,
        name: agent.name,
        permissions: agent.permissions,
        tier: agent.tier || 'free'
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
    );

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const newRefreshTokenExpiry = getRefreshTokenExpiry();

    const { error: refreshRotateError } = await supabase
      .from('agents')
      .update({
        refresh_token_hash: newRefreshTokenHash,
        refresh_token_expires_at: newRefreshTokenExpiry,
        last_verified_at: new Date().toISOString()
      })
      .eq('agent_id', agent.agent_id);

    if (refreshRotateError) {
      console.error('Failed to rotate refresh token:', refreshRotateError);
      return res.status(500).json({ error: 'Failed to rotate refresh token' });
    }

    return res.json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token_expires_in: REFRESH_TOKEN_TTL_SECONDS
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /agents/revoke-tokens
// Revoke all refresh tokens for authenticated agent
// ============================================
app.post('/agents/revoke-tokens', authenticateToken, async (req, res) => {
  try {
    const agentId = req.agent.agent_id;

    // Clear refresh token from database
    const { error } = await supabase
      .from('agents')
      .update({
        refresh_token_hash: null,
        refresh_token_expires_at: null
      })
      .eq('agent_id', agentId);

    if (error) {
      console.error('Token revocation error:', error);
      return res.status(500).json({ error: 'Failed to revoke tokens' });
    }

    res.json({
      success: true,
      message: 'All refresh tokens have been revoked. Please verify again to get new tokens.'
    });
  } catch (err) {
    console.error('Token revocation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /agents
// List all agents (requires admin permission)
// ============================================
app.get('/agents', authenticateToken, async (req, res) => {
  try {
    // Check admin permission (now using scoped permission system)
    if (!hasPermission(req.agent.permissions, '*:*:*')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin permission (*:*:*) required to list all agents',
        your_permissions: req.agent.permissions
      });
    }

    // Fetch all agents (excluding sensitive data)
    const { data: agents, error } = await supabase
      .from('agents')
      .select('agent_id, name, description, owner_email, permissions, status, created_at, last_verified_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    res.json({
      agents,
      count: agents.length
    });

  } catch (err) {
    console.error('List agents error:', err);
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
    const isAdmin = hasPermission(req.agent.permissions, '*:*:*');
    if (req.agent.agent_id !== id && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own agent details or need admin permission (*:*:*)'
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
// POST /agents/:id/revoke
// Revoke/deactivate an agent (requires auth)
// ============================================
app.post('/agents/:id/revoke', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if requesting own revocation or has admin permission
    const isAdmin = hasPermission(req.agent.permissions, '*:*:*');
    if (req.agent.agent_id !== id && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only revoke your own agent or need admin permission (*:*:*)'
      });
    }

    // Update agent status to revoked
    const { data, error } = await supabase
      .from('agents')
      .update({
        status: 'revoked',
        last_verified_at: new Date().toISOString()
      })
      .eq('agent_id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Database error:', error);
      return res.status(404).json({
        error: 'Not found',
        message: 'Agent not found'
      });
    }

    // Send webhook (non-blocking)
    sendWebhook(id, 'agent.revoked', {
      agent_id: data.agent_id,
      revoked_at: new Date().toISOString(),
      revoked_by: req.agent.agent_id
    }).catch(console.error);

    res.json({
      success: true,
      message: 'Agent revoked successfully',
      agent: {
        agent_id: data.agent_id,
        name: data.name,
        status: data.status
      }
    });

  } catch (err) {
    console.error('Revoke agent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /agents/:id/activity
// Get activity logs for an agent (requires auth)
// ============================================
app.get('/agents/:id/activity', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Check if requesting own data or has admin permission
    const isAdmin = hasPermission(req.agent.permissions, '*:*:*');
    if (req.agent.agent_id !== id && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own activity logs or need admin permission (*:*:*)'
      });
    }

    // Fetch total count first
    const { count: totalCount, error: countError } = await supabase
      .from('verification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', id);

    if (countError) {
      console.error('Database error:', countError);
      return res.status(500).json({ error: 'Failed to fetch activity logs' });
    }

    // Fetch activity logs
    const { data: logs, error } = await supabase
      .from('verification_logs')
      .select('*')
      .eq('agent_id', id)
      .order('timestamp', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch activity logs' });
    }

    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);
    const total = totalCount || 0;

    res.json({
      activity: logs,
      pagination: {
        offset: offsetNum,
        limit: limitNum,
        count: logs.length,
        total: total,
        has_more: offsetNum + logs.length < total
      },
      agent_id: id
    });

  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PUT /agents/:id/tier
// Update agent tier (requires admin permission)
// ============================================
app.put('/agents/:id/tier', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tier } = req.body;

    // Check admin permission
    const isAdmin = hasPermission(req.agent.permissions, '*:*:*');
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin permission (*:*:*) required to update agent tier'
      });
    }

    // Validate tier
    const validTiers = ['free', 'pro', 'enterprise'];
    if (!tier || !validTiers.includes(tier)) {
      return res.status(400).json({
        error: 'Invalid tier',
        message: 'Tier must be one of: free, pro, enterprise',
        valid_tiers: validTiers
      });
    }

    // Update agent tier
    const { data, error } = await supabase
      .from('agents')
      .update({ tier })
      .eq('agent_id', id)
      .select('agent_id, name, tier, status')
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Agent not found'
      });
    }

    res.json({
      success: true,
      message: `Agent tier updated to ${tier}`,
      agent: data
    });
  } catch (err) {
    console.error('Update tier error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /activity
// Get global activity feed across all agents (requires admin permission)
// ============================================
app.get('/activity', authenticateToken, async (req, res) => {
  try {
    // Check admin permission
    if (!hasPermission(req.agent.permissions, '*:*:*')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin permission (*:*:*) required to view global activity'
      });
    }

    const { limit = 100, offset = 0 } = req.query;

    // Fetch total count first
    const { count: totalCount, error: countError } = await supabase
      .from('verification_logs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Database error:', countError);
      return res.status(500).json({ error: 'Failed to fetch activity logs' });
    }

    // Fetch activity logs across all agents with agent info
    const { data: logs, error } = await supabase
      .from('verification_logs')
      .select(`
        id,
        agent_id,
        success,
        reason,
        timestamp,
        ip_address,
        agents!inner (
          name,
          agent_id
        )
      `)
      .order('timestamp', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch activity logs' });
    }

    // Transform the data to flatten the agent info
    const transformedLogs = logs.map(log => ({
      id: log.id,
      agent_id: log.agent_id,
      agent_name: log.agents?.name || 'Unknown',
      success: log.success,
      reason: log.reason,
      timestamp: log.timestamp,
      ip_address: log.ip_address
    }));

    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);
    const total = totalCount || 0;

    res.json({
      activity: transformedLogs,
      pagination: {
        offset: offsetNum,
        limit: limitNum,
        count: transformedLogs.length,
        total: total,
        has_more: offsetNum + transformedLogs.length < total
      }
    });

  } catch (err) {
    console.error('Get global activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PUT /agents/:id/permissions
// Update agent permissions (requires admin permission)
// ============================================
app.put('/agents/:id/permissions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    // Check admin permission
    if (!hasPermission(req.agent.permissions, '*:*:*')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin permission (*:*:*) required to update permissions'
      });
    }

    // Validate permissions array
    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        error: 'Invalid permissions',
        message: 'Permissions must be an array'
      });
    }

    // Validate each permission
    const permissionErrors = validatePermissions(permissions);
    if (permissionErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid permissions',
        message: 'Some permissions are invalid',
        invalid_permissions: permissionErrors
      });
    }

    // Limit number of permissions
    if (permissions.length > 50) {
      return res.status(400).json({
        error: 'Too many permissions',
        message: 'Maximum 50 permissions allowed per agent'
      });
    }

    // Update agent permissions
    const { data, error } = await supabase
      .from('agents')
      .update({ permissions })
      .eq('agent_id', id)
      .select('agent_id, name, permissions, status')
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Agent not found'
      });
    }

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      agent: data
    });

  } catch (err) {
    console.error('Update permissions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// WEBHOOK MANAGEMENT ROUTES
// ============================================

// POST /webhooks - Register a new webhook
app.post('/webhooks', authenticateToken, rateLimitByAgent, async (req, res) => {
  try {
    const { url, events } = req.body;
    const agent_id = req.agent.agent_id;

    if (!url || !events) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['url', 'events']
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate events
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        error: 'events must be a non-empty array',
        valid_events: WEBHOOK_EVENTS
      });
    }

    const invalidEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: 'Invalid events',
        invalid: invalidEvents,
        valid_events: WEBHOOK_EVENTS
      });
    }

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex');

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        agent_id,
        url,
        events,
        secret,
        is_active: true
      })
      .select('id, url, events, is_active, created_at')
      .single();

    if (error) {
      console.error('Webhook creation error:', error);
      return res.status(500).json({ error: 'Failed to create webhook' });
    }

    res.status(201).json({
      success: true,
      webhook: data,
      secret // Only returned once!
    });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /webhooks - List webhooks for authenticated agent
app.get('/webhooks', authenticateToken, rateLimitByAgent, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .select('id, url, events, is_active, created_at')
      .eq('agent_id', req.agent.agent_id);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch webhooks' });
    }

    res.json({ webhooks: data, count: data.length });
  } catch (err) {
    console.error('List webhooks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /webhooks/:id - Delete a webhook
app.delete('/webhooks/:id', authenticateToken, rateLimitByAgent, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id)
      .eq('agent_id', req.agent.agent_id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({ success: true, message: 'Webhook deleted' });
  } catch (err) {
    console.error('Delete webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /webhooks/:id/regenerate-secret - Regenerate webhook secret
app.post('/webhooks/:id/regenerate-secret', authenticateToken, rateLimitByAgent, async (req, res) => {
  try {
    const { id } = req.params;

    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');

    // Update webhook with new secret
    const { data, error } = await supabase
      .from('webhook_endpoints')
      .update({ secret: newSecret })
      .eq('id', id)
      .eq('agent_id', req.agent.agent_id)
      .select('id, url, events, is_active, created_at')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      success: true,
      message: 'Webhook secret regenerated successfully',
      webhook: data,
      secret: newSecret // Only returned once!
    });
  } catch (err) {
    console.error('Regenerate webhook secret error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /webhooks/events - List valid webhook events
app.get('/webhooks/events', (req, res) => {
  res.json({ events: WEBHOOK_EVENTS });
});

// ============================================
// EXAMPLE ROUTES: Demonstrating Scoped Permissions
// ============================================

// Example: Zendesk ticket creation (requires zendesk:tickets:write)
app.post('/integrations/zendesk/tickets', 
  authenticateToken, 
  requirePermission('zendesk:tickets:write'),
  async (req, res) => {
    res.json({ 
      success: true,
      message: 'Agent has permission to create Zendesk tickets',
      agent: req.agent.name,
      permission_used: 'zendesk:tickets:write'
    });
  }
);

// Example: Slack message posting (requires slack:messages:write)
app.post('/integrations/slack/messages', 
  authenticateToken, 
  requirePermission('slack:messages:write'),
  async (req, res) => {
    res.json({ 
      success: true,
      message: 'Agent has permission to post Slack messages',
      agent: req.agent.name,
      permission_used: 'slack:messages:write'
    });
  }
);

// Example: HubSpot contact reading (requires hubspot:contacts:read)
app.get('/integrations/hubspot/contacts', 
  authenticateToken, 
  requirePermission('hubspot:contacts:read'),
  async (req, res) => {
    res.json({ 
      success: true,
      message: 'Agent has permission to read HubSpot contacts',
      agent: req.agent.name,
      permission_used: 'hubspot:contacts:read'
    });
  }
);

// Example: GitHub repository access (requires github:repos:read)
app.get('/integrations/github/repos', 
  authenticateToken, 
  requirePermission('github:repos:read'),
  async (req, res) => {
    res.json({ 
      success: true,
      message: 'Agent has permission to read GitHub repositories',
      agent: req.agent.name,
      permission_used: 'github:repos:read'
    });
  }
);

// ============================================
// GET /permissions/list
// List all available permissions
// ============================================
app.get('/permissions/list', async (req, res) => {
  const permissionsList = {};
  
  for (const [service, permissions] of Object.entries(VALID_PERMISSIONS)) {
    permissionsList[service] = permissions.map(perm => 
      service === 'admin' ? perm : `${service}:${perm}`
    );
  }
  
  res.json({
    permissions: permissionsList,
    format: 'service:resource:action',
    examples: [
      'zendesk:tickets:read',
      'slack:messages:write',
      'hubspot:contacts:read',
      'github:repos:read',
      '*:*:* (admin - full access)'
    ],
    wildcards: {
      admin: '*:*:* grants full access to everything',
      service: 'zendesk:*:* grants access to all Zendesk resources',
      resource: 'zendesk:tickets:* grants all actions on Zendesk tickets'
    }
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════╗
  ║         AgentAuths API v0.4.0                      ║
  ║         Production-Ready & Optimized               ║
  ╠════════════════════════════════════════════════════╣
  ║  Server running on port ${PORT}                       ║
  ║                                                    ║
  ║  Core Endpoints:                                   ║
  ║  • GET  /health                 Health check       ║
  ║  • GET  /permissions/list       List permissions   ║
  ║  • POST /agents/register        Register agent     ║
  ║  • POST /agents/verify          Verify & login     ║
  ║  • POST /agents/refresh         Refresh token      ║
  ║  • POST /agents/revoke-tokens   Revoke tokens      ║
  ║  • GET  /agents                 List all agents    ║
  ║  • GET  /agents/:id             Get agent info     ║
  ║  • PUT  /agents/:id/tier        Update tier        ║
  ║  • POST /agents/:id/revoke      Revoke agent       ║
  ║  • GET  /agents/:id/activity    Activity log       ║
  ║                                                    ║
  ║  Webhooks:                                         ║
  ║  • POST   /webhooks                 Register       ║
  ║  • GET    /webhooks                 List           ║
  ║  • DELETE /webhooks/:id             Delete         ║
  ║  • POST   /webhooks/:id/regen...    Regen secret   ║
  ║  • GET    /webhooks/events          List events    ║
  ║                                                    ║
  ║  Rate Limits (per minute):                         ║
  ║  • free: 60  |  pro: 300  |  enterprise: 1000      ║
  ║                                                    ║
  ║  ✨ New in v0.4.0:                                  ║
  ║  • Fixed memory leak in rate limiting              ║
  ║  • Fixed race condition in rate limiter            ║
  ║  • Optimized: Tier cached in JWT (no DB query)     ║
  ║  • Production-ready CORS configuration             ║
  ║  • Enhanced test coverage (25 tests)               ║
  ╚════════════════════════════════════════════════════╝
  `);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log('HTTP server closed.');
    console.log('Graceful shutdown complete.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;