# Philosophy

## The Problem

Code has three layers of meaning:
- **What** — the syntax, the logic (the code itself)
- **How** — implementation approach (comments, docs)
- **Why** — design intent, architectural vision (usually... nowhere)

The "why" lives in people's heads. When an AI agent refactors your code, it can read the what and sometimes the how. But the why? Gone. The agent optimizes locally, breaking global design intent.

## The Insight

Constitutional governance solves this in politics: write down the core principles, make them hard to change, require explicit process to amend them. The same pattern works for codebases.

A constitution doesn't prevent change — it ensures change is *intentional*.

## The Framework

**Constitutional Coding** means:

1. **Capture intent explicitly.** Don't let design rationale live only in your head.
2. **Make agents accountable.** They must read and respect the constitution.
3. **Enable evolution.** The constitution changes through amendments, not silent drift.
4. **Preserve history.** Every architectural decision and amendment is recorded.

## Why Not Just Comments?

Comments explain *how*. They live next to code and get stale when code changes.

A constitution explains *why* at the architectural level. It's separate from code, reviewed deliberately, and amended explicitly. It's the difference between a post-it note and a legal document.

## The Recursive Property

ccagent is designed to be used to build itself. The framework has its own constitution. This isn't just dogfooding — it's proof that the pattern works at every level.
