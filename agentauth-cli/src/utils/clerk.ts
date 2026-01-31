/**
 * Clerk API Client
 *
 * Fetches users from Clerk using the Backend API (api.clerk.com/v1).
 * Permissions are extracted from each user's public_metadata.permissions array.
 *
 * Required: Clerk secret key (sk_live_xxx or sk_test_xxx)
 */

import type { ClerkUser, MigrationAgent, PermissionMappingConfig } from '../types.js';
import { mapPermissions } from './permission-mapper.js';

const CLERK_API_BASE = 'https://api.clerk.com/v1';

interface ClerkPaginatedResponse {
  data: ClerkUser[];
  total_count: number;
}

/**
 * Fetch a page of Clerk users
 */
async function fetchClerkUsersPage(
  secretKey: string,
  offset: number = 0,
  limit: number = 100
): Promise<{ users: ClerkUser[]; totalCount: number }> {
  const url = `${CLERK_API_BASE}/users?offset=${offset}&limit=${limit}&order_by=-created_at`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  await handleClerkError(res, 'fetch users');

  const data = (await res.json()) as ClerkPaginatedResponse | ClerkUser[];

  // Clerk v1 returns an array directly, v2 returns { data, total_count }
  if (Array.isArray(data)) {
    return { users: data, totalCount: data.length };
  }

  return { users: data.data || [], totalCount: data.total_count };
}

/**
 * Fetch all Clerk users with pagination
 */
export async function fetchAllClerkUsers(
  secretKey: string
): Promise<ClerkUser[]> {
  const allUsers: ClerkUser[] = [];
  const limit = 100;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { users } = await fetchClerkUsersPage(secretKey, offset, limit);
    allUsers.push(...users);

    if (users.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return allUsers;
}

/**
 * Extract permissions from a Clerk user's public_metadata
 *
 * Supports these metadata shapes:
 *   { permissions: ["read:tickets", "write:tickets"] }
 *   { roles: ["admin", "support"] }
 *   { role: "admin" }
 */
export function extractClerkPermissions(user: ClerkUser): string[] {
  const meta = user.public_metadata || {};
  const permissions: string[] = [];

  // Direct permissions array
  if (Array.isArray(meta.permissions)) {
    permissions.push(...(meta.permissions as string[]));
  }

  // Roles array (each role name treated as a permission to be mapped)
  if (Array.isArray(meta.roles)) {
    permissions.push(...(meta.roles as string[]));
  }

  // Single role string
  if (typeof meta.role === 'string') {
    permissions.push(meta.role as string);
  }

  return permissions;
}

/**
 * Fetch all Clerk users and convert to MigrationAgent[]
 */
export async function fetchAllClerkData(
  secretKey: string,
  mappingConfig?: PermissionMappingConfig
): Promise<MigrationAgent[]> {
  const users = await fetchAllClerkUsers(secretKey);
  const agents: MigrationAgent[] = [];

  for (const user of users) {
    // Get primary email
    const primaryEmail = user.email_addresses?.[0]?.email_address;
    if (!primaryEmail) continue;

    const sourcePermissions = extractClerkPermissions(user);

    // Skip users with no permissions/roles
    if (sourcePermissions.length === 0) continue;

    const { mapped, unmapped } = mapPermissions(sourcePermissions, mappingConfig);

    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || primaryEmail;

    agents.push({
      sourceId: user.id,
      name,
      email: primaryEmail,
      sourcePermissions,
      mappedPermissions: mapped,
      unmappedPermissions: unmapped,
      metadata: {
        clerkUserId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        publicMetadata: user.public_metadata,
      },
    });
  }

  return agents;
}

/**
 * Handle Clerk API error responses
 */
async function handleClerkError(res: Response, action: string): Promise<void> {
  if (res.ok) return;

  if (res.status === 401) {
    throw new Error(
      'Clerk: Invalid secret key. Make sure you are using a valid sk_live_xxx or sk_test_xxx key.'
    );
  }

  if (res.status === 403) {
    throw new Error(
      `Clerk: Forbidden while trying to ${action}. Check your API key permissions.`
    );
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    throw new Error(
      `Clerk: Rate limited while trying to ${action}. ` +
      (retryAfter ? `Retry after ${retryAfter} seconds.` : 'Please wait and retry.')
    );
  }

  const body = await res.text();
  throw new Error(`Clerk: Failed to ${action} (${res.status}): ${body}`);
}
