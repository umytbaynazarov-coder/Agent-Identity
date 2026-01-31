/**
 * Type definitions for AgentAuth CLI
 */

export interface AgentAuthConfig {
  baseUrl: string;
  agentId?: string;
  apiKey?: string;
  environment: 'development' | 'staging' | 'production';
}

export interface InitOptions {
  baseUrl?: string;
  skipPrompts?: boolean;
}

export interface TestOptions {
  agentId?: string;
  apiKey?: string;
  verbose?: boolean;
}

export interface DeployOptions {
  env?: string;
  check?: boolean;
}

export interface MockServerConfig {
  port: number;
  delay?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// Migration Types
// ============================================

export interface MigrateAuth0Options {
  domain: string;
  clientId: string;
  clientSecret: string;
  dryRun?: boolean;
  mapping?: string;
  output?: string;
  batchDelay?: number;
}

export interface MigrateJwtOptions {
  config: string;
  dryRun?: boolean;
  output?: string;
}

export interface MigrateClerkOptions {
  secretKey: string;
  dryRun?: boolean;
  mapping?: string;
  output?: string;
}

export interface MigrateWorkOSOptions {
  apiKey: string;
  dryRun?: boolean;
  mapping?: string;
  output?: string;
}

/** Universal migration agent - all providers convert to this format */
export interface MigrationAgent {
  sourceId: string;
  name: string;
  email: string;
  sourcePermissions: string[];
  mappedPermissions: string[];
  unmappedPermissions: string[];
  metadata: Record<string, unknown>;
}

export interface MigrationRegistrationResult {
  agent: MigrationAgent;
  success: boolean;
  agentId?: string;
  apiKey?: string;
  error?: string;
}

export interface PermissionMappingRule {
  source: string;
  target: string;
  isRegex?: boolean;
}

export interface PermissionMappingConfig {
  rules: PermissionMappingRule[];
  defaults: Record<string, string>;
  unmappedAction: 'skip' | 'warn' | 'prompt';
}

export interface PermissionMapResult {
  mapped: string;
  source: 'default' | 'custom' | 'unmapped';
}

export interface BatchMapResult {
  mapped: string[];
  unmapped: string[];
}

export interface MigrationReportSummary {
  totalAgents: number;
  successful: number;
  failed: number;
  skipped: number;
  unmappedPermissions: string[];
}

export interface MigrationReport {
  source: 'auth0' | 'jwt' | 'clerk' | 'workos';
  startedAt: string;
  completedAt: string;
  dryRun: boolean;
  summary: MigrationReportSummary;
  agents: MigrationRegistrationResult[];
  credentials: Array<{ name: string; agentId: string; apiKey: string }>;
}

// Auth0 API response types
export interface Auth0User {
  user_id: string;
  email: string;
  name: string;
  nickname?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export interface Auth0Role {
  id: string;
  name: string;
  description?: string;
}

export interface Auth0Permission {
  permission_name: string;
  description?: string;
  resource_server_name?: string;
}

// Clerk API response types
export interface ClerkUser {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name: string | null;
  last_name: string | null;
  public_metadata: Record<string, unknown>;
}

// WorkOS API response types
export interface WorkOSUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  metadata: Record<string, unknown>;
}

// JWT config file format
export interface JwtConfigAgent {
  name: string;
  email: string;
  permissions: string[];
}

export interface JwtConfig {
  agents: JwtConfigAgent[];
  permission_mapping: Record<string, string>;
}
