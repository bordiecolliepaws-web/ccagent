# Make It So — Design V2: Research Agent Architecture

> Recording our design discussion (2026-02-12)

## Context

We started with a clean 3-phase model:
```
Charter → Explore → Engage (Ralph loop)
```

But testing against a real project (ADDM — LLM experiment framework) revealed that Phase 1 (Explore) is much harder than "generate a PRD." For research projects, exploration means **running experiments, diagnosing failures, and iterating on the design itself.**

## Key Realizations

### 1. The Charter is a Knowledge Transfer Document

Not a "brief" or "one-liner." It's everything a brilliant new researcher needs to operate autonomously:

```markdown
# Charter Structure

## I. Thesis (WHY — don't change this)
The core research contribution. What we're proving and why.

## II. Method (HOW — understand deeply before touching)
- How the system works end-to-end
- Each component explained: what it does, why it's designed that way
- Infrastructure: how experiments run, data pipeline, costs

## III. Current State (WHERE we are)
- Benchmark results
- Known strengths and weaknesses

## IV. Mission (WHAT to do)
The specific goal for this agent run.

## V. Degrees of Freedom (WHAT can change)
- CANNOT change: foundational architecture, core concepts
- CAN change (with caution): parameters, thresholds, calibration
- SHOULD change: things that are known to be domain-specific
- FREE to change: implementation details, prompts, experiments
```

Section V is the key innovation — an explicit **permission system** for what the agent can modify. Like constitutional law: fundamental rights need supermajority, regulations can change freely.

### 2. The Charter is the Same Whether Building from Scratch or Extending

For dev-ADDM from scratch: Phase 0 produces a charter with the full thesis, method design, evaluation methodology. The agent builds it.

For dev-ADDM Amazon expansion: Same charter structure, plus "Current State" section with existing results, plus mission = "expand to Amazon."

The charter is **domain knowledge**, not a to-do list.

### 3. Phase 1 Explore Includes Running Code

For a research project:
```
Explore iteration 1:
  → Agent proposes agenda design for Amazon
  → Builds prototype (implements it)
  → Runs experiment
  → AMOS loses to baseline
  → Diagnoses: "agenda is Yelp-specific, gate calibration wrong"

Explore iteration 2:
  → Adjusts agenda, recalibrates Tekoa
  → Runs experiment
  → AMOS wins on 9/12 topics, Yelp stable ✓
  → Diagnosis: "3 remaining topics have weak review signal"

Explore iteration 3:
  → Redesigns agendas for weak topics OR excludes them
  → Final results: AMOS wins reliably
  → Blueprint locked
```

This means Phase 1 already includes building + testing. It IS a loop, possibly using Ralph-style iteration internally.

## Open Questions

### Q1: Do we still need separate Phase 1 and Phase 2?

Phase 1 (Explore) includes building + running code. Phase 2 (Engage/Ralph) also builds code. What's the difference?

**Possible answer:** Phase 1 is **exploratory** — the agent is trying different approaches, running experiments, iterating on design. The code is prototype-quality. Phase 2 is **production** — the agent takes the winning approach and builds it properly with tests, clean architecture, documentation.

```
Phase 1: "Does this approach work?" (prototype, iterate, validate)
Phase 2: "Build it properly." (production quality, Ralph loop)
```

But for some projects, Phase 1's prototype IS the final product (especially research code). In that case, Phase 2 might be unnecessary — or Phase 2 is just "clean up and write tests."

**Or:** Phase 1 and Phase 2 merge. The agent runs a single extended loop that starts exploratory and converges to production quality. The "blueprint" isn't a separate artifact — it emerges from the exploration.

### Q2: What IS Phase 1 concretely?

If there exists a "target blueprint" that would correctly build dev-ADDM or dev-ADDM-Amazon, what process leads to it?

**Possibility A: Plan then build (current model)**
```
Charter → Agent generates blueprint → Ralph builds it
```
Problem: For research, the agent can't know the right blueprint without experimenting. The blueprint IS the research output.

**Possibility B: Explore = prototype loop, then clean build**
```
Charter → Agent prototypes + experiments in a loop → 
  discovers what works → extracts blueprint → Ralph builds clean version
```
This separates "figuring out what to build" from "building it well."

**Possibility C: Single adaptive loop**
```
Charter → Agent runs in a loop, starting exploratory,
  gradually converging to production quality
```
No separate phases. The agent is autonomous throughout. The charter constrains it. Early iterations are exploratory (try things, run experiments). Later iterations are refinement (clean up, test, document).

**Possibility D: Research loop with checkpoints**
```
Charter → Agent runs explore loop →
  At each checkpoint, presents findings to human →
  Human steers ("that direction is good" / "try X instead") →
  When human says "this works," switch to production build mode
```
This keeps human-in-the-loop for strategic decisions but lets agent drive the research.

### Q3: How does the agent diagnose failures?

When AMOS loses to baseline, the failure could be:
- Agenda design (questions don't discriminate)
- Ground truth (labels are wrong)
- AMOS method (gates too aggressive)
- Tekoa calibration (thresholds off)
- Data issue (Amazon reviews have different characteristics)

These are **coupled**: changing agenda changes ground truth changes baseline scores.

The charter's "Degrees of Freedom" helps, but the agent also needs:
- **Diagnostic heuristics**: "if AMOS wins on Yelp but loses on Amazon, suspect domain-specific hardcoding"
- **Cost awareness**: "ground truth recalculation costs $X, don't change agenda frivolously"
- **Regression testing**: "always rerun Yelp after changes to confirm no regression"

Should these be in the charter? Or does the agent learn them?

## Summary of Where We Are

### What we've locked in:
- **Name:** Make It So 🖖
- **Three concepts:** Charter, Explore, Engage
- **Charter:** Rich knowledge transfer document with degrees of freedom
- **Phase 2 (Engage):** Ralph Wiggum loop, use existing implementation

### What we're figuring out:
- **Phase 1 (Explore):** How it works for research projects
- **Phase 1 vs Phase 2 boundary:** Are they separate? Does Phase 1 subsume Phase 2?
- **The diagnosis problem:** How does the agent debug coupled failures?

---

*Discussion: Jimmy & Bordie 🐕*
*Date: 2026-02-12*
