---
applyTo: "src/**"
---

# n8n-cli-sync — Engineering Instructions

## Module Boundaries (strict)

Each module has a single responsibility. Do not mix concerns:

| Module | Responsibility | Must NOT |
|---|---|---|
| `cli.ts` | Commander.js wiring, parse options, call commands | Contain business logic, format output beyond errors, call `process.exit` from async handlers |
| `commands/pull.ts`, `commands/push.ts` | Business logic: orchestrate API calls + file I/O | Call `process.exit`, import Commander, format CLI options |
| `client.ts` | Wrap n8n REST API with typed methods | Format user output, know about files, know about config structure |
| `config.ts` | Load, parse, validate, resolve config | Make API calls, format output |
| `types.ts` | Shared TypeScript type definitions | Contain logic |
| `error-utils.ts` | Extract human-readable messages from unknown errors | Know about Commander or config |

**The command modules receive pre-loaded config and options — they never load config themselves.**

## TypeScript Rules
- Strict mode is enabled (`"strict": true` in tsconfig) — all strict checks apply
- Never use `any`; use `unknown` for truly unknown shapes or define the type
- Always provide explicit return types on exported functions
- Use `interface` for object shapes, `type` for unions and intersections
- Prefer immutability: `const`, `readonly`, `Readonly<T>` where appropriate
- Resolve JSON modules is enabled (`resolveJsonModule: true`) — import JSON with type safety

## N8NClient Design (`src/client.ts`)
- Constructor takes `EnvironmentConfig` only — no other state
- All public methods are `async` and return typed promises
- Axios instance configured with:
  - `baseURL`: `{env.url}/api/v1` (trailing slashes stripped from `env.url`)
  - Auth: `X-N8N-API-KEY` header (not Bearer — n8n uses API key header auth)
  - `Content-Type: application/json`
  - Timeout: 30 000 ms
- `listWorkflows()` handles cursor-based pagination internally — callers always receive all workflows as a flat array, never a paginated response object
  - Default page size: 250 items (`limit=250`)
  - Loop until `nextCursor` is null/undefined
- Do not expose raw Axios errors — let `error-utils.ts` handle formatting at the call site

## Pull Command (`src/commands/pull.ts`)
- Receive `config: N8NCliConfig` and `options: { env?: string }` — no other parameters
- Resolve environment: `options.env ?? config.source`
- For each workflow: fetch full details via `client.getWorkflow(id)` after listing (list response may be incomplete)
- **Slugify algorithm** for the filename: `name.toLowerCase()`, replace `[^a-z0-9]+` with `-`, collapse multiple `-`, trim leading/trailing `-`. Example: `"My Workflow!"` → `"my-workflow.json"`
- **Create `workflowsDir` if it doesn’t exist**: `fs.mkdirSync(dir, { recursive: true })` before writing any file
- Write one JSON file per workflow to `workflowsDir` using the **workflow envelope format**:
  ```json
  {
    "exportedAt": "<ISO 8601 timestamp>",
    "sourceEnvironment": "<env name>",
    "workflow": { /* full N8NWorkflow object */ }
  }
  ```
- Individual workflow failures are caught, logged, and do not halt other workflows
- Print a summary line at the end: `Saved X workflows.` / `Y failed.`

## Push Command (`src/commands/push.ts`)
- Receive `config: N8NCliConfig` and `options: { env?: string; activate?: boolean }` — no other parameters
- Resolve environment: `options.env ?? config.target`
- Read all `.json` files from `workflowsDir`; **skip `.gitkeep`** files
- Each file is the **workflow envelope** format written by pull — extract `file.workflow` before processing
- Fetch all existing workflows from target to build a **name → workflow** map before processing
- For each local JSON file:
  - Build payload using **explicit whitelist** — only allowed fields:
    - Workflow level: `name`, `active`, `connections`, `settings`, `staticData`, `pinData`, `nodes`
    - Strip: `id`, `createdAt`, `updatedAt`, `versionId`, `meta`, `tags`, `description`, `isArchived`
  - For each node in `nodes`, keep only:
    - `id`, `name`, `type`, `typeVersion`, `position`, `parameters`, `webhookId`, `disabled`, `notes`, `notesInFlow`, `color`, `executeOnce`, `alwaysOutputData`, `continueOnFail`, `onError`
    - Always set `credentials: {}` (strip environment-specific credential IDs)
    - Remove `issues` (read-only runtime field — causes API 400 if sent)
  - `active` field: default to `false`; use source value only if `options.activate` is `true`
  - Match by workflow `name` against the target map:
    - Name found → `client.updateWorkflow(existingId, payload)`
    - Name not found → `client.createWorkflow(payload)`
- Individual workflow failures are caught, logged, and do not halt others
- Print a summary line: `Created X, updated Y, failed Z.`

## List Command (in `src/cli.ts`)
- Uses `client.listWorkflows()` only — **no** per-item `getWorkflow` call (list response is sufficient for display)
- Prints a padded table to stdout: `ID | Name | Status`

## Config Module (`src/config.ts`)
- `loadConfig(configPath?: string): N8NCliConfig` is the public API
- Resolution order: `configPath` argument → `cwd/n8n-cli-config.json`
- Validation rules (throw on violation with a human-readable message and a hint):
  - File must exist and be valid JSON
  - Root must be an object (not array, not null)
  - `environments` must be a non-empty object
  - Each environment must have non-empty string `url` and `apiKey`
  - `source` must reference an existing environment key
  - `target` must reference an existing environment key
- If file is missing: include `"Run \`n8n-sync init\` to create a starter config"` in the error message
- `workflowsDir` defaults to `path.join(process.cwd(), 'n8n-config', 'workflows')` if absent

## Error Utilities (`src/error-utils.ts`)
- `extractErrorMessage(err: unknown): string` is the only export
- Always use this function when producing user-facing error strings — never access `err.message` directly in command code
- Handles: plain `Error`, Axios errors (with HTTP status + response body parsing), primitives
- Axios error details: `HTTP {status} {statusText} — {detail}` where detail is extracted from `response.data.message`, `.code`, or `.error`
- Response body truncated to 300 characters to prevent log flooding

## Import Order
1. Node built-ins (`fs`, `path`, `os`)
2. External packages (`axios`, `commander`)
3. Internal modules (`./client`, `./config`, `./types`, `./error-utils`, `../commands/…`)

## Avoid
- Do not use `require()` — use ES module `import` syntax (TypeScript compiles to CJS)
- Do not use `console.error` in command modules for user-messaging — pass errors up and let `cli.ts` handle terminal exit; use `console.log`/`console.error` in cli.ts
- Do not add `dependencies` without justification — keep dependency footprint minimal (only `axios` and `commander`)
- Do not delete workflows in push — push is create/update only (safe by design)
