/**
 * Auth0 Management API v2 Client
 *
 * Fetches users, roles, and permissions from an Auth0 tenant
 * using Machine-to-Machine (M2M) credentials.
 */

import type {
  Auth0User,
  Auth0Role,
  Auth0Permission,
  MigrationAgent,
} from '../types.js';
import { mapPermissions } from './permission-mapper.js';
import type { PermissionMappingConfig } from '../types.js';

interface Auth0TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface Auth0PaginatedResponse<T> {
  start: number;
  limit: number;
  length: number;
  total: number;
  users?: T[];
}

/**
 * Get an Auth0 Management API token via M2M client credentials
 */
export async function getAuth0ManagementToken(
  domain: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const url = `https://${domain}/oauth/token`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error(
        'Auth0 authentication failed. Check your client ID and client secret.'
      );
    }
    if (res.status === 403) {
      throw new Error(
        'Auth0 M2M application lacks required scopes. Ensure it has: read:users, read:roles, read:role_members.'
      );
    }
    const body = await res.text();
    throw new Error(`Auth0 token request failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as Auth0TokenResponse;
  return data.access_token;
}

/**
 * Fetch a page of Auth0 users
 */
export async function fetchAuth0Users(
  domain: string,
  token: string,
  page: number = 0,
  perPage: number = 50
): Promise<{ users: Auth0User[]; total: number }> {
  const url = `https://${domain}/api/v2/users?page=${page}&per_page=${perPage}&include_totals=true`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleAuth0Error(res, 'fetch users');

  const data = (await res.json()) as Auth0PaginatedResponse<Auth0User>;
  return { users: data.users || [], total: data.total };
}

/**
 * Fetch all Auth0 roles
 */
export async function fetchAuth0Roles(
  domain: string,
  token: string
): Promise<Auth0Role[]> {
  const url = `https://${domain}/api/v2/roles`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleAuth0Error(res, 'fetch roles');

  return (await res.json()) as Auth0Role[];
}

/**
 * Fetch permissions assigned to a specific Auth0 role
 */
export async function fetchAuth0RolePermissions(
  domain: string,
  token: string,
  roleId: string
): Promise<Auth0Permission[]> {
  const url = `https://${domain}/api/v2/roles/${roleId}/permissions`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleAuth0Error(res, `fetch permissions for role ${roleId}`);

  return (await res.json()) as Auth0Permission[];
}

/**
 * Fetch roles assigned to a specific Auth0 user
 */
export async function fetchAuth0UserRoles(
  domain: string,
  token: string,
  userId: string
): Promise<Auth0Role[]> {
  const url = `https://${domain}/api/v2/users/${encodeURIComponent(userId)}/roles`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleAuth0Error(res, `fetch roles for user ${userId}`);

  return (await res.json()) as Auth0Role[];
}

/**
 * Fetch all Auth0 data: users with their roles and permissions
 *
 * Returns MigrationAgent[] with source permissions collected from
 * each user's assigned roles.
 */
export async function fetchAllAuth0Data(
  domain: string,
  clientId: string,
  clientSecret: string,
  mappingConfig?: PermissionMappingConfig
): Promise<MigrationAgent[]> {
  // 1. Get management token
  const token = await getAuth0ManagementToken(domain, clientId, clientSecret);

  // 2. Fetch all roles and their permissions upfront
  const roles = await fetchAuth0Roles(domain, token);
  const rolePermissionMap = new Map<string, string[]>();

  for (const role of roles) {
    const perms = await fetchAuth0RolePermissions(domain, token, role.id);
    rolePermissionMap.set(
      role.id,
      perms.map(p => p.permission_name)
    );
  }

  // 3. Fetch all users (paginated)
  const agents: MigrationAgent[] = [];
  let page = 0;
  const perPage = 50;
  let total = Infinity;

  while (page * perPage < total) {
    const result = await fetchAuth0Users(domain, token, page, perPage);
    total = result.total;

    for (const user of result.users) {
      // Skip users without email
      if (!user.email) continue;

      // Get user's roles
      const userRoles = await fetchAuth0UserRoles(domain, token, user.user_id);

      // Collect all permissions from user's roles
      const sourcePermissions: string[] = [];
      for (const role of userRoles) {
        const perms = rolePermissionMap.get(role.id) || [];
        sourcePermissions.push(...perms);
      }

      // Skip users with no roles/permissions
      if (sourcePermissions.length === 0 && userRoles.length === 0) {
        continue;
      }

      // Deduplicate source permissions
      const uniqueSourcePerms = Array.from(new Set(sourcePermissions));

      // Map permissions
      const { mapped, unmapped } = mapPermissions(uniqueSourcePerms, mappingConfig);

      agents.push({
        sourceId: user.user_id,
        name: user.name || user.nickname || user.email,
        email: user.email,
        sourcePermissions: uniqueSourcePerms,
        mappedPermissions: mapped,
        unmappedPermissions: unmapped,
        metadata: {
          auth0UserId: user.user_id,
          auth0Roles: userRoles.map(r => r.name),
          nickname: user.nickname,
          app_metadata: user.app_metadata,
        },
      });
    }

    page++;
  }

  return agents;
}

/**
 * Handle Auth0 API error responses
 */
async function handleAuth0Error(res: Response, action: string): Promise<void> {
  if (res.ok) return;

  if (res.status === 401) {
    throw new Error(
      `Auth0: Unauthorized while trying to ${action}. Token may be expired.`
    );
  }

  if (res.status === 403) {
    throw new Error(
      `Auth0: Forbidden while trying to ${action}. ` +
      'Your M2M application needs these scopes: read:users, read:roles, read:role_members.'
    );
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    throw new Error(
      `Auth0: Rate limited while trying to ${action}. ` +
      (retryAfter ? `Retry after ${retryAfter} seconds.` : 'Please wait and retry.')
    );
  }

  const body = await res.text();
  throw new Error(`Auth0: Failed to ${action} (${res.status}): ${body}`);
}
