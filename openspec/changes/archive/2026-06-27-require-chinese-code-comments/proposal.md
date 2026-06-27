## Why

The user wants `code-review-spec/SKILL.md` to make the expected comment
language explicit: when comments are written or updated, they should be Chinese
comments.

## What Changes

- Add a concise rule to `code-review-spec/SKILL.md` requiring Chinese comments
  for newly written or modified comments.
- Add focused text contract coverage so the rule remains visible in the skill
  entry point.

## Capabilities

### Modified Capabilities

- `code-review-spec`: The skill entry point now states that written or modified
  code comments must be in Chinese.

## Impact

- Affected documentation: `code-review-spec/SKILL.md`
- Affected tests: text contract coverage for the `code-review-spec` skill
  entry point
- No runtime production code is affected.
