## Context

`code-review-spec/SKILL.md` is the first document loaded for this repository's
code review skill. It currently points reviewers to the main spec and
references, but it does not explicitly state the user's preferred language for
comments.

## Decisions

- State the rule directly in `code-review-spec/SKILL.md`: newly written or
  modified code comments must use Chinese.
- Keep the rule scoped to comments, without changing naming, strings, logs,
  commit messages, or existing code that is outside the current diff.
- Add a focused contract test that reads `code-review-spec/SKILL.md` and
  requires the Chinese-comment rule markers.
- Do not alter unrelated review rules or reference examples.

## Risks / Trade-offs

- Putting the rule in `SKILL.md` makes it highly visible to agents but does not
  rewrite the larger detailed spec. This matches the requested file and keeps
  the change small.
