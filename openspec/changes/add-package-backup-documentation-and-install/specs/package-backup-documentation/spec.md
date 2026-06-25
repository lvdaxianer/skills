## ADDED Requirements

### Requirement: Repository docs MUST advertise the package-backup skill
The repository documentation MUST list `package-backup` in both README files and
describe it as the skill to use for archive creation and extraction work that
must follow the `package_backup.sh` contract.

#### Scenario: A user reads the README
- **WHEN** a user opens `README.md` or `README-zh.md`
- **THEN** the skill list includes `package-backup`
- **AND** the installation instructions show how to copy `package-backup` into
  `~/.claude/skills` and the project `.claude/skills` directory

### Requirement: Default agent context MUST include package-backup for archive tasks
The repository default context files `AGENTS.md` and `CLAUDE.md` MUST keep the
existing `development-workflow` pointer and MUST also mention `package-backup`
as the skill to load for archive creation and extraction tasks.

#### Scenario: A project root copies the context files
- **WHEN** a user copies `AGENTS.md` or `CLAUDE.md` into a project root
- **THEN** the file still points to `development-workflow/SKILL.md`
- **AND** it also points to `package-backup/SKILL.md` for archive work

### Requirement: Local Claude skill directory MUST contain package-backup
The local Claude skill directory at `/Users/lvdaxianer/.claude/skills` MUST
contain a copy of the `package-backup` skill so the installed Claude environment
can discover it immediately.

#### Scenario: Claude scans installed skills
- **WHEN** Claude lists skills from `/Users/lvdaxianer/.claude/skills`
- **THEN** `package-backup` is present alongside the existing skills
