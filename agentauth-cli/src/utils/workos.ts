/**
 * WorkOS API Client
 *
 * Fetches users and organization roles from WorkOS User Management API.
 * Uses cursor-based pagination.
 *
 * Required: WorkOS API key (sk_xxx)
 */

import type { WorkOSUser, MigrationAgent, PermissionMappingConfig } from '../types.js';
import { mapPermissions } from './permission-mapper.js';

const WORKOS_API_BASE = 'https://api.workos.com';

interface WorkOSListResponse<T> {
  data: T[];
  list_metadata: {
    after?: string;
    before?: string;
  };
}

interface WorkOSRole {
  id: string;
  slug: string;
  name: string;
  permissions: string[];
}

interface WorkOSOrganizationMembership {
  id: string;
  user_id: string;
  organization_id: string;
  role: {
    slug: string;
  };
}

/**
 * Fetch a page of WorkOS users (cursor-paginated)
 */
async function fetchWorkOSUsersPage(
  apiKey: string,
  after?: string,
  limit: number = 100
): Promise<{ users: WorkOSUser[]; after?: string }> {
  let url = `${WORKOS_API_BASE}/user_management/users?limit=${limit}`;
  if (after) url += `&after=${after}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  await handleWorkOSError(res, 'fetch users');

  const data = (await res.json()) as WorkOSListResponse<WorkOSUser>;
  return {
    users: data.data || [],
    after: data.list_metadata?.after,
  };
}

/**
 * Fetch all WorkOS users with cursor pagination
 */
export async function fetchAllWorkOSUsers(
  apiKey: string
): Promise<WorkOSUser[]> {
  const allUsers: WorkOSUser[] = [];
  let cursor: string | undefined;

  do {
    const { users, after } = await fetchWorkOSUsersPage(apiKey, cursor);
    allUsers.push(...users);
    cursor = after;
  } while (cursor);

  return allUsers;
}

/**
 * Fetch organization roles and their permissions
 */
export async function fetchWorkOSRoles(
  apiKey: string,
  orgId: string
): Promise<WorkOSRole[]> {
  const url = `${WORKOS_API_BASE}/organizations/${orgId}/roles`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  // Roles endpoint may not be available on all plans
  if (res.status === 404) return [];

  await handleWorkOSError(res, 'fetch roles');

  const data = (await res.json()) as WorkOSListResponse<WorkOSRole>;
  return data.data || [];
}

/**
 * Fetch organization memberships for a user to find their roles
 */
async function fetchUserOrgMemberships(
  apiKey: string,
  userId: string
): Promise<WorkOSOrganizationMembership[]> {
  const url = `${WORKOS_API_BASE}/user_management/organization_memberships?user_id=${userId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (res.status === 404) return [];
  await handleWorkOSError(res, `fetch org memberships for user ${userId}`);

  const data = (await res.json()) as WorkOSListResponse<WorkOSOrganizationMembership>;
  return data.data || [];
}

/**
 * Fetch all WorkOS users and convert to MigrationAgent[]
 *
 * Permissions are collected from:
 *  1. User metadata.permissions (if present)
 *  2. Organization role slugs (treated as permission identifiers)
 */
export async function fetchAllWorkOSData(
  apiKey: string,
  mappingConfig?: PermissionMappingConfig
): Promise<MigrationAgent[]> {
  const users = await fetchAllWorkOSUsers(apiKey);
  const agents: MigrationAgent[] = [];

  // Collect org IDs and fetch roles once per org
  const orgRolesCache = new Map<string, Map<string, string[]>>();

  for (const user of users) {
    if (!user.email) continue;

    const sourcePermissions: string[] = [];

    // 1. Extract from user metadata
    const meta = user.metadata || {};
    if (Array.isArray(meta.permissions)) {
      sourcePermissions.push(...(meta.permissions as string[]));
    }
    if (typeof meta.role === 'string') {
      sourcePermissions.push(meta.role as string);
    }
    if (Array.isArray(meta.roles)) {
      sourcePermissions.push(...(meta.roles as string[]));
    }

    // 2. Fetch org memberships to get role-based permissions
    const memberships = await fetchUserOrgMemberships(apiKey, user.id);
    for (const membership of memberships) {
      const orgId = membership.organization_id;
      const roleSlug = membership.role?.slug;

      if (roleSlug) {
        // Try to resolve role permissions from cache
        if (!orgRolesCache.has(orgId)) {
          const roles = await fetchWorkOSRoles(apiKey, orgId);
          const roleMap = new Map<string, string[]>();
          for (const role of roles) {
            roleMap.set(role.slug, role.permissions || []);
          }
          orgRolesCache.set(orgId, roleMap);
        }

        const rolePerms = orgRolesCache.get(orgId)?.get(roleSlug);
        if (rolePerms && rolePerms.length > 0) {
          sourcePermissions.push(...rolePerms);
        } else {
          // Use role slug itself as a permission identifier
          sourcePermissions.push(roleSlug);
        }
      }
    }

    // Skip users with no permissions
    if (sourcePermissions.length === 0) continue;

    const uniquePerms = Array.from(new Set(sourcePermissions));
    const { mapped, unmapped } = mapPermissions(uniquePerms, mappingConfig);

    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

    agents.push({
      sourceId: user.id,
      name,
      email: user.email,
      sourcePermissions: uniquePerms,
      mappedPermissions: mapped,
      unmappedPermissions: unmapped,
      metadata: {
        workosUserId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        orgMemberships: memberships.map(m => ({
          orgId: m.organization_id,
          role: m.role?.slug,
        })),
      },
    });
  }

  return agents;
}

/**
 * Handle WorkOS API error responses
 */
async function handleWorkOSError(res: Response, action: string): Promise<void> {
  if (res.ok) return;

  if (res.status === 401) {
    throw new Error(
      'WorkOS: Invalid API key. Verify your WorkOS API key (sk_xxx).'
    );
  }

  if (res.status === 403) {
    throw new Error(
      `WorkOS: Forbidden while trying to ${action}. Check your API key scope.`
    );
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    throw new Error(
      `WorkOS: Rate limited while trying to ${action}. ` +
      (retryAfter ? `Retry after ${retryAfter} seconds.` : 'Please wait and retry.')
    );
  }

  const body = await res.text();
  throw new Error(`WorkOS: Failed to ${action} (${res.status}): ${body}`);
}
