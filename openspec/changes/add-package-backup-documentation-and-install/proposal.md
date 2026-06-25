## Why

The repository documentation and default agent context do not yet mention the
new `package-backup` skill. As a result, people reading the repository README or
dropping `AGENTS.md` / `CLAUDE.md` into a project root will not discover that
archive and restore work should follow the `package_backup.sh` contract.

## What Changes

- Add `package-backup` to the English and Chinese skill listings in the README
  files.
- Add installation instructions for copying `package-backup` into
  `~/.claude/skills` and the per-project `.claude/skills` directory.
- Update `AGENTS.md` and `CLAUDE.md` so the default development context points
  to `package-backup/SKILL.md` in addition to `development-workflow/SKILL.md`.
- Copy the `package-backup` skill directory into `/Users/lvdaxianer/.claude/skills`
  so the local Claude installation can discover it immediately.

## Capabilities

### Added Capabilities

- `package-backup` documentation and installation visibility across README and
  default agent contexts.

## Impact

- Affected documentation: `README.md`, `README-zh.md`, `AGENTS.md`, `CLAUDE.md`
- Affected installation state: `/Users/lvdaxianer/.claude/skills/package-backup`
- No behavior logic changes inside the skill itself
