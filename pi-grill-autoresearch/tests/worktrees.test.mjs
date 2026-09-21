import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);

async function git(cwd, ...args) {
  return exec("git", args, { cwd });
}

test("new, promote, and resume keep campaign generations isolated", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.match(readme, /git worktree add -b "\$branch" "\$worktree" "\$base_ref"/);
  assert.match(readme, /git -C "\$worktree" rm -r --ignore-unmatch \.auto/);

  const parent = await mkdtemp(join(tmpdir(), "pi-grill-worktrees-"));
  const repo = join(parent, "strategy");
  await mkdir(repo);
  await git(repo, "init", "-q");
  await git(repo, "config", "user.email", "test@example.com");
  await git(repo, "config", "user.name", "Test");
  await writeFile(join(repo, "strategy.py"), "baseline = 1\n");
  await git(repo, "add", ".");
  await git(repo, "commit", "-qm", "base");
  const base = (await git(repo, "rev-parse", "HEAD")).stdout.trim();

  await mkdir(join(repo, ".auto"));
  await writeFile(join(repo, ".auto", "prompt.md"), "generation one\n");
  await writeFile(join(repo, ".auto", "log.jsonl"), '{"metric":1}\n');
  await git(repo, "add", ".auto");
  await git(repo, "commit", "-qm", "winner");
  const winner = (await git(repo, "rev-parse", "HEAD")).stdout.trim();

  const gen1 = join(parent, "strategy-ar-momentum-gen1");
  await git(repo, "worktree", "add", "-q", "-b", "autoresearch/momentum/gen-1", gen1, base);
  assert.equal((await git(gen1, "branch", "--show-current")).stdout.trim(), "autoresearch/momentum/gen-1");

  const gen2 = join(parent, "strategy-ar-momentum-gen2");
  await git(repo, "worktree", "add", "-q", "-b", "autoresearch/momentum/gen-2", gen2, winner);
  await git(gen2, "rm", "-qr", "--ignore-unmatch", ".auto");
  await assert.rejects(readFile(join(gen2, ".auto", "prompt.md")));

  await mkdir(join(gen1, ".auto"));
  await mkdir(join(gen2, ".auto"));
  await writeFile(join(gen1, ".auto", "log.jsonl"), '{"generation":1}\n');
  await writeFile(join(gen2, ".auto", "log.jsonl"), '{"generation":2}\n');
  assert.notEqual(
    await readFile(join(gen1, ".auto", "log.jsonl"), "utf8"),
    await readFile(join(gen2, ".auto", "log.jsonl"), "utf8"),
  );

  assert.equal((await git(gen1, "branch", "--show-current")).stdout.trim(), "autoresearch/momentum/gen-1");
});
