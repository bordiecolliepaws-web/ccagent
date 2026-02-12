# Make It So 🖖

> **Charter. Explore. Engage.** — From intent to product in three phases.

Ralph Wiggum keeps coding until it's done. **Make It So** tells Ralph *what matters* before it starts.

## The Problem

You can vibe-code small things. You can write a PRD and run a Ralph loop for medium things. But for anything real, someone has to do the hard design work — architecture, trade-offs, UI spec, test strategy. That someone is usually you, exhausted at 2 AM.

## The Solution

Make It So splits the work into three phases with decreasing human involvement:

```
human thoughts ──Charter──▶ CHARTER ──Explore──▶ BLUEPRINT ──Engage──▶ PRODUCT
```

### Phase 0: Charter
**You + Agent define what matters.** Vision, constraints, non-negotiables. Not *how* to build it — *why* it matters and *what* must be true.

### Phase 1: Explore
**Agent explores the design space.** Returns multiple blueprint options — different architectures, trade-offs, approaches. You pick one (or say "try again"). Agent refines into a full blueprint.

### Phase 2: Engage
**Ralph loop builds it.** The blueprint feeds directly into a Ralph Wiggum loop. Agent codes autonomously until all stories pass.

## Quick Start

```bash
# Clone and link
git clone https://github.com/bordiecolliepaws-web/ccagent.git
cd ccagent && npm install && npm link

# In your project:
makeitso charter "Build an offline-first task manager for mobile"
makeitso explore
makeitso engage
```

## Why "Make It So"?

Captain Picard doesn't tell his crew how to reroute the plasma conduits. He sets the directive and says "Make it so." The crew figures out the rest.

That's what this does. You set the charter. The agent explores, plans, and builds. You steer — you don't row.

## Docs

- [Design Document](docs/design.md) — Full architecture and rationale
- [Philosophy](docs/philosophy.md) — Why this approach
- [Agent Integration](docs/agent-integration.md) — Wiring into coding agents

## License

MIT
