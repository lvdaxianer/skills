## Why

The current workflow text already enforces mandatory gates, but some context
files still read like summaries rather than hard constraints. That makes the
workflow easier to skim past than to obey.

The user wants the wording to be unmistakable: the workflow must read like a
non-optional operating rule, and the home-context files must stop repeating the
workflow text in multiple places.

## What Changes

- Tighten `development-workflow/SKILL.md` wording so the mandatory nature is
  explicit and non-negotiable.
- Reduce home-context files to hard pointers that only reference the canonical
  `~/.claude/skills/development-workflow/SKILL.md`.
- Remove duplicated workflow text from the Claude/Codex home-context files so
  future edits happen in one place.
- Keep repository startup context files aligned with the stronger wording.

## Capabilities

### Modified Capabilities
- `development-workflow`: Makes the tone hard-mandatory and removes any soft
  interpretation.
- `default-context-workflow`: Keeps startup context files aligned with the
  canonical hard-mandatory source.

## Impact

- Affected documentation: `development-workflow/SKILL.md`, `AGENTS.md`,
  `CLAUDE.md`, and the corresponding home-context files under `~/.claude` and
  `~/.codex`
- Affected specs: `openspec/specs/development-workflow/spec.md`,
  `openspec/specs/default-context-workflow/spec.md`
- Affected tests: workflow/default context contract checks
- No runtime production code is affected.
