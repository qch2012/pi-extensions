import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildAutoresearchCommand,
  handoffAutoresearch,
  queueAutoresearch,
  readProjectBrief,
} from "../bridge.ts";

async function project() {
  return mkdtemp(join(tmpdir(), "pi-grill-autoresearch-"));
}

test("package exposes the bridge extension and grilling skill", async () => {
  const packageRoot = new URL("../../", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("package.json", packageRoot), "utf8"));
  const extension = "./pi-grill-autoresearch/pi-grill-autoresearch.ts";
  const skill = "./pi-grill-autoresearch/skill";

  assert.ok(manifest.pi.extensions.includes(extension));
  assert.ok(manifest.pi.skills.includes(skill));
  await access(new URL(extension, packageRoot));
  await access(new URL(`${skill}/SKILL.md`, packageRoot));
});

test("rejects brief paths outside the project", async () => {
  const cwd = await project();
  const outside = await project();
  const outsideBrief = join(outside, "brief.md");
  await writeFile(outsideBrief, "outside\n");

  await symlink(outsideBrief, join(cwd, "linked-brief.md"));

  await assert.rejects(readProjectBrief(cwd, outsideBrief), /project-relative/);
  await assert.rejects(readProjectBrief(cwd, "../brief.md"), /outside the project/);
  await assert.rejects(readProjectBrief(cwd, "linked-brief.md"), /outside the project/);
});

test("rejects missing, unreadable, and blank briefs", async () => {
  const cwd = await project();
  await mkdir(join(cwd, "directory.md"));
  await writeFile(join(cwd, "blank.md"), " \n\t");

  await assert.rejects(readProjectBrief(cwd, "missing.md"), /not found/);
  await assert.rejects(readProjectBrief(cwd, "directory.md"), /Unable to read brief/);
  await assert.rejects(readProjectBrief(cwd, "blank.md"), /empty/);
});

test("queues the new campaign as an expanded follow-up command", () => {
  let sent;
  const result = queueAutoresearch((message, options) => {
    sent = { message, options };
  }, ".scratch/autoresearch-brief.md", false);

  assert.deepEqual(sent, {
    message: buildAutoresearchCommand(".scratch/autoresearch-brief.md", false),
    options: { deliverAs: "followUp", expandPromptTemplates: true },
  });
  assert.equal(result, "Queued new campaign from .scratch/autoresearch-brief.md.");
});

test("queues resume wording that preserves the existing campaign", () => {
  let sent;
  const result = queueAutoresearch((message, options) => {
    sent = { message, options };
  }, ".scratch/autoresearch-brief.md", true);

  assert.deepEqual(sent, {
    message: "/autoresearch Read .scratch/autoresearch-brief.md as the binding contract. Continue the existing campaign. Do not call init_experiment. Do not reset the baseline. Do not overwrite .auto/prompt.md. Resume experiments immediately.",
    options: { deliverAs: "followUp", expandPromptTemplates: true },
  });
  assert.equal(result, "Queued resume campaign from .scratch/autoresearch-brief.md.");
  assert.equal(
    buildAutoresearchCommand(".scratch/autoresearch-brief.md", true),
    sent.message,
  );
});

test("existing playbook selects resume without modifying Autoresearch state", async () => {
  const cwd = await project();
  await mkdir(join(cwd, ".scratch"));
  await mkdir(join(cwd, ".auto"));
  await writeFile(join(cwd, ".scratch", "autoresearch-brief.md"), "# Resume latency\n");
  await writeFile(join(cwd, ".auto", "prompt.md"), "original playbook\n");
  await writeFile(join(cwd, ".auto", "log.jsonl"), '{"type":"baseline","metric":10}\n{"type":"result","metric":8}\n');
  let sent;

  const result = await handoffAutoresearch(cwd, ".scratch/autoresearch-brief.md", (message, options) => {
    sent = { message, options };
  });

  assert.equal(result.mode, "resume");
  assert.equal(result.message, "Queued resume campaign from .scratch/autoresearch-brief.md.");
  assert.match(sent.message, /Do not call init_experiment/);
  assert.equal(await readFile(join(cwd, ".auto", "prompt.md"), "utf8"), "original playbook\n");
  assert.equal(
    await readFile(join(cwd, ".auto", "log.jsonl"), "utf8"),
    '{"type":"baseline","metric":10}\n{"type":"result","metric":8}\n',
  );
});

test("reads a non-empty project brief and builds the new-campaign command", async () => {
  const cwd = await project();
  await mkdir(join(cwd, ".scratch"));
  await writeFile(join(cwd, ".scratch", "autoresearch-brief.md"), "# Optimize latency\n");

  const brief = await readProjectBrief(cwd, ".scratch/autoresearch-brief.md");

  assert.deepEqual(brief, {
    content: "# Optimize latency\n",
    displayPath: ".scratch/autoresearch-brief.md",
  });
  assert.equal(
    buildAutoresearchCommand(brief.displayPath, false),
    "/autoresearch Read .scratch/autoresearch-brief.md as the binding contract, create the .auto harness, establish the baseline, and start experiments immediately. You are already on the campaign branch. Do not create or switch branches at any point.",
  );
});
