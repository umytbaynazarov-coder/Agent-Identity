const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// In-memory storage for registered agents
const agents = new Map();

// POST /agents/register - Register a new agent
app.post('/agents/register', (req, res) => {
  try {
    const { name, capabilities, metadata } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Agent name is required and must be a string'
      });
    }

    // Generate unique agent ID
    const agentId = uuidv4();
    
    // Create agent record
    const agent = {
      id: agentId,
      name: name.trim(),
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      metadata: metadata || {},
      registeredAt: new Date().toISOString(),
      status: 'active'
    };

    // Store the agent
    agents.set(agentId, agent);

    console.log(`Agent registered: ${agent.name} (${agentId})`);

    // Return the registered agent
    res.status(201).json({
      message: 'Agent registered successfully',
      agent: agent
    });

  } catch (error) {
    console.error('Error registering agent:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register agent'
    });
  }
});

// GET /agents - List all registered agents (helpful for testing)
app.get('/agents', (req, res) => {
  const agentList = Array.from(agents.values());
  res.json({
    count: agentList.length,
    agents: agentList
  });
});

// GET /agents/:id - Get a specific agent by ID
app.get('/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  
  if (!agent) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'Agent not found'
    });
  }
  
  res.json(agent);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Agent Identity Server running on http://localhost:${PORT}`);
  console.log(`Register agents at POST /agents/register`);
});