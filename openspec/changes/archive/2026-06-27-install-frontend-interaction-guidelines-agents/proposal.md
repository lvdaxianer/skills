## Why

The `frontend-interaction-guidelines` skill now exists in the repository, but it
is not installed under `/Users/lvdaxianer/.agents/skills`, so agents that load
the agents skill root cannot discover it. The public README files also do not
list the new skill or explain how to install it.

## What Changes

- Install `frontend-interaction-guidelines` into
  `/Users/lvdaxianer/.agents/skills`.
- Update `README.md` and `README-zh.md` so the skill list, installation
  commands, skill details, and requirements include the frontend interaction
  skill.
- Add focused coverage that checks the repository docs mention the skill and
  the agents installation copy exists with the expected core assets.

## Capabilities

### Changed Capabilities

- `frontend-interaction-guidelines-skill`: The skill must be available from the
  agents skill root and documented in the repository README files.

## Impact

- Affected documentation: `README.md`, `README-zh.md`.
- Affected local installation: `/Users/lvdaxianer/.agents/skills/frontend-interaction-guidelines`.
- Affected tests: documentation and installation contract coverage.
