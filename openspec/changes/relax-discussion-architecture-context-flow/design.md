## Context

The startup context currently front-loads the complete development workflow for
all documentation and design-oriented work. The desired behavior is more
nuanced: conversations and architecture drafts should be quick, while
implementation remains gated by the canonical workflow.

## Decision

Add a dedicated "lightweight discussion and architecture design" boundary to the
startup context files. The boundary makes these cases explicit:

- Pure discussion and architecture design can proceed without OpenSpec, TDD,
  code-review-spec, or commit gates.
- Fast architecture design documents can be drafted directly when the user asks
  for a quick document, provided the work does not become a durable project
  planning asset or implementation change.
- Any move into code, tests, configuration, refactoring, committed project
  documentation, OpenSpec changes, or git commits re-enters the full mandatory
  `development-workflow`.

## Alternatives Considered

### Keep the current universal workflow trigger

This preserves maximum process safety but makes early architecture and
requirement work too heavy.

### Remove documentation from the workflow trigger entirely

This would speed up document work but would also weaken durable project
documentation changes that should still be planned, reviewed, and committed
carefully.

### Add a scoped lightweight boundary

This is the chosen approach because it preserves strict execution gates while
making pre-implementation thinking and quick architecture drafts efficient.

## Testing

Add or update contract tests that assert both startup context files:

- include the lightweight discussion/design exception;
- require switching to `development-workflow` before implementation changes;
- stay semantically aligned for the new boundary.
