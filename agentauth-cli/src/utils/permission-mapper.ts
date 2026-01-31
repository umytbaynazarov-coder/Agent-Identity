/**
 * Permission Mapper - Maps external auth provider permissions to AgentAuth format
 *
 * AgentAuth permission format: service:resource:action
 * Valid services: zendesk, slack, hubspot, github, salesforce, stripe
 */

import { readFile } from 'fs/promises';
import inquirer from 'inquirer';
import type {
  PermissionMappingConfig,
  PermissionMapResult,
  BatchMapResult,
} from '../types.js';

// Mirror of VALID_PERMISSIONS from server.js
export const VALID_PERMISSIONS_MAP: Record<string, string[]> = {
  zendesk: ['tickets:read', 'tickets:write', 'users:read', 'users:write'],
  slack: ['messages:read', 'messages:write', 'channels:read', 'channels:write'],
  hubspot: ['contacts:read', 'contacts:write', 'deals:read', 'deals:write', 'companies:read'],
  github: ['repos:read', 'repos:write', 'issues:read', 'issues:write', 'pull_requests:read'],
  salesforce: ['accounts:read', 'accounts:write', 'leads:read', 'leads:write'],
  stripe: ['payments:read', 'customers:read', 'invoices:read'],
};

// Default mappings for common Auth0/Clerk/WorkOS permission patterns
export const DEFAULT_MAPPINGS: Record<string, string> = {
  // Auth0 common patterns
  'read:tickets': 'zendesk:tickets:read',
  'write:tickets': 'zendesk:tickets:write',
  'read:users': 'zendesk:users:read',
  'write:users': 'zendesk:users:write',
  'read:messages': 'slack:messages:read',
  'write:messages': 'slack:messages:write',
  'read:channels': 'slack:channels:read',
  'write:channels': 'slack:channels:write',
  'read:contacts': 'hubspot:contacts:read',
  'write:contacts': 'hubspot:contacts:write',
  'read:deals': 'hubspot:deals:read',
  'write:deals': 'hubspot:deals:write',
  'read:companies': 'hubspot:companies:read',
  'read:repos': 'github:repos:read',
  'write:repos': 'github:repos:write',
  'read:issues': 'github:issues:read',
  'write:issues': 'github:issues:write',
  'read:pull_requests': 'github:pull_requests:read',
  'read:accounts': 'salesforce:accounts:read',
  'write:accounts': 'salesforce:accounts:write',
  'read:leads': 'salesforce:leads:read',
  'write:leads': 'salesforce:leads:write',
  'read:payments': 'stripe:payments:read',
  'read:customers': 'stripe:customers:read',
  'read:invoices': 'stripe:invoices:read',

  // Broader patterns
  'admin': '*:*:*',
  'admin:*': '*:*:*',
  'superadmin': '*:*:*',
  '*': '*:*:*',

  // Service-level patterns
  'zendesk:*': 'zendesk:*:*',
  'slack:*': 'slack:*:*',
  'hubspot:*': 'hubspot:*:*',
  'github:*': 'github:*:*',
  'salesforce:*': 'salesforce:*:*',
  'stripe:*': 'stripe:*:*',
};

/**
 * Load a custom permission mapping config from a JSON file
 */
export async function loadCustomMapping(path: string): Promise<PermissionMappingConfig> {
  const content = await readFile(path, 'utf-8');
  const config = JSON.parse(content) as PermissionMappingConfig;

  if (!config.rules) config.rules = [];
  if (!config.defaults) config.defaults = {};
  if (!config.unmappedAction) config.unmappedAction = 'warn';

  return config;
}

/**
 * Map a single source permission to AgentAuth format
 */
export function mapPermission(
  source: string,
  config?: PermissionMappingConfig
): PermissionMapResult {
  const normalized = source.toLowerCase().trim();

  // Already in AgentAuth format (service:resource:action)?
  if (isValidAgentAuthPermission(normalized)) {
    return { mapped: normalized, source: 'default' };
  }

  // Check custom mapping rules first
  if (config) {
    // Check custom defaults
    if (config.defaults[normalized]) {
      return { mapped: config.defaults[normalized], source: 'custom' };
    }

    // Check regex rules
    for (const rule of config.rules) {
      if (rule.isRegex) {
        const regex = new RegExp(rule.source, 'i');
        if (regex.test(normalized)) {
          return { mapped: rule.target, source: 'custom' };
        }
      } else if (normalized === rule.source.toLowerCase()) {
        return { mapped: rule.target, source: 'custom' };
      }
    }
  }

  // Check default mappings
  if (DEFAULT_MAPPINGS[normalized]) {
    return { mapped: DEFAULT_MAPPINGS[normalized], source: 'default' };
  }

  return { mapped: normalized, source: 'unmapped' };
}

/**
 * Map a batch of permissions, returning mapped and unmapped lists
 */
export function mapPermissions(
  sources: string[],
  config?: PermissionMappingConfig
): BatchMapResult {
  const mapped: string[] = [];
  const unmapped: string[] = [];

  for (const source of sources) {
    const result = mapPermission(source, config);
    if (result.source === 'unmapped') {
      unmapped.push(source);
    } else {
      mapped.push(result.mapped);
    }
  }

  // Deduplicate
  return {
    mapped: Array.from(new Set(mapped)),
    unmapped: Array.from(new Set(unmapped)),
  };
}

/**
 * Validate a permission string against the server's VALID_PERMISSIONS
 */
export function isValidAgentAuthPermission(perm: string): boolean {
  if (perm === '*:*:*') return true;

  const parts = perm.split(':');
  if (parts.length !== 3) return false;

  const [service, resource, action] = parts;

  // Wildcard patterns
  if (resource === '*' && action === '*') {
    return service in VALID_PERMISSIONS_MAP;
  }
  if (action === '*') {
    return VALID_PERMISSIONS_MAP[service]?.some(p => p.startsWith(`${resource}:`)) ?? false;
  }

  const validPerms = VALID_PERMISSIONS_MAP[service];
  if (!validPerms) return false;

  return validPerms.includes(`${resource}:${action}`);
}

/**
 * Get a flat list of all valid AgentAuth permissions
 */
export function getAvailablePermissions(): string[] {
  const permissions: string[] = ['*:*:*'];

  for (const [service, perms] of Object.entries(VALID_PERMISSIONS_MAP)) {
    permissions.push(`${service}:*:*`);
    for (const perm of perms) {
      permissions.push(`${service}:${perm}`);
    }
  }

  return permissions;
}

/**
 * Interactively resolve unmapped permissions via inquirer prompts
 */
export async function resolveUnmappedInteractively(
  unmapped: string[]
): Promise<Record<string, string>> {
  const available = getAvailablePermissions();
  const resolved: Record<string, string> = {};

  for (const perm of unmapped) {
    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: 'list',
        name: 'action',
        message: `How should "${perm}" be mapped?`,
        choices: [
          { name: 'Skip this permission', value: '__skip__' },
          { name: 'Map to a specific AgentAuth permission', value: '__select__' },
          { name: 'Enter a custom mapping', value: '__custom__' },
        ],
      },
    ]);

    if (action === '__skip__') continue;

    if (action === '__select__') {
      const { selected } = await inquirer.prompt<{ selected: string }>([
        {
          type: 'list',
          name: 'selected',
          message: `Select AgentAuth permission for "${perm}":`,
          choices: available,
        },
      ]);
      resolved[perm] = selected;
    } else {
      const { custom } = await inquirer.prompt<{ custom: string }>([
        {
          type: 'input',
          name: 'custom',
          message: `Enter AgentAuth permission for "${perm}" (format: service:resource:action):`,
          validate: (input: string) => {
            if (isValidAgentAuthPermission(input)) return true;
            return 'Invalid permission format. Use service:resource:action';
          },
        },
      ]);
      resolved[perm] = custom;
    }
  }

  return resolved;
}
