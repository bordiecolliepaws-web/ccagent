# Agent Integration Guide

## Overview

ccagent works with any AI coding agent that reads instruction files. Here's how to wire it in.

## Codex / Claude Code

Add to your `AGENTS.md`:

```markdown
## Constitutional Coding

This project uses ccagent for design intent preservation.

Before modifying any code:
1. Read `constitution/CONSTITUTION.md` and `constitution/invariants.md`
2. For module-specific changes, read `constitution/modules/{module}.md` if it exists
3. Check your proposed changes against the principles and invariants
4. If your change conflicts with the constitution:
   a. STOP — do not proceed with the conflicting change
   b. Create an amendment proposal in `constitution/amendments/`
   c. Explain why the constitution should change
   d. Wait for human approval before proceeding
5. After completing changes, update relevant constitution docs if the design evolved

Never silently violate the constitution. Always amend first.
```

## Cursor

Add to `.cursorrules`:

```
Read constitution/CONSTITUTION.md before making architectural changes.
Check constitution/invariants.md — never violate these without an amendment.
If your change conflicts with design intent, propose an amendment first.
```

## Any Agent

The pattern is simple:
1. Make the constitution files discoverable (standard location: `constitution/`)
2. Add instructions to the agent's config to read them
3. Define the amendment workflow (how does the agent propose changes?)

## The Check Step

For automated validation, you can add a pre-commit hook or CI step:

```bash
# Simple: just remind the developer/agent
echo "Did you check your changes against constitution/CONSTITUTION.md?"

# Advanced: use an LLM to validate
# (see scripts/check.sh for an example)
```

## Tips

- **Start small.** 3-5 principles max. Too many and agents ignore them.
- **Be specific.** "Keep it clean" is useless. "All functions under 50 lines" is actionable.
- **Update regularly.** A stale constitution is worse than none — it teaches agents to ignore instructions.
- **Module-level intent matters.** The overall constitution is for architecture; module docs are for implementation intent.
