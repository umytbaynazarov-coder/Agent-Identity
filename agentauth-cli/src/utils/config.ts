/**
 * Configuration file management utilities
 */

import fs from 'fs/promises';
import path from 'path';
import { AgentAuthConfig } from '../types.js';

const CONFIG_FILE = '.agentauthrc';
const ENV_FILE = '.env.agentauth';

/**
 * Load AgentAuth config from current directory
 */
export async function loadConfig(): Promise<AgentAuthConfig | null> {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Save AgentAuth config to current directory
 */
export async function saveConfig(config: AgentAuthConfig): Promise<void> {
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Generate .env template file
 */
export async function generateEnvTemplate(config: AgentAuthConfig): Promise<void> {
  const envPath = path.join(process.cwd(), ENV_FILE);
  const envContent = `# AgentAuth Configuration
# Copy this to .env and fill in your credentials

AGENTAUTH_BASE_URL=${config.baseUrl}
AGENTAUTH_AGENT_ID=${config.agentId || 'your-agent-id'}
AGENTAUTH_API_KEY=${config.apiKey || 'your-api-key'}
AGENTAUTH_ENVIRONMENT=${config.environment}

# Optional: Custom token lifetime (in seconds)
# AGENTAUTH_TOKEN_LIFETIME=3600

# Optional: Enable debug logging
# AGENTAUTH_DEBUG=true
`;

  await fs.writeFile(envPath, envContent, 'utf-8');
}

/**
 * Load environment variables from .env file
 */
export async function loadEnv(): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {};

  try {
    const envPath = path.join(process.cwd(), '.env');
    const content = await fs.readFile(envPath, 'utf-8');

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  } catch (error) {
    // .env file doesn't exist, return empty object
  }

  return envVars;
}

/**
 * Check if AgentAuth is configured in current directory
 */
export async function isConfigured(): Promise<boolean> {
  try {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    await fs.access(configPath);
    return true;
  } catch {
    return false;
  }
}
