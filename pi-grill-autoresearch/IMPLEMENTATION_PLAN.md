# Implementation plan: pi-grill-autoresearch

This plan implements the design in `DESIGN.md`, which is **Accepted**. This plan does not authorize implementation, commits, merges, or pushes by itself.

## Phase 1: establish package seams

1. Add the component layout under `pi-grill-autoresearch/`:
   - `README.md`;
   - `pi-grill-autoresearch.ts`;
   - `skill/SKILL.md`;
   - `tests/bridge.test.mjs`.
2. Update the root `package.json` Pi manifest to expose:
   - `./pi-grill-autoresearch/pi-grill-autoresearch.ts` as an extension;
   - `./pi-grill-autoresearch/skill` as a skill root.
3. Import the bridge parameter schema from the unscoped `typebox` and declare `typebox` in peer dependencies. Do not use `@sinclair/typebox`. Pi's loader aliases both names to one bundled copy, so both work inside Pi, but only the unscoped name is what Pi bundles; the scoped name is the subject of upstream issue #98 and fails outside Pi's loader, which is where this package's tests run.
4. Keep path validation and instruction selection in pure functions that import no schema, so the test process never needs to resolve `typebox` at all.
5. Keep the requested public skill name `pi-grill-autoreasearch` consistent in frontmatter, prompts, and README examples.

**Completion criterion:** Pi package discovery lists both the bridge extension and the user-invoked skill without warnings or name collisions.

## Phase 2: write the generic grilling skill

1. Make the skill user-invoked with `disable-model-invocation: true`.
2. Point to the existing `grilling` discipline rather than copying its interview algorithm.
3. Encode the domain-neutral decision frontier from `DESIGN.md`.
4. Require an agent-runnable measurement and objectively testable gates before completion.

   Record the holdout as a manual check the user runs on a promoted winner. Autoresearch has no hidden-evaluator support, so the brief must not present the holdout as enforced or as protected from the agent reading it.

   Record repeated sampling as part of the measurement script. Autoresearch cannot gather repeats itself, so any median, multi-window, or walk-forward evaluation belongs inside the measurement command.
5. Define a generic Autoresearch Brief schema containing:
   - campaign identity, mode, and campaign branch (read from `git branch --show-current`);
   - objective;
   - primary and secondary metrics;
   - baseline;
   - measurement command and noise policy;
   - search space;
   - acceptance gates;
   - development and holdout inputs;
   - scope and exclusions;
   - budget, split into enforced limits (`maxIterations` in `.auto/config.json`, `timeout_seconds`, `checks_timeout_seconds`) and advisory runtime and cost ceilings;
   - shared input-data directory as an absolute path, when measurement reads data that must not be duplicated per worktree;
   - concurrency ceiling and any per-run resource budget, when campaigns will run in parallel;
   - retention policy.
6. State in the brief that the campaign branch is already checked out and that no component may create or switch branches. Phrase this behaviorally. Do not cite a step number from the `autoresearch-create` skill, because that reference breaks silently if the other package rewords its setup section.

   Use `maxIterations` as the config key. `maxExperiments` is Autoresearch's internal state field and is not read from configuration.
7. State that `log_experiment` commits on `keep` and reverts on failure, unconditionally, so the brief presents this as accepted behaviour and never offers it as a choice.
8. State that advisory ceilings are stopped manually with `/autoresearch off`, not enforced.
9. Require the agent to show the completed contract and obtain explicit approval.
10. After approval, write `.scratch/autoresearch-brief.md` and call `start_autoresearch_from_brief`.
11. Phrase all pre-approval behavior positively: continue interviewing and refining; the start tool is available only at the final gate.

**Completion criterion:** for unrelated example subjects, the skill reaches a measurable, approved contract without introducing domain-specific fields, promising unenforceable control, or starting experiments early.

## Phase 3: implement the bridge extension

1. Register the always-active `start_autoresearch_from_brief` tool.
2. Accept one project-relative `briefPath` string.
3. Canonicalize `ctx.cwd` and the brief path.
4. Reject traversal and absolute paths outside the project.
5. Read the brief and reject missing, unreadable, or blank content.
6. Convert the path back to a project-relative display path.
7. Test whether `<cwd>/.auto/prompt.md` exists, and select the new-campaign or resume instruction accordingly. This selection only chooses wording; `/autoresearch` performs its own equivalent check to decide whether to load `autoresearch-create`.
8. Queue the selected `/autoresearch` command as a follow-up user message with prompt/command expansion enabled.
9. Return a concise tool result naming the queued brief and the selected wording. State that the command was queued. Do not assert that a campaign started, because `/autoresearch` refuses when Autoresearch mode is already active and the bridge cannot observe that refusal.
10. Do not import, inspect, or mutate Pi Autoresearch's internal runtime. The only Autoresearch file touched is `.auto/prompt.md`, and only to test for its presence.

**Completion criterion:** an approved tool call activates the installed Autoresearch extension through its public command, the next agent turn receives the brief as its binding contract, and an existing campaign keeps its baseline and playbook.

## Phase 4: document the setup convention

1. Document the naming convention in the component README:
   - branch `autoresearch/<topic-slug>/gen-<n>`;
   - worktree `<repo-parent>/<repo-name>-ar-<topic-slug>-gen<n>`;
   - lowercase topic slugs (`[a-z0-9]+(?:-[a-z0-9]+)*`).
2. Give copy-pasteable command sequences for the three campaign workflows:
   - `new`: `git worktree add -b <branch> <path> HEAD`;
   - `promote`: the same from an explicit winning commit;
   - `resume`: `cd <existing-worktree>` with no branch creation.
3. State that the worktree must exist before Pi starts, because a running session stays bound to its original working directory.
4. Show the in-Pi step: type `/skill:pi-grill-autoreasearch` and state the topic.
5. Note that uncommitted changes in the source worktree are not carried into a new worktree.
6. Give cleanup instructions using `git worktree remove` as an explicit user action.
7. State that a shared input-data directory lives outside every worktree and is referenced by absolute path, so generations stay comparable and caches are warmed once.
8. State that parallel campaigns are safe only when the primary metric is statistical, and that a session with Autoresearch already active must be stopped with `/autoresearch off` before a new campaign is started in it.

**Completion criterion:** a user can set up any of the three campaign workflows by following the README without guessing a path, branch name, or command.

## Phase 5: retain and summarize campaign history

1. Document `.auto/log.jsonl` as the authoritative run ledger.
2. Document that `keep` commits are the retained implementation history while discarded experiments remain in the ledger.
3. Add a finalization checklist to the component README:
   - run `/autoresearch export` if a dashboard artifact is wanted;
   - write `docs/research/<topic>/gen-<n>.md` with baseline, best result, holdout result, failures, and conclusion;
   - keep the campaign branch/worktree until consciously archived;
   - never use `/autoresearch clear` as a substitute for archiving.
4. Document campaign modes:
   - resume preserves the baseline;
   - promote starts a new generation from a winner;
   - new starts unrelated history.
5. Document that a winner never replaces a baseline automatically.

**Completion criterion:** a user can locate the complete machine history, human conclusion, winning code, and baseline lineage for every generation.

## Phase 6: verification

### Skill checks

Test at least three unrelated prompts:

- reduce a CLI command's runtime;
- improve an image-compression quality metric;
- optimize a trading rule.

Verify that the same generic brief schema works, missing evaluators are resolved before handoff, approval is required, and the brief separates enforced limits from advisory ceilings without offering a Git-commit opt-out.

Verify that the shared-data and concurrency fields are raised only when they apply: the trading subject should surface both, while a single-campaign CLI runtime subject should surface neither.

### Bridge tests

Cover:

- valid non-empty project-relative brief;
- missing brief;
- empty brief;
- `..` traversal;
- absolute path outside the project;
- queued message text with no `.auto/prompt.md` present (new-campaign wording, including the behavioral clause forbidding branch creation and switching, asserted without reference to another package's step numbering);
- queued message text with `.auto/prompt.md` present (resume wording, forbidding `init_experiment`, baseline reset, and playbook overwrite);
- `deliverAs: "followUp"` and `expandPromptTemplates: true`.

Prefer extracting path validation and instruction selection into small pure functions, leaving one extension integration test around `pi.sendUserMessage`. Instruction selection takes the harness-present flag as an argument so both wordings are testable without touching disk.

### README command check

Run the documented `new`, `promote`, and `resume` command sequences in a temporary Git repository and confirm each produces the intended branch and worktree. This validates the documentation, not shipped code.

### Package smoke test

1. Run Pi directly with the extension path.
2. Confirm the bridge tool is registered before Autoresearch mode is active.
3. Reload resources and invoke `/skill:pi-grill-autoreasearch`.
4. Complete a minimal interview, approve it, and verify `/autoresearch` activates.
5. Confirm an existing `.auto/` campaign resumes rather than being silently replaced.
6. Confirm the bridge reports only that the command was queued when Autoresearch mode is already active, rather than claiming a campaign started.
7. Run two campaigns in separate worktrees at the same time and confirm each keeps its own widget, metrics, and run counts. Upstream issue #7 covered cross-session state leakage and is closed, but parallel campaigns are this workflow's main use and deserve a direct check.
8. Record the verified `pi-autoresearch` version in the component README.

**Completion criterion:** automated checks pass and one manual TUI smoke test completes the full worktree → grilling → approval → Autoresearch handoff.

## Phase 7: documentation and release preparation

1. Add the component to the root README's extension list.
2. Document installation through the existing Pi package.
3. Cross-link the Phase 4 setup convention from the root README.
4. Show where campaign summaries live.
5. Stage and review the complete diff.
6. Wait for explicit approval before any commit, merge, or push.

**Completion criterion:** a new user can install the package, start an isolated campaign, understand baseline generations, and recover every result without undocumented steps.
