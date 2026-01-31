/**
 * JWT / JSON Migrator
 *
 * Imports agents from a JSON config file. Supports inline permission
 * mappings so users can migrate from any JWT-based auth system.
 *
 * Config format:
 * {
 *   "agents": [
 *     { "name": "Agent 1", "email": "a@b.com", "permissions": ["read", "write"] }
 *   ],
 *   "permission_mapping": {
 *     "read": "zendesk:tickets:read",
 *     "write": "zendesk:tickets:write"
 *   }
 * }
 */

import { readFile } from 'fs/promises';
import { mapPermissions } from './permission-mapper.js';
import type {
  JwtConfig,
  MigrationAgent,
  PermissionMappingConfig,
} from '../types.js';

/**
 * Load and validate a JWT migration config file
 */
export async function loadJwtConfig(configPath: string): Promise<JwtConfig> {
  let content: string;
  try {
    content = await readFile(configPath, 'utf-8');
  } catch {
    throw new Error(`Cannot read config file: ${configPath}`);
  }

  let config: JwtConfig;
  try {
    config = JSON.parse(content) as JwtConfig;
  } catch {
    throw new Error(`Invalid JSON in config file: ${configPath}`);
  }

  if (!Array.isArray(config.agents)) {
    throw new Error('Config must have an "agents" array');
  }

  for (let i = 0; i < config.agents.length; i++) {
    const agent = config.agents[i];
    if (!agent.name || typeof agent.name !== 'string') {
      throw new Error(`Agent at index ${i} is missing a valid "name"`);
    }
    if (!agent.email || typeof agent.email !== 'string') {
      throw new Error(`Agent at index ${i} ("${agent.name}") is missing a valid "email"`);
    }
    if (!Array.isArray(agent.permissions)) {
      throw new Error(`Agent at index ${i} ("${agent.name}") is missing a "permissions" array`);
    }
  }

  if (!config.permission_mapping) {
    config.permission_mapping = {};
  }

  return config;
}

/**
 * Convert JWT config agents to MigrationAgent[]
 *
 * Uses the inline permission_mapping from the config first,
 * then falls back to the global default mappings and any
 * external --mapping file config.
 */
export function convertJwtAgents(
  config: JwtConfig,
  externalMapping?: PermissionMappingConfig
): MigrationAgent[] {
  // Build a merged mapping config that includes the inline permission_mapping
  const inlineConfig: PermissionMappingConfig = {
    rules: [],
    defaults: { ...config.permission_mapping },
    unmappedAction: externalMapping?.unmappedAction ?? 'warn',
  };

  // If an external mapping file was provided, merge its rules on top
  if (externalMapping) {
    inlineConfig.rules = externalMapping.rules;
    // External defaults override inline ones
    Object.assign(inlineConfig.defaults, externalMapping.defaults);
  }

  return config.agents.map((agent, index) => {
    const { mapped, unmapped } = mapPermissions(
      agent.permissions,
      inlineConfig
    );

    return {
      sourceId: `jwt-${index}-${agent.email}`,
      name: agent.name,
      email: agent.email,
      sourcePermissions: agent.permissions,
      mappedPermissions: mapped,
      unmappedPermissions: unmapped,
      metadata: {
        source: 'jwt-config',
        configIndex: index,
      },
    };
  });
}
