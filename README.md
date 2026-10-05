# oc-plugin-rainbow

Theme-aware rainbow post-processing for the OpenCode TUI.

![Rainbow stripe preview](https://raw.githubusercontent.com/anomalyco/oc-plugin-rainbow/main/assets/rainbow-stripe.svg)

It adds:

- animated foreground color bands for neutral text
- optional animated background tint for neutral surfaces
- a built-in settings dialog for toggling and tuning the effect live

## Installation

Install from the CLI:

```bash
opencode plugin oc-plugin-rainbow
```

Or from OpenCode commands:

1. Press `Ctrl+P`
2. Select `Install Plugin`
3. Enter `oc-plugin-rainbow`

Requires OpenCode `>=2.0.23`.

## Options

Plugin options can be configured via the `cli.json` config file.

### TUI

- `enabled` (`boolean`, default `true`)
- `fg` (`boolean`, default `true`): animate neutral text colors
- `bg` (`boolean`, default `true`): animate neutral background surfaces
- `speed` (`number`, default `0.008`, range `0`-`0.03`)
- `turns` (`number`, default `3`, range `0.25`-`8`)
- `glow` (`number`, default `0.05`, range `0`-`0.15`)
- `keybinds.logo_splash` (`string`, default `ctrl+shift+r`): trigger the white-flash logo route

Example:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "oc-plugin-rainbow",
      "options": {
        "enabled": true,
        "fg": true,
        "bg": true,
        "speed": 0.008,
        "turns": 3,
        "glow": 0.05
      }
    }
  ]
}
```

Open `Rainbow settings` from the command palette or run `/rainbow-settings` to tune the effect live. Those changes are stored locally per user.

## Local use

Point a TUI config at the package directory:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [{ "package": "../../oc-plugin-rainbow", "options": { "enabled": true } }]
}
```

The package exports its TUI entry at `./tui` and renders with `@opentui/solid`.
