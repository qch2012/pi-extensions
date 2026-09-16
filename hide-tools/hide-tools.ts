import {
  createBashToolDefinition,
  createEditToolDefinition,
  createFindToolDefinition,
  createGrepToolDefinition,
  createLsToolDefinition,
  createPowerShellToolDefinition,
  createReadToolDefinition,
  createWriteToolDefinition,
  getAgentDir,
  type ExtensionAPI,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Container, Text, type KeyId } from "@earendil-works/pi-tui";

interface Config {
  enabled: boolean;
  shortcut: KeyId;
}

const defaults: Config = {
  enabled: true,
  shortcut: "ctrl+shift+o",
};
const configPath = join(getAgentDir(), "hide-tools.json");

function isShortcut(value: unknown): value is KeyId {
  return (
    typeof value === "string" &&
    /^(?:(?:ctrl|shift|alt|super)\+)+(?:[a-z0-9]|f(?:[1-9]|1[0-2])|escape|enter|tab|space|backspace|delete|insert|home|end|pageUp|pageDown|up|down|left|right)$/.test(
      value,
    )
  );
}

function loadConfig(): { config: Config; warning?: string } {
  try {
    const value = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    if (typeof value.enabled !== "boolean" || (value.shortcut !== undefined && !isShortcut(value.shortcut))) {
      throw new Error('expected { "enabled": boolean, "shortcut"?: string }');
    }
    return {
      config: {
        enabled: value.enabled,
        shortcut: value.shortcut ?? defaults.shortcut,
      },
    };
  } catch (error: any) {
    if (error?.code === "ENOENT") return { config: { ...defaults } };
    return { config: { ...defaults }, warning: `Invalid ${configPath}: ${error.message}` };
  }
}

function saveConfig(config: Config) {
  mkdirSync(dirname(configPath), { recursive: true });
  const temporaryPath = `${configPath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(config, null, 2)}\n`);
  renameSync(temporaryPath, configPath);
}

export default function (pi: ExtensionAPI) {
  const loaded = loadConfig();
  let enabled = loaded.config.enabled;
  let warned = false;

  pi.registerShortcut(loaded.config.shortcut, {
    description: "Toggle tool-call output",
    handler: (ctx) => {
      enabled = !enabled;
      saveConfig({ ...loaded.config, enabled });

      // Force existing tool rows to rebuild with the new render mode.
      const expanded = ctx.ui.getToolsExpanded();
      ctx.ui.setToolsExpanded(!expanded);
      ctx.ui.setToolsExpanded(expanded);
      ctx.ui.notify(`Tool output ${enabled ? "hidden" : "visible"}`, "info");
    },
  });

  pi.on("session_start", (_event, ctx) => {
    if (loaded.warning && !warned) {
      ctx.ui.notify(`${loaded.warning}; using defaults`, "warning");
      warned = true;
    }

    const active = new Set(pi.getActiveTools());
    const builtins = new Set(
      pi
        .getAllTools()
        .filter((tool) => tool.sourceInfo.source === "builtin")
        .map((tool) => tool.name),
    );
    const empty = () => new Container();

    for (const createTool of [
      createReadToolDefinition,
      createBashToolDefinition,
      createPowerShellToolDefinition,
      createEditToolDefinition,
      createWriteToolDefinition,
      createGrepToolDefinition,
      createFindToolDefinition,
      createLsToolDefinition,
    ]) {
      const tool = createTool(ctx.cwd) as ToolDefinition<any, any, any>;
      if (!active.has(tool.name) || !builtins.has(tool.name)) continue;

      const renderCall = tool.renderCall;
      const renderResult = tool.renderResult;

      pi.registerTool({
        ...tool,
        renderShell: "self",
        renderCall(args, theme, context) {
          if (enabled && !context.isError) return empty();
          return renderCall?.(args, theme, context) ?? new Text(theme.bold(tool.name), 0, 0);
        },
        renderResult(result, options, theme, context) {
          if (enabled && !context.isError) return empty();
          return renderResult?.(result, options, theme, context) ?? empty();
        },
      });
    }
  });
}
