import path from 'node:path';
import { runAgent } from './agent.js';
import { checkConstitution } from './check.js';
import {
  appendProgress,
  assertAgentName,
  fileExists,
  loadConstitution,
  loadPrd,
  readProgressTail,
  runCommand,
  safeTitle,
  savePrd,
  shortText,
  timestamp,
  toPositiveInteger,
  writeText,
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

function ensureCleanWorkingTree(workdir) {
  const result = runCommand('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: workdir,
    allowFailure: true,
  });

  if (result.stdout.trim()) {
    throw new Error(
      'Build requires a clean git worktree (including untracked files). Commit, stash, or remove local changes first.'
    );
  }
}

function hasWorktreeChanges(workdir) {
  const result = runCommand('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: workdir,
    allowFailure: true,
  });

  return Boolean(result.stdout.trim());
}

function revertIteration(workdir) {
  runCommand('git', ['reset', '--hard', 'HEAD'], { cwd: workdir });
  runCommand('git', ['clean', '-fd'], { cwd: workdir });
}

function storyPriority(story, fallback) {
  if (Number.isFinite(story.priority)) {
    return story.priority;
  }
  return fallback;
}

function getNextStory(stories) {
  const remaining = stories.filter((story) => !story.passes);
  if (!remaining.length) {
    return null;
  }

  remaining.sort((a, b) => {
    const pA = storyPriority(a, Number.MAX_SAFE_INTEGER);
    const pB = storyPriority(b, Number.MAX_SAFE_INTEGER);
    if (pA !== pB) {
      return pA - pB;
    }

    const idA = Number.isFinite(a.id) ? a.id : Number.MAX_SAFE_INTEGER;
    const idB = Number.isFinite(b.id) ? b.id : Number.MAX_SAFE_INTEGER;
    return idA - idB;
  });

  return remaining[0];
}

function buildStoryPrompt({ story, constitutionText, prdJson, progressText }) {
  const refs = Array.isArray(story.constitutional_refs)
    ? story.constitutional_refs.join(', ')
    : '';

  const acceptance = Array.isArray(story.acceptance)
    ? story.acceptance.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
    : '';

  return [
    'You are implementing a single story in a constitutional coding loop.',
    'You must follow the constitution and invariants strictly.',
    '',
    'Task:',
    `- Story ID: ${story.id}`,
    `- Title: ${story.title}`,
    `- Description: ${story.description || '(none)'}`,
    `- Constitutional refs: ${refs || '(none)'}`,
    '- Acceptance criteria:',
    acceptance || '(none)',
    '',
    'Rules:',
    '- Implement only this story.',
    '- Make the smallest complete set of code changes needed.',
    '- Run available checks/tests if relevant.',
    '- Do not commit any changes.',
    '- Do not modify prd.json or progress.txt directly.',
    '- Stop when implementation is complete and report what changed.',
    '',
    'Constitution:',
    constitutionText,
    '',
    'PRD snapshot:',
    prdJson,
    '',
    'Recent progress:',
    progressText || '(none yet)',
  ].join('\n');
}

async function flushProgress(progressPath, lines) {
  if (!lines.length) {
    return;
  }

  for (const line of lines) {
    await appendProgress(progressPath, line);
  }

  lines.length = 0;
}

function commitMessageForStory(story) {
  return `ccagent: complete story ${story.id} ${safeTitle(story.title)}`;
}

export async function runBuild(options = {}) {
  const {
    agent = 'codex',
    iterations = 10,
    workdir = process.cwd(),
  } = options;

  assertAgentName(agent);

  const maxIterations = toPositiveInteger(iterations, 10);
  const constitutionDir = path.join(workdir, 'constitution');
  const prdPath = path.join(workdir, 'prd.json');
  const progressPath = path.join(workdir, 'progress.txt');

  ensureGitRepo(workdir);
  ensureCleanWorkingTree(workdir);

  if (!(await fileExists(constitutionDir))) {
    throw new Error('Missing constitution/ directory. Run `ccagent init` first.');
  }

  if (!(await fileExists(prdPath))) {
    throw new Error('Missing prd.json. Run `ccagent init` first.');
  }

  if (!(await fileExists(progressPath))) {
    await writeText(progressPath, '# ccagent build progress\n');
  }

  const constitutionText = await loadConstitution(constitutionDir);
  const prdBundle = await loadPrd(prdPath);
  const runtimeProgressBuffer = [];

  let completedStories = prdBundle.stories.filter((story) => story.passes).length;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const story = getNextStory(prdBundle.stories);
    if (!story) {
      break;
    }

    const startLine = `[${timestamp()}] iteration ${iteration}: start story ${story.id} (${story.title})`;
    runtimeProgressBuffer.push(startLine);

    console.log(
      `Iteration ${iteration}/${maxIterations}: story ${story.id} - ${shortText(story.title, 120)}`
    );

    const persistedProgress = await readProgressTail(progressPath, 80);
    const runtimeProgress = runtimeProgressBuffer.join('\n');
    const progressText = [persistedProgress, runtimeProgress].filter(Boolean).join('\n');

    const prompt = buildStoryPrompt({
      story,
      constitutionText,
      prdJson: JSON.stringify(
        prdBundle.format === 'array'
          ? prdBundle.stories
          : { ...prdBundle.raw, stories: prdBundle.stories },
        null,
        2
      ),
      progressText,
    });

    try {
      await runAgent(prompt, {
        agent,
        workdir,
        autoApprove: true,
      });
    } catch (error) {
      runtimeProgressBuffer.push(
        `[${timestamp()}] iteration ${iteration}: agent execution failed (${shortText(
          error.message,
          300
        )})`
      );
      revertIteration(workdir);
      console.log(`Iteration ${iteration}: agent execution failed, retrying.`);
      continue;
    }

    if (!hasWorktreeChanges(workdir)) {
      runtimeProgressBuffer.push(
        `[${timestamp()}] iteration ${iteration}: no code changes produced for story ${story.id}`
      );
      console.log(`Iteration ${iteration}: no changes produced, retrying story ${story.id}.`);
      continue;
    }

    let validation;
    try {
      validation = await checkConstitution({
        agent,
        workdir,
        quiet: true,
      });
    } catch (error) {
      runtimeProgressBuffer.push(
        `[${timestamp()}] iteration ${iteration}: check errored (${shortText(error.message, 300)})`
      );
      revertIteration(workdir);
      console.log(`Iteration ${iteration}: constitutional check errored, reverted.`);
      continue;
    }

    if (!validation.pass) {
      const reason = validation.reasoning[0] || 'no reason provided';
      runtimeProgressBuffer.push(
        `[${timestamp()}] iteration ${iteration}: FAIL story ${story.id} - ${shortText(reason, 280)}`
      );
      revertIteration(workdir);
      console.log(`Iteration ${iteration}: constitutional FAIL for story ${story.id}, reverted.`);
      continue;
    }

    story.passes = true;
    story.completed_at = timestamp();
    completedStories += 1;

    runtimeProgressBuffer.push(
      `[${timestamp()}] iteration ${iteration}: PASS story ${story.id} (${story.title})`
    );

    await flushProgress(progressPath, runtimeProgressBuffer);
    await savePrd(prdPath, prdBundle);

    runCommand('git', ['add', '-A'], { cwd: workdir });

    const commitMessage = commitMessageForStory(story);
    const commitResult = runCommand('git', ['commit', '-m', commitMessage], {
      cwd: workdir,
      allowFailure: true,
    });

    if (commitResult.status !== 0) {
      throw new Error(
        `Failed to commit story ${story.id}: ${commitResult.stderr.trim() || commitResult.stdout.trim()}`
      );
    }

    const commitHash = runCommand('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: workdir,
    }).stdout.trim();

    console.log(`Iteration ${iteration}: committed story ${story.id} as ${commitHash}.`);
  }

  if (runtimeProgressBuffer.length) {
    await flushProgress(progressPath, runtimeProgressBuffer);
  }

  const remaining = prdBundle.stories.filter((story) => !story.passes);

  if (remaining.length > 0) {
    await savePrd(prdPath, prdBundle);
    throw new Error(
      `Build stopped: ${remaining.length} stories incomplete after ${maxIterations} iterations.`
    );
  }

  await savePrd(prdPath, prdBundle);
  console.log(`Build complete: ${completedStories}/${prdBundle.stories.length} stories passed.`);
}
