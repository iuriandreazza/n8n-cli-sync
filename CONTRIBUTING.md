# Contributing to n8n-cli-sync

Thank you for your interest in contributing! This document covers everything you need to know to open a pull request.

For opening **issues** (bug reports, feature requests, questions), see [ISSUES.md](ISSUES.md).

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Branch Naming](#branch-naming)
- [Conventional Commits](#conventional-commits)
- [Making Changes](#making-changes)
- [Pull Request Checklist](#pull-request-checklist)
- [Review Process](#review-process)
- [What NOT to Do](#what-not-to-do)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating you agree to abide by its terms. Violations can be reported to the maintainers via GitHub's private reporting feature.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm (do **not** use yarn or bun — `package-lock.json` is the committed lockfile)

### Setup

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/n8n-cli-sync.git
cd n8n-cli-sync

# 2. Install dependencies
npm install

# 3. Run the CLI directly (no build step needed)
npm run dev -- --help
npm run dev -- pull --env develop

# 4. Run the test suite
npm test

# 5. Run the linter
npm run lint
```

---

## Branch Naming

Create your feature/fix branch off `main` using one of these prefixes:

| Prefix | When to use |
|---|---|
| `feat/<slug>` | New feature or command |
| `fix/<slug>` | Bug fix |
| `docs/<slug>` | Documentation-only change |
| `chore/<slug>` | Build, tooling, dependency updates |
| `test/<slug>` | Test-only changes |
| `refactor/<slug>` | Refactoring without behaviour change |

Examples: `feat/list-filter`, `fix/push-credential-strip`, `docs/ci-cd-example`

---

## Conventional Commits

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>
```

### Types

| Type | Description |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Build, tooling, CI changes |
| `test` | Adding or updating tests |
| `refactor` | Code change with no feature/fix |
| `perf` | Performance improvement |

### Scopes (common for this project)

| Scope | Module |
|---|---|
| `cli` | `src/cli.ts` |
| `pull` | `src/commands/pull.ts` |
| `push` | `src/commands/push.ts` |
| `list` | list command in `src/cli.ts` |
| `init` | init command in `src/cli.ts` |
| `client` | `src/client.ts` |
| `config` | `src/config.ts` |
| `types` | `src/types.ts` |
| `deps` | dependency updates |

### Examples

```
feat(pull): add --dry-run flag to preview file names
fix(push): strip issues field from node payloads
docs(readme): add CI/CD GitHub Actions example
test(config): cover missing apiKey validation
chore(deps): upgrade axios to 1.8.0
```

---

## Making Changes

1. **Open an issue first** for any non-trivial change so it can be discussed before you invest time.
2. Write or update unit tests for every changed behaviour. The test suite mirrors the source structure under `tests/`.
3. Make sure `npm test` passes with no failures before opening your PR.
4. Run `npm run lint` and fix any reported issues.
5. Keep changes focused — one concern per PR.

### Project structure

```
src/
  cli.ts                # Commander.js routing ONLY — no business logic here
  client.ts             # N8NClient — Axios wrapper for the n8n REST API
  config.ts             # Config loading, validation, path resolution
  types.ts              # Shared TypeScript interfaces
  error-utils.ts        # extractErrorMessage() — unified error formatter
  commands/
    pull.ts             # pull command implementation
    push.ts             # push command implementation
tests/                  # Jest tests — mirrors src/ structure
```

---

## Pull Request Checklist

Before opening your PR, confirm:

- [ ] An issue exists (or is referenced) for non-trivial changes
- [ ] `npm test` passes locally with no failures
- [ ] `npm run lint` reports no errors
- [ ] New/changed behaviour is covered by tests
- [ ] Commit messages follow Conventional Commits format
- [ ] `n8n-cli-config.json` is **not** included in any commit
- [ ] No API keys, secrets, or credentials are present in any file
- [ ] `README.md` is updated if a new command or option is added

### PR description template

```
## What does this PR do?
<!-- Concise summary of the change -->

## Related issue
<!-- Closes #<issue-number> -->

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor / chore

## Testing
<!-- Describe how you tested this -->

## Checklist
- [ ] Tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] No secrets committed
```

---

## Review Process

- A maintainer will review your PR within **~7 days** (best effort — this is an open-source side project).
- At least **1 approving review** is required before merging.
- Address all review comments before requesting a re-review.
- Maintainers may squash commits on merge for a clean history.

---

## What NOT to Do

- **Do not open a large refactor PR without a prior issue.** Agree on the approach first.
- **Do not commit `n8n-cli-config.json`** — it contains API keys and is gitignored for a reason.
- **Do not add runtime dependencies** without strong justification — the dependency footprint is intentionally minimal (`axios` and `commander` only).
- **Do not implement delete/purge operations** — push is create/update only by design (safe for production).
- **Do not bypass the whitelist** in the push payload builder — unlisted fields (e.g., `id`, `createdAt`) must never be sent to the target instance.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
