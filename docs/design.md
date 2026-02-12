# Make It So — Design Document

> From intent to product in three phases: **Charter. Explore. Engage.**

## The Name

In Star Trek, Captain Picard doesn't tell his crew *how* to reroute the plasma conduits. He sets the **directive** — the mission and the principles that must not be violated. Then he says **"Make it so."**

The Make It So technique applies this to AI coding. Instead of writing a detailed PRD yourself, you define your **charter**, let the agent **explore** approaches, pick one, and say **engage**.

## The Problem

AI coding has evolved through phases:

| Phase | Flow | Problem |
|-------|------|---------|
| **Vibe coding** | command → agent codes | No design. Agent does whatever. |
| **Plan mode** | command → agent plans → codes | Plan is ephemeral, doesn't persist. |
| **Spec-driven** | human writes spec → agent codes | Human does all the design work. Exhausting. |
| **Ralph loop** | human writes PRD → loop(agent codes) | Better execution, but PRD is still human-authored. |

The common failure: either the **human is exhausted** writing detailed specs, or the **agent drifts** because there's no persistent design constraint.

## The Solution: Three Phases

```
human thoughts ──Charter──▶ CHARTER ──Explore──▶ BLUEPRINT ──Engage──▶ PRODUCT
```

```bash
makeitso charter "Build an offline-first task manager"
makeitso explore
makeitso engage
```

### Phase 0: Charter

**Human + Agent define what matters.**

The charter captures intent, constraints, and success criteria — NOT implementation details. It's what a founder would tell a CTO on day one.

**What's in the charter:**
- **Vision** — What are we building and why?
- **Core constraints** — Must-haves (offline-first, must use React, etc.)
- **Non-negotiables** — Hard invariants (zero data loss, sub-2s load, etc.)
- **Boundaries** — What it is NOT, scope limits
- **Audience** — Who is this for?
- **Success criteria** — How do we know it's done?

**How it works:**
- Human provides initial intent (natural language)
- Agent asks clarifying questions
- Back and forth until charter is locked
- Output: `charter/` directory

**Human involvement: HIGH** — this is the steering wheel.

### Phase 1: Explore

**Agent autonomously explores the design space.**

The agent takes the charter and explores multiple approaches — different architectures, tech stacks, trade-offs. It comes back with **options**, not a single answer.

**How it works:**
1. Agent reads the charter
2. Agent explores multiple directions
3. Returns 2-3 blueprint options, each with:
   - Architecture approach
   - Tech stack choices
   - Trade-off analysis
   - Rough story breakdown
4. Human picks one (or says "try again with feedback")
5. Agent refines the chosen direction into a full blueprint
6. Repeat until human approves

**The explore loop:**
```
Charter
   ↓
Explore (run 1) → Option A: React + SQLite + event sourcing
                → Option B: Vue + IndexedDB + CRDT
                → Option C: Svelte + PouchDB + sync engine
   ↓
Human: "B is close but use React instead of Vue"
   ↓
Explore (run 2) → Option B': React + IndexedDB (refined)
                → Option B'': React + IndexedDB + service worker variant
   ↓
Human: "B' looks good, lock it in"
   ↓
Blueprint locked
```

**The blueprint (Phase 1 output) contains:**
- `prd.json` — User stories with acceptance criteria (Ralph-compatible)
- `architecture.md` — Tech stack, data models, APIs, system design
- `ui-spec.md` — Screens, components, layout, user flows
- `conventions.md` — Coding style, patterns, naming, file structure
- `test-strategy.md` — What to test, how, coverage expectations
- `CLAUDE.md` / `AGENTS.md` — Agent instructions for the build phase
- `progress.txt` — Empty, ready for Ralph

**Human involvement: LOW** — agent explores, human selects direction.

### Phase 2: Engage (Ralph Loop)

**Agent builds it autonomously.**

This phase IS a Ralph Wiggum loop. No need to reinvent it. The agent takes the blueprint and codes iteratively until all stories pass.

**How it works:**
- Each iteration: fresh agent context
- Agent reads: blueprint + prd.json + progress.txt
- Picks highest-priority incomplete story
- Implements it, runs quality checks
- Commits if checks pass, updates progress
- Repeats until all stories done

**Human involvement: NEAR ZERO** — fully autonomous.

**What Make It So adds to Ralph:**
- The charter persists as a guardrail across all iterations
- Each iteration can be validated against charter constraints
- If the agent discovers the blueprint needs to change, it can propose amendments (escalating to human for charter-level changes)

---

## The Key Insight

```
Ralph Wiggum:  PRD → loop(code)         Human writes the plan.
Make It So:    Charter → Explore → Ralph  Agent explores the plan.
```

Ralph keeps coding until it's done.
Make It So tells Ralph *what matters* before it starts.

The human's job shrinks from "write a detailed PRD" to "tell me what you care about and pick a direction." The agent does the rest.

---

## Comparison with Other Frameworks

| Framework | Phase 0 (Intent) | Phase 1 (Design) | Phase 2 (Build) | Agent Autonomy |
|-----------|------------------|-------------------|-----------------|----------------|
| Vibe coding | ❌ | ❌ | Agent codes | Unguided |
| Plan mode | ❌ | Human + Agent plan | Agent codes | Low |
| Spec Kit | Human writes spec | 4-phase gated process | Agent codes | Medium |
| BMAD | Human briefs | Multi-agent planning (PM, Architect) | Agent codes | Medium |
| Ralph | Human writes PRD | ❌ | Loop(agent codes) | High (execution only) |
| **Make It So** | **Human + Agent lock charter** | **Agent explores options, human selects** | **Ralph loop** | **High (design + execution)** |

---

## Implementation

### CLI

```bash
# Phase 0: Define the charter (interactive)
makeitso charter "Build an offline-first task manager for mobile"

# Phase 1: Explore approaches (agent-driven, returns options)
makeitso explore                    # first run
makeitso explore --feedback "use React, not Vue"  # refine

# Phase 2: Build it (Ralph loop)
makeitso engage                     # default 10 iterations
makeitso engage --iterations 20     # more iterations
makeitso engage --agent claude      # use Claude Code instead of Codex
```

### File Structure (in user's project)

```
my-project/
├── charter/                    # Phase 0 output
│   ├── CHARTER.md             # Vision, constraints, non-negotiables
│   ├── boundaries.md          # Scope limits, what it's NOT
│   └── success-criteria.md    # How we know it's done
├── blueprint/                  # Phase 1 output
│   ├── prd.json               # Stories for Ralph
│   ├── architecture.md        # System design
│   ├── ui-spec.md             # UI/UX spec
│   ├── conventions.md         # Coding patterns
│   ├── test-strategy.md       # Testing approach
│   └── CLAUDE.md              # Agent instructions
├── progress.txt               # Ralph's memory
└── src/                       # Phase 2 output (the code)
```

### Agent Support

Works with any CLI-based coding agent:
- **Codex** (`codex exec --full-auto`)
- **Claude Code** (`claude -p --dangerously-skip-permissions`)
- **Amp** (via Ralph's existing integration)

---

## Prior Art & Influences

- **Ralph Wiggum Loop** (Geoffrey Huntley) — Phase 2's execution model. Fresh context per iteration, PRD-driven, progress tracking.
- **BMAD Method** — Multi-agent planning with personas (PM, Architect). Closest existing framework, but agents follow roles, not principles.
- **GitHub Spec Kit** — 4-phase gated development. Human-driven throughout.
- **Devin Interactive Planning** — AI generates a roadmap before coding, but single-path, no exploration.
- **Spec-driven development** (Addy Osmani) — Plan before code. Make It So automates the planning.
- **Anthropic Constitutional AI** — Principles-based self-governance. Inspiration for charter as persistent constraint.

---

*Authors: Jimmy & Bordie 🐕*
*Created: 2026-02-11*
*Updated: 2026-02-12 — renamed to Make It So, 3-phase architecture*
