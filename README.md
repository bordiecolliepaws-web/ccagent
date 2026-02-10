# ccagent

**Constitutional Coding for AI Agents** — a design intent preservation framework.

## Problem

AI coding agents (Codex, Claude Code, Cursor, etc.) are great at writing code but terrible at preserving *why* code was written that way. They'll refactor your carefully designed abstraction into spaghetti because they optimized for the immediate task, not the architecture.

## Solution

Give your codebase a **constitution** — a living document that captures design intent, invariants, and architectural decisions. Agents read it before changing code, check alignment, and propose amendments when they need to evolve the design.

## How It Works

```
1. INIT     → Create a constitution for your project
2. READ     → Agent reads constitution before any change
3. CHECK    → Validate proposed changes against principles
4. AMEND    → If design needs to evolve, propose an amendment
5. COMMIT   → Changes + constitution updates ship together
```

## Quick Start

```bash
# Add ccagent to your project
cp -r templates/constitution/ your-project/constitution/

# Or use the init script
./scripts/init.sh /path/to/your-project
```

Then add to your agent's instructions (AGENTS.md, .cursorrules, etc.):
```
Before modifying code, read constitution/CONSTITUTION.md.
Check your changes against the principles and invariants.
If your change conflicts with the constitution, propose an amendment before proceeding.
```

## Constitution Structure

```
constitution/
├── CONSTITUTION.md      # Core principles & architectural vision
├── invariants.md        # Things that must NEVER be violated
├── modules/             # Per-module design intent
│   └── {module}.md
├── decisions/           # Architectural Decision Records (ADRs)
│   └── 001-{title}.md
└── amendments/          # Proposed & accepted changes to the constitution
    └── 001-{title}.md
```

## For Agent Developers

See [docs/agent-integration.md](docs/agent-integration.md) for how to wire ccagent into your coding agent's workflow.

## Philosophy

Code tells you *what*. Comments tell you *how*. A constitution tells you ***why*** — and keeps agents accountable to that intent.

## License

MIT
