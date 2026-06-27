# Relax OpenSpec Planning Commit Requirement

## Summary
Update the development workflow so OpenSpec planning remains mandatory before
implementation, but does not require a standalone planning commit by default.

## Motivation
The previous workflow forced every OpenSpec plan into its own commit before any
business implementation. That creates document-only commits even when the plan is
only useful together with the first complete business module. Commits should be
atomic around complete business value. A standalone OpenSpec/documentation commit
is appropriate only when the change itself is documentation-only or when no
business code remains to carry the document update.

## Scope
- Replace the mandatory standalone planning commit rule with a validated-plan
  first rule.
- Require OpenSpec planning files to be committed with the first complete
  business task by default.
- Allow a standalone documentation/OpenSpec commit only for documentation-only
  changes or when the remaining work is only documentation/OpenSpec state.
- Update repository context and contract tests to reflect the new policy.

## Out of Scope
- Changing TDD, code-review-spec, final audit, or archive gates.
- Changing commit message format requirements.
- Changing OpenSpec layout or validation requirements.
