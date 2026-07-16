## ADDED Requirements

### Requirement: Development workflow MUST scale standard-change evidence by behavior risk
The development workflow MUST classify persisted standard changes into S, M, or
L tiers before implementation. The tier MUST be based primarily on behavior risk
and secondarily on file count or module span. The tier MUST scale the depth of
OpenSpec content, task-boundary detail, verification scope, review evidence, and
subagent orchestration without removing mandatory traceability or gate order.

#### Scenario: Agent classifies a standard change
- **WHEN** a persisted standard change is ready for planning
- **THEN** the workflow classifies it as S, M, or L before implementation
- **AND** behavior risk is the primary classifier
- **AND** file count and module span are only secondary signals

#### Scenario: Low-risk standard change uses compact evidence
- **WHEN** a standard change is classified as S-tier
- **THEN** the workflow keeps an OpenSpec change by default
- **AND** uses compact proposal, design, task, spec, verification, and review evidence
- **AND** keeps the required task completion, commit, final audit, and archive gates

#### Scenario: Higher-risk standard change uses fuller evidence
- **WHEN** a standard change is classified as M-tier or L-tier
- **THEN** the workflow increases evidence depth according to the behavior risk
- **AND** L-tier changes receive the fullest task breakdown, risk notes, verification scope, and review evidence
