/**
 * Migration Report - Generate, save, and display migration reports
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import chalk from 'chalk';
import type {
  MigrationReport,
  MigrationAgent,
  MigrationRegistrationResult,
} from '../types.js';

/**
 * Create an empty migration report
 */
export function createEmptyReport(
  source: MigrationReport['source'],
  dryRun: boolean
): MigrationReport {
  return {
    source,
    startedAt: new Date().toISOString(),
    completedAt: '',
    dryRun,
    summary: {
      totalAgents: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      unmappedPermissions: [],
    },
    agents: [],
    credentials: [],
  };
}

/**
 * Finalize the report with completion time and recalculated summary
 */
export function finalizeReport(report: MigrationReport): MigrationReport {
  report.completedAt = new Date().toISOString();

  report.summary.totalAgents = report.agents.length;
  report.summary.successful = report.agents.filter(a => a.success).length;
  report.summary.failed = report.agents.filter(a => !a.success && a.error).length;
  report.summary.skipped = report.agents.filter(
    a => !a.success && !a.error
  ).length;

  // Collect all unmapped permissions
  const unmapped = new Set<string>();
  for (const result of report.agents) {
    for (const perm of result.agent.unmappedPermissions) {
      unmapped.add(perm);
    }
  }
  report.summary.unmappedPermissions = Array.from(unmapped);

  return report;
}

/**
 * Save the migration report as JSON
 */
export async function saveReport(
  report: MigrationReport,
  outputPath: string
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * Save credentials to a separate file with restricted permissions
 */
export async function saveCredentials(
  report: MigrationReport,
  outputDir: string
): Promise<string> {
  const credentialsPath = `${outputDir}/migration-credentials.json`;
  await mkdir(outputDir, { recursive: true });

  const credentialData = {
    source: report.source,
    migratedAt: report.completedAt,
    agents: report.credentials,
  };

  await writeFile(credentialsPath, JSON.stringify(credentialData, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });

  return credentialsPath;
}

/**
 * Print a dry-run preview table to stdout
 */
export function printDryRunPreview(agents: MigrationAgent[]): void {
  console.log(chalk.cyan('\n━━━ Dry Run Preview ━━━\n'));
  console.log(chalk.gray(`Found ${agents.length} agent(s) to migrate:\n`));

  for (const agent of agents) {
    console.log(chalk.white(`  ${agent.name}`));
    console.log(chalk.gray(`    Source ID: ${agent.sourceId}`));
    console.log(chalk.gray(`    Email:     ${agent.email}`));

    if (agent.mappedPermissions.length > 0) {
      console.log(chalk.green(`    Mapped:    ${agent.mappedPermissions.join(', ')}`));
    }

    if (agent.unmappedPermissions.length > 0) {
      console.log(chalk.yellow(`    Unmapped:  ${agent.unmappedPermissions.join(', ')}`));
    }

    if (agent.sourcePermissions.length === 0) {
      console.log(chalk.gray(`    Permissions: (none)`));
    }

    console.log();
  }

  if (agents.some(a => a.unmappedPermissions.length > 0)) {
    const allUnmapped = new Set(agents.flatMap(a => a.unmappedPermissions));
    console.log(chalk.yellow(`  ⚠  ${allUnmapped.size} unmapped permission(s) found.`));
    console.log(chalk.yellow(`     Run without --dry-run to resolve interactively.\n`));
  }
}

/**
 * Print the post-migration summary
 */
export function printMigrationSummary(report: MigrationReport): void {
  console.log(chalk.cyan('\n━━━ Migration Summary ━━━\n'));
  console.log(chalk.white(`  Source:     ${report.source}`));
  console.log(chalk.white(`  Started:    ${report.startedAt}`));
  console.log(chalk.white(`  Completed:  ${report.completedAt}`));
  console.log(chalk.white(`  Dry Run:    ${report.dryRun}`));
  console.log();
  console.log(chalk.white(`  Total:      ${report.summary.totalAgents}`));
  console.log(chalk.green(`  Successful: ${report.summary.successful}`));

  if (report.summary.failed > 0) {
    console.log(chalk.red(`  Failed:     ${report.summary.failed}`));
  }

  if (report.summary.skipped > 0) {
    console.log(chalk.yellow(`  Skipped:    ${report.summary.skipped}`));
  }

  if (report.summary.unmappedPermissions.length > 0) {
    console.log(chalk.yellow(`\n  Unmapped permissions:`));
    for (const perm of report.summary.unmappedPermissions) {
      console.log(chalk.yellow(`    - ${perm}`));
    }
  }

  // Show failed agents
  const failed = report.agents.filter(a => !a.success && a.error);
  if (failed.length > 0) {
    console.log(chalk.red(`\n  Failed agents:`));
    for (const result of failed) {
      console.log(chalk.red(`    - ${result.agent.name}: ${result.error}`));
    }
  }

  console.log();
}

/**
 * Add a registration result to the report and update credentials if successful
 */
export function addResult(
  report: MigrationReport,
  result: MigrationRegistrationResult
): void {
  report.agents.push(result);

  if (result.success && result.agentId && result.apiKey) {
    report.credentials.push({
      name: result.agent.name,
      agentId: result.agentId,
      apiKey: result.apiKey,
    });
  }
}
