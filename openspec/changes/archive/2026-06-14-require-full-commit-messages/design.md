## Context

The repository uses `development-workflow/SKILL.md` as the default entry point
for development tasks. That workflow delegates commit behavior to the `commit`
skill, which points to `/Users/lvdaxianer/.claude/commands/commit.md`.

The canonical commit command currently treats `simple` as the default style and
only creates a body/footer when `--style=full` is selected. The workflow's commit
gate does not force `--style=full`, so an otherwise compliant task commit can
still be too sparse.

## Decisions

- The canonical commit command will default to `full` style.
- `simple` style remains available only when explicitly requested with
  `--style=simple`.
- Full-style commits must always include:
  - a Conventional Commit subject with the mapped emoji,
  - a non-empty body explaining what changed and why,
  - a non-empty footer containing traceability metadata.
- When no breaking change, issue, or co-author applies, the footer must still
  include a `Refs:` entry. For workflow tasks, that reference should point to the
  OpenSpec change/task or equivalent local decision record.
- `development-workflow/SKILL.md` will name `commit --style=full` directly in
  the commit gate so the workflow cannot fall back to single-line commits.
- `AGENTS.md` and `CLAUDE.md` will mirror the stricter default context rule.

## Risks / Trade-offs

- Full commit messages take slightly longer to write, but they preserve the
  rationale and verification trail required by this repository's gated workflow.
- Footer traceability can be awkward for tiny documentation edits. The fallback
  `Refs:` rule keeps it deterministic without inventing issue numbers.
