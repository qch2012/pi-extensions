# Design decision: generic Grill-to-Autoresearch workflow

**Status:** Accepted

## Context

Pi skills can guide an interview but cannot activate extension commands. Pi Autoresearch deliberately hides `init_experiment`, `run_experiment`, and `log_experiment` until `/autoresearch <goal>` enables its mode. A running Pi session also stays bound to its original working directory, so it cannot move itself into a newly created Git worktree.

Autoresearch stores active state in one `.auto/` directory per working directory. Reusing that directory for unrelated topics conflates prompts, metrics, baselines, logs, and retained commits. Users also need an explicit distinction between continuing a campaign and promoting a previous winner into a new baseline.

The workflow must work for any measurable topic, not only trading or software performance. Some topics will initially lack an agent-runnable evaluator; the interview must resolve that before experiments begin.

## Decision

Build `pi-grill-autoresearch` as two cooperating components plus a documented setup convention.

### 1. User-invoked grilling skill

Ship a user-invoked skill named exactly `pi-grill-autoreasearch` (the requested spelling). It delegates the interview discipline to the existing `grilling` skill and remains domain-neutral.

The interview resolves:

- desired outcome;
- primary metric, unit, and optimization direction;
- secondary diagnostics;
- baseline or control;
- deterministic measurement command and noise policy;
- mutable search space;
- invariants and objective acceptance gates;
- representative development inputs and a locked holdout when applicable;
- iteration limit, per-run timeout, and advisory runtime and cost ceilings;
- files and systems in scope and off limits;
- campaign mode, campaign branch, and result-retention policy;
- the shared input-data directory, when measurement reads data that must not be duplicated per worktree;
- the concurrency ceiling, when campaigns will run in parallel.

If no agent-runnable measurement exists, defining or building that evaluator remains part of the design conversation. Autoresearch does not start until the evaluator and all hard gates are testable.

#### What the brief can and cannot enforce

The interview must not offer control that Autoresearch does not provide. Two areas need honest wording.

**Budget.** Only three limits have an enforcement point:

| Limit | Mechanism |
| --- | --- |
| Iteration count | `maxIterations` in `.auto/config.json` |
| Per-run timeout | `timeout_seconds` on `run_experiment` (default 600) |
| Checks timeout | `checks_timeout_seconds` on `run_experiment` (default 300) |

The config key is `maxIterations`. Autoresearch's internal state field is named `maxExperiments`, but that name is not read from configuration; writing it into `.auto/config.json` silently leaves the campaign unbounded.

Wall-clock runtime and money cost have none. The interview records them as advisory ceilings and tells the user that stopping the campaign at those ceilings is a manual act: watch the dashboard, then run `/autoresearch off`.

**Holdout.** Autoresearch has no hidden-evaluator support. Upstream issue #81 proposed one and was closed without implementation; version 1.8.1 has no holdout or profile mechanism. Any holdout script sitting in the repository is readable by the agent, and a prompt rule not to read it is a norm rather than a boundary that survives compaction. The interview therefore records the holdout as a manual, out-of-band check that the user runs themselves on a promoted winner, never as an enforced gate inside the loop.

This matters most for the subjects this workflow targets. Where the metric is a backtest statistic, overfitting the evaluator is the dominant failure mode rather than an edge case, so the brief must not imply protection that does not exist.

**Noise.** Autoresearch reports an advisory confidence score but cannot gather repeat samples itself; upstream issue #69 proposes `repeats` and A/B replay and remains open. Any averaging, median-of-repeats, or multi-window evaluation must be implemented inside the measurement script, which is the only place repeated sampling can happen. The interview settles that as part of the noise policy.

**Git.** Committing is not optional. `log_experiment` runs `git add -A && git commit` on every `keep`, and reverts code changes on `discard`, `crash`, and `checks_failed`. The interview therefore states this behaviour as a consequence to accept rather than a permission to grant. The only genuine scope decisions are which files may change and which are off limits, both already covered above.

After the decision frontier is empty, the skill writes a binding brief to `.scratch/autoresearch-brief.md`, presents the final contract, and asks for explicit approval to start. Approval is a hard gate.

The brief records the checked-out branch as the campaign branch and states that no component may create or switch branches. The bridge instruction carries the same rule, but the brief is what survives a compaction.

### 2. Always-active bridge tool

Ship a Pi extension that registers `start_autoresearch_from_brief`. The skill calls this tool only after approval.

The tool:

1. resolves the brief relative to `ctx.cwd`;
2. rejects paths outside the project;
3. rejects missing or empty briefs;
4. detects whether `.auto/prompt.md` exists under `ctx.cwd`;
5. queues a follow-up user message through `pi.sendUserMessage` with `expandPromptTemplates: true`;
6. sends one of two `/autoresearch` instructions, chosen by that check.

`/autoresearch` already performs the same presence check and appends the trailing text in either case, so one string would in fact be delivered under both branches. The bridge still sends two wordings because the resume case needs prohibitions the new-campaign case must not carry, and the new-campaign case needs a branch clause the resume case does not. This is a deliberate choice for clearer instructions, not a limitation of the command.

The bridge's presence check is therefore advisory: it selects wording only. Autoresearch resolves `.auto/` through its own `workingDir` config override, so a campaign that sets `workingDir` could make the two checks disagree. This workflow does not set `workingDir`, and the consequence of a disagreement is unhelpful wording rather than incorrect state.

If Autoresearch mode is already active, `/autoresearch` refuses with a notification and takes no action. The bridge cannot observe that refusal, so it must not claim it started a campaign. Its result text states that the command was queued, not that experiments began, and the README tells the user to run `/autoresearch off` before starting a new campaign in a session that already has one active.

No `.auto/prompt.md` — a new generation:

```text
/autoresearch Read <brief> as the binding contract, create the .auto harness, establish the baseline, and start experiments immediately. You are already on the campaign branch. Do not create or switch branches at any point.
```

The branch clause is required. `/autoresearch` loads the `autoresearch-create` skill whenever the harness is absent, and that skill's setup runs `git checkout -b autoresearch/<goal>-<date>`. Unchecked, the agent moves off the user's campaign branch and every `log_experiment` commit lands on a branch no document names, which strands the winner that **Promote** later needs to find.

The clause is phrased as a behavioural prohibition rather than as an instruction to skip a numbered step. A step number is a reference into another package's prose, and it stops matching silently when that package is reworded.

`.auto/prompt.md` present — an existing generation:

```text
/autoresearch Read <brief> as the binding contract. Continue the existing campaign. Do not call init_experiment. Do not reset the baseline. Do not overwrite .auto/prompt.md. Resume experiments immediately.
```

The resume wording is load-bearing. A second `init_experiment` call opens a new segment and resets the baseline, which would break the resume guarantee in **Baseline semantics** below.

The `/autoresearch` command remains the sole owner of enabling Autoresearch mode. The bridge reads only `.auto/prompt.md` for presence, and never parses or mutates Autoresearch state.

### 3. Campaign setup by convention

No component of this package creates worktrees. The user does it from a normal shell before starting Pi. This package ships only the convention and the documentation for it.

```text
branch:   autoresearch/<topic-slug>/gen-<n>
worktree: <repo-parent>/<repo-name>-ar-<topic-slug>-gen<n>
```

The README documents the three campaign workflows as command sequences:

```bash
# new campaign
git worktree add -b autoresearch/<topic>/gen-1 ../<repo>-ar-<topic>-gen1 HEAD
cd ../<repo>-ar-<topic>-gen1 && pi

# promote a winner into a new generation
git worktree add -b autoresearch/<topic>/gen-2 ../<repo>-ar-<topic>-gen2 <winning-commit>
cd ../<repo>-ar-<topic>-gen2 && pi

# resume an existing campaign
cd ../<repo>-ar-<topic>-gen1 && pi
```

Inside Pi the user types `/skill:pi-grill-autoreasearch` to open the interview. Typed slash commands pass through Pi's normal command dispatch, so the skill loads reliably.

The user states the campaign topic to the skill directly. No request file is written or read.

## Concurrency and shared inputs

Worktrees exist to allow independent campaigns to run at the same time. That is safe only when the primary metric is statistical rather than a wall-clock measurement. A latency or throughput campaign cannot run beside another campaign without the neighbour's load corrupting its timings; a campaign whose metric is a backtest statistic is unaffected by neighbouring CPU load.

Two consequences belong in the brief rather than in code.

**Shared input data.** Large inputs and warmed caches must live in one directory outside every worktree, referenced by absolute path. Duplicating them per generation wastes disk and re-warms caches needlessly, and divergent copies would make generations incomparable. The brief records that path.

**Concurrency ceiling.** Parallel campaigns still contend for CPU and memory. If measurement is resource-hungry, a busy neighbour widens the observed noise floor, which reintroduces the contamination that a statistical metric was supposed to avoid. The brief records how many campaigns may run at once and any per-run resource budget.

## Campaign identity and storage

A **Topic** is the broad optimization subject, represented by a stable slug. A **Generation** is one independent campaign whose baseline is fixed at its first measurement.

Each generation has its own branch, worktree, and `.auto/` directory:

```text
<repo>-ar-<topic>-gen1/.auto/
<repo>-ar-<topic>-gen2/.auto/
```

`.auto/log.jsonl` is the authoritative machine-readable experiment history. `.auto/prompt.md`, checks, ideas, configuration, and retained Git commits complete the reproducibility record. A human summary should be written to `docs/research/<topic>/gen-<n>.md` before a campaign is retired.

Completed campaign branches are retained until the user explicitly archives or deletes them. `/autoresearch clear` is not an archival mechanism.

## Baseline semantics

A better experiment becomes the campaign's **Best Result**; it does not replace that generation's **Baseline**.

- **Resume** continues the same generation, original baseline, best result, and `.auto/log.jsonl`.
- **Promote** creates a new worktree from the selected winning commit. Its first benchmark becomes the next generation's baseline.
- **New** starts an unrelated objective with independent metrics and history.

Baseline promotion is always explicit. Autoresearch never silently rebases comparisons around a winner.

## Safety and trust boundaries

- Explicit user approval is required before starting Autoresearch.
- Brief paths are project-contained and validated by the bridge.
- This package never creates, moves, or removes branches and worktrees. The user performs every Git setup step explicitly.
- No component interpolates user text into Git refs or shell commands, so that class of injection risk does not arise.
- This package never commits, merges, pushes, stashes, or resets on the user's behalf.
- Autoresearch's own `log_experiment` does commit and revert, unconditionally and inside the isolated campaign branch. This is not configurable, so the brief states it as accepted behaviour rather than an option.
- Nothing in the workflow pushes to a remote. Publishing a campaign branch stays a deliberate user action.

## Package layout

```text
pi-grill-autoresearch/
├── README.md                      # setup convention and campaign workflows
├── pi-grill-autoresearch.ts       # bridge tool
├── skill/
│   └── SKILL.md                   # user-invoked generic grilling workflow
└── tests/
    └── bridge.test.mjs
```

The repository package manifest exposes the extension and the skill. Both install through the existing Pi package with no shell entrypoint to place on the user's `PATH`.

## Alternatives rejected

### Skill alone

Rejected because a skill cannot activate `/autoresearch` or change the running Pi process's working directory.

### Directly activating Autoresearch tools from the bridge

Rejected because it couples this package to another extension's private gated-tool implementation. Dispatching the public `/autoresearch` command preserves ownership and compatibility.

### One `.auto/` directory with topic subfolders

Rejected because Pi Autoresearch defines `.auto/` relative to one working directory. Inventing nested topic semantics would not be understood by the extension.

Upstream reached the same position. Issue #10 asked how to run several campaigns and the maintainer's answer was the `workingDir` config setting plus manual cleanup. Issue #12 proposed `/autoresearch use|list|archive` subcommands over `workingDir`, and version 1.8.1 contains none of them. Separate worktrees remain the only isolation this workflow can rely on.

## Upstream compatibility

This design is verified against `pi-autoresearch` 1.8.1. Three behaviours it depends on live in that package rather than in this one: the `/autoresearch` presence check that chooses between an `autoresearch-create` kickoff and a resume kickoff, the refusal when Autoresearch mode is already active, and the `maxIterations` config key. A README note records the verified version so a future upstream change is diagnosed rather than guessed at.

The bridge imports its parameter schema from the unscoped `typebox`. Pi's extension loader aliases `typebox` and `@sinclair/typebox` to the same bundled copy, so both resolve inside Pi, but only the unscoped name matches what Pi actually bundles and declares. Upstream issue #98 reports the scoped import failing outside that loader, which is precisely the situation this package's own test process runs in.

### Automatically replacing the baseline with every winner

Rejected because it destroys the original comparison point and makes campaign history difficult to interpret. Promotion creates a new generation instead.

### Creating a worktree from inside the active Pi session

Rejected because the current session remains bound to its original `cwd`. The worktree must exist before Pi starts in it.

### A companion shell wizard that creates the worktree and launches Pi

Rejected. Pi's interactive mode sends a command-line initial message through `session.prompt` without `expandPromptTemplates`, so an injected `/skill:...` kickoff would reach the model as literal text rather than loading the skill. Working around that would add a fourth component to carry one sentence across a process boundary. The setup is three mechanical commands, so documenting the convention costs less than automating it and removes every mutation, every shell-quoting concern, and the whole class of collision-handling failure modes.

## Consequences

- The workflow has two deliberate human boundaries: creating the worktree from a shell, and invoking the skill inside Pi. After the interview begins, the path through Autoresearch activation is automatic following approval.
- Topics and generations are naturally isolated and reproducible.
- Campaign naming is a convention, not an enforced rule. A user who deviates gets a working campaign with a non-standard name rather than an error.
- Users retain complete experiment history and can compare generations without ambiguous baselines.
- The package contains one Pi extension and one user-invoked skill, both covered by standard Pi package discovery.
