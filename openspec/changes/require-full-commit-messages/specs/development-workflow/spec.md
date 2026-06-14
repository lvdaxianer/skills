## MODIFIED Requirements

### Requirement: Development workflow MUST process implementation tasks one at a time
The development workflow MUST select the next unchecked OpenSpec task and complete
the full gate sequence before moving to another task. Each task commit MUST be a
Chinese Conventional Commit created with full style and MUST include a non-empty
body and non-empty footer.

#### Scenario: Implementing an OpenSpec task
- **WHEN** an unchecked task is selected
- **THEN** `superpowers:test-driven-development` writes the smallest useful failing test first
- **AND** the workflow confirms RED, implements minimal GREEN, runs focused and broader verification, runs a Superpowers audit against the OpenSpec spec, runs canonical `code-review-spec`, fixes required issues, marks exactly that task complete, and creates one Chinese Conventional Commit with subject, body, and footer

#### Scenario: Creating a task commit
- **WHEN** the workflow reaches the commit gate for a completed task
- **THEN** it applies `commit --style=full`
- **AND** the commit message body explains what changed and why
- **AND** the commit message footer includes traceability metadata such as `Refs: <OpenSpec change/task>`
