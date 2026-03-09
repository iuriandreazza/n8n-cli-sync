# n8n-cli-sync

> A lightweight CLI tool to sync n8n workflows between environments — pull, push, list, and bootstrap with ease.

[![npm version](https://img.shields.io/npm/v/n8n-cli-sync.svg)](https://www.npmjs.com/package/n8n-cli-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Commands](#commands)
  - [init](#init)
  - [pull](#pull)
  - [push](#push)
  - [list](#list)
- [Workflow Files](#workflow-files)
- [Advanced Usage](#advanced-usage)
- [Security Considerations](#security-considerations)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

`n8n-cli-sync` bridges the gap between n8n environments. It lets you export all workflows from a source instance (e.g. `develop`) into versioned JSON files, then replay them onto a target instance (e.g. `production`) — creating new ones or updating existing ones by name.

**Key features:**
- **Pull** — Export all workflows from any n8n instance to local JSON files
- **Push** — Deploy local workflow JSON files to any n8n instance (create or update by name)
- **List** — Browse workflows in any configured environment
- **Init** — Bootstrap a config file in seconds
- **Multi-environment** — Configure as many environments as you need
- **Safe by default** — Pushed workflows are inactive unless you explicitly pass `--activate`
- **Credential-safe** — Credential IDs are stripped on push (environment-specific; must be re-linked)

---

## Installation

### Global install (recommended for regular use)

```bash
npm install -g n8n-cli-sync
# or
yarn global add n8n-cli-sync
```

### Per-project install

```bash
npm install --save-dev n8n-cli-sync
```

### One-off use with npx

```bash
npx n8n-cli-sync --help
```

---

## Quick Start

```bash
# 1. Create a config file
n8n-sync init

# 2. Edit n8n-cli-config.json with your environment URLs and API keys

# 3. Pull all workflows from your develop environment
n8n-sync pull

# 4. Push them to production (as inactive by default)
n8n-sync push

# 5. Push and preserve the active/inactive state from source
n8n-sync push --activate
```

---

## Configuration

Run `n8n-sync init` to create a starter `n8n-cli-config.json` in your current directory, then edit it:

```json
{
  "environments": {
    "develop": {
      "url": "http://localhost:5678",
      "apiKey": "your-dev-n8n-api-key"
    },
    "production": {
      "url": "https://your-prod-n8n-instance.example.com",
      "apiKey": "your-prod-n8n-api-key"
    }
  },
  "source": "develop",
  "target": "production"
}
```

### Config fields

| Field | Type | Required | Description |
|---|---|---|---|
| `environments` | `object` | ✅ | Map of environment name → `{ url, apiKey }` |
| `environments.<name>.url` | `string` | ✅ | Base URL of the n8n instance |
| `environments.<name>.apiKey` | `string` | ✅ | n8n API key (Settings → API → Create API Key) |
| `source` | `string` | ✅ | Default source environment for `pull` and `list` |
| `target` | `string` | ✅ | Default target environment for `push` |
| `workflowsDir` | `string` | ❌ | Custom path to store workflow JSON files (default: `./n8n-config/workflows`) |

### Adding more environments

You can define as many environments as needed:

```json
{
  "environments": {
    "local": { "url": "http://localhost:5678", "apiKey": "local-key" },
    "staging": { "url": "https://staging.example.com", "apiKey": "staging-key" },
    "production": { "url": "https://n8n.example.com", "apiKey": "prod-key" }
  },
  "source": "staging",
  "target": "production"
}
```

> **Security tip:** Never commit `n8n-cli-config.json` to version control — it contains API keys. Add it to `.gitignore`.

---

## Commands

### init

Create a starter `n8n-cli-config.json` in the current directory.

```bash
n8n-sync init
```

If a config already exists, the command exits without overwriting it.

---

### pull

Pull all workflows from an n8n environment and save them as JSON files.

```bash
n8n-sync pull [options]
```

**Options:**

| Option | Description |
|---|---|
| `-e, --env <name>` | Override the source environment (default: `source` from config) |
| `-c, --config <path>` | Path to config file (default: `./n8n-cli-config.json`) |

**Example:**

```bash
# Pull from the default source environment
n8n-sync pull

# Pull from a specific environment
n8n-sync pull --env staging

# Use a custom config file
n8n-sync pull --config /path/to/my-config.json
```

**Output:**

Workflow files are saved to `./n8n-config/workflows/` (or the path set by `workflowsDir` in config), one JSON file per workflow, named using a URL-safe slug of the workflow name.

```
n8n-config/
  workflows/
    send-welcome-email.json
    sync-contacts-to-crm.json
    daily-report.json
```

---

### push

Push local workflow JSON files to an n8n environment. Matches by workflow **name** — creates a new workflow if no match is found, or updates the existing one.

```bash
n8n-sync push [options]
```

**Options:**

| Option | Description |
|---|---|
| `-e, --env <name>` | Override the target environment (default: `target` from config) |
| `--activate` | Preserve the active/inactive state from the source file (default: always push as inactive) |
| `-c, --config <path>` | Path to config file (default: `./n8n-cli-config.json`) |

**Example:**

```bash
# Push all workflows to production (inactive by default — safe)
n8n-sync push

# Push and preserve active state from source files
n8n-sync push --activate

# Push to a specific environment
n8n-sync push --env staging
```

> **Important:** Credential bindings are stripped during push because credential IDs are environment-specific. After pushing, open each workflow in the target n8n instance and re-link the credentials.

---

### list

List all workflows in an n8n environment.

```bash
n8n-sync list [options]
```

**Options:**

| Option | Description |
|---|---|
| `-e, --env <name>` | Environment to list (default: `source` from config) |
| `-c, --config <path>` | Path to config file (default: `./n8n-cli-config.json`) |

**Example:**

```bash
n8n-sync list
n8n-sync list --env production
```

**Output:**

```
→ Listing workflows from: develop (http://localhost:5678)

ID         Name                                               Status
---------- -------------------------------------------------- ----------
1          Send Welcome Email                                 active
2          Sync Contacts to CRM                               inactive
3          Daily Report                                       active

Total: 3 workflow(s)
```

---

## Workflow Files

Each pulled workflow is stored as a JSON file with the following envelope:

```json
{
  "exportedAt": "2024-06-01T12:00:00.000Z",
  "sourceEnvironment": "develop",
  "workflow": {
    "id": "1",
    "name": "Send Welcome Email",
    "active": true,
    "nodes": [...],
    "connections": {...},
    "settings": {...}
  }
}
```

These files are designed to be committed to version control (git) to track changes to your workflows over time. **Do not commit** `n8n-cli-config.json` — only the workflow JSON files.

Recommended `.gitignore` additions:

```gitignore
n8n-cli-config.json
```

---

## Advanced Usage

### Use in CI/CD pipelines

You can integrate `n8n-cli-sync` into GitHub Actions, GitLab CI, or any CI/CD system.

**Example — GitHub Actions deploy step:**

```yaml
- name: Push workflows to production
  env:
    N8N_PROD_API_KEY: ${{ secrets.N8N_PROD_API_KEY }}
  run: |
    cat > n8n-cli-config.json <<EOF
    {
      "environments": {
        "production": {
          "url": "https://n8n.mycompany.com",
          "apiKey": "$N8N_PROD_API_KEY"
        }
      },
      "source": "production",
      "target": "production"
    }
    EOF
    npx n8n-cli-sync push --env production --activate
```

### Custom workflows directory

Set `workflowsDir` in your config to control where workflow files are stored:

```json
{
  "workflowsDir": "./workflows",
  ...
}
```

### Using with a monorepo

Use the `-c` / `--config` flag to point to the right config file:

```bash
n8n-sync pull -c packages/automation/n8n-cli-config.json
n8n-sync push -c packages/automation/n8n-cli-config.json
```

---

## Security Considerations

- **Never commit `n8n-cli-config.json`** — it contains API keys. Add it to `.gitignore`.
- **Use environment variables** in CI/CD instead of static config files.
- **Credential IDs are stripped** on push — they are environment-specific and must be re-linked manually in the target environment.
- **Workflows are pushed as inactive by default** — use `--activate` only when you are ready to enable them.
- API keys are sent via the `X-N8N-API-KEY` header over HTTPS (ensure your n8n instances use TLS).

---

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone https://github.com/iuriandreazza/n8n-cli-sync.git
cd n8n-cli-sync
npm install
```

### Running locally

```bash
# Run without building
npm run dev -- --help
npm run dev -- pull --env develop
```

### Building

```bash
npm run build
```

### Running tests

```bash
npm test
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
```

### Project structure

```
n8n-cli-sync/
├── src/
│   ├── cli.ts              # CLI entry point (Commander.js)
│   ├── client.ts           # N8NClient — Axios wrapper for n8n REST API
│   ├── config.ts           # Config loading, validation, and resolution
│   ├── error-utils.ts      # Human-readable error extraction
│   ├── types.ts            # Shared TypeScript types
│   └── commands/
│       ├── pull.ts         # pull command implementation
│       └── push.ts         # push command implementation
├── tests/
│   ├── client.test.ts
│   ├── config.test.ts
│   ├── error-utils.test.ts
│   └── commands/
│       ├── pull.test.ts
│       └── push.test.ts
├── n8n-cli-config.example.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes, add tests
4. Run tests: `npm test`
5. Open a pull request

Please open an issue first to discuss larger changes.

---

## License

[MIT](LICENSE) © Iuri Andreazza
