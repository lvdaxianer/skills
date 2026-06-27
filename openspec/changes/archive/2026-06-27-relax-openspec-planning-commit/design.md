# Design

## Rule Change
The workflow will separate "plan before implementation" from "commit before
implementation". The OpenSpec plan must still be created and validated before
implementation starts, but it no longer has to be committed as an independent
planning commit.

## Commit Semantics
Task commits should be atomic around complete business modules. When a task
implements business behavior, its commit includes both the business code and the
OpenSpec planning files that justify that work. A document-only commit is allowed
only when the change itself is documentation-only or when all business work has
already been committed and only OpenSpec/documentation state remains.

## Workflow Impact
The mandatory loop will remove the separate planning commit gate. The first task
selection now follows validated OpenSpec planning. The commit gate remains after
RED, GREEN, broader verification, audit, code review, fixes, re-verification, and
task completion.

## Verification
Contract tests will assert that the skill and startup context no longer require
an independent planning commit, and that they require validated planning before
implementation plus OpenSpec files included in the next atomic business commit.
