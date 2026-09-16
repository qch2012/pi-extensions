# hide-tools

A Pi extension that hides successful built-in tool rows while keeping failed tool calls visible.

Test it directly:

```bash
pi -e ./hide-tools.ts
```

## Usage

Hides successful built-in tool rows while leaving failed tool calls visible. Press `Ctrl+Shift+O` to toggle visibility; the choice persists across sessions.

Optional configuration: `~/.pi/agent/hide-tools.json`

```json
{
  "enabled": true,
  "shortcut": "ctrl+shift+o"
}
```

Without this file, hiding is enabled and the default shortcut is used. The file is created after the first keyboard toggle. After changing `shortcut`, restart Pi or run `/reload`.

Test it with:

```text
Use the read tool to read MISSION.md, then state only its title.
```

The final answer should appear without a `read` row. Toggle visibility and repeat to compare. The extension covers Pi's built-in tools; tools registered by other extensions retain their own rendering.

## Install

Install the package from GitHub:

```bash
pi install git:github.com/qch2012/pi-extensions
```
