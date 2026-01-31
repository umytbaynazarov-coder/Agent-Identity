# CLI Quick Start - Setup in Under 3 Minutes

> The fastest way to set up, test, and deploy AgentAuth

The AgentAuth CLI reduces setup time from 30 minutes to **under 3 minutes** with interactive wizards, local testing, and deployment validation.

## Prerequisites

- **Node.js 16+** (check with `node --version`)
- **npm** package manager
- 3 minutes of your time ⏱️

## Installation

```bash
npm install -g @umytbaynazarow/agentauth-cli
```

Verify installation:

```bash
agentauth --version
# Output: 0.1.0
```

---

## Three Commands to Master

The AgentAuth CLI has three commands that cover the entire development lifecycle:

1. **`agentauth init`** - Interactive project setup
2. **`agentauth test`** - Local testing with mock server
3. **`agentauth deploy --check`** - Pre-deployment validation

---

## Command 1: `agentauth init` (1 minute)

Initialize AgentAuth in your project with an interactive wizard.

### Interactive Mode

```bash
agentauth init
```

You'll be prompted for:
```
🚀 AgentAuth Setup

? AgentAuth API URL: https://agentauth.dev
? Environment: production
? Do you have existing agent credentials? No

✔ Configuration files created!

✅ AgentAuth initialized successfully!

Files created:
  • .agentauthrc       (Configuration file)
  • .env.agentauth     (Environment template)

📋 Next steps:

1. Register an agent:
   curl -X POST https://agentauth.dev/agents/register \
     -H "Content-Type: application/json" \
     -d '{"name":"My Agent","owner_email":"you@company.com","permissions":["zendesk:tickets:read"]}'

2. Copy environment template to .env:
   cp .env.agentauth .env

3. Update .env with your credentials

4. Test your configuration:
   agentauth test
```

### Non-Interactive Mode

For scripts or CI/CD:

```bash
agentauth init \
  --base-url https://auth.yourcompany.com \
  --skip-prompts
```

### Generated Files

#### `.agentauthrc` (Configuration)

```json
{
  "baseUrl": "https://agentauth.dev",
  "environment": "production"
}
```

#### `.env.agentauth` (Environment Template)

```bash
# AgentAuth Configuration
# Copy this to .env and fill in your credentials

AGENTAUTH_BASE_URL=https://agentauth.dev
AGENTAUTH_AGENT_ID=your-agent-id
AGENTAUTH_API_KEY=your-api-key
AGENTAUTH_ENVIRONMENT=production

# Optional: Custom token lifetime (in seconds)
# AGENTAUTH_TOKEN_LIFETIME=3600

# Optional: Enable debug logging
# AGENTAUTH_DEBUG=true
```

---

## Command 2: `agentauth test` (1 minute)

Test your AgentAuth configuration **without hitting production**. The CLI starts a local mock API server and runs 5 comprehensive tests.

### Basic Usage

```bash
agentauth test
```

Output:

```
🧪 AgentAuth Test Mode

✔ Mock server running on http://localhost:3333

Running tests against mock API...

✔ Health Check - API is healthy
✔ Register Agent - Agent ID: agent_test_1234...
✔ Verify Agent - Token expires in: 3600s
✔ Get Agent Details - Agent: Test Agent, Status: active
✔ List Permissions - 6 permissions available

✅ All tests passed!

Your configuration:
  Base URL:    https://agentauth.dev
  Agent ID:    agent_abc123...
```

### Verbose Mode

See detailed error messages:

```bash
agentauth test --verbose
```

### Test Specific Credentials

```bash
agentauth test \
  --agent-id agent_abc123 \
  --api-key ak_secret123 \
  --verbose
```

### What's Being Tested?

1. **Health Check** - Verifies API is reachable
2. **Register Agent** - Tests agent registration flow
3. **Verify Agent** - Tests JWT token generation
4. **Get Agent Details** - Tests authenticated requests
5. **List Permissions** - Tests permission enumeration

---

## Command 3: `agentauth deploy --check` (30 seconds)

Validate your environment before deploying to production. This command checks for common misconfigurations and security issues.

### Basic Usage

```bash
agentauth deploy --check
```

Output (Success):

```
🚀 AgentAuth Deployment Check

✔ Environment loaded

Validating environment variables...

  ✓ All environment variables are valid

✔ API is reachable

✅ Deployment validation passed!

Configuration summary:
  Base URL:    https://agentauth.dev
  Agent ID:    agent_abc123...
  Environment: production
```

Output (Errors Found):

```
🚀 AgentAuth Deployment Check

✔ Environment loaded

Validating environment variables...

❌ Errors:
  • Missing required environment variable: AGENTAUTH_AGENT_ID
  • Missing required environment variable: AGENTAUTH_API_KEY

⚠️  Warnings:
  • Using http:// in production is insecure. Use https://

❌ Deployment validation failed!
```

### Validate Specific .env File

```bash
agentauth deploy --env .env.production --check
```

### Validation Rules

The CLI checks for:

- ✅ Required environment variables (BASE_URL, AGENT_ID, API_KEY)
- ✅ URL format validation (http/https protocol)
- ✅ Production security (warns about http in production)
- ✅ Credential format (agent_ and ak_ prefixes)
- ✅ Token lifetime limits (60s min, 24h max)
- ✅ Environment values (development/staging/production)
- ✅ API connectivity

---

## Common Workflows

### 1. New Project Setup

```bash
# Initialize project
agentauth init

# Test locally
agentauth test

# If tests pass, copy template and add credentials
cp .env.agentauth .env

# Edit .env with your agent ID and API key
# (Get these from agent registration)

# Validate before deploying
agentauth deploy --check
```

### 2. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
- name: Validate AgentAuth config
  run: |
    npm install -g @umytbaynazarow/agentauth-cli
    agentauth deploy --check

- name: Deploy if validation passes
  if: success()
  run: |
    npm run deploy
```

### 3. Local Development

```bash
# Quick setup for local dev
agentauth init --base-url http://localhost:3000 --skip-prompts

# Copy template
cp .env.agentauth .env

# Add your credentials to .env
vim .env  # or code .env, nano .env, etc.

# Test auth flow
agentauth test --verbose
```

### 4. Debugging Authentication Issues

```bash
# Test with specific credentials and verbose output
agentauth test \
  --agent-id agent_your_id \
  --api-key ak_your_key \
  --verbose

# Check deployment validation
agentauth deploy --check

# If errors occur, check environment variables
cat .env
```

---

## Command Options Reference

### `agentauth init`

Initialize AgentAuth in your project.

**Options:**
- `-b, --base-url <url>` - AgentAuth API base URL
- `--skip-prompts` - Skip interactive prompts and use defaults

**Examples:**
```bash
# Interactive mode
agentauth init

# Non-interactive with custom URL
agentauth init --base-url https://auth.company.com --skip-prompts

# Local development
agentauth init --base-url http://localhost:3000
```

### `agentauth test`

Test AgentAuth configuration with local mock API server.

**Options:**
- `-a, --agent-id <id>` - Agent ID to test
- `-k, --api-key <key>` - API key to test
- `-v, --verbose` - Show detailed error messages

**Examples:**
```bash
# Test with environment variables
agentauth test

# Test specific credentials
agentauth test --agent-id agent_123 --api-key ak_secret

# Verbose mode for debugging
agentauth test --verbose
```

### `agentauth deploy`

Validate environment variables and API connectivity.

**Options:**
- `-e, --env <file>` - Path to .env file
- `-c, --check` - Check-only mode (no deployment)

**Examples:**
```bash
# Validate current environment
agentauth deploy --check

# Validate specific .env file
agentauth deploy --env .env.production --check

# Validate staging environment
agentauth deploy --env .env.staging --check
```

---

## Configuration Files

### `.agentauthrc`

JSON configuration file with base settings:

```json
{
  "baseUrl": "https://auth.yourcompany.com",
  "environment": "production",
  "agentId": "agent_...",
  "apiKey": "ak_..."
}
```

⚠️ Add this to `.gitignore` if it contains credentials!

### `.env.agentauth`

Environment variable template. Copy this to `.env` and fill in your credentials:

```bash
AGENTAUTH_BASE_URL=https://auth.yourcompany.com
AGENTAUTH_AGENT_ID=your-agent-id
AGENTAUTH_API_KEY=your-api-key
AGENTAUTH_ENVIRONMENT=production

# Optional settings
AGENTAUTH_TOKEN_LIFETIME=3600
AGENTAUTH_DEBUG=true
```

---

## Troubleshooting

### "Command not found: agentauth"

**Solution:** Install the CLI globally:

```bash
npm install -g @umytbaynazarow/agentauth-cli

# Verify installation
which agentauth
agentauth --version
```

### "Missing required environment variable"

**Solution:** Make sure you've created a `.env` file from the template:

```bash
cp .env.agentauth .env

# Edit .env and add your credentials
code .env  # or vim .env, nano .env, etc.
```

### "Failed to connect to API"

**Solution:** Check that:
1. Your `AGENTAUTH_BASE_URL` is correct
2. The API server is running
3. Your network allows connections to the API

Test connectivity:

```bash
curl https://your-agentauth-url/health
```

### "Invalid credentials" during test

**Solution:** The test command uses mock credentials by default. To test with real credentials:

```bash
agentauth test --agent-id your-real-id --api-key your-real-key
```

---

## 🎯 Next Steps

After setting up with the CLI, integrate AgentAuth into your application:

- [TypeScript SDK Guide](typescript.md) - For Node.js/Express apps
- [Python SDK Guide](python.md) - For FastAPI/Django apps
- [Full CLI Reference](../../agentauth-cli/README.md) - Complete CLI documentation

---

## 🔒 Security Best Practices

### 1. Never Commit Credentials

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".agentauthrc" >> .gitignore  # If it contains credentials
```

### 2. Use Different Environments

```bash
# Development
agentauth init --base-url http://localhost:3000

# Staging
agentauth deploy --env .env.staging --check

# Production
agentauth deploy --env .env.production --check
```

### 3. Validate Before Deploying

Always run deployment validation before pushing to production:

```bash
agentauth deploy --check || exit 1
# Script exits if validation fails
```

---

## 📖 API Reference

For complete documentation, see:

- [CLI Tool Reference](../../agentauth-cli/README.md)
- [TypeScript SDK](../../agentauth-sdk/README.md)
- [Python SDK](../../agentauth-sdk-python/README.md)
- [REST API](../../agentauth/README.md)

---

## 🎉 You're Ready!

You've successfully:
- ✅ Installed the AgentAuth CLI
- ✅ Learned the three core commands (init, test, deploy)
- ✅ Configured your project
- ✅ Tested locally with the mock server
- ✅ Validated deployment readiness

### What's Next?

- [TypeScript Quick Start](typescript.md) - Integrate into Node.js apps
- [Python Quick Start](python.md) - Integrate into Python apps
- [Join our Discord](https://discord.gg/agentauth) to get help

---

**Built with ❤️ for the AI agent revolution**

[← Back to Documentation](../index.md) | [TypeScript Guide →](typescript.md)
