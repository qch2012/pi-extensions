import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { queueNewCampaign, readProjectBrief } from "./bridge.ts";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "start_autoresearch_from_brief",
    label: "Start Autoresearch From Brief",
    description: "Queue a new Autoresearch campaign from a completed brief after the user explicitly approves it",
    parameters: Type.Object({
      briefPath: Type.String({ description: "Project-relative path to the approved Autoresearch brief" }),
    }),
    async execute(_toolCallId, { briefPath }, _signal, _onUpdate, ctx) {
      const brief = await readProjectBrief(ctx.cwd, briefPath);
      const message = queueNewCampaign(
        (content, options) => pi.sendUserMessage(content, options),
        brief.displayPath,
      );
      return {
        content: [{ type: "text", text: message }],
        details: { briefPath: brief.displayPath, mode: "new" },
      };
    },
  });
}
