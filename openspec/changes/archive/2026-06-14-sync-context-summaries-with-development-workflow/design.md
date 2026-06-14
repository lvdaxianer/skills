## Context

`AGENTS.md` and `CLAUDE.md` are the startup context files for Codex and Claude.
They already reference `development-workflow/SKILL.md`, but the content is still
compressed enough that important workflow details can be missed when a session
starts from those files alone.

## Decisions

- Keep both context files as readable summaries, but make them materially closer
  to the canonical workflow structure.
- Mirror the workflow by section name, not just by a few bullet points.
- Preserve identical workflow meaning between `AGENTS.md` and `CLAUDE.md`.
- Keep the files concise enough to read quickly, but complete enough to cover the
  planning, task loop, commit, and archive gates.

## Risks / Trade-offs

- The files will be longer, but the startup context becomes much less ambiguous.
- Duplication between the skill and the summary is intentional because these are
  startup files whose job is to be readable without extra navigation.
