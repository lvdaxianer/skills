## Why

`code-review-spec` still documents the old author marker `lvdaxianerplus`.
The user requested that author examples and requirements use the email
`lvdaxianer@yeah.net` instead.

## What Changes

- Replace `lvdaxianerplus` with `lvdaxianer@yeah.net` across the
  `code-review-spec` skill package.
- Keep the rule scope unchanged: only newly added methods or classes require
  the author marker.
- Add focused text verification so future changes catch regressions to the old
  author marker.

## Capabilities

### Modified Capabilities

- `code-review-spec`: Author-marker requirements and examples now use
  `lvdaxianer@yeah.net`.

## Impact

- Affected documentation: `code-review-spec/spec.md`,
  `code-review-spec/references/*.md`
- Affected tests: text contract coverage for the `code-review-spec` author
  marker
- No runtime production code is affected.
