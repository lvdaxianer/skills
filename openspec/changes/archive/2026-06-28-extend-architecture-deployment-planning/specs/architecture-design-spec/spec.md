# architecture-design-spec Deployment Planning

## ADDED Requirements

### Requirement: Architecture View Types Include Business Architecture

The skill SHALL recognize `业务架构图` as a supported architecture view type in
addition to function, logical, deployment, process, and data architecture views.

#### Scenario: Overall architecture document describes business capabilities

- **GIVEN** a user creates or checks an architecture document that describes
  business capability grouping or business domains
- **WHEN** the skill evaluates architecture views
- **THEN** `业务架构图` SHALL count as a valid architecture view
- **AND** the skill SHALL not force the user to relabel business architecture as
  function architecture.

### Requirement: System-Level Documents Include Deployment Resource Planning

The skill SHALL require system-level overall architecture documents to include
deployment resource planning for both standalone and high-availability
deployments.

#### Scenario: Standalone deployment planning is reviewed

- **GIVEN** a system-level architecture document
- **WHEN** the document has a deployment section
- **THEN** the skill SHALL check for standalone deployment machine
  specifications
- **AND** the skill SHALL check which components are deployed on each machine.

#### Scenario: High-availability deployment planning is reviewed

- **GIVEN** a system-level architecture document
- **WHEN** the document has a deployment section
- **THEN** the skill SHALL check for high-availability deployment machine
  specifications
- **AND** the skill SHALL check component placement and instance counts for the
  high-availability topology.

### Requirement: Templates Expose Deployment Resource Planning Sections

The skill SHALL include template sections that prompt authors to document
standalone deployment and high-availability deployment resource requirements.

#### Scenario: User generates a standard or complete system architecture template

- **GIVEN** a user asks the skill to generate a system-level architecture
  document
- **WHEN** the skill uses the standard or complete template
- **THEN** the deployment section SHALL include resource planning subsections
  for standalone and high-availability deployments.
