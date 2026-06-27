## Context

The repository skill has been created and archived into OpenSpec, but the user
also wants it installed into the global agents skill directory. Existing README
files enumerate available skills and installation copy commands, so they should
stay aligned with the repository contents.

## Decisions

- Treat `/Users/lvdaxianer/.agents/skills` as the intended target for the
  user's `.agens/skills` wording because this environment exposes that path as
  the agents skill root and it already contains other installed skills.
- Copy the complete skill folder, including `SKILL.md`, `agents/openai.yaml`,
  and `references/interaction-checklist.md`, so the installed copy behaves like
  the repository source.
- Update both English and Chinese README files in parallel:
  - Available skills table.
  - Global installation commands.
  - Per-project installation commands.
  - Skill details section.
  - Requirements section.
- Add contract tests instead of relying only on manual inspection. The tests
  should fail when README coverage is removed or the agents installation copy is
  missing required assets.

## Risks / Trade-offs

- `/Users/lvdaxianer/.agents/skills` is outside the repository, so git cannot
  record the installed copy. Tests can still verify that the local installation
  exists in this environment.
- Future edits to the repository skill may drift from the installed copy. The
  README should document that the skill can be copied into agents or Claude
  skill roots, and future synchronization changes should update both locations
  intentionally.
