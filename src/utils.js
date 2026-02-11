import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const MAX_BUFFER = 1024 * 1024 * 20;

export function timestamp() {
  return new Date().toISOString();
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJson(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

export async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

export async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
}

export function runCommand(command, args = [], options = {}) {
  const {
    cwd = process.cwd(),
    env,
    stdio = 'pipe',
    allowFailure = false,
  } = options;

  const result = spawnSync(command, args, {
    cwd,
    env: env ? { ...process.env, ...env } : process.env,
    encoding: 'utf8',
    stdio,
    maxBuffer: MAX_BUFFER,
  });

  if (result.error && (result.status === null || result.status === undefined)) {
    throw result.error;
  }

  const status = result.status ?? 1;
  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';

  if (!allowFailure && status !== 0) {
    const details = [
      `Command failed: ${command} ${args.join(' ')}`,
      `Exit code: ${status}`,
      stderr.trim() || stdout.trim(),
    ]
      .filter(Boolean)
      .join('\n');
    throw new Error(details);
  }

  return { status, stdout, stderr };
}

function extractBalancedJson(text, openChar, closeChar) {
  const start = text.indexOf(openChar);
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === openChar) {
      depth += 1;
      continue;
    }

    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function extractJson(text) {
  if (typeof text !== 'string') {
    throw new Error('Expected string output when extracting JSON');
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [];

  if (fencedMatch && fencedMatch[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const trimmed = text.trim();
  if (trimmed) {
    candidates.push(trimmed);
  }

  const objectCandidate = extractBalancedJson(text, '{', '}');
  if (objectCandidate) {
    candidates.push(objectCandidate);
  }

  const arrayCandidate = extractBalancedJson(text, '[', ']');
  if (arrayCandidate) {
    candidates.push(arrayCandidate);
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new Error('Unable to parse JSON from agent output');
}

async function walkFiles(rootDir, baseDir = rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const sorted = entries.sort((a, b) => a.name.localeCompare(b.name));

  const files = [];
  for (const entry of sorted) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      const nested = await walkFiles(fullPath, baseDir);
      files.push(...nested);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const relativePath = path.relative(baseDir, fullPath);
    files.push({ fullPath, relativePath });
  }

  return files;
}

export async function loadConstitution(constitutionDir) {
  if (!(await fileExists(constitutionDir))) {
    throw new Error(`Missing constitution directory: ${constitutionDir}`);
  }

  const files = await walkFiles(constitutionDir);
  const textFiles = files.filter((file) => !file.relativePath.endsWith('.png'));

  const sections = [];
  for (const file of textFiles) {
    const content = await fs.readFile(file.fullPath, 'utf8');
    sections.push(`### ${file.relativePath}\n\n${content.trim()}`);
  }

  return sections.join('\n\n');
}

export function sanitizeRelativePath(relativePath) {
  const normalized = path.normalize(relativePath).replace(/^([/\\])+/, '');
  if (!normalized || normalized === '.' || normalized.startsWith('..')) {
    throw new Error(`Invalid relative path: ${relativePath}`);
  }
  return normalized;
}

export async function loadPrd(prdPath) {
  const raw = await readJson(prdPath);

  if (Array.isArray(raw)) {
    return {
      format: 'array',
      raw,
      stories: raw,
    };
  }

  if (raw && typeof raw === 'object' && Array.isArray(raw.stories)) {
    return {
      format: 'object',
      raw,
      stories: raw.stories,
    };
  }

  throw new Error('Invalid prd.json format: expected an array or object with a stories array');
}

export async function savePrd(prdPath, prdBundle) {
  if (prdBundle.format === 'array') {
    await writeJson(prdPath, prdBundle.stories);
    return;
  }

  const next = {
    ...prdBundle.raw,
    stories: prdBundle.stories,
  };
  await writeJson(prdPath, next);
}

export async function appendProgress(progressPath, line) {
  await ensureDir(path.dirname(progressPath));
  await fs.appendFile(progressPath, `${line}\n`, 'utf8');
}

export async function readProgressTail(progressPath, maxLines = 80) {
  if (!(await fileExists(progressPath))) {
    return '';
  }

  const text = await fs.readFile(progressPath, 'utf8');
  const lines = text.split('\n').filter(Boolean);
  return lines.slice(-maxLines).join('\n');
}

export function isAgentName(agent) {
  return agent === 'codex' || agent === 'claude';
}

export function assertAgentName(agent) {
  if (!isAgentName(agent)) {
    throw new Error(`Unsupported agent: ${agent}. Use \"codex\" or \"claude\".`);
  }
}

export function toPositiveInteger(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return defaultValue;
  }
  return parsed;
}

export function hasApprovalPhrase(input) {
  if (!input) {
    return false;
  }
  const normalized = input.trim().toLowerCase();
  return (
    normalized.includes('looks good') ||
    normalized.includes('build it') ||
    normalized.includes('approved') ||
    normalized === 'approve' ||
    normalized === 'ok'
  );
}

export function safeTitle(title, fallback = 'story') {
  if (!title || typeof title !== 'string') {
    return fallback;
  }
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || fallback;
}

export function shortText(text, length = 160) {
  const value = (text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= length) {
    return value;
  }
  return `${value.slice(0, length - 3)}...`;
}
