## Why

The development workflow already requires a final audit report after all planned
tasks complete, but that report only lists completed and unfinished tasks. The
user wants the closing report to also capture a quality retrospective: what was
done well, why it was good, what was poor in the original code or workflow, why
it was poor, and how to correct similar issues.

Without this explicit requirement, final reports can prove completion but miss
the learning value that helps future changes improve.

## What Changes

- Extend the final audit report requirement in `development-workflow` so it
  includes a final review summary after all tasks finish.
- Require the summary to cover good changes, why those changes are good,
  original problems, why those problems are bad, and recommended corrections.
- Keep the existing final audit and OpenSpec archive order unchanged.
- Add contract coverage so the workflow keeps requiring this summary.

## Capabilities

### Modified Capabilities

- `development-workflow`: Final audit reports include a required qualitative
  review summary, not only task completion status.

## Impact

- Affected documentation: `development-workflow/SKILL.md`
- Affected specs: `openspec/specs/development-workflow/spec.md`
- Affected tests: workflow contract tests
- No runtime production code is affected.
