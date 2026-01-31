/**
 * Test AgentAuth configuration with mock server
 */

import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, loadEnv } from '../utils/config.js';
import { startMockServer } from '../utils/mock-server.js';
import { TestOptions } from '../types.js';

export async function testCommand(options: TestOptions = {}): Promise<void> {
  console.log(chalk.bold.blue('\n🧪 AgentAuth Test Mode\n'));

  // Load configuration
  const config = await loadConfig();
  const env = await loadEnv();

  const agentId = options.agentId || env.AGENTAUTH_AGENT_ID || config?.agentId;
  const apiKey = options.apiKey || env.AGENTAUTH_API_KEY || config?.apiKey;
  const baseUrl = env.AGENTAUTH_BASE_URL || config?.baseUrl || 'http://localhost:3000';

  // Start mock server
  const spinner = ora('Starting mock API server...').start();
  let mockServer: { port: number; close: () => void } | null = null;

  try {
    mockServer = await startMockServer({ port: 3333 });
    spinner.succeed(chalk.green(`Mock server running on http://localhost:${mockServer.port}`));
  } catch (error) {
    spinner.fail(chalk.red('Failed to start mock server'));
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }

  const mockBaseUrl = `http://localhost:${mockServer.port}`;

  console.log(chalk.dim('\nRunning tests against mock API...\n'));

  // Test 1: Health check
  await runTest('Health Check', async () => {
    const response = await fetch(`${mockBaseUrl}/health`);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();
    if (data.status !== 'ok') throw new Error('Health check failed');
    return 'API is healthy';
  }, options.verbose);

  // Test 2: Register agent
  let testAgentId = '';
  let testApiKey = '';

  await runTest('Register Agent', async () => {
    const response = await fetch(`${mockBaseUrl}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Agent',
        owner_email: 'test@example.com',
        permissions: ['zendesk:tickets:read'],
      }),
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();

    testAgentId = data.agent.agent_id;
    testApiKey = data.credentials.api_key;

    return `Agent ID: ${testAgentId.slice(0, 15)}...`;
  }, options.verbose);

  // Test 3: Verify agent
  await runTest('Verify Agent', async () => {
    const response = await fetch(`${mockBaseUrl}/agents/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: testAgentId,
        api_key: testApiKey,
      }),
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();

    if (!data.token?.access_token) throw new Error('No access token returned');
    return `Token expires in: ${data.token.expires_in}s`;
  }, options.verbose);

  // Test 4: Get agent details
  await runTest('Get Agent Details', async () => {
    const response = await fetch(`${mockBaseUrl}/agents/${testAgentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();

    return `Agent: ${data.agent.name}, Status: ${data.agent.status}`;
  }, options.verbose);

  // Test 5: List permissions
  await runTest('List Permissions', async () => {
    const response = await fetch(`${mockBaseUrl}/permissions/list`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();

    const totalPerms = Object.values(data.permissions).reduce(
      (sum, perms) => sum + (perms as string[]).length,
      0
    );
    return `${totalPerms} permissions available`;
  }, options.verbose);

  // Cleanup
  mockServer.close();

  console.log(chalk.bold.green('\n✅ All tests passed!\n'));

  // Show configuration summary
  console.log(chalk.bold('Your configuration:'));
  console.log(chalk.dim('  Base URL:    ') + chalk.cyan(baseUrl));
  if (agentId) {
    console.log(chalk.dim('  Agent ID:    ') + chalk.cyan(agentId.slice(0, 20) + '...'));
  }
  if (apiKey) {
    console.log(chalk.dim('  API Key:     ') + chalk.cyan(apiKey.slice(0, 10) + '...'));
  }

  console.log(chalk.bold('\n📋 Next steps:\n'));
  console.log(chalk.dim('1. Validate deployment readiness:'));
  console.log(chalk.cyan('   agentauth deploy --check'));
  console.log();
  console.log(chalk.dim('2. Test against your actual API:'));
  console.log(chalk.cyan('   curl -X POST ') + baseUrl + chalk.cyan('/agents/verify \\'));
  console.log(chalk.cyan('     -H "Content-Type: application/json" \\'));
  console.log(chalk.cyan(`     -d '{"agent_id":"${agentId}","api_key":"${apiKey}"}'`));
  console.log();
}

async function runTest(
  name: string,
  testFn: () => Promise<string>,
  verbose: boolean = false
): Promise<void> {
  const spinner = ora(name).start();

  try {
    const result = await testFn();
    spinner.succeed(chalk.green(name) + chalk.dim(` - ${result}`));
  } catch (error) {
    spinner.fail(chalk.red(name));
    if (error instanceof Error && verbose) {
      console.error(chalk.red(`  Error: ${error.message}`));
    }
    throw error;
  }
}
