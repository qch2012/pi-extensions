# pi-grill-autoresearch

A user-invoked grilling skill and bridge tool for starting or resuming an approved, measurable Autoresearch campaign.

Verified with [`pi-autoresearch`](https://github.com/davebcn87/pi-autoresearch) 1.8.1.

## Install

```bash
pi install npm:pi-autoresearch
pi install git:github.com/qch2012/pi-extensions
```

## Campaign names

Use a stable topic slug and an increasing generation number:

```text
branch:   autoresearch/<topic-slug>/gen-<n>
worktree: <repo-parent>/<repo-name>-ar-<topic-slug>-gen<n>
```

Use lowercase letters, digits, and hyphens in the topic slug. This is a convention, not an enforced rule.

A worktree must exist before Pi starts because a running Pi session stays in its original working directory. Each `git worktree add` below starts from a committed ref, so uncommitted changes in the source worktree are not copied.

## New

Choose a clean base ref that does not contain another campaign's `.auto/` directory.

```bash
repo_root=$(git rev-parse --show-toplevel)
repo_name=$(basename "$repo_root")
repo_parent=$(dirname "$repo_root")
topic=momentum
generation=1
base_ref=HEAD
branch="autoresearch/$topic/gen-$generation"
worktree="$repo_parent/$repo_name-ar-$topic-gen$generation"

git worktree add -b "$branch" "$worktree" "$base_ref"
cd "$worktree"
pi
```

Inside Pi:

```text
/skill:pi-grill-autoreasearch <optimization idea>
```

The skill presents a binding brief and waits for explicit approval. After approval it writes `.scratch/autoresearch-brief.md`; the bridge validates that path and queues the public `/autoresearch` command.

## Resume

Resume in the existing worktree. Its `.auto/prompt.md` makes the bridge preserve the generation's original baseline, best result, playbook, and ledger.

```bash
worktree=../strategy-ar-momentum-gen1
cd "$worktree"
pi
```

Invoke `/skill:pi-grill-autoreasearch` again. If Autoresearch is already active in that Pi session, run `/autoresearch off` before starting the approved handoff.

## Promote

Promotion starts a new generation from a selected winning commit. The inherited `.auto/` belongs to the old generation, so remove it before Pi starts; otherwise the bridge correctly interprets the worktree as a resume.

```bash
repo_root=$(git rev-parse --show-toplevel)
repo_name=$(basename "$repo_root")
repo_parent=$(dirname "$repo_root")
topic=momentum
generation=2
base_ref=<winning-commit>
branch="autoresearch/$topic/gen-$generation"
worktree="$repo_parent/$repo_name-ar-$topic-gen$generation"

git worktree add -b "$branch" "$worktree" "$base_ref"
git -C "$worktree" rm -r --ignore-unmatch .auto
cd "$worktree"
pi
```

Invoke `/skill:pi-grill-autoreasearch`. With no inherited playbook, the winner's code gets a new baseline and independent ledger. The previous generation remains unchanged on its branch and worktree.

## Shared inputs and parallel campaigns

Put large market data and reusable caches outside every worktree. Record one absolute path in each brief so all generations measure the same inputs without copying data or warming separate caches.

A statistical metric such as Sharpe ratio or drawdown can be evaluated in parallel if the brief sets a concurrency ceiling and per-run CPU and memory budget. A wall-clock metric such as latency or throughput cannot run beside competing workloads because resource contention corrupts the measurement.

Separate worktrees give each campaign its own branch, playbook, ledger, widget, metrics, and run count. They do not remove CPU or memory contention.

## History and finalization

`.auto/log.jsonl` is the authoritative experiment ledger. A `keep` retains the code in a Git commit. A discarded, crashed, or checks-failed experiment has its code reverted, but its result remains in the ledger.

Before retiring a generation:

1. Run `/autoresearch export` if you want a dashboard artifact.
2. Run the manual holdout against the promoted winner.
3. Write `docs/research/<topic>/gen-<n>.md` with the original baseline, best result, holdout result, important failures, and conclusion.
4. Keep the campaign branch and worktree until you consciously archive them.

`/autoresearch clear` deletes active state; it is not an archive command. A better result never replaces that generation's baseline automatically.

- **Resume** keeps the same generation and baseline.
- **Promote** starts the next generation from a winning commit and measures a new baseline.
- **New** starts unrelated history from a clean base ref.

Cleanup is an explicit user action:

```bash
git worktree remove "$worktree"
git branch -d "$branch"
```

## Smoke check

For a release smoke check, create two worktrees and start one Pi session in each. Complete the grilling and approval flow in both, then confirm that each TUI shows its own widget, metric, and run count and that each worktree has a different `.auto/prompt.md` and `.auto/log.jsonl`. Resume one session and confirm its original baseline and best result remain unchanged.
