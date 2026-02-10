# ccagent Design Document

> Constitutional Coding for AI Agents — the full pipeline from intent to code.

## The Problem

AI coding has evolved through phases:

| Phase | Flow | Problem |
|-------|------|---------|
| **Vibe coding** | command → agent codes | No design. Agent does whatever. |
| **Plan mode** | command → agent plans → agent codes | Plan is ephemeral, doesn't persist as guardrail. |
| **Spec-driven** | human writes spec → agent codes | Human does all the design work. Exhausting. |
| **Ralph loop** | human writes PRD → loop(agent codes) | Better execution, but PRD is still human-authored. Design still front-loaded on human. |

The common failure: either the **human is exhausted** writing detailed specs, or the **agent drifts** because there's no persistent design constraint.

## The Solution: Two Loops

ccagent splits the workflow into two distinct loops:

```
Loop 1 (Design):     command <-> constitution + PRD + stories
Loop 2 (Build):      constitution + PRD + stories <-> coding
```

**Loop 1** is our innovation. **Loop 2** follows Ralph loop best practices.

---

## Loop 1: The Design Loop

### Core Insight: Hierarchical Decision-Making

Not all decisions need human involvement. ccagent uses a **constitutional hierarchy** where human involvement decreases at each level:

```
LEVEL              WHO DECIDES              WHAT IT CONTAINS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
L1: Principles     Human writes             Vision, values, non-negotiables
        ↓
L2: Objectives     Human approves           Architecture, major tech choices
        ↓
L3: Implementation Agent decides,           Module design, data models, APIs
                   human can review
        ↓
L4: Fine Details   Agent locks in           Naming, file structure, test
                   silently                 strategy, coding style
```

Each level **constrains** the level below it:
- Principles constrain objectives
- Objectives constrain implementation
- Implementation constrains fine details

**The agent generates ALL levels**, but only escalates to the human based on the level. The human never has to think about fine details unless they choose to.

### How It Works

**Step 1: Human provides intent (L1)**

```
"Build a task manager with offline sync that never loses data"
```

**Step 2: Agent generates the full hierarchy**

The agent drafts all four levels at once:

```
📜 L1 PRINCIPLES (need your approval):
  1. Offline-first: app works without internet
  2. Eventually consistent sync (not real-time)
  3. Zero data loss guarantee

🎯 L2 OBJECTIVES (proposing, please review):
  - Event sourcing for state management
  - SQLite for local storage
  - WebSocket sync when online
  - React Native for cross-platform mobile

🔧 L3 IMPLEMENTATION (I've decided, expand to review):
  - EventStore class with append-only log
  - Sync engine with conflict resolution via last-write-wins
  - Offline queue with retry logic
  ... (12 more decisions)

⚙️ L4 FINE DETAILS (locked in):
  - 47 decisions covering naming, structure, tests
  - [expand if curious]
```

**Step 3: Human steers, agent adjusts**

```
Human: "Principles yes. But use plain event log, not SQLite."
Agent:  Updated L2. Cascading changes: L3 adjusted (8 decisions),
        L4 adjusted (23 decisions). Ready to review?
Human: "Looks good. Build it."
```

The human touched **3 principles + 1 objective**. The agent autonomously locked in **59 implementation decisions**. Nobody got tired. Intent is fully preserved.

### The Constitution as Output

Loop 1 produces a **constitution directory**:

```
constitution/
├── CONSTITUTION.md          # L1 + L2: Principles and approved objectives
├── invariants.md            # Hard constraints extracted from L1
├── architecture.md          # L2: Approved architectural decisions
├── modules/                 # L3: Per-module implementation intent
│   ├── event-store.md
│   ├── sync-engine.md
│   └── offline-queue.md
├── conventions.md           # L4: Coding style, naming, structure
├── decisions/               # ADRs for all non-trivial choices
│   ├── 001-event-sourcing.md
│   ├── 002-plain-event-log.md
│   └── ...
└── amendments/              # Changes made during Loop 1 refinement
```

Plus a **PRD** (`prd.json`) with stories derived from the constitution:

```json
{
  "name": "task-manager",
  "branchName": "feature/task-manager",
  "stories": [
    {
      "id": 1,
      "title": "Event store foundation",
      "description": "Implement append-only event log...",
      "acceptance": ["Events persist across app restart", "..."],
      "constitutional_refs": ["L1.3 (zero data loss)", "L2.1 (event sourcing)"],
      "priority": 1,
      "passes": false
    }
  ]
}
```

Note: each story references the constitutional principles it serves. This creates traceability from code back to intent.

### The Design Loop Conversation

The back-and-forth (`<->`) is iterative:

```
Human intent
    ↓
Agent generates full hierarchy (L1-L4)
    ↓
Human reviews L1 (principles) ←── must approve
    ↓
Human reviews L2 (objectives) ←── should approve
    ↓
Human optionally reviews L3-L4 ←── can skip
    ↓
Human requests changes at any level
    ↓
Agent cascades changes downward
    ↓
Repeat until human says "build it"
    ↓
Constitution + PRD locked → Loop 2 begins
```

Key properties:
- **Changes cascade downward.** Changing a principle can reshape everything below it.
- **Lower levels auto-adjust.** The human doesn't need to manually update L4 when L1 changes.
- **The agent explains trade-offs.** "If we drop SQLite, we lose X but gain Y."
- **Nothing is hidden.** Every level is reviewable, but only L1-L2 demand attention.

---

## Loop 2: The Build Loop

Loop 2 follows established Ralph loop patterns with constitutional enforcement.

### Each Iteration

```
1. Fresh agent context spawned
2. Agent reads:
   - constitution/ (design intent)
   - prd.json (what to build next)
   - progress.txt (what's been done)
3. Agent picks highest-priority incomplete story
4. Agent implements the story
5. Agent runs quality checks (tests, types, lint)
6. POST-VALIDATION: constitutional check
   - Does the diff violate any invariants?
   - Does the implementation match module intent?
   - Did design intent drift?
7. If violation → revert, log reason, retry
   If clean → commit, update progress
8. If design legitimately needs to evolve → propose amendment
9. Repeat until all stories pass
```

### Constitutional Validation

After each iteration, a validation step checks the code changes against the constitution:

```bash
ccagent check --diff <git-diff> --constitution constitution/
```

This is an LLM-powered check that:
- Reads the diff
- Reads the relevant constitutional documents
- Returns PASS/FAIL with reasoning
- Suggests amendments if the constitution itself should evolve

### Amendments During Build

Sometimes the agent discovers that the constitution needs to change mid-build. The amendment process:

1. Agent creates `amendments/NNN-title.md`
2. Describes what needs to change and why
3. **L1-L2 amendments** → pause and ask human
4. **L3-L4 amendments** → agent can self-approve, logged for review
5. Constitution updated, build continues

---

## What Makes This Different

| Approach | Design Effort (Human) | Design Effort (Agent) | Persistent Guardrails | Autonomous Detail |
|----------|----------------------|----------------------|----------------------|-------------------|
| Vibe coding | None | None | ❌ | ❌ |
| Plan mode | Medium | Medium | ❌ (ephemeral) | ❌ |
| Spec-driven | High | Low | ⚠️ (static doc) | ❌ |
| Ralph loop | High (PRD) | Low | ⚠️ (progress.txt) | ❌ |
| **ccagent** | **Low (L1-L2 only)** | **High (L1-L4)** | **✅ (constitution)** | **✅ (L3-L4)** |

The key insight: **the agent does the design work, the human provides the intent.** The constitution ensures the agent's design decisions persist and constrain the coding loop, even across fresh contexts.

---

## Implementation Plan

### Phase 1: Core Framework
- [ ] `ccagent init <description>` — Generate constitution from natural language intent
- [ ] Constitutional hierarchy (L1-L4) generation
- [ ] Interactive refinement loop (human steers, agent adjusts)
- [ ] Constitution directory output

### Phase 2: Build Integration
- [ ] `ccagent build` — Ralph-style loop with constitutional validation
- [ ] `ccagent check` — Validate diff against constitution
- [ ] Amendment workflow during build
- [ ] Progress tracking with constitutional references

### Phase 3: Agent Integration
- [ ] Claude Code integration (CLAUDE.md / AGENTS.md)
- [ ] Codex integration
- [ ] Cursor integration (.cursorrules)
- [ ] MCP tool server (expose constitution as tools)

### Phase 4: Evolution
- [ ] Multi-project constitutions (shared principles across repos)
- [ ] Constitution analytics (which principles get amended most?)
- [ ] Learning from amendments (improve future constitution generation)

---

## Prior Art & Influences

- **Ralph Wiggum Loop** (Geoffrey Huntley) — The execution model. Fresh context per iteration, PRD-driven, progress tracking. ccagent adopts this for Loop 2.
- **Spec-driven development** (GitHub spec-kit, Addy Osmani) — Write specs before coding. ccagent automates spec generation and adds persistence.
- **Constitutional AI** (Anthropic) — Principles-based self-governance. ccagent applies this concept to code architecture instead of AI safety.
- **GTPlanner** (OpenSQZ) — PRD generation for agents. ccagent goes further: generates constitution + PRD, with hierarchical human involvement.
- **Plan Mode** (Claude Code) — Read-only planning before execution. ccagent makes the plan persistent and enforceable.

---

*Authors: Jimmy & Bordie 🐕*
*Created: 2026-02-11*
