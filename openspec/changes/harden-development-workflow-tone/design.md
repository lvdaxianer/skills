## Context

This repository already treats `development-workflow/SKILL.md` as the canonical
rule source. The problem is tone and duplication: a few context files still
carry extra prose, and some of it reads like guidance rather than mandatory
instruction.

## Decisions

- Reword the canonical workflow so it reads in hard mandatory language:
  "must", "must not", "do not", and "noncompliant" where appropriate.
- Keep the repository startup context files aligned with the canonical skill.
- Replace duplicated home-context workflow text with short pointer content that
  only names the canonical source.
- Treat any future deviation from the canonical workflow as a direct violation
  of the workflow, not a suggestion to reconsider.

## Risks / Trade-offs

- The wording will feel stricter. That is intentional.
- Short pointer files reduce duplication but leave less local explanation in
  home-context files. That is the point: the canonical skill carries the rules.
