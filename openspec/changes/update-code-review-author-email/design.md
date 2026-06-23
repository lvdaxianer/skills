## Context

The requested change is documentation-only. The code review rules currently
refer to `lvdaxianerplus` as the required `@author` value for newly added
methods or classes, and several reference examples repeat that value.

## Decisions

- Treat `lvdaxianer@yeah.net` as the canonical author marker throughout the
  `code-review-spec` skill package.
- Replace the old marker in the main spec, review checklist text, and reference
  examples so reviewers see a single consistent value.
- Add a focused text contract test that fails while `lvdaxianerplus` appears in
  the package and passes only when `lvdaxianer@yeah.net` is present.
- Do not alter unrelated review rules, examples, wording, or workflow behavior.

## Risks / Trade-offs

- This change touches many documentation snippets because the old marker appears
  in multiple reference examples. Keeping the replacement literal and scoped to
  the `code-review-spec` package minimizes unrelated churn.
