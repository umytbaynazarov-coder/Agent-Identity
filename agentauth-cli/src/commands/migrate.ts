/**
 * Migration Commands
 *
 * Orchestrates migration from external auth providers to AgentAuth.
 * Each provider follows the same flow:
 *   1. Load config (baseUrl from .agentauthrc / .env)
 *   2. Load custom mapping if --mapping provided
 *   3. Fetch data from source provider
 *   4. Convert to MigrationAgent[] with permission mapping
 *   5. If unmapped permissions exist + not dry-run -> interactive resolution
 *   6. If --dry-run -> preview + save report + exit
 *   7. Confirm with user
 *   8. Register each agent via POST /agents/register (rate-limited)
 *   9. Save credentials file
 *  10. Print migration summary
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { loadConfig } from '../utils/config.js';
import { loadCustomMapping, resolveUnmappedInteractively } from '../utils/permission-mapper.js';
import {
  createEmptyReport,
  finalizeReport,
  saveReport,
  saveCredentials,
  printDryRunPreview,
  printMigrationSummary,
  addResult,
} from '../utils/migration-report.js';
import { fetchAllAuth0Data } from '../utils/auth0.js';
import { loadJwtConfig, convertJwtAgents } from '../utils/jwt-migrator.js';
import { fetchAllClerkData } from '../utils/clerk.js';
import { fetchAllWorkOSData } from '../utils/workos.js';
import type {
  MigrateAuth0Options,
  MigrateJwtOptions,
  MigrateClerkOptions,
  MigrateWorkOSOptions,
  MigrationAgent,
  MigrationReport,
  PermissionMappingConfig,
} from '../types.js';

const DEFAULT_BASE_URL = 'https://agentauth-production-b6b2.up.railway.app';
const REGISTER_DELAY_MS = 10_000; // 10s between registrations (10 req / 15 min limit)

/**
 * Resolve the AgentAuth base URL from config, env, or default
 */
async function resolveBaseUrl(): Promise<string> {
  const config = await loadConfig();
  return (
    config?.baseUrl ||
    process.env.AGENTAUTH_BASE_URL ||
    DEFAULT_BASE_URL
  );
}

/**
 * Load optional custom permission mapping
 */
async function loadMapping(
  mappingPath?: string
): Promise<PermissionMappingConfig | undefined> {
  if (!mappingPath) return undefined;
  return loadCustomMapping(mappingPath);
}

/**
 * Register a single agent with the AgentAuth API
 */
async function registerAgent(
  baseUrl: string,
  agent: MigrationAgent
): Promise<{ agentId: string; apiKey: string }> {
  const res = await fetch(`${baseUrl}/agents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: agent.name,
      owner_email: agent.email,
      permissions: agent.mappedPermissions,
      description: `Migrated from external provider (source: ${agent.sourceId})`,
    }),
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
    await sleep(waitMs);

    // Retry once
    const retry = await fetch(`${baseUrl}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: agent.name,
        owner_email: agent.email,
        permissions: agent.mappedPermissions,
        description: `Migrated from external provider (source: ${agent.sourceId})`,
      }),
    });

    if (!retry.ok) {
      const body = await retry.text();
      throw new Error(`Registration failed after retry (${retry.status}): ${body}`);
    }

    const data = (await retry.json()) as Record<string, unknown>;
    return {
      agentId: data.agent_id as string,
      apiKey: data.api_key as string,
    };
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Registration failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    agentId: data.agent_id as string,
    apiKey: data.api_key as string,
  };
}

/**
 * Core migration orchestrator - shared by all provider commands
 */
async function executeMigration(
  report: MigrationReport,
  agents: MigrationAgent[],
  options: { dryRun?: boolean; output?: string }
): Promise<void> {
  const baseUrl = await resolveBaseUrl();

  // Handle unmapped permissions
  const allUnmapped = Array.from(
    new Set(agents.flatMap(a => a.unmappedPermissions))
  );

  if (allUnmapped.length > 0 && !options.dryRun) {
    console.log(chalk.yellow(`\n⚠  ${allUnmapped.length} unmapped permission(s) found.\n`));
    const resolved = await resolveUnmappedInteractively(allUnmapped);

    // Apply resolved mappings to all agents
    for (const agent of agents) {
      const stillUnmapped: string[] = [];
      for (const perm of agent.unmappedPermissions) {
        if (resolved[perm]) {
          agent.mappedPermissions.push(resolved[perm]);
        } else {
          stillUnmapped.push(perm);
        }
      }
      agent.unmappedPermissions = stillUnmapped;
    }
  }

  // Dry run - preview and exit
  if (options.dryRun) {
    printDryRunPreview(agents);

    // Add agents to report as-is (not registered)
    for (const agent of agents) {
      addResult(report, { agent, success: false });
    }

    const finalized = finalizeReport(report);
    if (options.output) {
      await saveReport(finalized, options.output);
      console.log(chalk.gray(`Report saved to ${options.output}`));
    }

    return;
  }

  // Confirm before proceeding
  const validAgents = agents.filter(a => a.mappedPermissions.length > 0);
  if (validAgents.length === 0) {
    console.log(chalk.yellow('\nNo agents with valid permissions to migrate.'));
    return;
  }

  const estimatedMinutes = Math.ceil((validAgents.length * REGISTER_DELAY_MS) / 60_000);
  console.log(
    chalk.white(`\nReady to migrate ${validAgents.length} agent(s).`)
  );
  console.log(
    chalk.gray(
      `Estimated time: ~${estimatedMinutes} minute(s) (rate-limited to 10 req/15 min)`
    )
  );

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Proceed with migration of ${validAgents.length} agent(s)?`,
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('\nMigration cancelled.'));
    return;
  }

  // Register agents one by one with rate limiting
  const spinner = ora().start();

  for (let i = 0; i < validAgents.length; i++) {
    const agent = validAgents[i];
    spinner.text = `Registering agent ${i + 1}/${validAgents.length}: ${agent.name}...`;

    try {
      const { agentId, apiKey } = await registerAgent(baseUrl, agent);
      addResult(report, {
        agent,
        success: true,
        agentId,
        apiKey,
      });
    } catch (error) {
      addResult(report, {
        agent,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Rate limit delay (skip after last agent)
    if (i < validAgents.length - 1) {
      spinner.text = `Waiting ${REGISTER_DELAY_MS / 1000}s (rate limit)...`;
      await sleep(REGISTER_DELAY_MS);
    }
  }

  spinner.stop();

  // Finalize
  const finalized = finalizeReport(report);
  printMigrationSummary(finalized);

  // Save report and credentials
  const outputDir = options.output || '.';

  if (finalized.credentials.length > 0) {
    const credPath = await saveCredentials(finalized, outputDir);
    console.log(chalk.green(`Credentials saved to ${credPath}`));
    console.log(chalk.yellow('Store these securely - API keys are shown only once.\n'));
  }

  const reportPath = `${outputDir}/migration-report-${report.source}.json`;
  await saveReport(finalized, reportPath);
  console.log(chalk.gray(`Full report saved to ${reportPath}`));
}

// ============================================
// Provider Commands
// ============================================

/**
 * Migrate agents from Auth0
 */
export async function migrateAuth0Command(
  options: MigrateAuth0Options
): Promise<void> {
  console.log(chalk.bold.blue('\n━━━ Auth0 Migration ━━━\n'));

  const spinner = ora('Connecting to Auth0...').start();
  const report = createEmptyReport('auth0', options.dryRun ?? false);

  try {
    const mappingConfig = await loadMapping(options.mapping);

    spinner.text = 'Fetching users, roles, and permissions from Auth0...';
    const agents = await fetchAllAuth0Data(
      options.domain,
      options.clientId,
      options.clientSecret,
      mappingConfig
    );

    spinner.succeed(`Found ${agents.length} agent(s) in Auth0`);

    if (agents.length === 0) {
      console.log(chalk.yellow('\nNo eligible users found in Auth0 (users need at least one role).'));
      return;
    }

    await executeMigration(report, agents, {
      dryRun: options.dryRun,
      output: options.output,
    });
  } catch (error) {
    spinner.fail(chalk.red('Auth0 migration failed'));

    if (error instanceof Error) {
      console.error(chalk.red(`\nError: ${error.message}`));

      if (error.message.includes('401')) {
        console.log(chalk.yellow('\nTip: Verify your Auth0 client ID and client secret.'));
      } else if (error.message.includes('403')) {
        console.log(chalk.yellow('\nTip: Your Auth0 M2M application needs these scopes:'));
        console.log(chalk.yellow('  - read:users'));
        console.log(chalk.yellow('  - read:roles'));
        console.log(chalk.yellow('  - read:role_members'));
      }
    }

    // Save partial report on failure
    const finalized = finalizeReport(report);
    if (options.output) {
      const reportPath = `${options.output}/migration-report-auth0.json`;
      await saveReport(finalized, reportPath);
      console.log(chalk.gray(`\nPartial report saved to ${reportPath}`));
    }

    throw error;
  }
}

/**
 * Migrate agents from a JWT/JSON config file
 */
export async function migrateJwtCommand(
  options: MigrateJwtOptions
): Promise<void> {
  console.log(chalk.bold.blue('\n━━━ JWT / JSON Migration ━━━\n'));

  const spinner = ora('Loading config file...').start();
  const report = createEmptyReport('jwt', options.dryRun ?? false);

  try {
    const config = await loadJwtConfig(options.config);
    const mappingConfig = await loadMapping(undefined); // JWT uses inline mapping
    const externalMapping = options.output ? undefined : mappingConfig; // no external mapping flag on jwt

    spinner.text = 'Converting agents...';
    const agents = convertJwtAgents(config, externalMapping);

    spinner.succeed(`Loaded ${agents.length} agent(s) from config`);

    if (agents.length === 0) {
      console.log(chalk.yellow('\nNo agents found in config file.'));
      return;
    }

    await executeMigration(report, agents, {
      dryRun: options.dryRun,
      output: options.output,
    });
  } catch (error) {
    spinner.fail(chalk.red('JWT migration failed'));

    if (error instanceof Error) {
      console.error(chalk.red(`\nError: ${error.message}`));
    }

    // Save partial report on failure
    const finalized = finalizeReport(report);
    if (options.output) {
      const reportPath = `${options.output}/migration-report-jwt.json`;
      await saveReport(finalized, reportPath);
      console.log(chalk.gray(`\nPartial report saved to ${reportPath}`));
    }

    throw error;
  }
}

/**
 * Migrate agents from Clerk
 */
export async function migrateClerkCommand(
  options: MigrateClerkOptions
): Promise<void> {
  console.log(chalk.bold.blue('\n━━━ Clerk Migration ━━━\n'));

  const spinner = ora('Connecting to Clerk...').start();
  const report = createEmptyReport('clerk', options.dryRun ?? false);

  try {
    const mappingConfig = await loadMapping(options.mapping);

    spinner.text = 'Fetching users and permissions from Clerk...';
    const agents = await fetchAllClerkData(options.secretKey, mappingConfig);

    spinner.succeed(`Found ${agents.length} agent(s) in Clerk`);

    if (agents.length === 0) {
      console.log(chalk.yellow('\nNo eligible users found in Clerk (users need permissions in public_metadata).'));
      return;
    }

    await executeMigration(report, agents, {
      dryRun: options.dryRun,
      output: options.output,
    });
  } catch (error) {
    spinner.fail(chalk.red('Clerk migration failed'));

    if (error instanceof Error) {
      console.error(chalk.red(`\nError: ${error.message}`));

      if (error.message.includes('Invalid secret key')) {
        console.log(chalk.yellow('\nTip: Use your Clerk secret key (sk_live_xxx or sk_test_xxx).'));
        console.log(chalk.yellow('     Find it at: Dashboard > API Keys'));
      }
    }

    const finalized = finalizeReport(report);
    if (options.output) {
      const reportPath = `${options.output}/migration-report-clerk.json`;
      await saveReport(finalized, reportPath);
      console.log(chalk.gray(`\nPartial report saved to ${reportPath}`));
    }

    throw error;
  }
}

/**
 * Migrate agents from WorkOS
 */
export async function migrateWorkOSCommand(
  options: MigrateWorkOSOptions
): Promise<void> {
  console.log(chalk.bold.blue('\n━━━ WorkOS Migration ━━━\n'));

  const spinner = ora('Connecting to WorkOS...').start();
  const report = createEmptyReport('workos', options.dryRun ?? false);

  try {
    const mappingConfig = await loadMapping(options.mapping);

    spinner.text = 'Fetching users, roles, and permissions from WorkOS...';
    const agents = await fetchAllWorkOSData(options.apiKey, mappingConfig);

    spinner.succeed(`Found ${agents.length} agent(s) in WorkOS`);

    if (agents.length === 0) {
      console.log(chalk.yellow('\nNo eligible users found in WorkOS (users need roles or metadata permissions).'));
      return;
    }

    await executeMigration(report, agents, {
      dryRun: options.dryRun,
      output: options.output,
    });
  } catch (error) {
    spinner.fail(chalk.red('WorkOS migration failed'));

    if (error instanceof Error) {
      console.error(chalk.red(`\nError: ${error.message}`));

      if (error.message.includes('Invalid API key')) {
        console.log(chalk.yellow('\nTip: Use your WorkOS API key (sk_xxx).'));
        console.log(chalk.yellow('     Find it at: WorkOS Dashboard > API Keys'));
      }
    }

    const finalized = finalizeReport(report);
    if (options.output) {
      const reportPath = `${options.output}/migration-report-workos.json`;
      await saveReport(finalized, reportPath);
      console.log(chalk.gray(`\nPartial report saved to ${reportPath}`));
    }

    throw error;
  }
}

// ============================================
// Helpers
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
