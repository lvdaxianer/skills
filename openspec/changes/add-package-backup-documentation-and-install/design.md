## Context

The `package-backup` skill already exists in the repository, but it is not yet
referenced by the top-level README files or by the default agent context files.
The user also wants a local copy installed into `~/.claude/skills` so Claude can
load it without a manual copy step.

## Decisions

- Treat the README updates as installation and discovery guidance, not as a new
  implementation surface for the skill itself.
- Keep the README additions symmetrical between English and Chinese so the
  installation instructions stay easy to follow in both locales.
- Update `CLAUDE.md` and `AGENTS.md` to preserve the existing
  `development-workflow` pointer while adding `package-backup` as an additional
  context skill for archive tasks.
- Install the local skill by copying the repository `package-backup/` directory
  into `/Users/lvdaxianer/.claude/skills/package-backup`.

## Risks / Trade-offs

- The README instructions will now mention one more skill, so the install blocks
  need to stay in sync if new skills are added later.
- Updating `CLAUDE.md` and `AGENTS.md` changes default context behavior, so the
  wording should remain explicit that `development-workflow` is still the base
  workflow while `package-backup` is an additional domain-specific skill.
