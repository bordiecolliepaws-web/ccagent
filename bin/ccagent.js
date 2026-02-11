#!/usr/bin/env node

let Command;
try {
  ({ Command } = await import('commander'));
} catch {
  ({ Command } = await import('../src/mini-commander.js'));
}
import { runInit } from '../src/init.js';
import { runBuild } from '../src/build.js';
import { runCheckCommand } from '../src/check.js';

function normalizeAgent(agent) {
  return (agent || 'codex').trim().toLowerCase();
}

function parseIterations(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('iterations must be a positive integer');
  }
  return parsed;
}

const program = new Command();

program
  .name('ccagent')
  .description('Constitutional Coding for AI Agents')
  .version('0.1.0');

program
  .command('init')
  .description('Loop 1: generate and lock constitution + PRD from natural language intent')
  .argument('<description...>', 'project description')
  .option('--agent <agent>', 'agent to use: codex | claude', 'codex')
  .option('--yes', 'lock the first draft without interactive steering', false)
  .option('--force', 'replace existing constitution/ and prd.json', false)
  .action(async (descriptionParts, options) => {
    const description = Array.isArray(descriptionParts)
      ? descriptionParts.join(' ')
      : String(descriptionParts || '');

    await runInit(description, {
      agent: normalizeAgent(options.agent),
      yes: options.yes,
      force: options.force,
    });
  });

program
  .command('build')
  .description('Loop 2: run Ralph-style story implementation with constitutional checks')
  .option('--agent <agent>', 'agent to use: codex | claude', 'codex')
  .option('--iterations <number>', 'maximum loop iterations', parseIterations, 10)
  .action(async (options) => {
    await runBuild({
      agent: normalizeAgent(options.agent),
      iterations: options.iterations,
    });
  });

program
  .command('check')
  .description('Validate the latest git diff against constitution rules')
  .option('--agent <agent>', 'agent to use: codex | claude', 'codex')
  .action(async (options) => {
    const result = await runCheckCommand({
      agent: normalizeAgent(options.agent),
    });

    process.exitCode = result.pass ? 0 : 1;
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
