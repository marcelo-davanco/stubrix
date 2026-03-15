# stubrix-vscode

VS Code / Windsurf extension for the Stubrix mock server platform.

## Features

- **Sidebar views**: Mocks, Status, Scenarios — visible in the activity bar
- **Commands** (via `Cmd+Shift+P`):
  - `Stubrix: Refresh Mocks`
  - `Stubrix: Start Mock Engine`
  - `Stubrix: Stop Mock Engine`
  - `Stubrix: Capture Scenario`
  - `Stubrix: Open API Docs`
  - `Stubrix: Doctor (Health Check)`
- **Settings**: `stubrix.apiUrl` (default: `http://localhost:9090`), `stubrix.showStatusBar`

## Prerequisites

- **Node.js 24+** and `npm install` run from the monorepo root
- Stubrix API running (`make stubrix-up` or `npm run dev:api`)

## Install

### 1. Add Windsurf CLI to PATH (one-time setup)

The Windsurf CLI is not added to `PATH` automatically on macOS. Add it to your shell:

```bash
echo 'export PATH="$PATH:/Applications/Windsurf.app/Contents/Resources/app/bin"' >> ~/.zshrc
source ~/.zshrc

# Verify:
windsurf --version   # → 1.108.x
```

### 2. Package and install

```bash
# From monorepo root:
make windsurf-install   # package .vsix + install in Windsurf
make vscode-install     # package .vsix + install in VS Code
```

Or step by step:

```bash
make vscode-package     # generates packages/vscode-extension/stubrix-vscode-X.Y.Z.vsix

# Windsurf:
make windsurf-install

# VS Code:
make vscode-install
```

Or via UI: `Cmd+Shift+P → Extensions: Install from VSIX...` → select the `.vsix` file.

## Development

```bash
# From monorepo root
npm run build:vscode    # TypeScript compile only
npm run dev -w stubrix-vscode   # watch mode

# From packages/vscode-extension
npm run build           # tsc
npm run dev             # tsc --watch
npm run package         # vsce package → .vsix
```

## Build Output

TypeScript compiles to `dist/extension.js`. The `.vsix` is generated at the package root and is excluded from git (`.gitignore`).

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `stubrix.apiUrl` | `http://localhost:9090` | Stubrix API base URL |
| `stubrix.showStatusBar` | `true` | Show status in the status bar |

Change via `Settings → Extensions → Stubrix` or `settings.json`:

```json
{
  "stubrix.apiUrl": "http://localhost:9090"
}
```
