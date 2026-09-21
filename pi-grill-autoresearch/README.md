# pi-grill-autoresearch

A user-invoked grilling skill and bridge tool for starting an approved, measurable Autoresearch campaign.

Requires [`pi-autoresearch`](https://github.com/davebcn87/pi-autoresearch), verified with version 1.8.1.

## Start a new campaign

Create and enter the campaign worktree before Pi starts. Then run Pi and invoke:

```text
/skill:pi-grill-autoreasearch <optimization idea>
```

The skill interviews you, presents a binding contract, and waits for explicit approval. After approval it writes `.scratch/autoresearch-brief.md`; the bridge validates that path and queues the public `/autoresearch` command.

This package does not create or switch branches. Autoresearch itself commits kept experiments and reverts failed or discarded experiments.

Resume, promotion, retention, and parallel-campaign guidance will be added by the follow-up campaign-lifecycle tickets.
