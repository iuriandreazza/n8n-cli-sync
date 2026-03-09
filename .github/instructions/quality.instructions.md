---
applyTo: "tests/**,src/**"
---

# n8n-cli-sync — Quality Instructions

## Test Setup
- **Framework**: Jest 29.7+ with ts-jest transformer
- **Config**: `jest.config.js` — uses `tsconfig.test.json` for compilation
- **Test match pattern**: `tests/**/*.test.ts`
- **Coverage source**: `src/**/*.ts`
- Run all tests: `npm test`
- Run with coverage: `npm run test:coverage`
- Run lint: `npm run lint` (ESLint 9 with `@typescript-eslint`)

## Test File Structure
Test files must **mirror the source structure** under `tests/`:

| Source file | Test file |
|---|---|
| `src/client.ts` | `tests/client.test.ts` |
| `src/config.ts` | `tests/config.test.ts` |
| `src/error-utils.ts` | `tests/error-utils.test.ts` |
| `src/commands/pull.ts` | `tests/commands/pull.test.ts` |
| `src/commands/push.ts` | `tests/commands/push.test.ts` |

## Mocking Patterns
- **Axios**: `jest.mock('axios')` — mock the module, then cast `axios.create` to `jest.Mock` and return a mock client instance
- **N8NClient**: `jest.mock('../src/client')` — mock the class; configure mock method return values per test
- **File system**: use Node's real `fs` with `fs.mkdtempSync()` for temporary directories — do not mock `fs`
- **Fixtures**: define reusable fixture objects (e.g., `VALID_CONFIG`, `WORKFLOW`) as `const` at the top of each test file, outside any `describe` block

Example fixture pattern:
```typescript
const VALID_CONFIG: N8NCliConfig = {
  environments: {
    develop: { url: 'http://localhost:5678', apiKey: 'dev-key' },
    production: { url: 'https://prod.example.com', apiKey: 'prod-key' },
  },
  source: 'develop',
  target: 'production',
  workflowsDir: '/tmp/workflows',
};

const WORKFLOW: N8NWorkflow = {
  id: 'abc123',
  name: 'My Workflow',
  active: false,
  nodes: [],
  connections: {},
};
```

### Axios Mock Setup (client tests)
Use this exact pattern to mock Axios:
```typescript
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockClient = { get: jest.fn(), post: jest.fn(), put: jest.fn() };
mockedAxios.create.mockReturnValue(mockClient as any);
```
Reset mocks in `beforeEach`: `jest.clearAllMocks()`

### `makeAxiosError()` helper (error-utils tests)
Create a reusable helper to build test Axios errors:
```typescript
function makeAxiosError(status: number, statusText: string, data: unknown) {
  const err = new Error('Request failed') as any;
  err.isAxiosError = true;
  err.response = { status, statusText, data };
  return err;
}
```

### `writeWorkflowFiles()` helper (push tests)
Pre-populate a temp workflows directory for push tests:
```typescript
function writeWorkflowFiles(dir: string, workflows: N8NWorkflow[]) {
  fs.mkdirSync(dir, { recursive: true });
  for (const wf of workflows) {
    const slug = wf.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    fs.writeFileSync(
      path.join(dir, `${slug}.json`),
      JSON.stringify({ exportedAt: new Date().toISOString(), sourceEnvironment: 'develop', workflow: wf }, null, 2)
    );
  }
}
```

## Temp File Isolation
Any test that writes to the file system must:
1. Create a unique temp directory in `beforeEach` using `fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-test-'))`
2. Store the path in a `let tmpDir: string` scoped to the `describe` block
3. Clean up in `afterEach` using `fs.rmSync(tmpDir, { recursive: true })`

```typescript
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true });
});
```

## Coverage Requirements

### `src/client.ts`
- Pagination: single-page response (no `nextCursor`), multi-page (cursor chain), empty result
- All CRUD methods: `createWorkflow`, `updateWorkflow`, `activateWorkflow`, `deactivateWorkflow`
- URL trailing slash normalization
- Correct `X-N8N-API-KEY` header is set

### `src/config.ts`
- Successful load with all fields present
- Successful load with `workflowsDir` absent (defaults applied)
- Missing config file → error message includes init hint
- Invalid JSON → parse error with file path
- Missing `environments` → validation error
- Environment with missing `url` or `apiKey` → validation error
- `source` referencing non-existent environment → validation error
- `target` referencing non-existent environment → validation error
- `configPath` override takes priority over cwd default

### `src/error-utils.ts`
- Plain `Error` instance → returns `error.message`
- String primitive → returns the string
- Axios error with response → `HTTP {status} {statusText} — {detail}`
- Axios error with long body → body truncated to 300 chars with `…`
- Axios error with no response → falls back to error message
- Unknown/non-error object → does not throw

### `src/commands/pull.ts`
- Fetches all workflows and writes one JSON file per workflow
- Written file uses the envelope format: `{ exportedAt, sourceEnvironment, workflow }`
- Workflow name is slugified correctly for the filename
- `workflowsDir` is created automatically if it does not exist
- Individual workflow fetch failure logs error and continues (does not throw)
- `--env` override uses the specified environment instead of `config.source`
- Summary output reflects correct saved/failed counts

### `src/commands/push.ts`
- Throws (or logs fatal error) if `workflowsDir` does not exist
- Throws (or logs fatal error) if no `.json` files are found in `workflowsDir`
- `.gitkeep` files are silently skipped
- Creates a new workflow when name is not found in target
- Updates an existing workflow when name matches
- Credential fields on nodes are stripped to `{}`
- `issues` field on nodes is removed
- `active` defaults to `false` without `--activate`
- `active` preserves source value with `--activate: true`
- Payload whitelist enforced (no `id`, `createdAt`, etc. sent)
- Individual push failure logs error and continues
- `--env` override uses specified environment instead of `config.target`

## Test Quality Rules
- **Test both success AND failure branches** for every command path
- **Use specific assertions** — `toEqual` over `toBeTruthy`, `toHaveBeenCalledWith` over `toHaveBeenCalled`
- **Avoid testing implementation details** — assert observable outcomes (files written, API calls made with correct payloads)
- **Never leave temp directories behind** — always clean up in `afterEach`
- **Call `jest.clearAllMocks()` in `beforeEach`** to prevent state leaking between tests

## Lint Rules
- ESLint 9 with `@typescript-eslint` rules — run `npm run lint`
- No `any` type — use `unknown` or a concrete type
- No unused variables or imports
- Consistent import order (Node built-ins → external packages → internal modules)
- `console.log` is allowed in source (CLI output); `console.error` is for fatal errors in `cli.ts` only
- **One assertion concept per `it` block** — split unrelated assertions into separate tests
- Do not use `setTimeout` or `sleep` in tests — mock async operations instead
- Never use `jest.useFakeTimers` unless testing time-dependent logic explicitly

## Lint Rules
- `@typescript-eslint/no-explicit-any` — error; use `unknown` or a proper type
- `@typescript-eslint/explicit-function-return-type` — warn on exported functions; always add return types
- Run `npm run lint` before committing — fix all errors, review all warnings
- ESLint config: `eslint.config.js` (flat config format, ESLint 9+)
