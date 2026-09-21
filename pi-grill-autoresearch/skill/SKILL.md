---
name: pi-grill-autoreasearch
description: Define and approve a measurable new or resumed Autoresearch campaign before it starts.
disable-model-invocation: true
---

# Grill to Autoresearch

Turn an optimization idea into one approved, agent-runnable contract, then start or resume its Autoresearch campaign.

## Interview

Load and follow the `grilling` skill. Its design tree, rounds, frontier, fact-finding, and shared-understanding gate govern the interview. Use the decision frontier below; do not replace `grilling` with a second interview process.

Establish repository facts yourself. Read relevant files, inspect the current branch with `git branch --show-current`, and run candidate measurement commands when safe. Ask the user for decisions, not facts available from the environment.

Set the campaign mode from the working directory: `.auto/prompt.md` absent means **new**; present means **resume**. For a resume, read the existing playbook and result ledger, keep that generation's original baseline, and grill only decisions that the persisted campaign does not already settle.

Resolve every applicable branch:

- outcome and mutable search space;
- primary metric, unit, and optimization direction;
- secondary diagnostics;
- baseline or control;
- deterministic measurement command;
- noise policy, including repeats, medians, multi-window evaluation, or walk-forward evaluation inside that command;
- invariants and objective acceptance gates;
- representative development inputs;
- manual holdout inputs for evaluation after a winner is promoted;
- files and systems in scope and off limits;
- campaign topic, generation, checked-out branch, and retention policy;
- enforced limits: `maxIterations`, `timeout_seconds`, and `checks_timeout_seconds`;
- advisory wall-clock and money ceilings;
- absolute shared-input path, concurrency ceiling, and per-run CPU and memory budget when campaigns share data or run in parallel.

Keep the frontier open until the measurement is agent-runnable and every hard gate has an objective command or observable result. If an evaluator does not exist, agree and create it before continuing. Autoresearch cannot enforce a hidden holdout or collect repeat samples: the user runs the holdout manually, and the measurement command owns repeated sampling.

## Contract

After the `grilling` shared-understanding gate, show the complete contract using this shape:

```markdown
# Autoresearch Brief

## Campaign
- Mode: <new or resume>
- Topic:
- Generation:
- Campaign branch:
- Retention:

## Objective
- Outcome:
- Mutable search space:

## Metrics
- Primary: <name, unit, higher/lower is better>
- Secondary:
- Baseline/control: <original generation baseline when resuming>

## Measurement
- Command:
- Noise policy:
- Development inputs:
- Manual holdout:

## Acceptance gates
- <objective gate and how to run it>

## Scope
- May change:
- Off limits:
- Shared input data: <absolute path or not applicable>
- Concurrency ceiling: <parallel campaign limit or not applicable>
- Per-run resource budget: <CPU/memory limit or not applicable>

## Budget
- `maxIterations`:
- `timeout_seconds`:
- `checks_timeout_seconds`:
- Advisory wall-clock ceiling:
- Advisory cost ceiling:

## Fixed Autoresearch behaviour
- The campaign branch is already checked out. All work stays on this branch.
- `log_experiment` commits each kept experiment and reverts code changes for discarded, crashed, or checks-failed experiments.
- Advisory ceilings require the user to stop the campaign with `/autoresearch off`.
- The holdout is a manual out-of-band check, not a hidden or enforced in-loop gate.
```

State plainly that no component creates or switches branches. For a resume, state that the original baseline, best result, playbook, and result ledger stay authoritative. Ask the user to approve this exact contract and start Autoresearch. Approval must be explicit.

## Start

After approval only:

1. Write the approved contract unchanged to `.scratch/autoresearch-brief.md`.
2. Call `start_autoresearch_from_brief` with `briefPath: ".scratch/autoresearch-brief.md"`.
3. Report that the command was queued. The bridge cannot prove that Autoresearch started.

Before approval, continue the interview or revise the contract. The start tool is the final gate, not an interview aid.
