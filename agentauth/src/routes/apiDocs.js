const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load OpenAPI specification
const openApiPath = path.join(__dirname, '../../docs/openapi.yaml');
const swaggerDocument = YAML.load(openApiPath);

// Available API versions
const availableVersions = ['v0.7.0'];

// Swagger UI options
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AgentAuth API v0.7.0 Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    // Environment selector - users can switch between servers
    servers: [
      {
        url: 'https://api.agentauth.dev',
        description: 'Production',
      },
      {
        url: 'https://staging-api.agentauth.dev',
        description: 'Staging',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local Development',
      },
    ],
  },
};

// List available API versions
router.get('/versions', (req, res) => {
  res.json(availableVersions);
});

// Serve raw OpenAPI spec as JSON
router.get('/openapi.json', (req, res) => {
  res.json(swaggerDocument);
});

// Serve raw OpenAPI spec as YAML
router.get('/openapi.yaml', (req, res) => {
  res.type('text/yaml');
  res.send(YAML.stringify(swaggerDocument, 10));
});

// Serve Swagger UI at versioned path /v0.7.0
router.use('/v0.7.0', swaggerUi.serveFiles(swaggerDocument, swaggerUiOptions));
router.get('/v0.7.0', swaggerUi.setup(swaggerDocument, swaggerUiOptions));

// Serve Swagger UI at root
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, swaggerUiOptions));

module.exports = router;
