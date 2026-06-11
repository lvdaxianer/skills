## Why

The development workflow currently defines how to execute and close tasks, but it
does not explicitly require a final audit report after all tasks are finished.
Without that report, it is hard to see which tasks completed successfully and
which tasks remained incomplete or blocked.

## What Changes

- Add a final audit report requirement to the development workflow.
- Require the report to list completed OpenSpec tasks and any unfinished tasks.
- Require the report to be produced after the final audit gate and before archive
  completion is considered done.

## Capabilities

### New Capabilities
- `development-workflow`: Adds a final audit report requirement at the end of a
  completed change.

### Modified Capabilities
- `development-workflow`: Clarifies the expected output after all tasks finish.

## Impact

- Affected documentation: `development-workflow/SKILL.md`
- Affected workflow assets: `openspec/changes/codify-development-workflow-audit-report/`
