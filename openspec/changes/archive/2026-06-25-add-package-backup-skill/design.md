## Context

The user wants a new skill that activates for packaging and extraction actions
and makes agents follow the behavior in
`/Users/lvdaxianer/Downloads/shell-main/package_backup.sh`. The user explicitly
chose the lightweight approach: the shell script content should be represented as
a reference, while the skill body stays focused on trigger rules and execution
requirements.

## Decisions

- Create a skill named `package-backup` because it is short, action-oriented,
  and maps directly to the source script name.
- Keep `SKILL.md` concise and mandatory: if a user asks to package, back up,
  restore, unzip, extract, or perform equivalent archive operations, the agent
  must load the reference before acting.
- Store the script-derived contract in
  `package-backup/references/package_backup.md` rather than copying the shell
  script itself as the executable implementation. This keeps the skill readable
  and avoids implying that agents must execute one bundled script in every
  environment.
- Capture behavior, not incidental Bash implementation details: naming,
  validation, dependency checks, path safety, sequence selection, restore
  safeguards, and expected command shapes.
- Add text tests that assert the skill metadata, reference loading rule, and
  key archive/restore constraints remain present.

## Risks / Trade-offs

- The reference document can drift from the original shell script if the external
  script changes. The skill must say to treat the reference as the loaded local
  contract and update it when synchronizing with the script.
- This change does not add an executable wrapper. Agents still decide how to run
  commands in the current environment, but their decisions are constrained by
  the reference behavior.
