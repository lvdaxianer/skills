## Why

The current Codex startup context treats requirement discussion, architecture
design, and implementation work as if they all require the same full
development workflow. That slows down lightweight design conversations and
quick architecture documents that should be produced before any implementation
commitment.

## What Changes

- Clarify that pure requirement discussion, option comparison, architecture
  design, research notes, and fast architecture document drafts do not trigger
  the full `development-workflow` loop when they avoid code, tests,
  configuration, refactoring, commits, or OpenSpec implementation changes.
- Keep the full mandatory workflow for implementation work and for any task that
  changes code, tests, documentation as a durable project asset,
  configuration, refactoring, or commits.
- Add an explicit transition rule: if a task starts as design discussion and
  later moves into implementation, the agent must switch into the full
  development workflow before making implementation changes.
- Keep `AGENTS.md` and `CLAUDE.md` semantically aligned.

## Capabilities

### Modified Capabilities
- `default-context-workflow`: Startup context files distinguish lightweight
  discussion/design work from development execution work.

## Impact

- Affected documentation: `AGENTS.md`, `CLAUDE.md`
- Affected tests: default-context workflow contract tests
- No runtime production code is affected.
