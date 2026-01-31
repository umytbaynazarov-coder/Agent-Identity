/**
 * Environment and configuration validation utilities
 */

import { ValidationResult } from '../types.js';

const REQUIRED_ENV_VARS = [
  'AGENTAUTH_BASE_URL',
  'AGENTAUTH_AGENT_ID',
  'AGENTAUTH_API_KEY',
];

const OPTIONAL_ENV_VARS = [
  'AGENTAUTH_ENVIRONMENT',
  'AGENTAUTH_TOKEN_LIFETIME',
  'AGENTAUTH_DEBUG',
];

/**
 * Validate environment variables for deployment
 */
export function validateEnvironment(env: Record<string, string>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else if (env[varName].includes('your-')) {
      errors.push(`${varName} still has placeholder value: ${env[varName]}`);
    }
  }

  // Validate base URL format
  if (env.AGENTAUTH_BASE_URL) {
    try {
      const url = new URL(env.AGENTAUTH_BASE_URL);
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('AGENTAUTH_BASE_URL must use http:// or https://');
      }
      if (url.protocol === 'http:' && !url.hostname.includes('localhost')) {
        warnings.push('Using http:// in production is insecure. Use https:// instead.');
      }
    } catch {
      errors.push('AGENTAUTH_BASE_URL is not a valid URL');
    }
  }

  // Validate agent ID format
  if (env.AGENTAUTH_AGENT_ID && !env.AGENTAUTH_AGENT_ID.startsWith('agent_')) {
    warnings.push('AGENTAUTH_AGENT_ID should start with "agent_" prefix');
  }

  // Validate API key format
  if (env.AGENTAUTH_API_KEY && !env.AGENTAUTH_API_KEY.startsWith('ak_')) {
    warnings.push('AGENTAUTH_API_KEY should start with "ak_" prefix');
  }

  // Validate token lifetime
  if (env.AGENTAUTH_TOKEN_LIFETIME) {
    const lifetime = parseInt(env.AGENTAUTH_TOKEN_LIFETIME, 10);
    if (isNaN(lifetime) || lifetime < 60) {
      errors.push('AGENTAUTH_TOKEN_LIFETIME must be a number >= 60 seconds');
    } else if (lifetime > 86400) {
      warnings.push('AGENTAUTH_TOKEN_LIFETIME > 24 hours may be a security risk');
    }
  }

  // Validate environment value
  if (env.AGENTAUTH_ENVIRONMENT) {
    const validEnvs = ['development', 'staging', 'production'];
    if (!validEnvs.includes(env.AGENTAUTH_ENVIRONMENT)) {
      warnings.push(`AGENTAUTH_ENVIRONMENT should be one of: ${validEnvs.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate API connectivity
 */
export async function validateApiConnectivity(baseUrl: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      errors.push(`Health check failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== 'ok') {
      warnings.push('Health check returned non-ok status');
    }
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Failed to connect to ${baseUrl}: ${error.message}`);
    } else {
      errors.push(`Failed to connect to ${baseUrl}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
