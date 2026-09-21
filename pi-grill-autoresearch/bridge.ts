import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

function isOutside(root: string, path: string) {
  const fromRoot = relative(root, path);
  return fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot);
}

export async function readProjectBrief(cwd: string, briefPath: string) {
  if (isAbsolute(briefPath)) throw new Error("briefPath must be project-relative");

  const root = await realpath(cwd);
  const unresolvedPath = resolve(root, briefPath);
  if (isOutside(root, unresolvedPath)) throw new Error("Brief path is outside the project");

  let path: string;
  try {
    path = await realpath(unresolvedPath);
  } catch (error: any) {
    if (error?.code === "ENOENT") throw new Error("Brief not found");
    throw new Error(`Unable to read brief: ${error.message}`);
  }
  if (isOutside(root, path)) throw new Error("Brief path is outside the project");

  let content: string;
  try {
    content = await readFile(path, "utf8");
  } catch (error: any) {
    throw new Error(`Unable to read brief: ${error.message}`);
  }
  if (!content.trim()) throw new Error("Brief is empty");

  return { content, displayPath: relative(root, path) };
}

export function buildNewCampaignCommand(briefPath: string) {
  return `/autoresearch Read ${briefPath} as the binding contract, create the .auto harness, establish the baseline, and start experiments immediately. You are already on the campaign branch. Do not create or switch branches at any point.`;
}

export function queueNewCampaign(
  sendUserMessage: (message: string, options: { deliverAs: "followUp"; expandPromptTemplates: true }) => void,
  briefPath: string,
) {
  sendUserMessage(buildNewCampaignCommand(briefPath), {
    deliverAs: "followUp",
    expandPromptTemplates: true,
  });
  return `Queued new campaign from ${briefPath}.`;
}
