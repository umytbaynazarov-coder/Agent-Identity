/**
 * Validate environment for deployment
 */

import chalk from 'chalk';
import ora from 'ora';
import { loadEnv, loadConfig } from '../utils/config.js';
import { validateEnvironment, validateApiConnectivity } from '../utils/validator.js';
import { DeployOptions } from '../types.js';

export async function deployCommand(options: DeployOptions = {}): Promise<void> {
  console.log(chalk.bold.blue('\n🚀 AgentAuth Deployment Check\n'));

  // Load environment variables
  const spinner = ora('Loading environment...').start();
  const env = await loadEnv();
  const config = await loadConfig();

  if (Object.keys(env).length === 0 && !config) {
    spinner.fail(chalk.red('No configuration found'));
    console.log(chalk.yellow('\n⚠️  Run') + chalk.cyan(' agentauth init ') + chalk.yellow('to set up AgentAuth first.\n'));
    process.exit(1);
  }

  spinner.succeed(chalk.green('Environment loaded'));

  // Merge config into env (env takes precedence)
  const mergedEnv = {
    AGENTAUTH_BASE_URL: env.AGENTAUTH_BASE_URL || config?.baseUrl || '',
    AGENTAUTH_AGENT_ID: env.AGENTAUTH_AGENT_ID || config?.agentId || '',
    AGENTAUTH_API_KEY: env.AGENTAUTH_API_KEY || config?.apiKey || '',
    AGENTAUTH_ENVIRONMENT: env.AGENTAUTH_ENVIRONMENT || config?.environment || '',
    ...env,
  };

  // Validate environment variables
  console.log(chalk.dim('\nValidating environment variables...\n'));
  const validation = validateEnvironment(mergedEnv);

  let hasErrors = false;

  if (validation.errors.length > 0) {
    hasErrors = true;
    console.log(chalk.bold.red('❌ Errors:\n'));
    for (const error of validation.errors) {
      console.log(chalk.red(`  • ${error}`));
    }
    console.log();
  }

  if (validation.warnings.length > 0) {
    console.log(chalk.bold.yellow('⚠️  Warnings:\n'));
    for (const warning of validation.warnings) {
      console.log(chalk.yellow(`  • ${warning}`));
    }
    console.log();
  }

  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    console.log(chalk.green('  ✓ All environment variables are valid\n'));
  }

  // Check API connectivity
  if (mergedEnv.AGENTAUTH_BASE_URL && !hasErrors) {
    const connectSpinner = ora('Checking API connectivity...').start();
    const connectivity = await validateApiConnectivity(mergedEnv.AGENTAUTH_BASE_URL);

    if (connectivity.valid) {
      connectSpinner.succeed(chalk.green('API is reachable'));
    } else {
      connectSpinner.fail(chalk.red('API connectivity check failed'));
      hasErrors = true;

      console.log(chalk.red('\n  Errors:'));
      for (const error of connectivity.errors) {
        console.log(chalk.red(`    • ${error}`));
      }
      console.log();
    }

    if (connectivity.warnings.length > 0) {
      console.log(chalk.yellow('  Warnings:'));
      for (const warning of connectivity.warnings) {
        console.log(chalk.yellow(`    • ${warning}`));
      }
      console.log();
    }
  }

  // Summary
  if (hasErrors) {
    console.log(chalk.bold.red('\n❌ Deployment validation failed!\n'));
    console.log(chalk.yellow('Fix the errors above before deploying.\n'));
    process.exit(1);
  } else {
    console.log(chalk.bold.green('\n✅ Deployment validation passed!\n'));

    console.log(chalk.bold('Configuration summary:'));
    console.log(chalk.dim('  Base URL:    ') + chalk.cyan(mergedEnv.AGENTAUTH_BASE_URL));
    console.log(chalk.dim('  Agent ID:    ') + chalk.cyan(mergedEnv.AGENTAUTH_AGENT_ID?.slice(0, 20) + '...'));
    console.log(chalk.dim('  Environment: ') + chalk.cyan(mergedEnv.AGENTAUTH_ENVIRONMENT || 'not set'));

    if (!options.check) {
      console.log(chalk.bold('\n📋 Next steps:\n'));
      console.log(chalk.dim('Your application is ready to deploy with AgentAuth!'));
      console.log();
      console.log(chalk.dim('Make sure to set these environment variables in your deployment:'));
      console.log(chalk.cyan('  • AGENTAUTH_BASE_URL'));
      console.log(chalk.cyan('  • AGENTAUTH_AGENT_ID'));
      console.log(chalk.cyan('  • AGENTAUTH_API_KEY'));
      console.log();
    }

    console.log(chalk.dim('Run') + chalk.cyan(' agentauth test ') + chalk.dim('to test authentication locally.\n'));
  }
}
