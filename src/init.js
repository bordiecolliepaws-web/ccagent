import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { runAgent } from './agent.js';
import {
  appendProgress,
  assertAgentName,
  extractJson,
  fileExists,
  hasApprovalPhrase,
  sanitizeRelativePath,
  shortText,
  timestamp,
  writeJson,
  writeText,
} from './utils.js';

const REQUIRED_FILES = [
  'constitution/CONSTITUTION.md',
  'constitution/invariants.md',
  'constitution/architecture.md',
  'constitution/conventions.md',
];

function buildInitPrompt({ description, feedback, previousDraft }) {
  const previousText = previousDraft
    ? `\nCurrent draft to revise:\n${JSON.stringify(previousDraft, null, 2)}\n`
    : '';

  const feedbackText = feedback
    ? `\nUser steering instructions:\n${feedback}\n`
    : '\nNo additional steering yet. Produce your best first draft.\n';

  return [
    'You are generating a Constitutional Coding project design package.',
    '',
    `Project intent: ${description}`,
    previousText,
    feedbackText,
    'Requirements:',
    '- Generate all four levels (L1-L4).',
    '- L1 principles and L2 objectives must be concise and reviewable.',
    '- L3 and L4 details should be auto-decided by you and reflected in files.',
    '- Return actual file contents, not summaries.',
    '- Keep output grounded in practical implementation choices.',
    '',
    'Return ONLY strict JSON (no markdown, no commentary) with this shape:',
    '{',
    '  "review": {',
    '    "l1_principles": ["..."],',
    '    "l2_objectives": ["..."]',
    '  },',
    '  "files": {',
    '    "constitution/CONSTITUTION.md": "...",',
    '    "constitution/invariants.md": "...",',
    '    "constitution/architecture.md": "...",',
    '    "constitution/conventions.md": "..."',
    '  },',
    '  "prd": {',
    '    "stories": [',
    '      {',
    '        "id": 1,',
    '        "title": "...",',
    '        "description": "...",',
    '        "acceptance": ["..."],',
    '        "constitutional_refs": ["..."],',
    '        "priority": 1,',
    '        "passes": false',
    '      }',
    '    ]',
    '  }',
    '}',
  ].join('\n');
}

function normalizeStories(stories = []) {
  return stories.map((story, index) => ({
    id: story.id ?? index + 1,
    title: story.title || `Story ${index + 1}`,
    description: story.description || '',
    acceptance: Array.isArray(story.acceptance) ? story.acceptance : [],
    constitutional_refs: Array.isArray(story.constitutional_refs)
      ? story.constitutional_refs
      : [],
    priority: Number.isFinite(story.priority) ? story.priority : index + 1,
    passes: Boolean(story.passes),
  }));
}

function normalizeDraft(rawDraft) {
  const draft = rawDraft && typeof rawDraft === 'object' ? rawDraft : {};
  const review = draft.review && typeof draft.review === 'object' ? draft.review : {};
  const files = draft.files && typeof draft.files === 'object' ? draft.files : {};
  const prdSource = draft.prd && typeof draft.prd === 'object' ? draft.prd : {};
  const stories = Array.isArray(prdSource.stories) ? prdSource.stories : [];

  return {
    review: {
      l1_principles: Array.isArray(review.l1_principles) ? review.l1_principles : [],
      l2_objectives: Array.isArray(review.l2_objectives) ? review.l2_objectives : [],
    },
    files,
    prd: {
      ...prdSource,
      stories: normalizeStories(stories),
    },
  };
}

function validateDraft(draft) {
  if (!draft.review.l1_principles.length) {
    throw new Error('Init draft missing review.l1_principles');
  }

  if (!draft.review.l2_objectives.length) {
    throw new Error('Init draft missing review.l2_objectives');
  }

  for (const filePath of REQUIRED_FILES) {
    if (!draft.files[filePath] || typeof draft.files[filePath] !== 'string') {
      throw new Error(`Init draft missing file content: ${filePath}`);
    }
  }

  if (!Array.isArray(draft.prd.stories) || draft.prd.stories.length === 0) {
    throw new Error('Init draft missing prd stories');
  }
}

function printHierarchy(review, iteration) {
  console.log('');
  console.log(`Draft ${iteration}: L1 + L2 review`);
  console.log('');
  console.log('L1 Principles:');
  review.l1_principles.forEach((principle, idx) => {
    console.log(`  ${idx + 1}. ${shortText(principle, 200)}`);
  });
  console.log('');
  console.log('L2 Objectives:');
  review.l2_objectives.forEach((objective, idx) => {
    console.log(`  ${idx + 1}. ${shortText(objective, 200)}`);
  });
  console.log('');
}

async function writeDraftFiles(workdir, draft, options = {}) {
  const { force = false } = options;
  const constitutionDir = path.join(workdir, 'constitution');
  const prdPath = path.join(workdir, 'prd.json');

  if (await fileExists(constitutionDir)) {
    if (!force) {
      throw new Error('constitution/ already exists. Re-run with --force to replace it.');
    }
    await fs.rm(constitutionDir, { recursive: true, force: true });
  }

  if (force && (await fileExists(prdPath))) {
    await fs.rm(prdPath, { force: true });
  }

  if (!force && (await fileExists(prdPath))) {
    throw new Error('prd.json already exists. Re-run with --force to replace it.');
  }

  for (const [relativePath, content] of Object.entries(draft.files)) {
    const safeRelativePath = sanitizeRelativePath(relativePath);
    const destination = path.join(workdir, safeRelativePath);
    const fileText = content.endsWith('\n') ? content : `${content}\n`;
    await writeText(destination, fileText);
  }

  await writeJson(prdPath, {
    ...(draft.prd || {}),
    stories: draft.prd.stories,
  });

  const progressPath = path.join(workdir, 'progress.txt');
  if (!(await fileExists(progressPath))) {
    await writeText(progressPath, '# ccagent build progress\n');
  }

  await appendProgress(
    progressPath,
    `[${timestamp()}] constitution locked from ccagent init (${draft.prd.stories.length} stories)`
  );
}

export async function runInit(description, options = {}) {
  const {
    agent = 'codex',
    workdir = process.cwd(),
    yes = false,
    force = false,
  } = options;

  assertAgentName(agent);

  const cleanDescription = (description || '').trim();
  if (!cleanDescription) {
    throw new Error('Description is required: ccagent init "<description>"');
  }

  const interactive = !yes && Boolean(stdin.isTTY && stdout.isTTY);
  const rl = interactive
    ? readline.createInterface({ input: stdin, output: stdout })
    : null;

  let feedback = '';
  let draft = null;

  try {
    let iteration = 0;
    while (true) {
      iteration += 1;
      console.log(`Generating draft ${iteration} with ${agent}...`);

      const prompt = buildInitPrompt({
        description: cleanDescription,
        feedback,
        previousDraft: draft,
      });

      const raw = await runAgent(prompt, {
        agent,
        workdir,
        autoApprove: true,
      });

      draft = normalizeDraft(extractJson(raw));
      validateDraft(draft);
      printHierarchy(draft.review, iteration);

      if (!interactive) {
        console.log('Non-interactive mode detected; locking first draft.');
        break;
      }

      const response = await rl.question(
        'Enter steering feedback, or type "build it" / "looks good" to lock: '
      );

      if (hasApprovalPhrase(response)) {
        break;
      }

      feedback = response.trim() || 'Refine clarity and strengthen invariants.';
    }
  } finally {
    rl?.close();
  }

  await writeDraftFiles(workdir, draft, { force });

  console.log('');
  console.log('Constitution locked and written to:');
  console.log('  - constitution/CONSTITUTION.md');
  console.log('  - constitution/invariants.md');
  console.log('  - constitution/architecture.md');
  console.log('  - constitution/conventions.md');
  console.log('  - prd.json');
}
