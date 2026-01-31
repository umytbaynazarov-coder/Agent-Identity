# AgentAuth CLI

> Setup, test, and deploy agent authentication in minutes

Official CLI tool for [AgentAuth](https://agentauth.dev) - the lightweight authentication system for AI agents.

## Features

- 🚀 **Interactive Setup** - `agentauth init` configures your project in seconds
- 🧪 **Local Testing** - `agentauth test` validates auth without hitting production
- ✅ **Deployment Validation** - `agentauth deploy` checks environment before going live
- 📦 **Zero Config** - Works out of the box with sensible defaults

## Installation

```bash
npm install -g @umytbaynazarow/agentauth-cli
```

## Quick Start

### 1. Initialize AgentAuth in your project

```bash
agentauth init
```

This will:
- Create `.agentauthrc` configuration file
- Generate `.env.agentauth` template
- Walk you through interactive setup

### 2. Test your configuration

```bash
agentauth test
```

This will:
- Start a local mock API server
- Run authentication flow tests
- Validate your credentials

### 3. Validate before deployment

```bash
agentauth deploy --check
```

This will:
- Check all required environment variables
- Validate API connectivity
- Ensure deployment readiness

## Commands

### `agentauth init`

Initialize AgentAuth in your project with interactive setup.

**Options:**
- `-b, --base-url <url>` - AgentAuth API base URL
- `--skip-prompts` - Skip interactive prompts and use defaults

**Example:**
```bash
# Interactive setup
agentauth init

# Non-interactive with custom URL
agentauth init --base-url https://auth.yourcompany.com --skip-prompts
```

### `agentauth test`

Test your AgentAuth configuration with a local mock API server.

**Options:**
- `-a, --agent-id <id>` - Agent ID to test
- `-k, --api-key <key>` - API key to test
- `-v, --verbose` - Show detailed error messages

**Example:**
```bash
# Test with environment variables
agentauth test

# Test with specific credentials
agentauth test --agent-id agent_123 --api-key ak_secret --verbose
```

### `agentauth deploy`

Validate environment variables and API connectivity before deployment.

**Options:**
- `-e, --env <file>` - Path to .env file
- `-c, --check` - Check-only mode (no deployment)

**Example:**
```bash
# Validate current environment
agentauth deploy --check

# Validate specific .env file
agentauth deploy --env .env.production --check
```

## Configuration Files

### `.agentauthrc`

JSON configuration file created by `agentauth init`:

```json
{
  "baseUrl": "https://auth.yourcompany.com",
  "environment": "production",
  "agentId": "agent_...",
  "apiKey": "ak_..."
}
```

### `.env.agentauth`

Environment variable template:

```bash
AGENTAUTH_BASE_URL=https://auth.yourcompany.com
AGENTAUTH_AGENT_ID=your-agent-id
AGENTAUTH_API_KEY=your-api-key
AGENTAUTH_ENVIRONMENT=production
```

## Use Cases

### Local Development

```bash
# Set up for local development
agentauth init --base-url http://localhost:3000

# Test against local API
agentauth test
```

### CI/CD Pipeline

```bash
# Validate before deployment
agentauth deploy --check

# If validation passes, proceed with deployment
if [ $? -eq 0 ]; then
  echo "Deploying..."
fi
```

### Quick Debugging

```bash
# Test specific credentials
agentauth test --agent-id agent_xxx --api-key ak_yyy --verbose
```

## Environment Variables

Required:
- `AGENTAUTH_BASE_URL` - AgentAuth API URL
- `AGENTAUTH_AGENT_ID` - Your agent ID
- `AGENTAUTH_API_KEY` - Your API key

Optional:
- `AGENTAUTH_ENVIRONMENT` - Environment name (development/staging/production)
- `AGENTAUTH_TOKEN_LIFETIME` - Custom token lifetime in seconds
- `AGENTAUTH_DEBUG` - Enable debug logging (true/false)

## Troubleshooting

### "Missing required environment variable"

Make sure you've created a `.env` file from the template:

```bash
cp .env.agentauth .env
# Edit .env with your credentials
```

### "Failed to connect to API"

Check that:
1. Your `AGENTAUTH_BASE_URL` is correct
2. The API server is running
3. Your network allows connections to the API

Use `agentauth test` to validate locally first.

### "Invalid credentials"

Verify your agent ID and API key are correct:

```bash
agentauth test --agent-id your-id --api-key your-key --verbose
```

## Related Packages

- [@umytbaynazarow/agentauth-sdk](https://www.npmjs.com/package/@umytbaynazarow/agentauth-sdk) - TypeScript SDK
- [umytbaynazarow-agentauth-sdk](https://pypi.org/project/umytbaynazarow-agentauth-sdk/) - Python SDK

## Documentation

Full documentation: [docs.agentauth.dev](https://docs.agentauth.dev)

## License

MIT

## Support

- Issues: [GitHub Issues](https://github.com/umytbaynazarov/agentauth/issues)
- Email: umytappleb7@icloud.com
