# Skill download sources Specification

## ADDED Requirements

### Requirement: Declare authoritative download sources

The installation README MUST declare an authoritative repository or platform source for the main Skill and every dependency family.

#### Scenario: AI installs from a clean checkout

- **WHEN** the AI reads the README without any dependency already installed
- **THEN** it MUST know which repository to clone, which Skill path to resolve, and how to verify the source before copying files

### Requirement: Reject unverifiable sources

The installation README MUST require the AI to stop when an exact Skill path or source cannot be verified, rather than guessing a URL or using an unknown installer.

#### Scenario: A declared path is absent

- **WHEN** a cloned or configured source does not contain the requested `SKILL.md`
- **THEN** the AI MUST report the missing path and stop that installation, unless a configured trusted mirror provides the same exact Skill
