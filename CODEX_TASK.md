# Task: Build ccagent CLI v0.1

Build a Node.js CLI tool called `ccagent` in this repo.

## What ccagent does

ccagent is a "Constitutional Coding" framework. It wraps AI coding agents (Claude Code, Codex) with a two-loop architecture:

1. **Loop 1 (Design):** Generate a constitutional hierarchy from a user's intent, refine interactively
2. **Loop 2 (Build):** Run a Ralph-style coding loop with constitutional validation

## Read First

Read `docs/design.md` for the full design document. That's the spec.

## What to Build (v0.1 — minimal)

### CLI Commands

```bash
ccagent init "<description>"    # Loop 1: Generate constitution from intent
ccagent build                   # Loop 2: Ralph loop with constitutional checks
ccagent check                   # Validate latest git diff against constitution
```

### `ccagent init "<description>"`

1. Takes a natural language project description
2. Calls the user's chosen AI agent (claude or codex) to generate:
   - `constitution/CONSTITUTION.md` — L1 principles + L2 objectives
   - `constitution/invariants.md` — hard constraints
   - `constitution/architecture.md` — L2 architectural decisions
   - `constitution/conventions.md` — L4 fine details
   - `prd.json` — stories with acceptance criteria and constitutional refs
3. Shows the L1-L2 hierarchy to the user for approval
4. User can steer ("change X", "add Y as invariant", etc.)
5. When user says "looks good" or "build it", locks the constitution

The prompt to the AI agent should instruct it to:
- Generate ALL four levels (L1-L4)
- Present L1 and L2 for human review
- Auto-decide L3 and L4
- Format output as the actual files

### `ccagent build`

1. Reads `constitution/` and `prd.json` from current directory
2. Runs a Ralph-style loop:
   - For each iteration (configurable, default 10):
     a. Spawn fresh AI agent with: constitution + prd.json + progress.txt
     b. Agent implements the next incomplete story
     c. After completion, run `ccagent check`
     d. If check passes: commit, update progress.txt, mark story done in prd.json
     e. If check fails: revert, log violation, retry
   - Stop when all stories pass or max iterations reached
3. Flags: `--agent claude|codex` (default: codex), `--iterations N` (default: 10)

### `ccagent check`

1. Reads `constitution/` directory
2. Gets the latest git diff (or diff of staged changes)
3. Calls AI agent to validate: "Does this diff violate any constitutional principles or invariants?"
4. Returns PASS/FAIL with reasoning
5. Exit code 0 for pass, 1 for fail

### Project Structure

```
ccagent/
├── bin/
│   └── ccagent.js           # CLI entry point (#!/usr/bin/env node)
├── src/
│   ├── init.js              # Loop 1: design loop
│   ├── build.js             # Loop 2: ralph loop  
│   ├── check.js             # Constitutional validation
│   ├── agent.js             # Agent abstraction (claude/codex subprocess)
│   └── utils.js             # Shared utilities
├── templates/
│   └── constitution/        # (already exists) starter templates
├── package.json             # name: ccagent, bin: ccagent
└── ...existing docs...
```

### Agent Abstraction (`src/agent.js`)

Must support both Claude Code and Codex:

```javascript
// Run a prompt through the chosen agent and return output
async function runAgent(prompt, options = {}) {
  // options.agent: 'claude' | 'codex' (default: 'codex')
  // options.workdir: working directory
  // options.autoApprove: bool (--full-auto for codex, --dangerously-skip-permissions for claude)
  
  // For codex: codex exec --full-auto "<prompt>"
  // For claude: claude -p "<prompt>" --dangerously-skip-permissions
}
```

### Key Details

- Use `commander` or `yargs` for CLI parsing
- Use `child_process.execSync` or `spawn` for running agents
- `prd.json` format: array of stories with `{id, title, description, acceptance, constitutional_refs, priority, passes}`
- `progress.txt`: append-only log of what happened each iteration
- Keep it simple! v0.1 just needs to work, not be pretty.

### package.json

```json
{
  "name": "ccagent",
  "version": "0.1.0",
  "description": "Constitutional Coding for AI Agents",
  "bin": {
    "ccagent": "./bin/ccagent.js"
  },
  "type": "module"
}
```

## Don't

- Don't use TypeScript (keep it simple for v0.1)
- Don't add tests yet
- Don't over-engineer — working > elegant
- Don't modify existing docs/ or templates/ files
