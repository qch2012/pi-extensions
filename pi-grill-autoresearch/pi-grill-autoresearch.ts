import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { handoffAutoresearch } from "./bridge.ts";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "start_autoresearch_from_brief",
    label: "Start Autoresearch From Brief",
    description: "Queue an Autoresearch campaign from a completed brief after the user explicitly approves it",
    parameters: Type.Object({
      briefPath: Type.String({ description: "Project-relative path to the approved Autoresearch brief" }),
    }),
    async execute(_toolCallId, { briefPath }, _signal, _onUpdate, ctx) {
      const result = await handoffAutoresearch(
        ctx.cwd,
        briefPath,
        (content, options) => pi.sendUserMessage(content, options),
      );
      return {
        content: [{ type: "text", text: result.message }],
        details: { briefPath: result.briefPath, mode: result.mode },
      };
    },
  });
}
