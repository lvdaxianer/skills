## Why

The development workflow currently requires Chinese Conventional Commits but
does not explicitly require detailed commit messages. The canonical commit
command also defaults to simple one-line messages, so workflow-driven commits
can omit both body and footer.

This weakens auditability because later readers cannot see the motivation,
verification evidence, or OpenSpec/task reference from the commit itself.

## What Changes

- Make full-style commit messages the default in the canonical commit command.
- Require every workflow-created commit to include a non-empty body and footer.
- Require workflow commits to use `commit --style=full`.
- Add stable footer guidance so agents do not omit footers when no issue or
  breaking change exists.
- Keep startup context files aligned with the stricter commit rule.

## Capabilities

### Modified Capabilities
- `development-workflow`: Tightens the commit gate so each atomic task commit
  must include subject, body, and footer.
- `default-context-workflow`: Mirrors the stricter commit requirement in
  startup context files.

## Impact

- Affected documentation: `development-workflow/SKILL.md`, `AGENTS.md`,
  `CLAUDE.md`
- Affected tests: workflow and commit contract tests
- External canonical source updated locally:
  `/Users/lvdaxianer/.claude/commands/commit.md`
- No runtime production code is affected.
