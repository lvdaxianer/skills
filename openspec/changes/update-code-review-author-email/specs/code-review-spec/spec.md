## MODIFIED Requirements

### Requirement: Code review spec MUST require the canonical author marker for new methods and classes
The code review spec MUST require only newly added methods or classes to use
the canonical `@author` marker `lvdaxianer@yeah.net`, while preserving existing
author values on older methods or classes.

#### Scenario: Reviewing a newly added method or class
- **WHEN** reviewed code adds a new method or class that requires an author
  marker
- **THEN** the review requires the marker to be `lvdaxianer@yeah.net`
- **AND** the review does not require changing author markers on existing
  methods or classes
