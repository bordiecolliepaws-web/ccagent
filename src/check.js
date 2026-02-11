import path from 'node:path';
import { runAgent } from './agent.js';
import {
  assertAgentName,
  extractJson,
  loadConstitution,
  runCommand,
  shortText,
} from './utils.js';

function ensureGitRepo(workdir) {
  const result = runCommand('git', ['rev-parse', '--is-inside-work-tree'], {
    cwd: workdir,
    allowFailure: true,
  });

  if (result.status !== 0 || result.stdout.trim() !== 'true') {
    throw new Error('Current directory is not a git repository');
  }
}

function getDiffPayload(workdir) {
  const staged = runCommand('git', ['diff', '--cached'], {
    cwd: workdir,
    allowFailure: true,
  });
  if (staged.stdout.trim()) {
    return { diff: staged.stdout, source: 'staged changes' };
  }

  const working = runCommand('git', ['diff'], {
    cwd: workdir,
    allowFailure: true,
  });
  if (working.stdout.trim()) {
    return { diff: working.stdout, source: 'working tree changes' };
  }

  const latestCommit = runCommand('git', ['show', '--format=', '--patch', '-1'], {
    cwd: workdir,
    allowFailure: true,
  });
  if (latestCommit.stdout.trim()) {
    return { diff: latestCommit.stdout, source: 'latest commit' };
  }

  return { diff: '', source: 'no changes detected' };
}

function buildCheckPrompt({ constitutionText, diff, source }) {
  return [
    'You are the constitutional validator for a coding project.',
    'Given the constitution and git diff, determine if the diff violates principles or invariants.',
    '',
    `Diff source: ${source}`,
    '',
    'Return ONLY strict JSON with this shape:',
    '{',
    '  "result": "PASS" | "FAIL",',
    '  "reasoning": ["short reason", "..."],',
    '  "violations": [',
    '    {',
    '      "reference": "L1/L2/invariant reference",',
    '      "explanation": "why violated"',
    '    }',
    '  ],',
    '  "amendment_suggestion": "optional suggestion or empty string"',
    '}',
    '',
    'Constitution:',
    constitutionText,
    '',
    'Diff:',
    diff || '(empty diff)',
  ].join('\n');
}

function normalizeValidation(raw) {
  const result = raw && typeof raw === 'object' ? raw : {};
  const status = (result.result || '').toString().trim().toUpperCase();
  const pass = status === 'PASS';

  return {
    pass,
    result: pass ? 'PASS' : 'FAIL',
    reasoning: Array.isArray(result.reasoning) ? result.reasoning : [],
    violations: Array.isArray(result.violations) ? result.violations : [],
    amendmentSuggestion:
      typeof result.amendment_suggestion === 'string'
        ? result.amendment_suggestion
        : '',
  };
}

function printResult(validation, source) {
  const status = validation.pass ? 'PASS' : 'FAIL';
  console.log(`${status} (${source})`);

  if (validation.reasoning.length) {
    console.log('Reasoning:');
    validation.reasoning.forEach((reason, idx) => {
      console.log(`  ${idx + 1}. ${shortText(reason, 260)}`);
    });
  }

  if (validation.violations.length) {
    console.log('Violations:');
    validation.violations.forEach((violation, idx) => {
      const reference = violation.reference || 'unknown reference';
      const explanation = violation.explanation || 'no explanation provided';
      console.log(`  ${idx + 1}. ${reference}: ${shortText(explanation, 260)}`);
    });
  }

  if (validation.amendmentSuggestion) {
    console.log(`Amendment suggestion: ${shortText(validation.amendmentSuggestion, 260)}`);
  }
}

export async function checkConstitution(options = {}) {
  const {
    agent = 'codex',
    workdir = process.cwd(),
    quiet = false,
    constitutionDir = path.join(workdir, 'constitution'),
  } = options;

  assertAgentName(agent);
  ensureGitRepo(workdir);

  const constitutionText = await loadConstitution(constitutionDir);
  const { diff, source } = getDiffPayload(workdir);

  if (!diff.trim()) {
    const emptyResult = {
      pass: true,
      result: 'PASS',
      reasoning: ['No diff found to validate.'],
      violations: [],
      amendmentSuggestion: '',
      source,
    };
    if (!quiet) {
      printResult(emptyResult, source);
    }
    return emptyResult;
  }

  const prompt = buildCheckPrompt({
    constitutionText,
    diff,
    source,
  });

  const raw = await runAgent(prompt, {
    agent,
    workdir,
    autoApprove: true,
  });

  const validation = normalizeValidation(extractJson(raw));
  const result = {
    ...validation,
    source,
  };

  if (!quiet) {
    printResult(result, source);
  }

  return result;
}

export async function runCheckCommand(options = {}) {
  const result = await checkConstitution(options);
  return result;
}
