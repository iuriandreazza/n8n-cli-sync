---
applyTo: "src/cli.ts,src/commands/**"
---

# n8n-cli-sync — CLI & UI Instructions

## CLI Framework: Commander.js
- Import: `import { Command } from 'commander'`
- Main program: `const program = new Command()`
- Set program name, version (from package.json), and description on the root command
- Sub-commands are registered with `program.command('<name>')`
- `cli.ts` is the **only** file that creates and configures Commander — command modules never import Commander

## Global Options
- `-c, --config <path>` — override config file path; registered on `program` (root), not on sub-commands
- Pass the resolved config path to `loadConfig()` before calling any command function

## Command Registration Pattern (`cli.ts`)
```typescript
program
  .command('pull')
  .description('...')
  .option('-e, --env <name>', 'Override source environment')
  .action(async (options) => {
    try {
      const config = loadConfig(program.opts().config);
      await pullCommand(config, options);
    } catch (err) {
      console.error(extractErrorMessage(err));
      process.exit(1);
    }
  });
```

- **`process.exit(1)`** is called exclusively in `cli.ts` `.action()` catch blocks — never inside command modules
- **`loadConfig()`** is called inside the action handler, after parsing — never at module load time
- All async action handlers must be wrapped in `try/catch`

## Commands

### `init`
- Creates `n8n-cli-config.json` in the current working directory
- **Non-destructive**: if the file already exists, print a message and exit normally (exit code 0)
- Pre-populate with `develop` and `production` environment stubs

### `pull`
- Options: `-e, --env <name>` — override `config.source`
- Fetches all workflows from the resolved source environment
- Writes one JSON file per workflow to `workflowsDir`

### `push`
- Options:
  - `-e, --env <name>` — override `config.target`
  - `--activate` — preserve the source workflow's `active` state; default without flag: push as **inactive**
- Reads all `.json` files from `workflowsDir`, deploys to the resolved target environment

### `list`
- Options: `-e, --env <name>` — override `config.source`
- Prints a formatted table to stdout: `ID | Name | Status`

## Output Conventions (stdout)

### Status Symbols
Use these Unicode symbols consistently in `console.log` output:

| Symbol | Meaning |
|---|---|
| `✓` | Success (e.g., file saved, workflow pushed) |
| `✗` | Failure (individual item error — does not halt) |
| `+` | Created (new resource in target) |
| `↻` | Updated (existing resource modified) |
| `→` | Informational / in-progress step |

Example:
```
→ Pulling workflows from develop...
✓ send-welcome-email.json
✓ crm-sync.json
✗ broken-workflow (HTTP 500 — Internal Server Error)
Saved 2 workflows. 1 failed.
```

### Tables (list command)
- Pad columns with spaces for alignment
- Print a header row: `ID           Name                          Status`
- Align columns consistently across all rows
- One workflow per line

### Summary Lines
- Always print a summary at the end of `pull` and `push`:
  - Pull: `Saved X workflows.` or `Saved X workflows. Y failed.`
  - Push: `Created X, updated Y.` or `Created X, updated Y. Z failed.`
- Summary goes to `console.log` (stdout)

## Error Output (stderr)
- Use `console.error(...)` only for fatal errors (caught in `.action()` blocks in `cli.ts`)
- Individual item failures in pull/push are logged to `console.log` with `✗` — they are non-fatal
- Error messages come from `extractErrorMessage(err)` — never raw `err.message` or interpolating `err` directly

## Safety Defaults
- Workflows are pushed **inactive** by default — only `--activate` flag preserves the source `active` value
- Push **never deletes** workflows — it only creates or updates; document this in help text
- `init` never overwrites an existing config file
- These defaults protect production environments from accidental activation or deletion

## Help Text Guidelines
- Description strings must be concise and action-oriented (e.g., `"Pull all workflows from the source environment"`)
- Option descriptions must mention the default behavior (e.g., `"Push workflows as inactive (use --activate to preserve active state)"`)
- Command-level `.addHelpText('after', ...)` can be used to add usage examples for complex commands

## Adding New Commands
1. Create `src/commands/<name>.ts` with an exported async function: `export async function <name>Command(config: N8NCliConfig, options: {...}): Promise<void>`
2. Register the command in `cli.ts` following the pattern above
3. Add a corresponding test file at `tests/commands/<name>.test.ts`
4. Update `README.md` with the new command's usage
