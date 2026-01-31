/**
 * Initialize AgentAuth in current project
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { saveConfig, generateEnvTemplate, isConfigured } from '../utils/config.js';
import { InitOptions, AgentAuthConfig } from '../types.js';

export async function initCommand(options: InitOptions = {}): Promise<void> {
  console.log(chalk.bold.blue('\n🚀 AgentAuth Setup\n'));

  // Check if already configured
  const configured = await isConfigured();
  if (configured && !options.skipPrompts) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'AgentAuth is already configured. Overwrite?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('\n✋ Setup cancelled.\n'));
      return;
    }
  }

  // Interactive prompts
  let config: AgentAuthConfig;

  if (options.skipPrompts) {
    config = {
      baseUrl: options.baseUrl || 'http://localhost:3000',
      environment: 'development',
    };
  } else {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'AgentAuth API URL:',
        default: options.baseUrl || 'http://localhost:3000',
        validate: (input: string) => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL (e.g., https://auth.yourcompany.com)';
          }
        },
      },
      {
        type: 'list',
        name: 'environment',
        message: 'Environment:',
        choices: ['development', 'staging', 'production'],
        default: 'development',
      },
      {
        type: 'confirm',
        name: 'hasCredentials',
        message: 'Do you have existing agent credentials?',
        default: false,
      },
    ]);

    config = {
      baseUrl: answers.baseUrl,
      environment: answers.environment,
    };

    // If user has credentials, prompt for them
    if (answers.hasCredentials) {
      const credentials = await inquirer.prompt([
        {
          type: 'input',
          name: 'agentId',
          message: 'Agent ID:',
          validate: (input: string) => (input.length > 0 ? true : 'Agent ID is required'),
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'API Key:',
          mask: '*',
          validate: (input: string) => (input.length > 0 ? true : 'API Key is required'),
        },
      ]);

      config.agentId = credentials.agentId;
      config.apiKey = credentials.apiKey;
    }
  }

  // Save configuration
  const spinner = ora('Creating configuration files...').start();

  try {
    await saveConfig(config);
    await generateEnvTemplate(config);
    spinner.succeed(chalk.green('Configuration files created!'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to create configuration files'));
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  // Success message with next steps
  console.log(chalk.bold.green('\n✅ AgentAuth initialized successfully!\n'));
  console.log(chalk.bold('Files created:'));
  console.log(chalk.dim('  • .agentauthrc       ') + chalk.gray('(Configuration file)'));
  console.log(chalk.dim('  • .env.agentauth     ') + chalk.gray('(Environment template)'));

  console.log(chalk.bold('\n📋 Next steps:\n'));

  if (!config.agentId || !config.apiKey) {
    console.log(chalk.dim('1. Register an agent:'));
    console.log(chalk.cyan('   curl -X POST ') + config.baseUrl + chalk.cyan('/agents/register \\'));
    console.log(chalk.cyan('     -H "Content-Type: application/json" \\'));
    console.log(chalk.cyan('     -d \'{"name":"My Agent","owner_email":"you@company.com","permissions":["zendesk:tickets:read"]}\''));
    console.log();
  }

  console.log(chalk.dim('2. Copy environment template to .env:'));
  console.log(chalk.cyan('   cp .env.agentauth .env'));
  console.log();

  console.log(chalk.dim('3. Update .env with your credentials'));
  console.log();

  console.log(chalk.dim('4. Test your configuration:'));
  console.log(chalk.cyan('   agentauth test'));
  console.log();

  console.log(chalk.dim('5. Validate before deployment:'));
  console.log(chalk.cyan('   agentauth deploy --check'));
  console.log();

  console.log(chalk.bold('📖 Documentation: ') + chalk.underline('https://docs.agentauth.dev'));
  console.log();
}
