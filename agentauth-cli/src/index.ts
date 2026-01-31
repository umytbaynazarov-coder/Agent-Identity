#!/usr/bin/env node

/**
 * AgentAuth CLI
 * Setup, test, and deploy agent authentication in minutes
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { testCommand } from './commands/test.js';
import { deployCommand } from './commands/deploy.js';
import {
  migrateAuth0Command,
  migrateJwtCommand,
  migrateClerkCommand,
  migrateWorkOSCommand,
} from './commands/migrate.js';

const program = new Command();

program
  .name('agentauth')
  .description('CLI tool for AgentAuth - Authentication for AI Agents')
  .version('0.1.0');

// Init command
program
  .command('init')
  .description('Initialize AgentAuth in your project')
  .option('-b, --base-url <url>', 'AgentAuth API base URL')
  .option('--skip-prompts', 'Skip interactive prompts and use defaults')
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Test AgentAuth configuration with mock API server')
  .option('-a, --agent-id <id>', 'Agent ID to test')
  .option('-k, --api-key <key>', 'API key to test')
  .option('-v, --verbose', 'Show detailed error messages')
  .action(async (options) => {
    try {
      await testCommand(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Test failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Deploy command
program
  .command('deploy')
  .description('Validate environment variables for deployment')
  .option('-e, --env <file>', 'Path to .env file')
  .option('-c, --check', 'Check-only mode (no deployment)')
  .action(async (options) => {
    try {
      await deployCommand(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Migrate command group
const migrate = program
  .command('migrate')
  .description('Migrate agents from external auth providers');

migrate
  .command('auth0')
  .description('Migrate agents from Auth0')
  .requiredOption('-d, --domain <domain>', 'Auth0 tenant domain (e.g., tenant.auth0.com)')
  .requiredOption('--client-id <id>', 'Auth0 M2M application client ID')
  .requiredOption('--client-secret <secret>', 'Auth0 M2M application client secret')
  .option('--dry-run', 'Preview migration without registering agents')
  .option('--mapping <path>', 'Path to custom permission mapping JSON file')
  .option('--output <path>', 'Output directory for report and credentials')
  .action(async (options) => {
    try {
      await migrateAuth0Command(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Migration failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

migrate
  .command('jwt')
  .description('Migrate agents from a JWT/JSON config file')
  .requiredOption('-c, --config <path>', 'Path to JSON config file with agents and permission mappings')
  .option('--dry-run', 'Preview migration without registering agents')
  .option('--output <path>', 'Output directory for report and credentials')
  .action(async (options) => {
    try {
      await migrateJwtCommand(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Migration failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

migrate
  .command('clerk')
  .description('Migrate agents from Clerk')
  .requiredOption('--secret-key <key>', 'Clerk secret key (sk_live_xxx or sk_test_xxx)')
  .option('--dry-run', 'Preview migration without registering agents')
  .option('--mapping <path>', 'Path to custom permission mapping JSON file')
  .option('--output <path>', 'Output directory for report and credentials')
  .action(async (options) => {
    try {
      await migrateClerkCommand(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Migration failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

migrate
  .command('workos')
  .description('Migrate agents from WorkOS')
  .requiredOption('--api-key <key>', 'WorkOS API key (sk_xxx)')
  .option('--dry-run', 'Preview migration without registering agents')
  .option('--mapping <path>', 'Path to custom permission mapping JSON file')
  .option('--output <path>', 'Output directory for report and credentials')
  .action(async (options) => {
    try {
      await migrateWorkOSCommand(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Migration failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse();
