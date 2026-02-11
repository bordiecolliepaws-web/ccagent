import { runCommand, assertAgentName } from './utils.js';

function buildAgentCommand(prompt, options = {}) {
  const { agent = 'codex', autoApprove = true } = options;
  assertAgentName(agent);

  if (agent === 'codex') {
    const args = ['exec'];
    if (autoApprove) {
      args.push('--full-auto');
    }
    args.push(prompt);
    return { command: 'codex', args };
  }

  const args = ['-p', prompt];
  if (autoApprove) {
    args.push('--dangerously-skip-permissions');
  }
  return { command: 'claude', args };
}

export async function runAgent(prompt, options = {}) {
  if (!prompt || !prompt.trim()) {
    throw new Error('Agent prompt cannot be empty');
  }

  const { workdir = process.cwd() } = options;
  const { command, args } = buildAgentCommand(prompt, options);

  const result = runCommand(command, args, {
    cwd: workdir,
    allowFailure: true,
  });

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || 'Unknown agent failure';
    throw new Error(`${command} failed (${result.status}): ${detail}`);
  }

  const output = result.stdout.trim() || result.stderr.trim();
  if (!output) {
    throw new Error(`${command} returned no output`);
  }

  return output;
}
