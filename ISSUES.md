# Opening Issues

Before opening an issue, please take a moment to search [existing issues](https://github.com/iuriandreazza/n8n-cli-sync/issues) to avoid duplicates. Also check the [README](README.md) — your question may already be answered there.

For contributing code or documentation, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Table of Contents

- [Bug Report](#bug-report)
- [Feature Request](#feature-request)
- [Question / Support](#question--support)
- [Issue Labels](#issue-labels)
- [Response Expectations](#response-expectations)

---

## Bug Report

Use the **Bug report** template when opening a new issue on GitHub (the structured form will guide you automatically). If filing manually, include the following:

### Description

A clear, concise description of what the bug is.

### Steps to Reproduce

```
1. Run: n8n-sync push --env production
2. Observe output...
3. Expected: ...
4. Actual: ...
```

### Expected Behaviour

What you expected to happen.

### Actual Behaviour

What actually happened. Include the **full error output** — paste it in a code block:

```
→ Pushing workflows to: production (https://n8n.example.com)
✗ my-workflow — HTTP 400 Bad Request — some detail here
```

### Environment

Please include all of the following:

```
n8n-cli-sync version: (run `n8n-sync --version`)
Node.js version:       (run `node --version`)
npm version:           (run `npm --version`)
Operating system:      (e.g. macOS 14, Ubuntu 22.04, Windows 11)
n8n version:           (check n8n Settings → About)
```

### Additional Context

Any other information that may be relevant (config shape — without secrets, workflow count, network environment, etc.).

---

## Feature Request

Use the **Feature request** template when opening a new issue on GitHub. If filing manually:

### Problem It Solves

Describe the problem or limitation you're hitting. Example: _"When syncing to production, I have no way to preview which workflows would be created/updated without actually pushing."_

### Proposed Solution

Describe the feature you'd like. Be specific about the CLI interface — what flag or command would this add?

Example:
```bash
# Proposed: dry-run flag for push
n8n-sync push --dry-run

# Output:
→ Dry run — no changes will be made
  + new-workflow (would create)
  ↻ existing-workflow (would update)
```

### Alternatives Considered

Have you tried workarounds? Are there other ways to solve this that you considered and rejected?

### Additional Context

Screenshots, links to related n8n issues, or any other context.

---

## Question / Support

For general questions — "how do I…?", "is it possible to…?" — please:

1. Check the [README](README.md) first, especially the [Advanced Usage](README.md#advanced-usage) section.
2. Search [existing issues](https://github.com/iuriandreazza/n8n-cli-sync/issues?q=is%3Aissue) (open and closed).
3. Open an issue with the label **`question`** if you still can't find an answer.

> **Note**: GitHub Issues is currently the primary support channel. There is no dedicated forum or Discord.

---

## Issue Labels

| Label | Description |
|---|---|
| `bug` | Something isn't working as documented |
| `enhancement` | New feature or improvement request |
| `question` | General question or support request |
| `good first issue` | Well-scoped, beginner-friendly contribution |
| `help wanted` | Extra help is welcome on this |
| `wontfix` | Out of scope or intentionally not addressed |
| `duplicate` | Already reported in another issue |

---

## Response Expectations

This is an open-source project maintained on a **best-effort basis**. Please set realistic expectations:

- Issues are reviewed as time permits — typically within a week, but not guaranteed.
- Not every feature request will be accepted — scope is intentionally kept narrow.
- Security-related issues should be reported **privately** via GitHub's [private vulnerability reporting](https://github.com/iuriandreazza/n8n-cli-sync/security/advisories/new) feature rather than as public issues.

Thank you for helping improve `n8n-cli-sync`!
